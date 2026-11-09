import { readFile } from "node:fs/promises";

const file = new URL("../research/research-candidates.json", import.meta.url);
const errors = [];
const allowedReview = new Set(["research_lead", "under_review", "approved_for_editorial_review", "rejected", "expired"]);
const allowedEvidence = new Set(["not_reviewed", "community_report_only", "independently_checked"]);
const allowedDeposit = new Set(["not_established", "none_confirmed", "required_confirmed", "unknown"]);
const allowedWithdrawal = new Set(["regional_non_cash_redemption", "non_cash_redemption", "conditional_account_and_region_check", "campaign_dependent", "terms_and_country_check_required", "regional_terms_check_required", "non_transferable_points_token_swap_unconfirmed", "not_an_earning_offer", "campaign_and_game_status_check_required", "unknown"]);

function https(value) {
  if (typeof value !== "string") return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

let registry;
try { registry = JSON.parse(await readFile(file, "utf8")); }
catch (error) {
  console.error("FAIL: research/research-candidates.json is not valid JSON.");
  console.error(error.message);
  process.exit(1);
}

if (registry?.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
if (registry?.publicationBoundary !== "research_only") errors.push("publicationBoundary must remain research_only.");
if (!Array.isArray(registry?.records)) errors.push("records must be an array.");
const ids = new Set();
for (const [index, item] of (Array.isArray(registry?.records) ? registry.records : []).entries()) {
  const label = `records[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) { errors.push(`${label} must be an object.`); continue; }
  for (const key of ["id", "name", "category", "recordType", "rewardModel", "withdrawalState", "geography", "resetInterval", "depositRequirement", "paymentEvidence", "notes"]) {
    if (typeof item[key] !== "string" || !item[key].trim()) errors.push(`${label}.${key} is required.`);
  }
  if (typeof item.id === "string") {
    if (ids.has(item.id)) errors.push(`Duplicate id: ${item.id}`);
    ids.add(item.id);
  }
  if (!https(item.officialUrl)) errors.push(`${label}.officialUrl must be HTTPS.`);
  if (!allowedReview.has(item.reviewStatus)) errors.push(`${label}.reviewStatus is invalid.`);
  if (!allowedEvidence.has(item.paymentEvidence)) errors.push(`${label}.paymentEvidence is invalid.`);
  if (!allowedDeposit.has(item.depositRequirement)) errors.push(`${label}.depositRequirement is invalid.`);
  if (!allowedWithdrawal.has(item.withdrawalState)) errors.push(`${label}.withdrawalState is invalid.`);
  if (item.reviewStatus === "research_lead" && item.paymentEvidence !== "not_reviewed") errors.push(`${label}: research leads must not imply payment evidence was reviewed.`);
}
if (errors.length) {
  console.error("Research catalogue validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}
console.log(`QuestPulse research catalogue OK: ${registry.records.length} internal leads checked; public feed unchanged.`);
