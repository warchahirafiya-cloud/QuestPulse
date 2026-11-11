import { readFile } from "node:fs/promises";

const offers = JSON.parse(await readFile(new URL("../data/offers.json", import.meta.url), "utf8"));
if (!Array.isArray(offers)) throw new Error("Offer catalogue must be a JSON array.");

const errors = [];
const ids = new Set();
const categories = new Set(["reward","store","discount","contest","loyalty","task","referral"]);
const rewardTypes = new Set(["cash","gift","discount","points","prize","other"]);
const now = Date.now();

for (const [index, offer] of offers.entries()) {
  const label = `offers[${index}]`;
  if (!offer || typeof offer !== "object") { errors.push(`${label} must be an object.`); continue; }
  if (!offer.id || typeof offer.id !== "string") errors.push(`${label}: missing id.`);
  else if (ids.has(offer.id)) errors.push(`${label}: duplicate id ${offer.id}.`);
  else ids.add(offer.id);

  if (offer.status !== "published") continue;
  for (const key of ["title","description","store","value","url","source","verifiedAt","category","rewardType"]) {
    if (!String(offer[key] ?? "").trim()) errors.push(`${label}: published offer is missing ${key}.`);
  }
  if (!categories.has(offer.category)) errors.push(`${label}: unsupported category.`);
  if (!rewardTypes.has(offer.rewardType)) errors.push(`${label}: unsupported rewardType.`);
  if (typeof offer.global !== "boolean") errors.push(`${label}: global must be true or false.`);
  if (!offer.global && (!Array.isArray(offer.countries) || offer.countries.length === 0)) errors.push(`${label}: list eligible countries or mark the offer global.`);

  for (const key of ["url","source"]) {
    try {
      const parsed = new URL(offer[key]);
      if (parsed.protocol !== "https:") errors.push(`${label}: ${key} must use HTTPS.`);
    } catch { errors.push(`${label}: invalid ${key} URL.`); }
  }
  const verified = Date.parse(offer.verifiedAt);
  if (!Number.isFinite(verified)) errors.push(`${label}: verifiedAt must be a valid date.`);
  else if (now - verified > 30 * 86400000) errors.push(`${label}: verification is older than 30 days; review before publishing.`);
  if (offer.expiresAt) {
    const expiry = Date.parse(offer.expiresAt);
    if (!Number.isFinite(expiry)) errors.push(`${label}: expiresAt must be a valid date.`);
    else if (expiry <= now) errors.push(`${label}: expired offer cannot remain published.`);
  }
  if (offer.fees === undefined || offer.eligibility === undefined || offer.termsUrl === undefined) {
    errors.push(`${label}: disclose fees, eligibility, and termsUrl (use explicit "none" where applicable).`);
  }
}

if (errors.length) {
  console.error("Offer catalogue validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}
console.log(`Offer catalogue valid: ${offers.length} records, ${offers.filter(o => o.status === "published").length} published.`);
