# QuestPulse Machine Learning Pipeline Roadmap

**Status:** Planned — design and data-readiness stage  
**Scope:** Assist the QuestPulse rewards-discovery and editorial-review workflow.  
**Safety rule:** ML may prioritize, classify, detect anomalies, and recommend review. It must never autonomously publish an offer, promise earnings, determine legal eligibility, or replace human verification.

## 1. Purpose and first model use cases

The active QuestPulse product is a reviewed directory of rewards, tasks, discounts, competitions, loyalty programmes, and online offers. The first ML iteration should support editorial quality rather than attempt a broad general-purpose model.

Prioritized use cases:
1. Candidate relevance and category classification.
2. Duplicate / near-duplicate candidate detection.
3. Staleness and suspicious-claim risk prioritization.
4. Country-eligibility evidence completeness scoring.
5. Editor-facing ranking of candidates for manual review.

Do not train on the historical cryptocurrency archive. Keep archive/crypto excluded from active data and model datasets.

## 2. End-to-end phase plan

| Order | Phase | Work products | Exit / acceptance criteria |
|---:|---|---|---|
| 0 | Data Collection | Approved source registry, source provenance, collection timestamps, raw snapshots where permitted | Every record has a source ID, original URL, collection time, and permitted-use basis |
| 1 | Preprocessing | HTML/text cleanup, Unicode normalization, URL canonicalization, timestamp parsing, currency/country normalization, missing-value flags | Deterministic, tested transformations; raw evidence remains traceable; no silent loss of source facts |
| 2 | Data Quality & Labels | Label guide, reviewer decisions, label provenance, class definitions | Labels are human-reviewed, consistent, versioned, and sufficiently represented |
| 3 | Data Splitting | Group-aware and time-aware split manifest | Related offers/merchants/campaigns do not leak across splits; test data remains untouched |
| 4 | Training Set | Training features and labels, reproducible dataset snapshot | Training-only transformations are fitted on training data; class balance and coverage are reported |
| 5 | Validation Set | Validation features and labels, validation report | Used for model selection and tuning only; no overlap or leakage with training groups |
| 6 | Model Selection & Architecture | Baseline rules, TF-IDF/linear model baseline, optional compact text encoder only if justified | Baseline beats simple rules on agreed metrics, is explainable enough for editors, and meets latency/cost limits |
| 7 | Model Training / Optimization | Reproducible training script, model artifact, experiment metadata | Fixed seeds, versioned data/code, logged metrics, model card, and reproducible run |
| 8 | Gradient Descent | Optimizer/loss configuration if a neural model is selected | Document optimizer, learning rate, loss, regularization, and convergence checks; skip custom neural training if a classical baseline is better |
| 9 | Epochs | Training loop and learning curves for neural models | Monitor train/validation curves; early stopping and checkpointing; avoid arbitrary epoch counts |
| 10 | Overfitting Controls | Leakage checks, regularization, early stopping, feature limits, group/time splits | Train-validation gap is monitored; performance generalizes to later unseen data |
| 11 | Hyperparameter Tuning | Small, bounded search plan and experiment table | Tune only on training/validation data; record search space, compute budget, and selected configuration |
| 12 | Evaluation & Validation | Locked test report, calibration, error analysis, subgroup analysis | Evaluate precision/recall/F1, PR-AUC where relevant, calibration, false-positive burden, and country/source slices |
| 13 | Shadow Deployment | Offline scoring or editor-only shadow scores | No public behavior changes; compare model recommendations with editor decisions |
| 14 | Controlled Integration | Versioned inference interface and rollback switch | Human approval remains mandatory; monitor drift and errors; rollback tested |

## 3. Dataset contract

Create a versioned dataset derived from reviewed candidate and published-offer records. Recommended fields:

- record_id, source_id, source_url, merchant_id
- collected_at, published_at, last_checked_at, expires_at
- title_raw, description_raw, title_clean, description_clean
- country_claims, verified_eligible_countries, currency, reward_type, category
- canonical_url, duplicate_group_id
- editor_label, label_reason, reviewer_id_or_role, labeled_at
- evidence_url, verification_status, fees_disclosed, terms_available

Do not collect passwords, one-time codes, private messages, unnecessary personal data, or sensitive user attributes. Respect source terms, robots/access restrictions, rate limits, copyright, and retention limits. Store only the minimum evidence needed for review.

## 4. Preprocessing rules

1. Preserve immutable raw input and source attribution.
2. Normalize Unicode and whitespace; strip unsafe markup while retaining meaningful text.
3. Parse dates strictly into UTC ISO-8601; flag invalid or ambiguous values rather than guessing.
4. Canonicalize URLs consistently; remove known tracking parameters only when safe, and do not collapse distinct offer IDs.
5. Normalize ISO country codes and currency codes; never infer global eligibility from publisher location.
6. Represent missing values explicitly with missingness flags.
7. Detect language before language-specific tokenization; do not translate silently.
8. Redact accidental personal data before dataset export.
9. Deduplicate exact and near duplicates using stable keys and reviewable similarity thresholds.
10. Keep a transformation version and validation report for every dataset snapshot.

## 5. Splitting strategy

Use group-aware splitting by duplicate group, merchant/campaign, or source family to prevent related records leaking between partitions. Prefer chronological evaluation: older records for training, a later period for validation, and the newest untouched period for final testing. A provisional split such as 70/15/15 is only a starting point; adjust to dataset size and class coverage. Never split individual near-duplicate rows randomly across partitions.

## 6. Model selection and architecture

Start with transparent baselines:
- Existing deterministic validation rules.
- TF-IDF with logistic regression or linear SVM for text classification.
- Lightweight similarity methods for duplicate candidate detection.

Only evaluate neural text models if there is enough high-quality labeled data and a measurable improvement that justifies operational complexity. Keep separate models/tasks for classification, duplicate detection, and risk triage rather than one opaque score.

## 7. Training and optimization

For classical models, tune regularization and feature parameters using validation data; gradient descent and epochs may not apply directly. For neural models, document loss, optimizer (for example AdamW), learning rate schedule, batch size, weight decay, gradient clipping if needed, number of epochs, early stopping, and checkpoint selection. Use fixed random seeds and log environment, code commit, dataset version, and configuration.

## 8. Overfitting and leakage safeguards

- Split by time and related entities before fitting transformations.
- Fit vocabulary, scalers, encoders, and feature selection on training data only.
- Keep the test set locked until final evaluation.
- Compare train and validation metrics; inspect learning curves and error examples.
- Use regularization, early stopping, and simpler models where appropriate.
- Check for target leakage in editorial status, verification timestamps, and post-publication fields.
- Report performance by country, source, category, and language where sample sizes allow.

## 9. Evaluation and release gates

For imbalanced editorial tasks, report precision, recall, F1, PR-AUC, confusion matrix, calibration, and precision at the review capacity. For duplicate detection, report precision/recall at the chosen threshold and manually inspect false matches. For risk triage, optimize for safe prioritization and disclose false positives/negatives.

A model is not release-ready until:
- It beats the rule-based baseline on a pre-agreed metric.
- Test-set results are reproducible and leakage checks pass.
- Country/source subgroup failures are understood.
- Model card, limitations, rollback, and monitoring are documented.
- Editors can override every suggestion.

## 10. Repository implementation sequence

Suggested future structure:
- ml/README.md
- ml/schemas/record.schema.json
- ml/preprocessing/
- ml/datasets/ (manifests and metadata only; no private/raw dumps committed)
- ml/splits/
- ml/training/
- ml/evaluation/
- ml/models/ (version metadata; large artifacts stored outside Git)
- ml/tests/
- ml/reports/

Keep Python ML dependencies isolated from the current Node.js website/API runtime. Add a separate reproducible environment and CI checks only after a representative, permitted, human-labeled dataset exists.

## 11. Current readiness and immediate next tasks

**Current state:** QuestPulse has candidate-only feed ingestion, an editorial inbox, source registry, and catalogue validators. The inspected repository does not yet establish a human-labeled ML dataset, split manifests, training code, or evaluation baselines.

Immediate sequence:
1. Audit inbox schema and source provenance at scale.
2. Strengthen preprocessing tests and URL/redirect safety.
3. Define editor labeling taxonomy and a small adjudicated pilot set.
4. Build dataset export with privacy and source-policy checks.
5. Create group/time split manifests.
6. Benchmark simple rules and TF-IDF baselines before selecting a larger architecture.

**No model should be trained on unreviewed candidate data as if it were ground truth.**
