import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const inbox = JSON.parse(await readFile(new URL("data/inbox.json", root), "utf8"));
const sources = JSON.parse(await readFile(new URL("data/sources.json", root), "utf8"));

if (!Array.isArray(inbox)) throw new Error("Candidate inbox must be a JSON array.");
if (!Array.isArray(sources)) throw new Error("Source registry must be a JSON array.");

const sourceById = new Map(sources.map(source => [source.id, source]));
const ids = new Set();
const offerUrls = new Set();
const errors = [];

function httpsUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) {
      errors.push(label + " must be a credential-free HTTPS URL.");
      return null;
    }
    return url;
  } catch {
    errors.push(label + " is not a valid URL.");
    return null;
  }
}

for (const [index, item] of inbox.entries()) {
  const label = `inbox[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(label + " must be an object.");
    continue;
  }

  if (typeof item.id !== "string" || !item.id.trim()) errors.push(label + " is missing its ID.");
  else if (ids.has(item.id)) errors.push(label + " has duplicate ID " + item.id + ".");
  else ids.add(item.id);

  if (!String(item.title ?? "").trim()) errors.push(label + " is missing its title.");
  if (!String(item.description ?? "").trim()) errors.push(label + " is missing its description.");

  // Discovery is deliberately separate from publication: inbox records can never
  // become public merely because a feed supplied them.
  if (!["pending_review", "rejected", "expired"].includes(item.status)) {
    errors.push(label + " has an invalid review status; candidates must not be published from the inbox.");
  }

  const source = sourceById.get(item.sourceId);
  if (!source || source.ingestionMode !== "candidate-only") {
    errors.push(label + " references an unknown or non-candidate source.");
  }

  const offerUrl = httpsUrl(item.url, label + ".url");
  const sourceUrl = httpsUrl(item.source, label + ".source");
  const feedUrl = source?.feedUrl
    ? httpsUrl(source.feedUrl, "Source " + source.id + ".feedUrl")
    : null;

  if (offerUrl) {
    const canonicalUrl = offerUrl.origin + (offerUrl.pathname.endsWith("/") ? offerUrl.pathname.slice(0, -1) : offerUrl.pathname) + offerUrl.hash;
    if (offerUrls.has(canonicalUrl)) {
      errors.push(label + " duplicates another candidate offer URL.");
    } else {
      offerUrls.add(canonicalUrl);
    }
  }
  if (source && !source.feedUrl) {
    errors.push(label + " references a source without an approved feed URL.");
  }
  if (feedUrl && offerUrl && offerUrl.hostname !== feedUrl.hostname) {
    errors.push(label + " offer URL host does not match its approved feed host.");
  }
  if (feedUrl && sourceUrl && sourceUrl.hostname !== feedUrl.hostname) {
    errors.push(label + " source attribution host does not match its approved feed host.");
  }

  if (!Array.isArray(item.countries) || item.countries.length === 0 ||
      item.countries.some(country => typeof country !== "string" || !country.trim())) {
    errors.push(label + " must state at least one eligible country.");
  }
  if (typeof item.global !== "boolean" || item.global !== false) {
    errors.push(label + " must remain non-global until eligibility is independently verified.");
  }
  if (!item.discoveredAt || !Number.isFinite(Date.parse(item.discoveredAt))) {
    errors.push(label + " has an invalid discovery timestamp.");
  }
}

if (errors.length) {
  console.error("Candidate inbox validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}

console.log(`Candidate inbox valid: ${inbox.length} review records; none are publishable directly from the inbox.`);
