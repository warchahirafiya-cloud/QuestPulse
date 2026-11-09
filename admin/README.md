# QuestPulse Editorial Console

Open `admin/index.html` on the published site or through a local static server.

## Security model
- This is a **local-only editor**. It fetches `../data/opportunities.json`, edits an in-memory copy, and exports a replacement JSON file.
- It does not authenticate users, write to GitHub, or modify the live website.
- Do not add GitHub tokens, API keys, passwords, or other secrets to this page.
- The page is intentionally marked `noindex,nofollow`; that is not access control. Anyone who knows the URL can open it, but cannot publish changes through this tool.
- To publish an approved data change, a repository maintainer must review the exported JSON and commit it through the normal GitHub workflow.

## Editorial/legal gate
The console enforces basic data consistency only. It does not establish legal clearance, truthfulness of claims, safety, eligibility, profitability, or payment reliability. Follow `docs/OPPORTUNITY_REVIEW_WORKFLOW.md` and the legal gate in the project dossier before adding live opportunities, promotional/referral links, deposit calls, or participation instructions.

## Validation
- Stable unique IDs and supported status/type fields.
- HTTPS-only official and verification URLs.
- Valid review dates.
- A record cannot be marked `verified` without an official HTTPS URL, at least one HTTPS verification source, and a valid review date.
- A record cannot be marked `active` unless its review status is `verified`.

These are technical minimums, not a replacement for independent human review.
