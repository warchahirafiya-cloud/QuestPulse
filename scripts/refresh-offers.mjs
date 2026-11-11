import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../data/offers.json", import.meta.url);
const offers = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(offers)) throw new Error("data/offers.json must contain an array.");

const now = new Date();
let changed = 0;
for (const offer of offers) {
  if (!offer || typeof offer !== "object") continue;
  if (offer.status === "published" && offer.expiresAt) {
    const expiry = new Date(offer.expiresAt);
    if (!Number.isNaN(expiry.valueOf()) && expiry < now) {
      offer.status = "expired";
      offer.statusReason = "Automatically expired after the published end date.";
      changed++;
    }
  }
}
await writeFile(file, JSON.stringify(offers, null, 2) + "\n");
console.log(`Offer maintenance complete. Expired: ${changed}. Total records: ${offers.length}.`);
