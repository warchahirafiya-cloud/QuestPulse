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
let added = 0;
const failures = [];

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
function validHttps(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; }
  catch { return ""; }
}

for (const source of activeFeeds) {
  const feedUrl = validHttps(source.feedUrl);
  if (!feedUrl || new URL(feedUrl).hostname !== "meh.com") {
    failures.push(source.id + ": feed URL is not on the approved meh.com host.");
    continue;
  }
  try {
    const response = await fetch(feedUrl, {
      headers: { "user-agent": "QuestPulseOfferIndexer/1.0 (+https://getquestpulse.com)", "accept": "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error("Feed exceeded 2 MB safety limit.");
    const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match => match[1]);
    for (const block of items.slice(0, 30)) {
      const title = tag(block, "title");
      const description = tag(block, "description");
      const link = validHttps(tag(block, "link"));
      const guid = tag(block, "guid") || link || title;
      if (!title || !link) continue;
      const id = createHash("sha256").update(source.id + "|" + guid).digest("hex").slice(0, 20);
      if (existing.has(id)) continue;
      const pubDate = tag(block, "pubDate");
      const publishedAt = pubDate && Number.isFinite(Date.parse(pubDate)) ? new Date(pubDate).toISOString() : null;
      inbox.push({
        id,
        title: title.slice(0, 240),
        description: description.slice(0, 1200),
        url: link,
        source: "https://meh.com",
        sourceId: source.id,
        discoveredAt: new Date().toISOString(),
        publishedAt,
        status: "pending_review",
        reviewNote: "Discovery only. Confirm current availability, country eligibility, fees, terms, and redemption on the original retailer page before publication."
      });
      existing.add(id);
      added++;
    }
  } catch (error) {
    failures.push(source.id + ": " + error.message);
  }
}

await writeFile(inboxPath, JSON.stringify(inbox, null, 2) + "\n");
console.log("Feed discovery complete. New candidates: " + added + ". Total inbox records: " + inbox.length + ".");
for (const failure of failures) console.error("Feed warning: " + failure);
if (failures.length && added === 0) process.exitCode = 1;
