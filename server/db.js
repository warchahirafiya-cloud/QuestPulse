import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const filename = path.resolve(process.env.DATABASE_PATH || "./server/data/questpulse.sqlite");
mkdirSync(path.dirname(filename), { recursive: true });
export const db = new Database(filename);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK(account_type IN ('individual','legal_entity','store','company')),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'publisher' CHECK(role IN ('publisher','admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  publisher_type TEXT NOT NULL,
  publisher_name TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK(post_type IN ('opportunity','direct_reward','new_product')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  website TEXT,
  offer_url TEXT,
  countries TEXT NOT NULL,
  expires_at TEXT,
  reward_value TEXT,
  product_price TEXT,
  disclosure TEXT NOT NULL CHECK(disclosure IN ('no','referral','sponsored')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','under_review','changes_requested','published','rejected','paused','expired')),
  moderation_note TEXT,
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_public_idx ON posts(status, post_type, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('image','video')),
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS media_post_idx ON media(post_id);
`);