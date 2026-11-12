# QuestPulse Video Worker

A private Python worker that connects the QuestPulse SQLite job queue to a separately hosted MoneyPrinterTurbo API. It does not publish videos to social platforms.

## What it does

1. Claims one queued job from `POST /api/admin/video-jobs/worker/claim`.
2. Builds a short script and search terms only from the already-published QuestPulse post snapshot. It does not invent reward amounts, eligibility, or deadlines.
3. Requests one render from MoneyPrinterTurbo's `POST /api/v1/videos`.
4. Polls `GET /api/v1/tasks/{task_id}` until completion/failure.
5. Downloads the resulting MP4 from the MoneyPrinterTurbo task download endpoint.
6. Uploads the MP4 to QuestPulse's private artifact endpoint, then reports the artifact key.

Completed artifacts are stored by the Node API under `VIDEO_ARTIFACT_DIR` and are accessible only to an authenticated administrator. No public media URL is created.

## Requirements and cost profile

- Python 3.11+ for the worker.
- A running QuestPulse Node API with the M1 video job routes and a persistent writable artifact directory.
- A separately running MoneyPrinterTurbo API (Python 3.11+ and FFmpeg/FFprobe).
- Edge TTS is selected for Arabic/English voice output and does not require a TTS API key.
- The worker supplies the script and search terms itself, so no LLM key is required for those two stages.
- The default Pexels footage source requires a Pexels API key configured in MoneyPrinterTurbo's own `config.toml`. Pexels has a free API tier subject to its current terms/limits. Alternatively configure a local asset workflow in MoneyPrinterTurbo.
- Background music volume is set to zero to avoid silently using music with unclear reuse rights.
- Do not enable paid LLM, voice, footage, AI-video, or publishing providers. No social publishing is called by this worker.

A free API tier is not a guarantee of unlimited availability. Check provider limits and licensing before production use.

## Configure the Node API

Set the same random secret in the Node API and the worker environment:

```sh
VIDEO_WORKER_TOKEN=<random-secret-at-least-32-characters>
VIDEO_ARTIFACT_DIR=./server/private-video-artifacts
```

Keep `VIDEO_ARTIFACT_DIR` on persistent storage with restricted filesystem permissions. The directory is ignored by Git. Back it up or clean it only under an explicit retention policy.

## Configure MoneyPrinterTurbo

Run MoneyPrinterTurbo separately and configure:

- Pexels API key in its own `config.toml` if using the default `MPT_VIDEO_SOURCE=pexels`.
- Edge TTS as the speech provider.
- API authentication only if desired; if MoneyPrinterTurbo has an API key configured, provide the same value to the worker as `MPT_API_KEY`.

Do not configure social platform credentials or automatic upload. The worker only calls video creation, task query, and task download endpoints.

## Run the worker locally

```sh
cd worker
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with the real private values, then export them into the process (or use your process manager's environment-file support):

```sh
set -a
. ./.env
set +a
python questpulse_video_worker.py
```

Use `python questpulse_video_worker.py --once` to claim at most one queued job for a smoke check. The worker polls continuously by default and handles one render at a time.

If running in Docker, build with `docker build -t questpulse-video-worker ./worker` and pass secrets at runtime using an environment file; never bake them into the image. Ensure the container can reach both the QuestPulse API and the MoneyPrinterTurbo API.

## Configuration

| Variable | Purpose |
|---|---|
| `QUESTPULSE_API_URL` | Base URL of the Node API, not the GitHub Pages website |
| `VIDEO_WORKER_TOKEN` | Shared secret; minimum 32 characters |
| `MPT_BASE_URL` | MoneyPrinterTurbo root URL, excluding `/api/v1` |
| `MPT_API_KEY` | Optional, only if MoneyPrinterTurbo API auth is enabled |
| `MPT_VIDEO_SOURCE` | `pexels` by default; can be `pixabay`, `coverr`, or `local` |
| `WORKER_POLL_SECONDS` | Idle queue poll interval |
| `MPT_POLL_SECONDS` | Render status poll interval |
| `MPT_TASK_TIMEOUT_SECONDS` | Maximum wait for one render |

## Validation

Run the adapter tests:

```sh
pip install -r worker/requirements.txt
python -m unittest discover -s worker -p 'test_*.py'
```

The worker cannot run until the Node API and MoneyPrinterTurbo endpoints are reachable and the required provider settings are valid. A successful GitHub build is not proof of a completed video render.

## Docker runtime (API + worker)

A root-level Compose setup is available for local operation:

```sh
cp .env.example .env
# Set VIDEO_WORKER_TOKEN to a fresh secret (at least 32 characters).
docker compose -f docker-compose.video.yml up -d --build
docker compose -f docker-compose.video.yml ps
docker compose -f docker-compose.video.yml logs -f api video-worker
```

This starts the QuestPulse Node API and worker. MoneyPrinterTurbo is intentionally managed separately; start its official Docker runtime and set `MPT_BASE_URL` in `.env` (default: `http://host.docker.internal:8080`). Full instructions, persistent volume notes, and shutdown/backup guidance are in `VIDEO_RUNTIME.md`.

The API is bound to localhost only. The Compose setup is a local runtime baseline, not a public production deployment. It does not provision hosting, cloud storage, Pexels credentials, or paid services.
