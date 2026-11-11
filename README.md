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
- An editor must verify the original source, eligible countries, current validity, fees, terms, and redemption method before manually adding an offer to `data/offers.json` with `status: "published"`.
- The daily GitHub Actions job discovers feed candidates, expires ended offers, and validates the public catalogue.
- Credentialed integrations such as eBay and Flipkart remain disabled until API access and usage terms are approved.

The first active automated feed is Meh's official daily-deal RSS. Its coverage is US-focused and must not be treated as globally eligible. The source is explicitly labelled as a candidate-only discovery feed.

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

## Editorial principles
- Clearly distinguish verified, under review, paused, and expired opportunities.
- Show country eligibility, reset interval, minimum withdrawal, fees, and payout methods where confirmed.
- Never invent payment proof or imply guaranteed income.
- Do not request passwords, one-time codes, or unnecessary sensitive information.
- Keep the historical cryptocurrency materials out of the active site.

**Discover carefully. Verify first.**
