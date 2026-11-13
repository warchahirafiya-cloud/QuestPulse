# QuestPulse Human-in-the-Loop Training

## Purpose
This workflow makes the project owner an explicit human reviewer and feedback contributor in the QuestPulse ML lifecycle. The assistant can help explain, analyze, draft tests, and prepare experiments, but does not autonomously learn model weights from chat messages.

## Project participant identity
- Participant ID: QP-TRAINER-001
- Role: Project Owner / Human Trainer
- Identity type: pseudonymous project-local identifier
- Personal name, email, phone, account IDs, and other direct identifiers must not be stored in ML training records.

The ID identifies an authorized project role in this workflow; it is not authentication. Any future application must enforce access control separately.

## Feedback cycle
1. The system presents a candidate, model suggestion, or evaluation example with source evidence.
2. The human trainer selects a documented decision: accept, correct, reject, uncertain, or request more evidence.
3. The system records the decision, reason code, timestamp, dataset version, and relevant model version.
4. Only reviewed, policy-compliant records may be considered for a labeled dataset.
5. Conflicting or uncertain labels are escalated for adjudication; they are not silently treated as truth.
6. Training and evaluation runs are versioned and independently validated before any release.

## Data minimization and consent
- Do not ingest entire private chat histories as training data.
- Store only explicit, task-relevant feedback that the participant knowingly submits for the project.
- Never collect passwords, one-time codes, private messages, payment details, or sensitive personal data.
- Keep source evidence and license/terms checks attached to candidate records.
- Provide a way to correct or withdraw a submitted feedback record from future dataset versions, subject to audit and retention requirements.
- Keep participant identity separate from labels and model features; use the pseudonymous ID only for audit provenance.
- Do not use participant ID as a predictive feature.

## Human authority and model limits
- Human decisions are authoritative editorial feedback, but still require evidence and may be marked uncertain.
- Model predictions are advisory only.
- No automatic publication, eligibility guarantee, reward promise, financial decision, or legal determination.
- The human trainer can override every model suggestion.
- A model must not be trained on unreviewed inbox candidates as ground truth.

## Assistant collaboration boundary
The assistant may help design the workflow, analyze explicitly provided project data, draft code and tests, and explain metrics. The assistant does not remain continuously active between conversations, cannot guarantee persistent autonomous work, and does not directly update its own foundation-model weights from this project.

## Required audit fields
- feedback_id
- participant_id
- record_id
- decision
- reason_code
- optional_correction
- evidence_reference
- submitted_at
- dataset_version
- model_version (when applicable)
- consent_scope
- review_status

## Initial rollout
Start with a small manually reviewed pilot. Measure reviewer agreement, label coverage, class balance, and correction rates before exporting any training set. Keep validation and test examples separate from feedback used for training.
