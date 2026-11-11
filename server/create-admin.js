import "dotenv/config";
import { db } from "./db.js";
import { hashPassword, newId } from "./auth.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_DISPLAY_NAME || "QuestPulse Admin";
if (!email || !password || password.length < 16) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters).");
  process.exit(1);
}
if (db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin'").get().count > 0) {
  console.error("An admin already exists. Bootstrap is disabled to prevent accidental privilege escalation.");
  process.exit(1);
}
const id = newId();
const passwordHash = await hashPassword(password);
db.prepare("INSERT INTO users (id,display_name,account_type,email,password_hash,role,status,created_at) VALUES (?,?,?,?,?,'admin','active',?)")
  .run(id, displayName, "legal_entity", email, passwordHash, new Date().toISOString());
console.log("Initial administrator created:", email);
