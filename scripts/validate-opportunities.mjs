import { readFile } from "node:fs/promises";

const file = new URL("../data/opportunities.json", import.meta.url);
const allowedType = new Set(["airdrop", "telegram", "clicktime", "tasks", "referral"]);
const allowedStatus = new Set(["unverified", "under_review", "verified", "paused", "expired"]);
const allowedAvailability = new Set(["unknown", "active", "paused", "expired"]);
const allowedRisk = new Set(["low", "medium", "high", "unrated"]);
const errors = [];

function isHttps(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isDate(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

let registry;
try {
  registry = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  console.error("FAIL: data/opportunities.json is not valid JSON.");
  console.error(error.message);
  process.exit(1);
}

if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
  errors.push("Root value must be an object.");
}
if (registry?.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (!Array.isArray(registry?.opportunities)) errors.push("opportunities must be an array.");

const seen = new Set();
for (const [index, item] of (Array.isArray(registry?.opportunities) ? registry.opportunities : []).entries()) {
  const label = `opportunities[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    errors.push(`${label} must be an object.`);
    continue;
  }

  if (typeof item.id !== "string" || !item.id.trim()) errors.push(`${label}.id is required.`);
  else if (seen.has(item.id)) errors.push(`Duplicate opportunity id: ${item.id}`);
  else seen.add(item.id);

  if (!allowedType.has(item.type)) errors.push(`${label}.type is invalid.`);
  if (!allowedStatus.has(item.status)) errors.push(`${label}.status is invalid.`);
  if (!allowedAvailability.has(item.availability)) errors.push(`${label}.availability is invalid.`);
  if (!allowedRisk.has(item.riskLevel)) errors.push(`${label}.riskLevel is invalid.`);
  if (typeof item.notes !== "string") errors.push(`${label}.notes must be a string.`);
  if (!Array.isArray(item.verificationSources)) errors.push(`${label}.verificationSources must be an array.`);
  if (!Array.isArray(item.paymentEvidence)) errors.push(`${label}.paymentEvidence must be an array.`);
  for (const key of ["withdrawalTerms", "resetInterval", "paymentEvidenceSummary", "riskNotes"]) {
    if (item[key] !== null && item[key] !== undefined && typeof item[key] !== "string") {
      errors.push(`${label}.${key} must be a string or null.`);
    }
  }
  for (const [evidenceIndex, evidence] of (Array.isArray(item.paymentEvidence) ? item.paymentEvidence : []).entries()) {
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      errors.push(`${label}.paymentEvidence[${evidenceIndex}] must be an object.`);
    } else if (evidence.url && !isHttps(evidence.url)) {
      errors.push(`${label}.paymentEvidence[${evidenceIndex}].url must be HTTPS.`);
    }
  }

  if (item.officialUrl !== null && item.officialUrl !== undefined && !isHttps(item.officialUrl)) {
    errors.push(`${label}.officialUrl must be null or a valid HTTPS URL.`);
  }

  for (const [sourceIndex, source] of (Array.isArray(item.verificationSources) ? item.verificationSources : []).entries()) {
    if (!source || !isHttps(source.url)) errors.push(`${label}.verificationSources[${sourceIndex}].url must be HTTPS.`);
    if (typeof source?.checkedFor !== "string" || !source.checkedFor.trim()) {
      errors.push(`${label}.verificationSources[${sourceIndex}].checkedFor is required.`);
    }
  }

  if (item.status === "verified") {
    if (!isHttps(item.officialUrl)) errors.push(`${label} cannot be verified without an official HTTPS URL.`);
    if (!isDate(item.reviewedAt)) errors.push(`${label} cannot be verified without a valid reviewedAt date.`);
    if (!Array.isArray(item.verificationSources) || item.verificationSources.length === 0 ||
        !item.verificationSources.some(source => isHttps(source?.url) && typeof source?.checkedFor === "string" && source.checkedFor.trim())) {
      errors.push(`${label} cannot be verified without at least one HTTPS verification source.`);
    }
  }

  if (item.availability === "active" && item.status !== "verified") {
    errors.push(`${label} cannot be marked active unless status is verified.`);
  }
  if (item.reviewedAt !== null && item.reviewedAt !== undefined && !isDate(item.reviewedAt)) {
    errors.push(`${label}.reviewedAt must be null or a valid date.`);
  }
}

if (errors.length) {
  console.error("QuestPulse registry validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

// Guard the homepage-to-registry integration against accidental disconnection.
const homepage = await readFile(new URL("../index.html", import.meta.url), "utf8");
if (!homepage.includes('fetch("./data/opportunities.json"')) {
  errors.push("Homepage must load the canonical data/opportunities.json registry.");
}
if (!homepage.includes("applyOpportunityRegistry(data.opportunities)")) {
  errors.push("Homepage must pass loaded registry records into the opportunity-card renderer.");
}
if (!homepage.includes("function syncDynamicCards(records)") || !homepage.includes("function makeDynamicCard(item)")) errors.push("Homepage must generate cards dynamically for registry records.");
if (!homepage.includes('typeof s?.checkedFor==="string"&&s.checkedFor.trim()')) {
  errors.push("Homepage verification gate must require a described HTTPS verification source.");
}
if (errors.length) {
  console.error("QuestPulse integration validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`QuestPulse registry and homepage integration OK: ${registry.opportunities.length} records checked.`);
