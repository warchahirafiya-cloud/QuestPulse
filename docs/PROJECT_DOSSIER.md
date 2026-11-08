# QuestPulse — Project Dossier

**Document status:** Initial project record  
**Version:** 1.0  
**Last updated:** 2026-11-08  
**Project repository:** https://github.com/warchahirafiya-cloud/QuestPulse  
**Current published URL:** https://warchahirafiya-cloud.github.io/QuestPulse/  
**Intended domain:** questpulse.com (not owned by the project as of this document)

## 1. Project identity

**Name:** QuestPulse  
**Short description:** A Web3 discovery and rewards-information hub.

QuestPulse is intended to help people discover Web3 opportunities—including airdrops, referral programs, Telegram bots, earning websites and apps, and emerging blockchain projects—while presenting participation requirements, withdrawal conditions, evidence, and risks in a clear format.

**Product principle:** Discover. Verify. Understand the risks.

## 2. Mission and scope

The project aims to make opportunity research easier to understand and compare. It is an information and discovery platform, not an exchange, wallet, investment manager, token issuer, or guaranteed-income service.

Planned opportunity records may include:
- Official project name and source links.
- Opportunity type and concise description.
- Supported countries or eligibility restrictions, when verified.
- Required tasks, deposits, fees, and activation conditions.
- Reward asset, withdrawal minimum, network, and withdrawal fees.
- Claim or mining/reward reset interval, where applicable.
- Payment evidence and the date it was checked.
- Risk level, unresolved concerns, and verification status.

## 3. Current website structure

The current index.html contains:
- Home / introduction.
- Discover opportunities.
- Telegram bots.
- Apps.
- Safety guidance.
- About the platform.
- Arabic, English, and French language selector.
- QP points display (currently a visual counter, not a verified reward ledger).
- A multi-segment rising activity indicator (currently illustrative; live usage data is not connected).
- A Progressive Web App manifest and a basic service worker.

Some opportunity categories are explicitly marked as pending addition or verification. Their presence in the interface must not be interpreted as proof that listed offers are currently available or verified.

## 4. Verification and editorial policy

Every published opportunity should be checked against its official source before it is described as active. Record the check date and preserve source links.

Use these statuses consistently:
- **Unverified:** insufficient evidence; do not present as a recommendation.
- **Under review:** checks are in progress.
- **Verified:** official source and material conditions have been checked.
- **Paused / expired:** no longer accepting participants or no longer confirmed.

Payment screenshots or community reports are supporting evidence only; they do not independently prove that a service is safe or that future payments are guaranteed.

Never claim a reward is guaranteed. Clearly distinguish facts, user reports, estimates, and unknown information.

## 5. Safety principles

- Never request a seed phrase, private key, password, or exchange login.
- Warn users before any deposit, activation payment, wallet signature, token approval, or network transfer.
- Explain network and withdrawal fees in plain language where known.
- Flag unlimited token approvals, suspicious wallet permissions, impersonation, and unrealistic return promises.
- Do not label a project safe solely because it has a website, social account, audit badge, or payment screenshot.
- State when information is incomplete or could not be independently verified.

## 6. Revenue and user rewards

The current QP counter is a display element only. No on-chain token, cash value, redemption right, or reward liability is established by this interface. Any future points or monetization system must have separate published rules and legal review before launch.

## 7. Technical record

- Repository: warchahirafiya-cloud/QuestPulse
- Main page: index.html
- PWA manifest: manifest.webmanifest
- Service worker: sw.js
- App icon: assets/questpulse-icon.svg
- Current hosting target: GitHub Pages
- Planned custom domain: questpulse.com

The current repository files have been checked for basic syntax/structure. This is not a substitute for a complete browser, security, accessibility, or production-readiness audit.

## 8. Ownership and brand protection

The project owner should retain control of:
- The domain registrar account and registrant contact email.
- The GitHub organization/account and repository.
- DNS and hosting accounts.
- Brand artwork, source files, and project documentation.

Enable multi-factor authentication, use unique passwords, keep recovery methods current, and avoid sharing account credentials.

A domain purchase does not grant trademark rights. Trademark availability and registration depend on the relevant jurisdiction and goods/services classes. No trademark registration or legal entity registration is claimed by this document.

## 9. Domain status

The intended domain is questpulse.com. It is currently advertised as a premium resale domain on Atom, rather than a standard unregistered domain. The listing price can change and must be reconfirmed at checkout. The project does not own the domain unless a completed transfer into the owner's registrar account is verified.

Do not make payment until the final price, renewal fee, transfer procedure, registrant details, and ownership transfer conditions have been reviewed.

## 10. Roadmap

1. Complete and review the project dossier and public-facing policies.
2. Confirm the legal registration jurisdiction and perform trademark clearance.
3. Decide whether to negotiate for questpulse.com or use an affordable alternative domain.
4. If purchased, transfer the domain into an account controlled by the project owner.
5. Configure DNS, HTTPS, canonical redirects, and GitHub Pages custom-domain settings.
6. Complete real-browser testing and security review before describing the site as production-ready.

## 11. Disclaimer

QuestPulse provides informational content for discovery and research. It does not provide investment, legal, tax, or financial advice. Users must independently verify projects, understand the risks, and make their own decisions. This document records the project's intended scope and current implementation; it is not a certificate of incorporation, trademark registration, security audit, or proof of domain ownership.
