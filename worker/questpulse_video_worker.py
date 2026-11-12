from __future__ import annotations

import logging
import os
import re
import signal
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

import httpx

LOG = logging.getLogger("questpulse-video-worker")
STOP = False
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def required(name: str) -> str:
    value = env(name)
    if not value:
        raise RuntimeError(f"Required environment variable is missing: {name}")
    return value


def api_url(base: str, route: str) -> str:
    return base.rstrip("/") + route


def questpulse_client() -> httpx.Client:
    base = required("QUESTPULSE_API_URL")
    token = required("VIDEO_WORKER_TOKEN")
    if len(token) < 32:
        raise RuntimeError("VIDEO_WORKER_TOKEN must contain at least 32 characters")
    return httpx.Client(
        base_url=base.rstrip("/") + "/api/admin/video-jobs",
        headers={"Authorization": f"Bearer {token}"},
        timeout=httpx.Timeout(30.0, connect=10.0),
    )


def mpt_client() -> httpx.Client:
    base = required("MPT_BASE_URL").rstrip("/")
    headers = {}
    key = env("MPT_API_KEY")
    if key:
        headers["x-api-key"] = key
    return httpx.Client(base_url=base + "/api/v1", headers=headers,
                        timeout=httpx.Timeout(60.0, connect=15.0))


def make_script(source: dict[str, Any], language: str) -> str:
    title = re.sub(r"\s+", " ", str(source.get("title") or "").strip())[:140]
    description = re.sub(r"\s+", " ", str(source.get("description") or "").strip())[:2400]
    if not title or not description:
        raise ValueError("Published source is missing a title or description")
    if language == "ar":
        return (
            f"هل تبحث عن فرصة رقمية جديدة؟ {title}. "
            f"{description}. "
            "قبل المشاركة، اقرأ الشروط وتحقق من الأهلية والمواعيد من المصدر الرسمي. "
            "اكتشف التفاصيل وتابع التحديثات عبر QuestPulse."
        )
    return (
        f"Looking for a new digital opportunity? {title}. "
        f"{description}. "
        "Before taking part, read the terms and verify eligibility and deadlines with the official source. "
        "Find the details and updates on QuestPulse."
    )


def make_terms(source: dict[str, Any], language: str) -> list[str]:
    text = f"{source.get('title', '')} {source.get('description', '')}"
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9+#.-]{2,}|[\u0600-\u06FF]{3,}", text)
    stop = {"the", "and", "for", "with", "this", "that", "from", "your", "you", "are", "هل", "من", "في", "على", "الى", "إلى", "عن", "هذا", "هذه"}
    unique: list[str] = []
    for word in words:
        if word.casefold() not in stop and word not in unique:
            unique.append(word)
        if len(unique) == 8:
            break
    if not unique:
        unique = ["digital opportunity", "technology", "online services"]
    return unique


def create_mpt_task(mpt: httpx.Client, job: dict[str, Any]) -> str:
    source = job.get("source") or {}
    language = job.get("language", "ar")
    voice = "ar-SA-HamedNeural" if language == "ar" else "en-US-GuyNeural"
    body = {
        "video_subject": str(job.get("title") or source.get("title") or "QuestPulse opportunity")[:140],
        "video_script": make_script(source, language),
        "video_terms": make_terms(source, language),
        "video_aspect": job.get("aspectRatio", "9:16"),
        "video_source": env("MPT_VIDEO_SOURCE", "pexels"),
        "video_count": 1,
        "video_clip_duration": 5,
        "voice_name": voice,
        "subtitle_enabled": True,
        "bgm_volume": 0.0,
        "n_threads": 2,
    }
    if body["video_source"] not in {"pexels", "pixabay", "coverr", "local"}:
        raise ValueError("MPT_VIDEO_SOURCE must be pexels, pixabay, coverr, or local")
    response = mpt.post("/videos", json=body)
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data") or {}
    task_id = data.get("task_id") or payload.get("task_id")
    if not isinstance(task_id, str) or not UUID_RE.fullmatch(task_id):
        raise RuntimeError("MoneyPrinterTurbo returned an invalid task identifier")
    return task_id


def wait_for_mpt_video(mpt: httpx.Client, task_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + int(env("MPT_TASK_TIMEOUT_SECONDS", "2400"))
    interval = max(3, min(30, int(env("MPT_POLL_SECONDS", "8"))))
    while time.monotonic() < deadline and not STOP:
        response = mpt.get(f"/tasks/{task_id}")
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data") or {}
        state = data.get("state")
        if state in (1, "1", "completed", "complete", "success"):
            return data
        if state in (-1, "-1", "failed", "error"):
            raise RuntimeError(str(data.get("error") or data.get("message") or "MoneyPrinterTurbo render failed")[:450])
        time.sleep(interval)
    if STOP:
        raise RuntimeError("Worker shutdown requested while waiting for render")
    raise TimeoutError("MoneyPrinterTurbo render timed out")


def output_relative_path(mpt_base: str, value: str) -> str:
    parsed = urlparse(value)
    path = parsed.path if parsed.scheme else value
    marker = "/tasks/"
    if marker in path:
        relative = path.split(marker, 1)[1]
    elif path.startswith("tasks/"):
        relative = path[len("tasks/"):]
    else:
        raise ValueError("MPT returned a video path outside its task output directory")
    parts = relative.split("/")
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise ValueError("Unsafe video output path from MoneyPrinterTurbo")
    if not relative.lower().endswith(".mp4"):
        raise ValueError("MoneyPrinterTurbo output is not an MP4 file")
    return relative


def download_video(mpt: httpx.Client, mpt_base: str, task: dict[str, Any], destination: Path) -> None:
    candidates = task.get("combined_videos") or task.get("videos") or []
    if not isinstance(candidates, list) or not candidates:
        raise RuntimeError("MoneyPrinterTurbo completed without returning a video file")
    relative = output_relative_path(mpt_base, str(candidates[0]))
    total = 0
    with mpt.stream("GET", "/download/" + quote(relative, safe="/"), timeout=300.0) as response:
        response.raise_for_status()
        with destination.open("wb") as output:
            for chunk in response.iter_bytes(1024 * 1024):
                if STOP:
                    raise RuntimeError("Worker shutdown requested during download")
                total += len(chunk)
                if total > 120 * 1024 * 1024:
                    raise RuntimeError("Generated video exceeds the 120 MB upload limit")
                output.write(chunk)
    if total < 12:
        raise RuntimeError("Downloaded video is empty or invalid")
    with destination.open("rb") as video:
        header = video.read(12)
    if header[4:8] != b"ftyp":
        raise RuntimeError("Downloaded file is not a valid MP4 container")


def process_job(qp: httpx.Client, mpt: httpx.Client, job: dict[str, Any]) -> None:
    job_id = str(job.get("id", ""))
    if not UUID_RE.fullmatch(job_id):
        raise ValueError("Claimed job has an invalid ID")
    LOG.info("Starting QuestPulse job %s", job_id)
    try:
        mpt_id = create_mpt_task(mpt, job)
        LOG.info("MoneyPrinterTurbo task %s started for %s", mpt_id, job_id)
        result = wait_for_mpt_video(mpt, mpt_id)
        mpt_base = required("MPT_BASE_URL").rstrip("/")
        with tempfile.TemporaryDirectory(prefix="qp-video-") as temp:
            video_path = Path(temp) / "render.mp4"
            download_video(mpt, mpt_base, result, video_path)
            with video_path.open("rb") as video:
                upload = qp.post(
                    f"/worker/artifact/{job_id}",
                    files={"file": ("render.mp4", video, "video/mp4")},
                    timeout=300.0,
                )
            upload.raise_for_status()
            artifact_key = upload.json().get("artifactKey")
        if not artifact_key:
            raise RuntimeError("QuestPulse did not return an artifact key")
        completed = qp.post("/worker/result", json={
            "jobId": job_id, "status": "completed", "artifactKey": artifact_key
        })
        completed.raise_for_status()
        LOG.info("QuestPulse job %s completed and stored privately", job_id)
    except Exception as exc:
        message = re.sub(r"[\r\n]+", " ", str(exc))[:450] or "Video worker failed"
        LOG.exception("QuestPulse job %s failed", job_id)
        try:
            failed = qp.post("/worker/result", json={
                "jobId": job_id, "status": "failed", "error": message
            })
            failed.raise_for_status()
        except Exception:
            LOG.exception("Could not report failure for QuestPulse job %s", job_id)


def run() -> None:
    global STOP
    logging.basicConfig(
        level=env("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    qp = questpulse_client()
    mpt = mpt_client()
    poll_seconds = max(2, min(60, int(env("WORKER_POLL_SECONDS", "10"))))
    once = "--once" in sys.argv
    LOG.info("Worker online; polling QuestPulse for queued jobs")
    try:
        while not STOP:
            try:
                response = qp.post("/worker/claim", json={})
                response.raise_for_status()
                if response.status_code == 204:
                    if once:
                        break
                    time.sleep(poll_seconds)
                    continue
                job = response.json().get("job")
                if not isinstance(job, dict):
                    raise RuntimeError("QuestPulse returned an invalid job payload")
                process_job(qp, mpt, job)
                if once:
                    break
            except (httpx.HTTPError, RuntimeError, ValueError) as exc:
                LOG.error("Worker cycle failed: %s", exc)
                if once:
                    raise
                time.sleep(poll_seconds)
    finally:
        qp.close()
        mpt.close()


def request_stop(_signum: int, _frame: Any) -> None:
    global STOP
    STOP = True


if __name__ == "__main__":
    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    run()
