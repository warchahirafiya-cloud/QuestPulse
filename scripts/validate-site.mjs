import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "guide.html",
  "privacy.html",
  "terms.html",
  "404.html",
  "robots.txt",
  "sitemap.xml",
  "admin/index.html",
  "admin/README.md",
  "data/opportunities.json",
  "manifest.webmanifest",
  "sw.js"
];
const errors = [];

for (const path of requiredFiles) {
  try { await access(new URL("../" + path, import.meta.url)); }
  catch { errors.push("Required project file is missing: " + path); }
}

const [home, guide, privacy, terms, notFound, robots, sitemap, admin, registryText] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../guide.html", import.meta.url), "utf8"),
  readFile(new URL("../privacy.html", import.meta.url), "utf8"),
  readFile(new URL("../terms.html", import.meta.url), "utf8"),
  readFile(new URL("../404.html", import.meta.url), "utf8"),
  readFile(new URL("../robots.txt", import.meta.url), "utf8"),
  readFile(new URL("../sitemap.xml", import.meta.url), "utf8"),
  readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/opportunities.json", import.meta.url), "utf8")
]);

if (!home.includes('href="./guide.html"')) errors.push("Main navigation must link to guide.html.");
for (const [name, page] of [["privacy", privacy], ["terms", terms]]) {
  if (!page.includes("<title>QuestPulse")) errors.push(name + " page is missing a QuestPulse title.");
  if (!page.includes("lang=\"ar\"")) errors.push(name + " page must declare its language.");
  if (!home.includes('href="./' + name + '.html"')) errors.push("Main footer must link to " + name + ".html.");
}
for (const key of ["navGuide"]) {
  if (!home.includes(key)) errors.push("Main page is missing the guide translation key: " + key);
}
for (const lang of ["ar", "en", "fr"]) {
  if (!guide.includes(lang + ":")) errors.push("Guide is missing language support: " + lang);
}
if (!notFound.includes("<title>404 | QuestPulse</title>")) errors.push("Custom 404 page is missing its title.");
if (!robots.includes("Disallow: /admin/")) errors.push("robots.txt must exclude the editorial console from crawling.");
if (!sitemap.includes("<urlset") || !sitemap.includes("guide.html") || !sitemap.includes("privacy.html") || !sitemap.includes("terms.html")) errors.push("sitemap.xml is missing public pages.");
if (!home.includes('property="og:title"') || !home.includes('name="twitter:card"')) errors.push("Homepage social sharing metadata is incomplete.");
for (const id of ["searchInput", "typeFilter", "statusFilter", "sortFilter", "clearFilters", "emptyClear", "resultCount"]) {
  if (!home.includes('id="' + id + '"')) errors.push("Homepage is missing the mobile discovery control: " + id);
}
for (const key of ["allStatuses", "sortRecommended", "sortNewest", "sortName", "clearFilters", "resultsLabel"]) {
  if (!home.includes(key)) errors.push("Homepage is missing a discovery filter translation: " + key);
}
for (const key of ["withdrawalTermsLabel", "resetIntervalLabel", "paymentEvidenceLabel", "riskNotesLabel", "detailDisclaimer"]) { if (!home.includes(key)) errors.push("Opportunity detail presentation is missing translation: " + key); }
if ((home.match(/class="opp-detail-grid"/g) || []).length !== 5) errors.push("Each opportunity category must include a structured detail grid.");
for (const key of ["withdrawalTerms", "resetInterval", "paymentEvidenceSummary", "riskNotes"]) if (!home.includes('data-detail="' + key + '"')) errors.push("Opportunity detail field is missing: " + key);
if (!admin.includes('name="robots" content="noindex,nofollow"')) {
  errors.push("Editorial console must retain its noindex directive.");
}
if (admin.includes("github_pat_") || admin.includes("ghp_")) {
  errors.push("A possible GitHub token pattern was found in the admin page.");
}

let registry;
try { registry = JSON.parse(registryText); }
catch { errors.push("Opportunity registry is not valid JSON."); }
if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.opportunities)) {
  errors.push("Opportunity registry has an invalid root schema.");
}
if (Array.isArray(registry?.opportunities)) {
  for (const item of registry.opportunities) {
    if (item.status === "verified" && (!item.officialUrl || !item.reviewedAt || !item.verificationSources?.length)) {
      errors.push("A verified record is missing required review evidence: " + item.id);
    }
  }
}

if (errors.length) {
  console.error("QuestPulse site validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}
console.log("QuestPulse site structure OK: required pages, policy links, guide language support, admin safety marker and registry checked.");
