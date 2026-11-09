import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "guide.html",
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

const [home, guide, admin, registryText] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../guide.html", import.meta.url), "utf8"),
  readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../data/opportunities.json", import.meta.url), "utf8")
]);

if (!home.includes('href="./guide.html"')) errors.push("Main navigation must link to guide.html.");
for (const key of ["navGuide"]) {
  if (!home.includes(key)) errors.push("Main page is missing the guide translation key: " + key);
}
for (const lang of ["ar", "en", "fr"]) {
  if (!guide.includes(lang + ":")) errors.push("Guide is missing language support: " + lang);
}
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
console.log("QuestPulse site structure OK: required pages, navigation, language support, admin safety marker and registry checked.");
