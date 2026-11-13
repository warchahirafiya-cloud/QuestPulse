# TLCE Repository Blueprint — Modular Monolith

**Status:** Proposed logical layout, not a claim about the existing parent repository.
**Parent product:** THE LAST COSMIC EXPLOSION.
**Internal branch:** QuestPulse (Q.P).

## 1. Architecture decision

Use a Modular Monolith as the initial architecture. One deployable backend may contain strongly bounded modules. Modules communicate through explicit application services and domain events rather than direct cross-module database writes. This keeps identity and social capabilities unified while allowing Q.P to remain an internal branch.

Do not create a standalone Q.P application, separate login, or separate Social Engine.

## 2. Proposed logical layout

```text
tlce/
  apps/
    web/                       # Unified TLCE web client and navigation
    api/                       # Parent API entrypoint
  src/
    core/
      identity/                # Authentication, sessions, profiles
      authorization/            # RBAC, branch and object permissions
      branches/                 # Branch registry and lifecycle
      content/                  # Canonical content registry
      social/
        reactions/
        comments/
        shares/
        reports/
        moderation/
      notifications/
      media/
      localization/
      audit/
    branches/
      questpulse/
        domain/                  # Offers, eligibility, sources, verification
        application/             # Q.P use cases/adapters
        presentation/            # Q.P screens/components
        policies/
    infrastructure/
      database/
      event-bus/
      storage/
      email/
      observability/
    contracts/
      api/
      events/
      schemas/
  migrations/
  tests/
    unit/
    integration/
    security/
    contract/
    e2e/
  docs/
```

This is a target layout only. Preserve actual existing paths and conventions when the real parent repository is available; do not move or rename files merely to match this proposal.

## 3. Dependency direction

- UI -> branch application services -> parent core contracts.
- Q.P domain may depend on shared value objects and interfaces, but not directly on identity/session storage.
- Social Engine may reference canonical content interfaces, not Q.P internal tables.
- Notifications subscribe to social events; Social Engine does not implement its own delivery channel.
- Infrastructure implements ports defined by core/application modules.
- No branch may write directly to another branch's tables.

## 4. Shared request lifecycle

1. Unified TLCE client sends a request with parent session.
2. Identity resolves the canonical actor.
3. Authorization verifies account, branch, target, and action permissions.
4. Q.P adapter resolves the canonical content target when the request originates in Q.P.
5. Social Engine executes the mutation transaction and writes an outbox event.
6. Parent event processor updates notifications and rebuildable projections.
7. API returns authoritative state and counts.
8. UI updates optimistically only with rollback on failure.

## 5. Q.P integration adapter

The adapter maps a Q.P offer identifier to the canonical parent content ID. It must not accept a client-supplied mapping. Every call includes internal branch context, and the parent verifies that the target belongs to Q.P.

Q.P retains its existing offer verification, source attribution, country eligibility, expiry, and editorial moderation requirements. Social engagement must never mark an offer verified or published.

## 6. Delivery milestones

### M0 — Discovery and source verification
- Locate and inspect actual TLCE parent repository and protected reference assets.
- Identify current framework, database, identity, routing, event, deployment, and test conventions.
- Produce a path-by-path integration map before changing source.

### M1 — Parent core contracts
- Confirm canonical identity and branch authorization.
- Confirm content registry and target ID model.
- Approve master schema and API/event contracts.

### M2 — Social Engine core
- Implement migrations, repositories, application services, APIs, outbox, and tests in the parent repository.
- Implement abuse limits, moderation, privacy, and audit behavior.

### M3 — Q.P adapter and UI
- Connect Q.P cards to parent canonical IDs.
- Add like/comment/share controls to the Q.P interface.
- Add Arabic/English labels, RTL/LTR, accessibility, loading, and failure states.

### M4 — Verification and controlled release
- Run unit, contract, concurrency, security, privacy, accessibility, and end-to-end tests.
- Enable behind a feature flag and observe abuse/error rates.
- Deployment and paid infrastructure require separate explicit approval.

## 7. Repository discovery gate

The available GitHub workspace currently exposes the QuestPulse repository, but the TLCE parent source has not been located in the connected repositories. Therefore:
- this blueprint is not an implementation map;
- no parent source files have been edited;
- no Q.P runtime files or `app.asar` reference asset have been altered;
- no deployment, purchase, paid service, or public activation has occurred.

Implementation starts only after the actual TLCE repository is identified and its current architecture is inspected.
