import { readFile, access } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const required = ["index.html","guide.html","link-check.html","account-safety.html","privacy.html","terms.html","archive.html","404.html","robots.txt","sitemap.xml","manifest.webmanifest","sw.js","offline.html","data/offers.json","data/inbox.json","data/sources.json","scripts/validate-offers.mjs","scripts/validate-inbox.mjs","scripts/refresh-offers.mjs","scripts/ingest-offer-feeds.mjs"];
const errors = [];
for (const path of required) {
  try { await access(new URL(path, root)); } catch { errors.push("Missing required page or project file: " + path); }
}
const pages = ["index.html","guide.html","account-safety.html","terms.html"];
for (const path of pages) {
  try {
    const content = await readFile(new URL(path, root), "utf8");
    if (!content.includes("<html") || !content.includes("</html>")) errors.push("Invalid HTML shell: " + path);
    if (/\b(airdrop|cryptocurrency|web3|wallet|tokenomics|blockchain|mining)\b|إيردروب|محفظة|عملات مشفرة|تعدين/i.test(content)) errors.push("Out-of-scope material remains in active page: " + path);
  } catch {}
}
const home = await readFile(new URL("index.html", root), "utf8");
for (const link of ["./guide.html","./link-check.html","./account-safety.html","./privacy.html","./terms.html","./archive.html"]) {
  if (!home.includes(link)) errors.push("Homepage is missing link: " + link);
}
for (const phrase of ["QuestPulse","الاستبيانات","المهام","منهجية المراجعة","كل الفرص العالمية","البحث الدقيق"]) {
  if (!home.includes(phrase)) errors.push("Homepage is missing expected rewards content: " + phrase);
}
const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
if (!manifest.name || !manifest.name.includes("Rewards")) errors.push("App manifest name is not aligned with rewards scope.");
if (errors.length) {
  console.error("QuestPulse validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exit(1);
}
console.log("QuestPulse validation passed: rewards homepage, required pages, navigation, manifest, and non-crypto scope checked.");
