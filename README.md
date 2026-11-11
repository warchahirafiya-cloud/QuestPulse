# QuestPulse

**A global directory for discovering carefully reviewed rewards, online stores, discounts, coupons, competitions, loyalty programmes, and digital tasks.**

QuestPulse combines a public global offers feed with precise search by eligible country, category, reward type, merchant, availability, and expiry. It covers rewards and gifts, online stores, discounts and coupons, competitions, loyalty programmes, apps, tasks, and referral offers.

## Live project
- Website: https://getquestpulse.com
- Repository: https://github.com/warchahirafiya-cloud/QuestPulse

## Current scope
The active project is focused on non-cryptocurrency rewards and digital earning opportunities. Cryptocurrency, blockchain, token, mining, and wallet-related features are excluded from the active website and remain only in the historical archive.

## Offer discovery and publishing
- `data/sources.json` is the approved source registry.
- `scripts/ingest-offer-feeds.mjs` imports items from approved public feeds into `data/inbox.json`.
- Feed imports are **discovery candidates only**. They are never published automatically.
- `scripts/validate-inbox.mjs` checks candidate IDs, source attribution, HTTPS links, country scope, timestamps, and review status; it rejects any attempt to mark an inbox item as published.
- An editor must verify the original source, eligible countries, current validity, fees, terms, and redemption method before manually adding an offer to `data/offers.json` with `status: "published"`.
- The daily GitHub Actions job discovers feed candidates, expires ended offers, and validates the public catalogue.
- Credentialed integrations such as eBay and Flipkart remain disabled until API access and usage terms are approved.

The active discovery feeds currently include Meh's official daily-deal RSS, Promo Magpie's US offers feed, and Voucher Magpie's UK offers feed. The two curated directories state that their offers come from merchant sites or official affiliate programmes, and their feeds specify country and currency. All three feeds are candidate-only; none is treated as globally eligible or published automatically. Source attribution and links to the original feed listing are retained.

An empty public catalogue is intentional until real offers pass review. A listing is not a guarantee of earnings, availability, or payment.

## Main pages
- [Home and global offers/search](index.html)
- [Published offer catalogue](data/offers.json)
- [Candidate review inbox](data/inbox.json)
- [Source integration registry](data/sources.json)
- [Evaluation guide](guide.html)
- [Link checking](link-check.html)
- [Account safety checklist](account-safety.html)
- [Privacy](privacy.html)
- [Terms](terms.html)
- [Previous versions archive](archive.html)

## Multi-publisher publishing (introductory phase)
- Public post types are fixed to: **اغتنم فرصة**, **مكافأة مباشرة**, and **منتوج جديد**.
- Publisher profiles are designed for individuals, legal entities, stores, and companies; administrator/developer access is reserved for project operators.
- The publisher page supports local draft preparation, HTTPS link checks, image/video previews, and JSON metadata export.
- Important: this static GitHub Pages release does not yet provide real user authentication, shared uploads, central submission, or live moderation. Drafts stay in the visitor's browser. Do not treat a local draft as a submitted or published post.
- See [Publisher Center](publish.html), [Publisher Account](publisher-account.html), [Admin Review](admin-review.html), [Multi-Publisher Policy](publishing-policy.html), and [submission schema](schemas/publisher-submission.schema.json).
- A Node.js + SQLite API scaffold now exists under `server/`; see [API Phase 2 setup](API_PHASE_2.md). It has account activation, server-side sessions, pending submissions, media validation, and admin review endpoints.
- A secure backend is required before activating shared accounts, public submissions, or media hosting. No paid service or new Cloudflare dependency is enabled.

## Editorial principles
- Clearly distinguish verified, under review, paused, and expired opportunities.
- Show country eligibility, reset interval, minimum withdrawal, fees, and payout methods where confirmed.
- Never invent payment proof or imply guaranteed income.
- Do not request passwords, one-time codes, or unnecessary sensitive information.
- Keep the historical cryptocurrency materials out of the active site.

**Discover carefully. Verify first.**
