# TLCE Master Data Model — Shared Core and QuestPulse Branch

**Status:** Design baseline; not a database migration.
**Architecture:** Modular Monolith.
**Parent:** THE LAST COSMIC EXPLOSION (TLCE).
**Branch:** QuestPulse (Q.P), an internal product branch only.

## 1. Non-negotiable ownership

TLCE Core owns identity, authorization, canonical content IDs, branch registry, social graph, moderation, notifications, localization, and audit policy. Q.P owns its domain-specific offer/reward records and presentation, but not a separate user account system or social tables. All social actions against Q.P content are stored in the parent Social Engine and scoped with `branch_id = 'questpulse'`.

No Q.P-specific login, duplicated user table, independent social graph, or parallel notification service is permitted.

## 2. Logical entities

### Identity and tenancy
- `users`: canonical account ID, normalized email/credential reference, account state, created/updated timestamps. Authentication secrets are never exposed to branch services.
- `profiles`: public display name, avatar reference, locale, timezone, privacy settings.
- `roles`, `permissions`, `user_role_assignments`: parent-managed RBAC.
- `branches`: stable branch key, display name, lifecycle state, policy version.
- `branch_memberships`: user ID, branch ID, branch-specific role/status only when needed. Membership does not create a second identity.

### Content
- `content_items`: canonical target ID, branch ID, content type, owner ID, visibility, moderation state, publication timestamps, soft-delete state.
- `qp_offers`: Q.P domain extension keyed by the same canonical content ID; offer category, reward details, eligible regions, source reference, terms, expiry, verification state.
- `content_media`: parent-owned media metadata and storage reference; private/unreviewed media is never publicly served.

### Social Engine (parent-owned)
- `reactions`: ID, actor ID, target type/ID, reaction type, created timestamp. Unique key: actor + target + reaction type.
- `comments`: ID, target type/ID, author ID, optional parent comment ID, body, moderation state, created/updated/deleted timestamps. MVP allows a single reply level.
- `share_events`: ID, actor ID, target type/ID, channel, confirmation type, dedupe key, timestamp. A share-sheet launch is not a completed share.
- `content_reports`: reporter, target, reason, details, state, reviewer, timestamps.
- `moderation_actions`: moderator, target, action, reason, immutable audit timestamp.
- `social_counters`: optional derived/cache projection only. It is never the source of truth and must be rebuildable from event/transaction records.

### Notifications and events
- `notifications`: recipient, event type, target reference, read state, created timestamp, delivery metadata.
- `outbox_events`: event ID, aggregate/target, branch ID, event type, schema version, minimal payload, created/published timestamps, retry state. Write in the same transaction as the mutation.
- `audit_log`: security- and moderation-relevant action metadata, actor, target, timestamp, request ID.

## 3. Keys, constraints, and integrity

- Use opaque stable IDs (UUID/ULID) generated server-side.
- Every branch-owned content record references one canonical `content_items.id`; no client may choose or override actor ID.
- Every social target lookup checks canonical content existence, branch, visibility, and moderation state before mutation or read.
- Unique reaction constraint prevents duplicate likes under concurrent retries.
- Foreign keys and cascade/retention rules must be explicitly chosen in the parent migration; prefer soft deletion for user content and preserve required moderation/audit evidence.
- Store timestamps in UTC; localize only at presentation.
- Counters are computed server-side; never accept client-submitted counts.
- Use transaction + outbox for each state change that emits a domain event.

## 4. Suggested SQL shape (illustrative, database-neutral)

```sql
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP NOT NULL,
  UNIQUE(actor_id, target_type, target_id, reaction_type)
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_comment_id TEXT NULL REFERENCES comments(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  deleted_at TIMESTAMP NULL
);

CREATE TABLE share_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  confirmation_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(dedupe_key)
);
```

These examples intentionally omit vendor-specific types, foreign-key targets, partitioning, and retention jobs until the actual TLCE database engine and existing conventions are inspected.

## 5. Branch boundary

Q.P may define offer-specific fields and domain events, but must call parent contracts for:
- current actor and session;
- authorization and branch access;
- canonical content ID resolution;
- reaction/comment/share mutations and summaries;
- reports, moderation decisions, and notifications.

## 6. Migration gates

Do not generate or run migrations until the parent repository, existing schema, database engine, naming conventions, and deployment topology are confirmed. The Q.P SQLite schema is a separate prototype scaffold and is not authoritative for TLCE Core.
