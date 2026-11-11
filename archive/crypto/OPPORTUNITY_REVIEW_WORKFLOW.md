# QuestPulse Opportunity Review Workflow

**Purpose:** Maintain accurate, dated, source-backed informational records. This file describes an editorial data process; it does not authorize promotion, referrals, monetization, wallet connections, deposits, or other regulated activity.

## Legal gate before publication

The project dossier records a legal operating constraint concerning virtual-asset activities and requires qualified written legal advice before launching features that may promote, facilitate, or monetize such activities. Do not populate this registry with live offers, referral URLs, Telegram bot links, calls to deposit, or participation instructions until that legal review has cleared the exact operating model and content.

## Data source

The website reads `data/opportunities.json`. Each record is matched to a card through its stable `id`.

Required fields:
- `id`: stable identifier matching the card's `data-opportunity-id`.
- `type`: card category.
- `status`: `unverified`, `under_review`, `verified`, `paused`, or `expired`.
- `availability`: `unknown`, `active`, `paused`, or `expired`.
- `officialUrl`: official HTTPS source, or `null`.
- `reviewedAt`: ISO-8601 date/time, or `null`.
- `verificationSources`: array of source records with HTTPS `url` and a concise `checkedFor` note.
- `paymentEvidence`: array of evidence records. Evidence supports a payment claim but never guarantees future payment.
- `riskLevel`: `low`, `medium`, `high`, or `unrated`.
- `notes`: concise unresolved issues and editorial context.

## When a record can appear as verified

The front end only displays the verified badge when all of these exist:
1. `status` is `verified`.
2. `officialUrl` is a valid HTTPS URL.
3. At least one `verificationSources` entry contains a valid HTTPS URL.
4. `reviewedAt` is a valid date.

This is a technical minimum, not a substitute for human editorial review or legal clearance. A verified source does not mean the opportunity is safe, profitable, available to every visitor, or guaranteed to pay.

## Ordering and freshness

Cards are ordered by:
1. Verified records with the required source and date fields.
2. Records under review.
3. Unverified records.
4. Paused records.
5. Expired records.

Within a status group, the newest review date appears first. Missing or invalid data cannot elevate a card to verified.

## Review checklist

Before changing a record:
- Confirm the official domain/account through independent channels.
- Record the exact date and time checked.
- Separate official facts from community reports and estimates.
- Check eligibility, required actions, deposits, activation fees, withdrawal minimums, payout asset, network and fees where legally appropriate to document.
- Flag wallet signatures, token approvals, custody requests, seed phrase requests, and suspicious permissions.
- For token-related information, assess liquidity, FDV, vesting, unlocks, and contract risks where legally appropriate.
- Record limitations and unresolved questions.
- Re-check expired or paused status instead of silently removing history.

## Updating the registry

Edit `data/opportunities.json` on the default branch. Keep the JSON valid, preserve stable IDs, use ISO-8601 dates, and do not invent proof, links, amounts, or availability. The service worker requests this registry network-first so published editorial updates can be retrieved without waiting for an application-shell cache rebuild.

All current records are intentionally placeholders: unverified, without official URLs, review dates, or payment evidence.
