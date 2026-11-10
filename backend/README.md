# QuestPulse API (read-only foundation)

This folder contains the first backend service for QuestPulse, implemented as a Cloudflare Worker with a D1 (SQLite) database.

## Included

- `GET /api/health` — service health check.
- `GET /api/opportunities` — paginated informational registry, optionally filtered by `type` and `status`.
- `GET /api/opportunities/:id` — one public record.
- CORS, JSON responses, bounded pagination, fixed filter allowlists, and generic server-error responses.
- D1 migrations with the five existing category placeholders, all marked `paused` to match the public registry safety hold.

## Deliberate safety boundary

This initial API is read-only. It does not provide public create/update/delete routes, user accounts, wallet connections, payment processing, referral tracking, token transactions, or an admin publishing endpoint. Do not add those features until the project's legal and security reviews explicitly authorize them. Never store wallet secrets, seed phrases, private keys, passwords, or exchange credentials.

The existing GitHub Pages site remains a static frontend. This Worker is a separate API service and does not replace the current website hosting.

## Deploy setup (requires the project owner's Cloudflare account)

1. Install Node.js and Wrangler: `npm install --global wrangler`.
2. Authenticate: `wrangler login`.
3. Create the database: `wrangler d1 create questpulse`.
4. Copy the returned database ID into `backend/wrangler.toml` in place of `REPLACE_WITH_D1_DATABASE_ID`.
5. From this directory, run `wrangler d1 migrations apply questpulse --remote`. This applies both migrations: the initial schema/seed and the follow-up migration that aligns existing placeholder rows to `paused`.
6. Deploy with `wrangler deploy`.
7. Test `https://<worker-subdomain>.workers.dev/api/health` and `/api/opportunities`.
8. Set `ALLOWED_ORIGIN` to the exact production website origin before launch. The current example value is `https://getquestpulse.com`; verify the actual custom domain or GitHub Pages origin before deployment. Keep the Worker URL and website origin documented; do not put secrets in frontend files.

## Local development

From this directory:

```sh
npx wrangler d1 migrations apply questpulse --local
npx wrangler dev
```

The D1 binding is configured in `wrangler.toml`. The database ID must be filled before remote deployment.

## API examples

```http
GET /api/health
GET /api/opportunities?limit=20&offset=0
GET /api/opportunities?type=telegram&status=unverified
GET /api/opportunities/telegram-bots
```

Unsupported methods return `405`. Unknown records return `404`. Invalid filter values return `400`. A missing database binding returns `503`. Malformed pagination values return `400`; limits are clamped to 1–100. All five existing placeholder records are paused by the migrations and must remain paused until the project's written legal and operational review authorizes a policy change.

## Frontend integration

The current site continues to load its published registry from `/data/opportunities.json`. Integrating this API into the public cards should be a separate, tested change after the Worker has been deployed, the D1 migrations have been applied, and its production URL and exact allowed website origin are confirmed. Until then, the static site remains unaffected.
