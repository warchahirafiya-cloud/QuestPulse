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
  const statuses = new Set(["unverified", "under_review", "verified", "paused", "expired"]);
  const availability = new Set(["active", "paused", "expired", "unknown"]);
  const riskLevels = new Set(["low", "medium", "high", "unrated"]);

  for (const [index, item] of registry.opportunities.entries()) {
    const label = item.id || `record #${index + 1}`;
    if (!item.id || typeof item.id !== "string") fail(`${label}: missing string id`);
    else if (ids.has(item.id)) fail(`${label}: duplicate id`);
    else ids.add(item.id);

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
    for (const source of item.verificationSources || []) {
      if (!source || !https(source.url)) fail(`${label}: each verification source needs an HTTPS URL`);
    }
    if (item.status === "verified") {
      if (!https(item.officialUrl)) fail(`${label}: verified record needs an official HTTPS URL`);
      if (!(item.verificationSources || []).some((source) => https(source?.url))) fail(`${label}: verified record needs an HTTPS verification source`);
      if (!item.reviewedAt || Number.isNaN(Date.parse(item.reviewedAt))) fail(`${label}: verified record needs a valid reviewedAt date`);
    }
    if (item.status !== "verified" && item.availability === "active") {
      fail(`${label}: only verified records may be marked active`);
    }
  }
  if (ids.size === registry.opportunities.length) pass(`registry parsed; ${ids.size} unique opportunity records`);
}

const html = await readFile("index.html", "utf8");
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

if (process.exitCode) process.exit(process.exitCode);
console.log("QuestPulse quality checks completed.");
