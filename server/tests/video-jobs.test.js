import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, isValidArtifactKey, VIDEO_JOB_STATUSES } from "../video-jobs.js";
import { videoJobCreateSchema, videoJobResultSchema } from "../validation.js";

const jobId = "123e4567-e89b-12d3-a456-426614174000";

test("video job statuses and transitions are explicit", () => {
  assert.deepEqual(VIDEO_JOB_STATUSES, ["queued", "processing", "completed", "failed", "cancelled"]);
  assert.equal(canTransition("queued", "processing"), true);
  assert.equal(canTransition("processing", "completed"), true);
  assert.equal(canTransition("failed", "queued"), true);
  assert.equal(canTransition("completed", "queued"), false);
  assert.equal(canTransition("cancelled", "processing"), false);
});

test("only valid approved-content job parameters pass validation", () => {
  assert.equal(videoJobCreateSchema.safeParse({ sourcePostId: jobId, language: "ar", aspectRatio: "9:16" }).success, true);
  assert.equal(videoJobCreateSchema.safeParse({ sourcePostId: jobId, language: "xx", aspectRatio: "9:16" }).success, false);
  assert.equal(videoJobCreateSchema.safeParse({ sourcePostId: jobId, language: "en", aspectRatio: "1:1" }).success, false);
  assert.equal(videoJobCreateSchema.safeParse({ sourcePostId: jobId, language: "en", aspectRatio: "9:16", outputPath: "/etc/passwd" }).success, false);
});

test("worker results reject malformed job ids and artifact traversal", () => {
  assert.equal(videoJobResultSchema.safeParse({ jobId, status: "completed", artifactKey: jobId + "/123e4567-e89b-12d3-a456-426614174001.mp4" }).success, true);
  assert.equal(videoJobResultSchema.safeParse({ jobId, status: "completed", artifactKey: "../../secret.mp4" }).success, false);
  assert.equal(videoJobResultSchema.safeParse({ jobId, status: "failed", error: "Render failed" }).success, true);
  assert.equal(videoJobResultSchema.safeParse({ jobId, status: "failed" }).success, false);
});

test("artifact keys are bound to the claimed job", () => {
  assert.equal(isValidArtifactKey(jobId, jobId + "/123e4567-e89b-12d3-a456-426614174001.mp4"), true);
  assert.equal(isValidArtifactKey(jobId, "other-job/123e4567-e89b-12d3-a456-426614174001.mp4"), false);
  assert.equal(isValidArtifactKey(jobId, jobId + "/../private.mp4"), false);
});
