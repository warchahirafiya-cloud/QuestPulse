import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const sourcesPath = new URL("data/sources.json", root);
const inboxPath = new URL("data/inbox.json", root);
const sources = JSON.parse(await readFile(sourcesPath, "utf8"));
const inbox = JSON.parse(await readFile(inboxPath, "utf8"));
if (!Array.isArray(sources) || !Array.isArray(inbox)) throw new Error("Sources and inbox must be JSON arrays.");

const activeFeeds = sources.filter(source =>
  source.status === "active" &&
  source.ingestionMode === "candidate-only" &&
  typeof source.feedUrl === "string"
);
const existing = new Set(inbox.map(item => item.id));
const existingById = new Map(inbox.map(item => [item.id, item]));
let added = 0;
const failures = [];
const allowedHosts = new Set(["meh.com", "promomagpie.com", "vouchermagpie.co.uk"]);

function validHttps(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; }
  catch { return ""; }
}
function canonicalOfferUrl(value) {
  const url = new URL(value);
  const pathname = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  return url.origin + pathname + url.search + url.hash;
}

// Prevent duplicates already in the inbox and duplicates discovered across
// different feed records during this run. Keep query strings and fragments,
// since they can identify distinct voucher/deal records on the same page.
const existingOfferUrls = new Set();
for (const item of inbox) {
  if (typeof item?.url !== "string") continue;
  try { existingOfferUrls.add(canonicalOfferUrl(item.url)); } catch {}
}
function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function tag(block, name) {
  const match = block.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i"));
  return match ? decodeXml(match[1]) : "";
}
function clean(value, max = 1200) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
async function getText(url, accept) {
  const response = await fetch(url, {
    headers: { "user-agent": "QuestPulseOfferIndexer/1.0 (+https://getquestpulse.com)", accept },
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const body = await response.text();
  if (body.length > 4_000_000) throw new Error("Feed exceeded 4 MB safety limit.");
  return body;
}
function addCandidate(candidate) {
  if (!candidate.title || !candidate.url) return;
  const id = createHash("sha256").update(candidate.sourceId + "|" + candidate.externalId).digest("hex").slice(0, 20);
  if (existing.has(id)) {
    const previous = existingById.get(id);
    if (previous) {
      previous.countries = candidate.country ? [candidate.country] : [];
      previous.currency = candidate.currency || null;
      previous.lastCheckedAt = candidate.lastCheckedAt || previous.lastCheckedAt || null;
      previous.expiresAt = candidate.expiresAt || previous.expiresAt || null;
      previous.merchantWebsite = candidate.merchantWebsite || previous.merchantWebsite || null;
    }
    return;
  }

  const canonicalUrl = canonicalOfferUrl(candidate.url);
  if (existingOfferUrls.has(canonicalUrl)) return;

  const record = {
    id,
    title: clean(candidate.title, 240),
    description: clean(candidate.description),
    url: candidate.url,
    source: candidate.source,
    sourceId: candidate.sourceId,
    store: clean(candidate.store, 160),
    merchantWebsite: candidate.merchantWebsite || null,
    countries: candidate.country ? [candidate.country] : [],
    global: false,
    currency: candidate.currency || null,
    discoveredAt: new Date().toISOString(),
    publishedAt: candidate.publishedAt || null,
    lastCheckedAt: candidate.lastCheckedAt || null,
    expiresAt: candidate.expiresAt || null,
    status: "pending_review",
    reviewNote: "Discovery only. Verify current availability, merchant terms, eligible countries, fees, and redemption on the original merchant page before publication."
  };
  inbox.push(record);
  existing.add(id);
  existingById.set(id, record);
  existingOfferUrls.add(canonicalUrl);
  added++;
}

for (const source of activeFeeds) {
  const feedUrl = validHttps(source.feedUrl);
  if (!feedUrl || !allowedHosts.has(new URL(feedUrl).hostname)) {
    failures.push(source.id + ": feed URL is not on an approved host.");
    continue;
  }
  try {
    if (source.feedFormat === "json") {
      const data = JSON.parse(await getText(feedUrl, "application/json"));
      const publisher = data.publisher || {};
      if (publisher.country !== source.publisherCountry) throw new Error("Feed publisher country did not match the source registry.");
      if (publisher.url && new URL(publisher.url).hostname !== new URL(feedUrl).hostname) throw new Error("Unexpected publisher domain.");
      const records = Array.isArray(data.offers) ? data.offers : [];
      for (const offer of records.slice(0, 250)) {
        const url = validHttps(offer.url);
        const expiry = offer.expires_at && Date.parse(offer.expires_at);
        const checked = offer.last_checked_at && Date.parse(offer.last_checked_at);
        if (expiry && expiry <= Date.now()) continue;
        if (!Number.isFinite(checked) || Date.now() - checked > 30 * 86400000) continue;
        if (!url || new URL(url).hostname !== new URL(feedUrl).hostname) continue;
        addCandidate({
          sourceId: source.id,
          externalId: String(offer.id),
          title: offer.title,
          description: [offer.discount, offer.terms].filter(Boolean).join(" — "),
          url,
          source: publisher.url || new URL(feedUrl).origin,
          store: offer.store?.name || "",
          merchantWebsite: validHttps(offer.store?.website),
          country: source.countryName || publisher.country,
          currency: publisher.currency,
          publishedAt: offer.starts_at,
          lastCheckedAt: offer.last_checked_at,
          expiresAt: offer.expires_at
        });
      }
    } else {
      if (source.feedFormat && source.feedFormat !== "rss") throw new Error("Unsupported feed format.");
      if (new URL(feedUrl).hostname !== "meh.com") throw new Error("RSS feed host is not approved.");
      const xml = await getText(feedUrl, "application/rss+xml, application/xml, text/xml");
      const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
      for (const block of items.slice(0, 30)) {
        const title = tag(block, "title");
        const description = tag(block, "description");
        const link = validHttps(tag(block, "link"));
        const guid = tag(block, "guid") || link || title;
        if (!title || !link) continue;
        const pubDate = tag(block, "pubDate");
        const publishedAt = pubDate && Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
        addCandidate({
          sourceId: source.id,
          externalId: guid,
          title,
          description,
          url: link,
          source: "https://meh.com",
          store: "Meh",
          country: "United States",
          publishedAt
        });
      }
    }
  } catch (error) {
    failures.push(source.id + ": " + error.message);
  }
}

await writeFile(inboxPath, JSON.stringify(inbox, null, 2) + "\n");
console.log("Feed discovery complete. New candidates: " + added + ". Total inbox records: " + inbox.length + ".");
for (const failure of failures) console.error("Feed warning: " + failure);
if (failures.length && added === 0) process.exitCode = 1;
