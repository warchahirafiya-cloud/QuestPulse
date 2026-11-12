# QuestPulse Video Runtime (local-first)

This runtime starts the Node API and Python worker in Docker. MoneyPrinterTurbo remains a separately managed service; the worker reaches it at `MPT_BASE_URL`. Nothing in this setup deploys to GitHub Pages, publishes to social networks, or enables paid hosting.

## Requirements

- Docker Engine with the Compose plugin (or Docker Desktop).
- A machine with enough CPU/RAM and free disk for FFmpeg video rendering. MoneyPrinterTurbo's current project guide recommends at least 4 CPU cores and 8 GB RAM for a comfortable deployment; a GPU is not mandatory.
- A running MoneyPrinterTurbo API reachable from the worker container on port 8080.
- A persistent disk for the named Docker volume `questpulse-video-data`.

## 1. Create private environment settings

From the repository root:

```sh
cp .env.example .env
```

Generate a strong worker secret locally and put it in `.env`. Do not commit `.env` or share its value:

```sh
openssl rand -hex 32
```

Set at least:

```dotenv
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:3000
VIDEO_WORKER_TOKEN=<your-random-secret>
MPT_BASE_URL=http://host.docker.internal:8080
MPT_VIDEO_SOURCE=pexels
```

The same `VIDEO_WORKER_TOKEN` is consumed by the API and worker through the private Compose environment. Do not put it in browser code.

## 2. Start MoneyPrinterTurbo separately

Follow the official Docker instructions in the MoneyPrinterTurbo repository. Its API documentation should be reachable at `http://127.0.0.1:8080/docs` on the host. Configure its footage provider and any required keys in its own configuration; the default Pexels source needs a valid Pexels API key. Do not enable paid LLM, voice, video, or publishing services unless separately approved.

If MoneyPrinterTurbo runs on another machine, set `MPT_BASE_URL` in `.env` to its reachable private API address. Do not expose its API publicly without authentication and network restrictions.

## 3. Build and start QuestPulse API + worker

```sh
docker compose -f docker-compose.video.yml up -d --build
docker compose -f docker-compose.video.yml ps
docker compose -f docker-compose.video.yml logs -f api video-worker
```

The API health endpoint is local-only at `http://127.0.0.1:3000/api/health`. The API port is bound to loopback; do not change that binding for an internet-facing deployment without adding HTTPS, authentication-aware proxying, and firewall rules.

## 4. Verify the runtime

- API container reports healthy.
- Worker logs show it is online and polling.
- MoneyPrinterTurbo API is reachable from the worker container.
- Create a video job only from an already-published, reviewed QuestPulse post using the authenticated administrator API.
- Confirm one generated MP4 is saved in the private Docker volume and can be fetched by an authenticated administrator.

A green container health check is not proof of a completed render. A full end-to-end render still needs to be run with valid footage-provider configuration and a real published source post.

## Storage, backup, and shutdown

- SQLite, publisher uploads, and private video artifacts live in the named Docker volume.
- Back up the volume before upgrades or host migration.
- Stop services without deleting data: `docker compose -f docker-compose.video.yml down`.
- **Do not** use `down -v` unless you intentionally want to delete the persistent database and generated files.
- This local volume is not a managed backup and is not suitable as the only production copy.

## Scope and safety

- No public artifact URL is created.
- Generated videos remain private drafts.
- No social media credentials or automatic publishing are used.
- No cloud storage or paid hosting is enabled.
- This Compose file is a local development/runtime baseline, not a hardened public production deployment.
