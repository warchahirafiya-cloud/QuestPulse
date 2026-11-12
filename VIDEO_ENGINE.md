# QuestPulse Video Engine — Implementation Blueprint

## Status

- Phase: repository audit and integration design
- Target branch: `feature/questpulse-video-engine`
- Production branch: `main` (unchanged)
- Budget: zero; no paid API, hosting, storage, or model service may be enabled
- Publishing: manual approval only; no automatic social publishing

## Existing repository constraints

QuestPulse is currently a static GitHub Pages site with a separate Node.js 22 + SQLite API scaffold under `server/`. GitHub Pages cannot execute the API or a Python/FFmpeg video worker. The API scaffold is not a confirmed production deployment. The active site's editorial scope is non-cryptocurrency rewards and digital earning opportunities; historical crypto material remains archived and must not be pulled into active video generation.

## Target architecture

1. **QuestPulse content adapter (Node.js API):** accept an administrator-selected, already-reviewed QuestPulse opportunity and create a video job. Do not automatically convert unreviewed feed candidates into claims or videos.
2. **Persistent job queue (SQLite):** store job ID, source reference, approved title/script, language, aspect ratio, status, timestamps, and safe error summaries. Use explicit states: queued, processing, completed, failed, cancelled.
3. **Isolated video worker (Python):** run MoneyPrinterTurbo outside GitHub Pages. The worker claims jobs through an authenticated internal API, generates the video, and reports a result. Never expose worker credentials in browser code or commit them to Git.
4. **Artifact storage:** initially use a local worker output directory for development. Production artifact storage must not be enabled until a genuinely free, persistent option and its limits are verified. Cloudflare R2 remains subject to the existing no-extra-spending rule.
5. **Studio UI:** an administrator-only interface to create jobs from reviewed content, view progress, preview/download completed output, and retry failures.
6. **Human approval:** generated videos remain drafts. No video is published or uploaded to social platforms without a separate explicit approval step.

## Free-first generation profile

- Prefer Edge TTS where supported; it does not require an API key.
- Prefer locally available FFmpeg and licensed/local stock assets.
- Do not silently select paid LLM, TTS, image, or video providers.
- A cloud model/API is disabled unless its cost is confirmed as zero and the user approves its use.
- Do not assume bundled background music is copyright-cleared. Use only assets with verified reuse rights or user-provided assets.

## Security requirements

- Administrator authorization for studio/job creation and job administration.
- Separate worker authentication using a server-side secret; never place it in HTML, JavaScript bundles, logs, or repository files.
- Validate all request fields, limit script/title lengths, rate-limit job creation, and restrict worker callbacks to known job IDs and valid state transitions.
- Never accept arbitrary output filesystem paths from a browser.
- Keep generated media private until an administrator approves it.
- Do not modify existing publisher authentication, moderation, domain-hunter, offer catalogue, or Cloudflare configuration as part of the video feature.

## Delivery milestones

### M0 — Audit and design
- [x] Confirm repository, default branch, and available GitHub write permissions.
- [x] Inspect current site/API structure and identify the GitHub Pages execution boundary.
- [x] Create an isolated feature branch.
- [x] Record architecture, scope, cost, security, and approval constraints.

### M1 — Secure job queue
- [x] Add SQLite job schema and migration-safe initialization.
- [x] Add administrator-only job creation/list/detail/cancel/retry endpoints.
- [x] Add authenticated worker claim and completion/failure endpoints.
- [x] Add validation and state-transition tests.
- [ ] Confirm CI passes on the feature branch.

### M2 — Worker adapter
- [ ] Add a Python worker adapter for MoneyPrinterTurbo.
- [ ] Document local setup and environment variables without committing secrets.
- [ ] Confirm a full local test render using free/local components.

### M3 — Studio interface
- [ ] Add administrator-only job creation and status UI.
- [ ] Add preview/download only after output storage is safely connected.
- [ ] Keep all generated content in draft state.

### M4 — Deployment decision
- [ ] Verify an actually free persistent runtime for the API/worker, or keep the worker local.
- [ ] Verify storage quota and retention before enabling uploads.
- [ ] Obtain explicit approval before any service that can incur charges is enabled.
- [ ] Deploy only after security checks and end-to-end tests pass.


## M1 implementation notes

The feature branch now includes a persistent SQLite `video_jobs` queue and the API routes below:

- `POST /api/admin/video-jobs` — admin creates a job from a published QuestPulse post only.
- `GET /api/admin/video-jobs` and `GET /api/admin/video-jobs/:id` — admin list/detail.
- `POST /api/admin/video-jobs/:id/cancel` and `POST /api/admin/video-jobs/:id/retry` — controlled state changes.
- `POST /api/admin/video-jobs/worker/claim` — worker claims the oldest queued job.
- `POST /api/admin/video-jobs/worker/result` — worker reports completion/failure.

Worker requests require a server-side `VIDEO_WORKER_TOKEN` of at least 32 characters, sent as a Bearer token. No token is stored in the repository. Completed results accept only a job-scoped UUID artifact key; arbitrary filesystem paths are rejected. Artifact delivery and preview are intentionally not exposed until storage is implemented.

The API supports Arabic/English output metadata and 9:16 / 16:9 formats. The current work creates and manages jobs; it does not yet render a video. MoneyPrinterTurbo worker execution remains M2.

## Current limitations

A GitHub repository connection permits repository changes; it does not itself provide a running Python host, FFmpeg runtime, persistent worker, or video storage. Therefore, this branch is groundwork only: no live video generation or public publishing is claimed until M1–M4 are implemented and tested.
