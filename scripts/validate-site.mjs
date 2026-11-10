import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "archive.html",
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

const [home, archive, guide, privacy, terms, notFound, robots, sitemap, admin, registryText] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../archive.html", import.meta.url), "utf8"),
  readFile(new URL("../guide.html", import.meta.url), "utf8"),
  readFile(new URL("../privacy.html", import.meta.url), "utf8"),
  readFile(new URL("../terms.html", import.meta.url), "utf8"),
  readFile(new URL("../404.html", import.meta.url), "utf8"),
  readFile(new URL("../robots.txt", import.meta.url), "utf8"),
  readFile(new URL("../sitemap.xml", import.meta.url), "utf8"),
  readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/opportunities.json", import.meta.url), "utf8")
]);

if (!archive.includes("<h1>الأرشيف التاريخي للمشروع</h1>")) errors.push("Historical archive page is missing its title.");
for (const category of ["Airdrop", "Telegram", "التطبيقات والنقر والتعدين", "المهام والمكافآت", "برامج الإحالة"]) {
  if (!archive.includes(category)) errors.push("Historical archive is missing category: " + category);
}
for (const rule of ["لا يوجد حظر جغرافي", "غير معلوم", "قراءة", "لا تُستعاد روابط"]) {
  if (!archive.includes(rule)) errors.push("Historical archive is missing global-access/read-only safeguard: " + rule);
}
if (!archive.includes("commits/main/data/opportunities.json")) errors.push("Historical archive must link to the version history of the opportunity registry.");
if (!home.includes('href="./archive.html"')) errors.push("Homepage sidebar must link to the historical archive.");
if (!home.includes('href="./guide.html"')) errors.push("Main navigation must link to guide.html.");
if (!home.includes('<a class="brand" href="#home">Quest<span>Pulse</span></a>')) {
  errors.push("Homepage header must keep the QuestPulse logo as its brand link.");
}
for (const id of ["qpSidebar", "qpMenuToggle", "qpSidebarBackdrop"]) {
  if (!home.includes('id="' + id + '"')) errors.push("Homepage is missing its sidebar navigation element: " + id);
}
if (!home.includes('class="qp-sidebar-tools"><div class="navtools"')) {
  errors.push("Language and utility controls must be placed inside the left sidebar.");
}
if (!home.includes("header .navtools{display:none!important}") ||
    !home.includes(".qp-sidebar-tools .navtools{display:flex!important")) {
  errors.push("Utility controls must be hidden from the header and visible inside the sidebar.");
}
if (!home.includes(".qp-sidebar{left:0") ||
    !home.includes("main.wrap{margin-left:calc(var(--qp-sidebar)") ||
    !home.includes(".qp-sidebar{display:flex!important;position:fixed")) {
  errors.push("Sidebar must stay on the physical left and the main content must reserve its width on desktop.");
}
if (!home.includes(".qp-sidebar.is-open{transform:translateX(0)!important}") ||
    !home.includes(".qp-sidebar-backdrop[hidden]{display:none}")) {
  errors.push("Mobile sidebar must support open/close states and a dismissible backdrop.");
}
if (!home.includes("function closeMenu()") || !home.includes("function openMenu()")) {
  errors.push("Mobile sidebar toggle must provide open and close handlers.");
}

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
if (!sitemap.includes("https://getquestpulse.com/") || sitemap.includes("warchahirafiya-cloud.github.io")) errors.push("sitemap.xml must use the configured custom domain.");
if (!robots.includes("Sitemap: https://getquestpulse.com/sitemap.xml")) errors.push("robots.txt must advertise the custom-domain sitemap.");
for (const [path, page, canonical] of [
  ["homepage", home, "https://getquestpulse.com/"],
  ["guide", guide, "https://getquestpulse.com/guide.html"],
  ["privacy", privacy, "https://getquestpulse.com/privacy.html"],
  ["terms", terms, "https://getquestpulse.com/terms.html"]
]) {
  if (!page.includes('<link rel="canonical" href="' + canonical + '">')) errors.push(path + " page is missing its custom-domain canonical URL.");
}
if (!home.includes('property="og:title"') || !home.includes('name="twitter:card"')) errors.push("Homepage social sharing metadata is incomplete.");
for (const id of ["searchInput", "typeFilter", "statusFilter", "sortFilter", "clearFilters", "emptyClear", "resultCount"]) {
  if (!home.includes('id="' + id + '"')) errors.push("Homepage is missing the mobile discovery control: " + id);
}
const languageSelectStart = home.indexOf('<select class="lang" id="language"');
const languageSelectEnd = home.indexOf("</select>", languageSelectStart);
const languageSelectMarkup = languageSelectStart >= 0 && languageSelectEnd >= 0 ? home.slice(languageSelectStart, languageSelectEnd) : "";
const homepageLanguageCodes = [...languageSelectMarkup.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
if (new Set(homepageLanguageCodes).size < 20) errors.push("Homepage must offer at least 20 unique language options.");
if (!home.includes("translate.google.com/translate_a/element.js") || !home.includes("googleTranslateElementInit")) errors.push("Homepage automatic translation integration is missing.");
for (const key of ["allStatuses", "sortRecommended", "sortNewest", "sortName", "clearFilters", "resultsLabel"]) {
  if (!home.includes(key)) errors.push("Homepage is missing a discovery filter translation: " + key);
}
for (const key of ["withdrawalTermsLabel", "resetIntervalLabel", "paymentEvidenceLabel", "riskNotesLabel", "detailDisclaimer"]) { if (!home.includes(key)) errors.push("Opportunity detail presentation is missing translation: " + key); }
if ((home.match(/class="opp-detail-grid"/g) || []).length !== 5) errors.push("Each opportunity category must include a structured detail grid.");
for (const key of ["withdrawalTerms", "resetInterval", "paymentEvidenceSummary", "riskNotes"]) if (!home.includes('data-detail="' + key + '"')) errors.push("Opportunity detail field is missing: " + key);
if (!admin.includes('name="robots" content="noindex,nofollow"')) {
  errors.push("Editorial console must retain its noindex directive.");
}
if (!admin.includes('const allowedTypes=["airdrop","telegram","clicktime","tasks","referral"];')) {
  errors.push("Editorial console must define every supported opportunity type before validating records.");
}
if (!admin.includes("allowedTypes.includes(r.type)")) {
  errors.push("Editorial console must validate opportunity types against its supported type list.");
}
if (!admin.includes("const errors=validate(data);")) {
  errors.push("Editorial console must validate imported and loaded registry data.");
}
for (const id of ["recordSearch", "restoreDraft", "clearDraft"]) {
  if (!admin.includes('id="' + id + '" ') && !admin.includes('id="' + id + '"')) errors.push("Editorial console is missing draft/search control: " + id);
}
for (const feature of ["questpulse-editor-draft-v1", "function persistDraft()", "localStorage.setItem", "localStorage.removeItem"]) {
  if (!admin.includes(feature)) errors.push("Editorial console is missing local draft feature: " + feature);
}
if (admin.includes("github_pat_") || admin.includes("ghp_")) {
  errors.push("A possible GitHub token pattern was found in the admin page.");
}
for (const field of ["withdrawalTerms","resetInterval","paymentEvidenceSummary","riskNotes"]) {
  if (!admin.includes('id="' + field + '"')) errors.push("Editorial console is missing opportunity field: " + field);
}
if (!admin.includes("local-only") && !admin.includes("local only")) errors.push("Editorial console must remain local-only.");
if (!admin.includes("preview") && !admin.includes("معاينة")) {
  // Preview is intentionally optional; the exported JSON remains the review artifact.
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
