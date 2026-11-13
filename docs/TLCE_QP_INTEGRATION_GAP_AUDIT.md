# QuestPulse ↔ TLCE Integration Gap Audit

**Status:** Repository inspection report; documentation only.
**Inspected repository:** `warchahirafiya-cloud/QuestPulse`
**Inspected branch:** default branch at time of inspection.
**Scope:** Existing publisher API scaffold versus the proposed TLCE shared-core architecture.
**Important:** This is a source-level review, not a production penetration test or a verification of a deployed service.

## 1. Executive finding

QuestPulse already contains a Node.js/Express + SQLite API scaffold for publisher registration, sessions, pending post submissions, media validation, and administrator review.

That scaffold is a Q.P prototype. It is not the TLCE parent core, and it does not implement the shared Social Engine. Its local identity, session, post, and media tables must not be copied into TLCE as parallel authoritative systems.

The correct integration direction is to adapt the Q.P domain into TLCE-owned identity, authorization, canonical content, media, moderation, and social contracts.

## 2. Existing implementation verified in source

The following files were inspected:

- `server/app.js`
- `server/db.js`
- `server/auth.js`
- `server/security.js`
- `server/validation.js`
- `server/create-admin.js`
- `server/tests/security.test.js`
- `server/tests/validation.test.js`
- `API_PHASE_2.md`
- `package.json`

The source currently provides:

- Publisher registration with pending activation.
- Password hashing using bcrypt and server-side opaque session tokens stored as hashes.
- Cookie-based session handling and same-origin checks for write requests.
- Publisher post submission into a pending moderation state.
- Three post types: `opportunity`, `direct_reward`, and `new_product`.
- Local SQLite persistence and local-disk media storage.
- MIME allowlisting plus file-signature checks for supported image/video formats.
- Administrator endpoints for activating/suspending publisher accounts and reviewing submissions.
- Validation and security unit tests.

These are useful prototype capabilities, but they do not establish a production deployment or a connection to TLCE.

## 3. Ownership and migration map

| Current Q.P prototype concept | Target TLCE owner | Integration treatment |
|---|---|---|
| `users` | TLCE Identity | Replace Q.P login/account authority with the canonical TLCE actor. Preserve publisher profile/business attributes only as approved profile or branch metadata. |
| `sessions` and `qp_session` | TLCE Identity / session layer | Do not create a second Q.P session system after integration. |
| `posts` | TLCE Content Registry + Q.P domain extension | Map each eligible Q.P post to a canonical TLCE content ID and retain offer-specific fields in the Q.P domain. |
| `media` and local uploads | TLCE Media | Move behind the parent media contract and storage policy; do not assume local disk is suitable for multi-instance production. |
| Admin review endpoints | TLCE Authorization + Moderation | Map to parent roles, branch/object scope, reason codes, and immutable audit trail. |
| Likes, comments, shares | TLCE Social Engine | Not present in the inspected Q.P API; implement once in the parent core, not in Q.P. |
| Notifications | TLCE Notifications | Not present as a shared implementation in this scaffold; consume parent events after integration. |

No data migration should be designed until the real TLCE schema and identity/content contracts are inspected.

## 4. Integration blockers and technical risks

### Blocker A — Parent source is still unidentified

The connected GitHub workspace exposes the QuestPulse repository, but the TLCE parent repository has not yet been identified. Therefore the proposed target architecture cannot yet be mapped to real parent source paths, framework conventions, database schema, authentication, event processing, or deployment.

**Required next action:** identify the actual TLCE repository or provide its source archive. Do not infer the parent structure from this Q.P prototype.

### Blocker B — Separate Q.P identity currently exists in the prototype

The current API registers Q.P publisher accounts, stores password hashes, creates Q.P sessions, and issues a `qp_session` cookie. This is acceptable as a standalone prototype boundary, but it conflicts with the final product rule that Q.P is an internal TLCE branch with one identity.

**Required integration:** use the parent actor/session and parent authorization; retain only publisher-specific profile or business metadata where approved. Do not run both identity systems as co-equal authorities.

### Blocker C — Q.P content is not yet represented as canonical parent content

The current `posts` table uses local IDs and local ownership. The Social Engine design requires every social target to resolve through the parent canonical content registry and carry the Q.P branch scope.

**Required integration:** create a parent content item for each accepted Q.P publication and maintain a server-controlled mapping to Q.P offer-domain data. Never accept a client-supplied actor or canonical target mapping.

### Blocker D — Prototype hosting assumptions

The API documentation explicitly describes local SQLite and local-disk uploads for a single-instance deployment. GitHub Pages cannot execute this API. Multi-instance operation, persistent storage, backups, and production deployment remain separate concerns.

**Required integration:** inspect TLCE hosting and storage first. Do not deploy this scaffold or connect the public form as part of the documentation phase.

### Additional production gaps documented by the project

The API setup document lists missing email verification, password reset, legal-entity ownership verification, malware scanning, media transcoding, backup/restore automation, audit-log UI, and multi-instance object storage. These gaps must be addressed according to the eventual parent architecture before public activation.

The current rate-limit middleware is configured in the API process; deployment review must determine whether limits need a shared store if the service ever runs across multiple instances.

## 5. Social Engine status

The inspected Q.P API does not expose implemented reaction, comment, share, report, or social-notification endpoints. The TLCE social files remain proposed specifications.

The intended contract remains:

- Parent-owned reactions with idempotent writes and server-derived counts.
- Parent-owned comments with bounded reply depth, safe rendering, reporting, and moderation.
- Shares recorded only after explicit copy-link action or successful native-share completion.
- Parent authorization and canonical content resolution on every operation.
- Transactional outbox events consumed by the shared notification service.
- Branch scoping so Q.P cannot access another branch's private content.

No social migrations, live social routes, frontend controls, or deployment have been created by this audit.

## 6. Recommended execution order

1. Locate and inspect the actual TLCE parent repository.
2. Produce a source-path map for identity, authorization, content, media, moderation, notifications, database, events, tests, and deployment.
3. Decide how the Q.P publisher prototype is retained, adapted, or retired under parent identity. Do not migrate its account/session tables as-is.
4. Approve canonical content mapping and Q.P domain extension against the real parent schema.
5. Implement the Social Engine once in TLCE Core, including migrations, API, outbox, audit, abuse controls, and tests.
6. Connect Q.P through a branch adapter and parent contracts.
7. Add the Q.P like/comment/share UI only after the parent API is implemented and available in a controlled environment.
8. Run security, authorization, concurrency, privacy, accessibility, and end-to-end tests before any separately approved release.

## 7. Change boundary

This report adds documentation only. It does not change Q.P runtime source, database files, account records, `app.asar`, deployment configuration, external services, or paid infrastructure.

**Architecture rule:** one central engine, multiple branches, one identity.
