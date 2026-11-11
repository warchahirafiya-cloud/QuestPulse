# QuestPulse API — Phase 2

This is a self-hosted Node.js API scaffold for the multi-publisher workflow. It is deliberately separate from the static GitHub Pages frontend. It does not use Cloudflare R2, paid SaaS, or automatic public publishing.

## What is implemented
- Publisher registration for individuals, legal entities, stores, and companies. New accounts start as `pending`; only an administrator can activate them.
- Password hashing with bcrypt, random opaque server-side sessions, hashed session tokens in SQLite, HttpOnly/SameSite cookies, and rate limits on login/registration.
- Publisher submissions enter the moderation queue as `pending`; they are never published automatically.
- Three fixed post types: `opportunity`, `direct_reward`, `new_product`.
- Admin moderation actions: approve, reject, request changes, pause; activate or suspend publisher accounts.
- HTTPS-only external links; media limits and MIME/signature checks; media is served only after its post is published.
- SQLite persistence and local-disk media storage for a single-instance deployment.

## Local setup
1. Install Node.js 22 or later.
2. Copy `.env.example` to `.env` and set a random `SESSION_SECRET` of at least 32 characters and the exact `APP_ORIGIN`.
3. Run `npm install`.
4. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 16 characters), and optionally `ADMIN_DISPLAY_NAME`; run `npm run create-admin` once.
5. Run `npm start`. Health check: `GET /api/health`.

## API endpoints
- `POST /api/auth/register` — create a pending publisher account.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `POST /api/posts` — authenticated multipart submission; field name for files is `media`.
- `GET /api/posts` — published posts only.
- `GET /api/admin/submissions?status=pending` — admin only.
- `PATCH /api/admin/posts/:id/review` — admin only; actions: `approve`, `reject`, `request_changes`, `pause`.
- `PATCH /api/admin/users/:id/activate` — admin only; status: `active` or `suspended`.
- `GET /api/media/:id` — published post media only.

## Important production gaps
This is a backend foundation, not yet a live public service. Do not connect the public form to it until deployment and security review are complete. Email verification, password reset, account ownership verification for legal entities, malware scanning, image/video transcoding, backup/restore automation, audit log UI, and multi-instance object storage are not implemented. Local SQLite and local disk uploads require persistent storage and a single server instance. Put the API behind HTTPS and a reverse proxy; configure the frontend and API to share one origin or implement a strict allowlist and CSRF strategy.

No hosting provider has been selected or charged. GitHub Pages cannot execute this API; a separate Node.js host is required before real accounts, submissions, or uploads can work.
