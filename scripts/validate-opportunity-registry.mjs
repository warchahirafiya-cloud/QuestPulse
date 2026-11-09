import { readFile } from "node:fs/promises";

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`PASS: ${message}`);

const registry = JSON.parse(await readFile("data/opportunities.json", "utf8"));
if (registry.schemaVersion !== 1) fail("Unsupported registry schemaVersion");
if (!Array.isArray(registry.opportunities)) fail("opportunities must be an array");
else {
  const ids = new Set();
  const types = new Set(["airdrop", "telegram", "clicktime", "tasks", "referral"]);
  const statuses = new Set(["unverified", "under_review", "verified", "paused", "expired"]);
  const availability = new Set(["active", "paused", "expired", "unknown"]);
  const riskLevels = new Set(["low", "medium", "high", "unrated"]);

  for (const [index, item] of registry.opportunities.entries()) {
    const label = item.id || `record #${index + 1}`;
    if (!item.id || typeof item.id !== "string") fail(`${label}: missing string id`);
    else if (ids.has(item.id)) fail(`${label}: duplicate id`);
    else ids.add(item.id);

    if (!types.has(item.type)) fail(`${label}: invalid type`);
    if (!statuses.has(item.status)) fail(`${label}: invalid status`);
    if (!availability.has(item.availability)) fail(`${label}: invalid availability`);
    if (!riskLevels.has(item.riskLevel)) fail(`${label}: invalid riskLevel`);
    if (!Array.isArray(item.verificationSources)) fail(`${label}: verificationSources must be an array`);
    if (!Array.isArray(item.paymentEvidence)) fail(`${label}: paymentEvidence must be an array`);

    const https = (value) => {
      try { return new URL(value).protocol === "https:"; }
      catch { return false; }
    };
    if (item.officialUrl !== null && !https(item.officialUrl)) fail(`${label}: officialUrl must be HTTPS or null`);
    for (const evidence of item.paymentEvidence || []) {
      if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) fail(`${label}: payment evidence entries must be objects`);
      else if (evidence.url !== undefined && !https(evidence.url)) fail(`${label}: payment evidence URL must be HTTPS`);
    }
    for (const source of item.verificationSources || []) {
      if (!source || !https(source.url)) fail(`${label}: each verification source needs an HTTPS URL`);
      if (typeof source?.checkedFor !== "string" || !source.checkedFor.trim()) {
        fail(`${label}: each verification source needs a checkedFor description`);
      }
    }
    if (item.status === "verified") {
      if (!https(item.officialUrl)) fail(`${label}: verified record needs an official HTTPS URL`);
      if (!(item.verificationSources || []).some((source) => https(source?.url) && typeof source?.checkedFor === "string" && source.checkedFor.trim())) {
        fail(`${label}: verified record needs a described HTTPS verification source`);
      }
      if (!item.reviewedAt || Number.isNaN(Date.parse(item.reviewedAt))) fail(`${label}: verified record needs a valid reviewedAt date`);
    }
    if (item.status !== "verified" && item.availability === "active") {
      fail(`${label}: only verified records may be marked active`);
    }
  }
  if (ids.size === registry.opportunities.length) pass(`registry parsed; ${ids.size} unique opportunity records`);
}

const html = await readFile("index.html", "utf8");
if (!html.includes('fetch("./data/opportunities.json"')) {
  fail("homepage must load the canonical data/opportunities.json registry");
}
if (!html.includes("applyOpportunityRegistry(data.opportunities)") || !html.includes("function syncDynamicCards(records)") || !html.includes("function makeDynamicCard(item)")) {
  fail("homepage must pass registry records into the opportunity-card renderer");
}
for (const item of registry.opportunities || []) {

}
const languageOptions = [...html.matchAll(/<option value="[^"]+">/g)].length;
if (languageOptions < 20) fail(`homepage has only ${languageOptions} language options; expected at least 20`);
else pass(`homepage exposes ${languageOptions} language options`);
if (!html.includes("qp-sidebar") || !html.includes("left:0;right:auto")) fail("desktop left sidebar positioning is missing");
else pass("desktop left sidebar positioning is present");
if (!html.includes(".navlinks{display:none!important}")) fail("duplicate mobile top navigation guard is missing");
else pass("mobile navigation guard is present");

for (const path of ["guide.html", "privacy.html", "terms.html", "manifest.webmanifest", "sw.js"]) {
  try { await readFile(path); pass(`${path} exists`); }
  catch { fail(`${path} is missing`); }
}

const editor = await readFile("admin/index.html", "utf8");
if (!editor.includes("../docs/SAFE_PUBLISHING.md")) fail("admin editor must link to the safe publishing guide");
else pass("admin editor links to safe publishing instructions");
if (!editor.includes('id="addRecord"') || !editor.includes('$("addRecord").onclick')) fail("admin editor must support creating new opportunity records");
else pass("admin editor supports dynamic opportunity creation");
for (const field of ["title","description","reward","depositRequired","minimumWithdrawal","eligibility","payoutMethod"]) {
  if (!editor.includes(`id="${field}"`) || !editor.includes(`"${field}"`)) fail(`admin editor is missing dynamic card field: ${field}`);
}

const submitWorkflow = await readFile(".github/workflows/submit-opportunity-registry.yml", "utf8");
for (const required of ["workflow_dispatch:", "permissions:", "contents: write", "pull-requests: write", "node scripts/validate-opportunity-registry.mjs", "node scripts/validate-site.mjs", "github.rest.pulls.create", "refs/heads/"]) {
  if (!submitWorkflow.includes(required)) fail(`submission workflow is missing required safeguard: ${required}`);
}
if (submitWorkflow.includes("secrets.GH_PAT") || submitWorkflow.includes("PERSONAL_ACCESS_TOKEN")) fail("submission workflow must not require a personal access token");
else pass("submission workflow uses no personal access token");

if (process.exitCode) process.exit(process.exitCode);
console.log("QuestPulse quality checks completed.");
