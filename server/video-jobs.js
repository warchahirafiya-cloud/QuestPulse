import { timingSafeEqual, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { videoJobCreateSchema, videoJobResultSchema } from "./validation.js";
import { newId } from "./auth.js";

export const VIDEO_JOB_STATUSES = Object.freeze(["queued", "processing", "completed", "failed", "cancelled"]);
const transitions = Object.freeze({
  queued: ["processing", "cancelled"],
  processing: ["completed", "failed", "cancelled"],
  failed: ["queued"],
  completed: [],
  cancelled: []
});

export function canTransition(from, to) {
  return transitions[from]?.includes(to) ?? false;
}

export function isValidArtifactKey(jobId, key) {
  if (typeof key !== "string") return false;
  return new RegExp("^" + jobId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/[a-f0-9-]{36}\\.mp4$").test(key);
}

function requireWorker(req, res, next) {
  const expected = process.env.VIDEO_WORKER_TOKEN || "";
  const supplied = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] || "";
  if (expected.length < 32) return res.status(503).json({ error: "Video worker is not configured." });
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: "Worker authentication failed." });
  next();
}

function publicJob(row) {
  return {
    id: row.id, sourcePostId: row.source_post_id, title: row.title,
    language: row.language, aspectRatio: row.aspect_ratio, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at,
    startedAt: row.started_at, completedAt: row.completed_at,
    error: row.error_message, artifactKey: row.artifact_key
  };
}

export function createVideoJobsRouter({ db, requireUser, requireAdmin, submitLimit, artifactDir }) {
  const router = Router();
  const getJob = db.prepare("SELECT * FROM video_jobs WHERE id=?");
  const artifactUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: 120 * 1024 * 1024 } });

  router.post("/", requireUser, requireAdmin, submitLimit, (req, res) => {
    const parsed = videoJobCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid video job request.", details: parsed.error.issues.map(x => ({ field: x.path.join("."), message: x.message })) });
    const source = db.prepare("SELECT id,title,description,offer_url,post_type FROM posts WHERE id=? AND status='published'").get(parsed.data.sourcePostId);
    if (!source) return res.status(404).json({ error: "Only published and reviewed QuestPulse content can be used." });
    const id = newId();
    const now = new Date().toISOString();
    const snapshot = JSON.stringify({ title: source.title, description: source.description, offerUrl: source.offer_url || "", postType: source.post_type });
    db.prepare("INSERT INTO video_jobs(id,source_post_id,title,source_snapshot,language,aspect_ratio,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,'queued',?,?,?)")
      .run(id, source.id, source.title, snapshot, parsed.data.language, parsed.data.aspectRatio, req.user.id, now, now);
    res.status(202).json({ job: publicJob(getJob.get(id)) });
  });

  router.get("/", requireUser, requireAdmin, (req, res) => {
    const status = req.query.status;
    if (status && !VIDEO_JOB_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid job status filter." });
    const rows = status
      ? db.prepare("SELECT * FROM video_jobs WHERE status=? ORDER BY created_at DESC LIMIT 100").all(status)
      : db.prepare("SELECT * FROM video_jobs ORDER BY created_at DESC LIMIT 100").all();
    res.json({ jobs: rows.map(publicJob) });
  });

  router.get("/:id", requireUser, requireAdmin, (req, res) => {
    const row = getJob.get(req.params.id);
    if (!row) return res.status(404).json({ error: "Video job not found." });
    res.json({ job: publicJob(row) });
  });

  router.post("/:id/cancel", requireUser, requireAdmin, (req, res) => {
    const row = getJob.get(req.params.id);
    if (!row) return res.status(404).json({ error: "Video job not found." });
    if (!canTransition(row.status, "cancelled")) return res.status(409).json({ error: "This job can no longer be cancelled.", status: row.status });
    const now = new Date().toISOString();
    db.prepare("UPDATE video_jobs SET status='cancelled',updated_at=? WHERE id=? AND status=?").run(now, row.id, row.status);
    res.json({ job: publicJob(getJob.get(row.id)) });
  });

  router.post("/:id/retry", requireUser, requireAdmin, (req, res) => {
    const row = getJob.get(req.params.id);
    if (!row) return res.status(404).json({ error: "Video job not found." });
    if (!canTransition(row.status, "queued")) return res.status(409).json({ error: "Only failed jobs can be retried.", status: row.status });
    const now = new Date().toISOString();
    db.prepare("UPDATE video_jobs SET status='queued',error_message=NULL,artifact_key=NULL,started_at=NULL,completed_at=NULL,updated_at=? WHERE id=? AND status='failed'").run(now, row.id);
    res.json({ job: publicJob(getJob.get(row.id)) });
  });

  router.post("/worker/artifact/:id", requireWorker, artifactUpload.single("file"), async (req, res) => {
    const row = getJob.get(req.params.id);
    if (!row || row.status !== "processing") return res.status(409).json({ error: "Job is missing or no longer processing." });
    const file = req.file;
    if (!file || file.mimetype !== "video/mp4" || file.size < 12 || file.buffer.subarray(4, 8).toString() !== "ftyp") {
      return res.status(400).json({ error: "A valid MP4 video file is required." });
    }
    const artifactId = randomUUID();
    const artifactKey = row.id + "/" + artifactId + ".mp4";
    const directory = path.join(artifactDir, row.id);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, artifactId + ".mp4"), file.buffer, { flag: "wx", mode: 0o600 });
    res.status(201).json({ artifactKey, size: file.size });
  });

  router.get("/:id/artifact", requireUser, requireAdmin, (req, res) => {
    const row = getJob.get(req.params.id);
    if (!row || row.status !== "completed" || !isValidArtifactKey(row.id, row.artifact_key)) {
      return res.status(404).json({ error: "Video artifact not found." });
    }
    const fileName = row.artifact_key.split("/")[1];
    res.set({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    res.type("video/mp4").sendFile(path.join(artifactDir, row.id, fileName), error => {
      if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).end();
    });
  });

  router.post("/worker/claim", requireWorker, (req, res) => {
    const now = new Date().toISOString();
    const claim = db.transaction(() => {
      const row = db.prepare("SELECT * FROM video_jobs WHERE status='queued' ORDER BY created_at ASC LIMIT 1").get();
      if (!row) return null;
      const changed = db.prepare("UPDATE video_jobs SET status='processing',started_at=?,updated_at=? WHERE id=? AND status='queued'").run(now, now, row.id);
      return changed.changes ? getJob.get(row.id) : null;
    });
    const row = claim();
    if (!row) return res.status(204).end();
    res.json({ job: { ...publicJob(row), source: JSON.parse(row.source_snapshot) } });
  });

  router.post("/worker/result", requireWorker, (req, res) => {
    const parsed = videoJobResultSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid worker result." });
    const row = getJob.get(parsed.data.jobId);
    if (!row || row.status !== "processing") return res.status(409).json({ error: "Job is missing or no longer processing." });
    if (parsed.data.status === "completed" && !isValidArtifactKey(row.id, parsed.data.artifactKey)) {
      return res.status(400).json({ error: "Artifact key is invalid." });
    }
    const now = new Date().toISOString();
    const completed = parsed.data.status === "completed";
    db.prepare("UPDATE video_jobs SET status=?,artifact_key=?,error_message=?,completed_at=?,updated_at=? WHERE id=? AND status='processing'")
      .run(completed ? "completed" : "failed", completed ? parsed.data.artifactKey : null, completed ? null : parsed.data.error, now, now, row.id);
    res.json({ job: publicJob(getJob.get(row.id)) });
  });

  return router;
}
