import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), "utf8"));

const participant = await readJson("ml/participants/QP-TRAINER-001.json");
const participantSchema = await readJson("ml/schemas/participant.schema.json");
const feedbackSchema = await readJson("ml/schemas/human-feedback.schema.json");

assert.equal(participant.participant_id, "QP-TRAINER-001");
assert.equal(participant.role, "project_owner_human_trainer");
assert.equal(participant.identity_type, "pseudonymous_project_local_id");
assert.equal(participant.active, true);
assert.equal(participantSchema.properties.participant_id.const, participant.participant_id);
assert.equal(participantSchema.properties.role.const, participant.role);
assert.equal(participantSchema.properties.identity_type.const, participant.identity_type);
assert.deepEqual(participantSchema.required, ["participant_id", "role", "identity_type", "active"]);

const feedback = feedbackSchema.properties;
assert.equal(feedback.participant_id.const, participant.participant_id);
assert.deepEqual(feedback.decision.enum, [
  "accept",
  "correct",
  "reject",
  "uncertain",
  "request_more_evidence"
]);
assert.deepEqual(feedback.review_status.enum, [
  "pending",
  "approved_for_dataset",
  "excluded",
  "needs_adjudication"
]);
assert.deepEqual(feedback.consent_scope.enum, [
  "project_quality_review",
  "training_dataset_candidate"
]);
for (const field of [
  "feedback_id",
  "participant_id",
  "record_id",
  "decision",
  "reason_code",
  "submitted_at",
  "consent_scope",
  "review_status"
]) {
  assert.ok(feedbackSchema.required.includes(field), `Feedback schema must require ${field}`);
}

assert.equal(participantSchema.additionalProperties, false);
assert.equal(feedbackSchema.additionalProperties, false);

console.log("ML governance valid: participant identity, feedback schema, decisions, consent scopes, and review gates are consistent.");
console.log("No training dataset or model is created by this check.");
