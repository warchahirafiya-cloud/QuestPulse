# QuestPulse Discovery & Opportunity Intelligence Engine
**Status:** Architecture proposal / implementation blueprint (not production crawler)  
**Date:** 2026-11-13  
**Scope:** Discover public merchant, retailer, brand, rewards, loyalty, task, contest and promotion websites; extract opportunities; verify evidence and country eligibility; monitor changes.  
**Explicit exclusion:** This is not the investment-domain hunter in `server/domain-hunter.js`. It discovers websites and offers for QuestPulse. The existing domain-investment feature remains separate.

## 1. Product objective and non-goals

Build a source-first discovery system that finds *places where opportunities may exist*, identifies candidate opportunities, and helps editors verify them. The system must never equate a discovered domain, a parsed claim, a feed item, or an ML score with a verified offer.

Primary user value:
- Find legitimate rewards, sign-up bonuses, free trials/products, coupons, discounts, cashback, loyalty points, competitions, referrals and digital tasks.
- Explain exactly who can participate, from which countries, at what cost, with which conditions, and until when.
- Show the original merchant/organizer evidence and last verification time.
- Surface globally relevant candidates while accurately excluding unsupported country claims (especially Algeria).

Non-goals for initial release:
- General-purpose web search engine or unrestricted internet crawler.
- Login-gated crawling, CAPTCHA solving, paywall circumvention, anti-bot evasion, or bypassing access controls.
- Automated account creation, purchases, referrals, reward claims, or transactions.
- Automatically publishing scraped content or generating SEO pages at scale.
- Cryptocurrency, blockchain, tokens, mining, wallets, trading or related opportunities in the active product.
- Replacing the separate domain-investment/domain-hunter feature.

## 2. Market position and differentiation hypothesis

Adjacent products solve parts of this problem: coupon/cashback aggregators, community deal forums, affiliate networks, product-feed aggregators, loyalty directories, and broad web crawlers. QuestPulse should not compete by merely mirroring their inventories.

Differentiation hypothesis to validate:
1. **Opportunity breadth:** one normalized model for rewards, coupons, cashback, loyalty, contests, referrals, free samples/trials and task-based opportunities.
2. **Evidence-first verification:** every claim is tied to a first-party merchant/organizer page or clearly attributed authorized provider feed.
3. **Country-level eligibility:** explicit evidence and confidence per country; no inference from site language, currency, IP, or publisher location.
4. **Freshness monitoring:** status changes, code expiry, terms changes, stock/region changes and stale evidence are tracked.
5. **Source transparency:** provenance, original URLs, retrieval time, source type, terms/licence basis, and attribution are retained.
6. **Human adjudication:** ML prioritizes and detects patterns; human reviewers control publication.

The phrase "first in the world" is not an established fact. It is a strategic ambition. Any first/unique claim requires a documented competitor matrix, feature definitions, geographic coverage, product testing and dated evidence.

## 3. Bounded system architecture

Keep the first implementation compatible with the existing Node.js 22 / ESM repository and SQLite backend, but do not run an unbounded crawler inside Express request handlers or GitHub Pages workflows.

Logical services:
- **Source Registry:** approved source definitions, discovery method, scope, terms, rate limits, country scope, attribution, owner, status.
- **Seed & Domain Discovery:** candidate merchant/site discovery from sitemaps, RSS/Atom, public APIs, curated directories, partner feeds, public business directories with permitted use, Common Crawl indexes, and human submissions.
- **Fetch Scheduler:** persistent queue, per-host concurrency, politeness, retries, backoff, budgets, robots policy, host health.
- **Safe Fetch Gateway:** DNS/IP validation, redirect revalidation, response-size/time limits, content-type allowlist, decompression limits, egress restrictions.
- **Page Understanding:** HTML metadata, canonical links, JSON-LD, Open Graph, sitemap links, page text, language, links and page type.
- **Opportunity Extractors:** deterministic parsers first; optional ML/LLM-assisted structured extraction only into candidate state.
- **Evidence & Verification:** source evidence, terms evidence, country eligibility evidence, dates, fees, redemption requirements, status.
- **Entity Resolution:** merchant/domain/brand identity, duplicate and near-duplicate campaigns, canonical URLs.
- **Review Workbench:** evidence packet, approve/correct/reject/uncertain/request-more-evidence.
- **Change Monitor:** re-fetch high-value pages, compare snapshots/hashes/fields, re-open review when material changes occur.
- **Search API / Index:** faceted search over reviewed records, not raw crawl output.
- **Metrics & Audit:** source quality, coverage, freshness, extraction precision, reviewer outcomes, crawl health.

Initial deployment topology:
- Existing public website remains static GitHub Pages.
- Existing Express API remains account/publishing backend.
- Discovery runs as a separately invoked, bounded worker/CLI first; later move to a durable worker host only after measured need.
- SQLite can support a small pilot, but queue locking/concurrency, audit history and search scale may require Postgres and a dedicated search index later.
- Do not add paid infrastructure or credentials without explicit approval. Start with offline fixtures, public permitted feeds, and low-volume manual runs.

## 4. Discovery channels and source priority

Use this order, from strongest structured evidence to weakest:
1. First-party merchant/organizer API, RSS/Atom, public JSON/CSV/XML feed, or sitemap.
2. Authorized affiliate/network APIs and feeds where the account is approved and terms permit the intended use.
3. First-party public pages linked from merchant navigation: rewards, loyalty, offers, promotions, refer-a-friend, contests, free samples, student/employee offers.
4. Public partner directories and curated sources with explicit attribution and reuse rights.
5. Common Crawl index/archive as a *discovery hint*, not a current truth source.
6. Human-submitted source candidates.
7. Search-engine result pages only through permitted APIs/products; do not scrape search result pages or automate Google queries.

Source registry required fields:
`source_id, display_name, source_type, owner_domain, seed_urls, discovery_method, allowed_hosts, country_scope, language_scope, terms_url, robots_policy, permitted_use, attribution_rule, max_requests_per_host_per_day, min_delay_ms, max_response_bytes, refresh_interval_hours, status, added_at, reviewed_at, reviewer`.

Every source must be explicitly approved before scheduled ingestion. Unknown source terms default to manual review and no bulk crawl.

## 5. Discovery and crawl lifecycle

1. **Seed intake:** validate URL syntax and source registry membership; store who/what supplied the seed and why.
2. **Domain identity:** derive registrable domain with a Public Suffix List-aware library; do not use naive last-two-label parsing. Keep subdomain relationships.
3. **Robots and policy:** fetch and cache robots.txt according to RFC 9309; apply the declared product policy. A robots allow is not legal permission; terms and applicable law still matter. If robots cannot be evaluated safely, pause or use a conservative policy.
4. **Sitemap discovery:** parse robots Sitemap directives, sitemap index files and bounded child sitemaps; cap nesting, count, decompressed bytes and URL count.
5. **Page selection:** prioritize likely paths and page types (rewards, offers, deals, promo, coupon, loyalty, referral, contest, giveaway, freebie, student, app, task) but use semantic context, not keyword-only inclusion.
6. **Fetch:** obey per-host delays and concurrency; use conditional requests (ETag / If-Modified-Since) where supported; apply exponential backoff with jitter for transient errors and 429/503; honor Retry-After.
7. **Parse:** extract page metadata, JSON-LD, canonical URL, text, outbound links and structured offer candidates.
8. **Queue follow-up:** enqueue only in-scope URLs on approved hosts; cross-domain links become new domain candidates, never silently crawl targets.
9. **Deduplicate:** normalized URL key + content hash + campaign/merchant similarity.
10. **Candidate creation:** persist candidate with evidence references, never publish.
11. **Verification:** independently inspect first-party page and terms; record exact evidence and country eligibility.
12. **Review:** human approval required for publication.
13. **Monitor:** schedule refresh based on volatility and value; record changed/removed/expired/blocked states.

Initial pilot defaults (tune after measurement, not universal constants):
- One concurrent request per host.
- Minimum 2 seconds between requests to a host unless the source explicitly documents a stricter limit.
- 25 pages per host per run; 100 pages per host per day.
- Maximum 3 link hops from a seed.
- Maximum 2 MiB decoded HTML/text response; smaller limits for feeds.
- 10 second connect/overall request timeout.
- Maximum 2 redirects; revalidate every hop.
- No browser rendering in phase 1; static HTML/feed only. Add headless rendering only for approved domains and a measured need.
- Respect Retry-After; bounded retries (e.g. 2) and circuit-break on repeated failures.

## 6. URL, network and SSRF security

All crawler fetches are untrusted outbound network requests. Implement a dedicated safe-fetch module and test it adversarially.

URL validation:
- Accept HTTPS by default; HTTP only for explicitly approved sources with a documented reason and no credential transmission.
- Reject userinfo, malformed URLs, unsupported schemes, IP-literal hosts unless explicitly allowlisted, localhost names, single-label hosts, and unusual ports.
- Normalize IDNs consistently and preserve the original URL for evidence.
- Resolve DNS immediately before each connection; reject loopback, private, link-local, multicast, reserved, carrier-grade NAT and IPv4-mapped IPv6 destinations.
- Protect against DNS rebinding: pin/validate the resolved destination used by the actual socket connection; revalidate after every redirect.
- Deny cloud metadata endpoints and internal service ranges at network egress as a second layer.
- Do not allow caller-controlled headers, cookies, authorization, proxy settings or arbitrary methods.
- GET/HEAD only; never submit forms or mutate remote state.
- Redirect target must pass the same validation and source/host policy; cap redirect count.
- Enforce response byte limits while streaming, decompressed-size limits, content-type allowlist, timeout and cancellation.
- Treat HTML, JSON, XML and feeds as hostile input. Disable external XML entities/DTD resolution; prevent XXE and parser expansion attacks.
- Never execute page JavaScript in phase 1. If browser rendering is later added, isolate it in a disposable sandbox with no internal network access, no local file access and strict resource limits.
- Never fetch URLs found in untrusted content without re-running the complete validation pipeline.

Operational safeguards:
- Host-level token bucket and circuit breaker.
- Global worker concurrency cap.
- Request audit: source ID, host, URL hash, status, bytes, duration, retry, policy decision.
- Kill switch by source and globally.
- Secrets (if any future API credentials) stored in GitHub secrets or a secret manager; never in repo, logs or candidate records.

## 7. Canonicalization and duplicate strategy

Maintain separate keys:
- `raw_url`: exact source-provided URL.
- `fetch_url`: validated URL actually fetched.
- `canonical_url`: page canonical after validation.
- `url_key`: deterministic dedup key.

Normalize scheme/host case, IDN, default ports, dot segments and fragments; remove known tracking parameters only from the dedup key, not from source evidence. Do not remove unknown query parameters by default because voucher IDs, campaign IDs and country codes may be semantically meaningful.

Domain identity uses PSL-aware registrable domain plus host. Merchant identity is a separate entity and may span multiple domains. Campaign identity is distinct from page identity. Similarity alone must never merge offers without a reviewable match reason.

## 8. Opportunity taxonomy

Canonical top-level categories:
- `signup_reward`: registration / welcome bonus.
- `purchase_reward`: reward conditional on purchase.
- `coupon_discount`: coupon or promo code.
- `cashback`: cash or percentage back.
- `loyalty_program`: points, tiers, membership benefits.
- `free_trial`: time-limited free access.
- `free_product_sample`: sample or free product.
- `contest_sweepstake`: competition, giveaway or draw.
- `referral_reward`: inviter/invitee reward.
- `digital_task`: task, survey, app/site activity.
- `store_offer`: merchant offer without a distinct reward subtype.
- `other`: only with explicit reason and manual review.

Keep reward mechanics separate from category:
- value type: fixed amount, percentage, points, product, entry/prize, access, unknown.
- reward currency and amount where explicit.
- trigger: signup, purchase, spend threshold, referral, task completion, random draw, subscription, code entry, unknown.
- payout method and minimum withdrawal.
- caps, quotas, geographic limitations, new-customer-only rules.
- costs: purchase required, shipping, subscription after trial, deposit, fees, none stated, unknown.
- recurrence and reset interval.
- eligibility age/residency/account status only where explicit; do not infer sensitive attributes.

## 9. Opportunity record contract (conceptual v1)

Each candidate should include:
- `id, merchant_id, source_id, source_type, category, reward_mechanic`
- `title, summary, original_claim, language`
- `merchant_name, merchant_domain, landing_url, canonical_url`
- `source_evidence[]`: URL, page title, excerpt/hash, captured_at, evidence_type, source ownership, retrieval status.
- `terms_evidence[]`: terms URL, excerpt/hash, captured_at.
- `eligible_countries[]`: ISO-3166-1 alpha-2 values with evidence URL, exact quote/field, confidence, verified_at.
- `excluded_countries[]`: only when explicitly evidenced.
- `global_eligibility`: never inferred; true only with clear source evidence and editor confirmation.
- `reward_value, currency, trigger, costs, fees, minimum_spend, payout_method, minimum_withdrawal`.
- `starts_at, expires_at, last_checked_at, next_check_at, status`.
- `verification_status: discovered | extracted | needs_evidence | editor_review | verified | rejected | paused | expired | withdrawn`.
- `confidence_components`: extraction, source authority, freshness, eligibility evidence, terms completeness; never collapse into a misleading guarantee.
- `review_history[]`, `change_history[]`, `created_at, updated_at, schema_version`.

Preserve unknowns as unknown. Do not turn missing country information into worldwide eligibility or missing fees into zero fees.

## 10. Verification and trust scoring

Use transparent gates before any aggregate score:
- **Gate A — source provenance:** traceable first-party page or authorized feed.
- **Gate B — offer existence:** explicit active offer/benefit, not a generic marketing statement.
- **Gate C — terms:** rules, trigger, exclusions, costs and redemption route understood.
- **Gate D — country:** eligible countries explicitly supported; Algeria is "unknown" unless evidence says otherwise.
- **Gate E — freshness:** current page checked within policy window and no known expired state.
- **Gate F — editorial:** human reviewer approved.

Trust score is an internal triage aid, not a probability of payout. Suggested component model (0–100):
- Source authority/provenance 0–25.
- Directness and completeness of offer evidence 0–25.
- Terms/fees clarity 0–15.
- Country eligibility evidence 0–15.
- Freshness 0–10.
- Merchant/source consistency 0–10.

Hard stops override score: inaccessible or suspicious destination, contradictory terms, unsupported eligibility claim, expired offer, source impersonation, material undisclosed fees, or missing first-party evidence. Public status is controlled by verification gates and human approval, not a threshold alone.

## 11. Change monitoring and lifecycle

Recheck priority:
- Active/volatile coupon codes and limited-time deals: 6–24 hours.
- Contest or short campaign: daily or closer to end date.
- Loyalty programme terms: 7–30 days.
- Evergreen programme: 30–90 days.
- Error/blocked source: exponential backoff; do not hammer.

Monitor:
- HTTP status, canonical URL, title, structured data, content hash, relevant text snippets, terms link/hash, country claims, dates, fees and redemption steps.
- On material change, mark `needs_reverification` and remove from public active results until reviewed if validity/eligibility/cost may have changed.
- 404/410, expired structured date, explicit ended notice or removed campaign should transition to expired/withdrawn only with evidence.
- Retain minimal audit evidence and obey source retention/copyright restrictions.

## 12. Search and ranking

Search only reviewed/public-safe opportunities. Filters:
- country (including Algeria), category, reward type, merchant, free/no-purchase-required, purchase-required, signup required, task, expiry window, language, payout method, minimum payout and verification freshness.
- Search facets must distinguish "eligible", "not eligible", and "unknown"; do not hide unknowns behind a global label.
- Rank by user relevance, verified status, freshness, eligibility evidence, reward utility and clarity. Do not rank by affiliate commission.
- Display: source, terms, eligibility, fees, conditions, last verified, expiry, disclosure and direct official destination.
- Keep original attribution and make no earnings guarantees.

## 13. Data architecture and migration

Current repository uses static JSON catalogues and an Express + SQLite API. Preserve those contracts during a pilot:
- `data/sources.json`: approved seed/feed registry.
- `data/inbox.json`: candidate-only editorial queue.
- `data/offers.json`: human-approved public catalogue.
- Do not write crawler output directly to `offers.json`.
- Keep the existing `server/domain-hunter.js` investment-domain tool untouched and separate.
- Proposed new namespace: `discovery/` for worker modules, fixtures and tests; `docs/discovery/` for contracts and operating policies.
- For pilot storage, use append-only crawl/evidence records and normalized candidate tables. Keep source snapshots minimal and hash-based where possible.
- Before schema migration, inspect current DB and API migration conventions. Avoid destructive migrations.
- JSON export may remain the static site publication format until the public API/search architecture is intentionally changed.

## 14. Observability and quality metrics

Measure by source, country, category, language and time window:
- domains discovered / accepted / rejected.
- pages fetched / blocked / errors / 429 / retries.
- candidate yield per 100 pages.
- first-party evidence coverage.
- country eligibility evidence coverage.
- editor approval rate and reason-coded rejection rate.
- extraction precision/recall on a human-labeled benchmark.
- duplicate precision and missed-duplicate rate.
- stale/expired offers found after publication.
- median time from offer publication to detection.
- source cost in requests/bytes/runtime (not just dollars).
- false positive rate for "free", "cash", "global" and "verified" claims.
- Algeria-specific eligible / excluded / unknown counts with evidence.

Quality gates for pilot:
- 100% of published offers have original evidence and human review.
- 100% have country state explicitly represented (eligible / excluded / unknown).
- 0 auto-published candidates.
- 0 SSRF test cases reaching private/internal destinations.
- 0 uncontrolled cross-domain crawl expansion.
- Duplicates and changes are auditable.
- No critical/high security issue open in crawler modules.

## 15. ML and human review integration

Start deterministic. Build a labeled benchmark from reviewed examples only.
- Rules: source type, page cues, structured data, explicit dates, country text, cost phrases.
- Baselines: TF-IDF + logistic regression or linear SVM for relevance/category; similarity models for duplicates.
- Separate tasks: relevance, category, duplicate grouping, risk triage, country-evidence extraction.
- Model suggestions must include evidence spans and abstain when uncertain.
- Never infer country eligibility or payout reliability solely from a model.
- Use time/group-aware train-validation-test splits; prevent merchant/campaign leakage.
- Participant `QP-TRAINER-001` is audit provenance only, not a model feature.
- No model training on raw unreviewed inbox records as ground truth; no automatic publication.

## 16. Legal, privacy and ethical controls

Before crawling a source, document terms, robots policy, copyright/licensing basis, privacy exposure, jurisdictional constraints and permitted retention. Robots.txt is a crawl coordination signal, not a licence or legal authorization. Public availability alone does not mean unrestricted republication.

Store factual summaries and short evidence excerpts rather than copying full pages. Link to the original offer and preserve attribution. Do not collect personal profiles, private user data, login-only content, passwords, OTPs, payment data or sensitive personal data. Provide a source removal/contact process and maintain a suppression list. Do not circumvent technical access controls.

## 17. Threat model

| Threat | Control |
|---|---|
| SSRF / internal network access | URL + DNS + socket destination validation; redirect revalidation; egress firewall |
| DNS rebinding | Pin validated IP to socket; resolve and validate each hop |
| Crawl trap / infinite URLs | Same-host allowlist, depth/page caps, query parameter policy, canonicalization |
| Host overload | Per-host pacing, concurrency, Retry-After, circuit breaker |
| Decompression bomb / huge body | Stream byte caps, decompressed-size caps, timeouts |
| XML external entity | Disable DTD/external entities; safe parser |
| Malicious HTML / scripts | No script execution; sanitize display; isolate any later browser worker |
| Poisoned feed / prompt injection | Treat page text as untrusted data, never as system instructions; schema validate outputs |
| False "free/global/guaranteed" claim | Evidence gates, unknown state, human review |
| Duplicate campaign spam | Multi-key dedup, entity resolution, manual adjudication |
| Stale coupon | Refresh policy, expiry checks, pause on material changes |
| Copyright / terms violation | Source approval, minimization, attribution, removal workflow |
| Secret leakage | No secrets in source, logs or fixtures; secret manager if future APIs |
| Model leakage / bias | Group/time splits, subgroup metrics, human authority |

## 18. Phased delivery plan

### Phase 0 — Governance and contracts
- Approve taxonomy, source policy, evidence contract, candidate/public boundary.
- Add discovery source registry schema and security policy.
- Define benchmark and reviewer reason codes.
**Exit:** schema and policies validated; no network crawler yet.

### Phase 1 — Offline discovery core
- URL canonicalization, source registry validation, sitemap/RSS/JSON parsers using local fixtures.
- Opportunity candidate schema and deterministic extractors.
- Duplicate detection and evidence packet generation.
- Unit and adversarial security tests.
**Exit:** reproducible fixture tests, no outbound network side effects.

### Phase 2 — Safe low-volume fetcher
- Safe fetch gateway, robots parser/cache, host scheduler, request budgets, retry logic.
- Only explicitly approved public hosts; GET/HEAD; no browser execution.
- Manual invocation and dry-run by default.
**Exit:** SSRF/redirect/robots/rate-limit tests pass; no automatic publication.

### Phase 3 — Review and verification
- Review queue UI/API, evidence and country eligibility workflow, decision audit.
- First-party terms verification and status gates.
**Exit:** human approval required and every public field traceable.

### Phase 4 — Change monitoring and search
- Recheck scheduler, material-change detection, stale offer lifecycle.
- Search facets and country filters using verified records only.
**Exit:** measured freshness and duplicate quality.

### Phase 5 — ML-assisted prioritization
- Labeled benchmark, baseline models, shadow scores, subgroup/error analysis.
- Integrate only if model beats rules and saves reviewer time.
**Exit:** no autonomous publication; rollback and model card exist.

### Phase 6 — Scale and partnership
- Evaluate partner feeds/APIs, durable queue, Postgres/search index, distributed workers.
- Only after traffic, coverage and operational evidence justify complexity/cost.
**Exit:** source rights, unit economics, reliability and quality targets met.

## 19. Decision log

- Reuse proven crawler technology concepts; do not build a general web crawler from scratch.
- Build a specialized QuestPulse discovery/verification layer.
- Keep candidate, extracted, verified and published states separate.
- Use first-party evidence and country-specific proof.
- Keep investment-domain hunting separate from opportunity-site discovery.
- Keep active crypto content excluded.
- No paid services, new credentials, purchases or external commitments without explicit approval.
- No direct-to-main implementation; use feature branch and reviewed PR.
