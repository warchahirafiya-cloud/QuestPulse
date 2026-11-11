import { z } from "zod";

const httpsUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Links must be valid HTTPS URLs without embedded credentials.");

const isoDate = z.string().optional().default("").refine(value => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Expiry must be a real calendar date in YYYY-MM-DD format.");

export const postSchema = z.object({
  publisherName: z.string().trim().min(2).max(100),
  postType: z.enum(["opportunity", "direct_reward", "new_product"]),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(3000),
  website: httpsUrl.optional().default(""),
  offerUrl: httpsUrl.optional().default(""),
  countries: z.string().trim().min(2).max(300),
  expiresAt: isoDate,
  rewardValue: z.string().trim().max(100).optional().default(""),
  productPrice: z.string().trim().max(80).optional().default(""),
  disclosure: z.enum(["no", "referral", "sponsored"])
}).strict();

export const accountSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  accountType: z.enum(["individual", "legal_entity", "store", "company"]),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128)
});
