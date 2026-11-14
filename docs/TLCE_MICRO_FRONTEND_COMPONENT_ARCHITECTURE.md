# TLCE Micro-Frontend & Component Architecture

**Status:** Architecture foundation and implementation contract  
**Parent product:** THE LAST COSMIC EXPLOSION (TLCE)  
**Internal branch:** QuestPulse (Q.P)  
**Repository inspected:** `warchahirafiya-cloud/QuestPulse`  
**Change boundary:** Feature branch only; no merge to `main`, deployment, database migration, or production activation.

## 1. Architectural decision

TLCE is the single parent application. Q.P is an internal product branch and must never become a competing standalone application, identity provider, or social platform.

Adopt a **modular shell first, micro-frontends at domain boundaries** strategy:

- The TLCE shell owns application bootstrap, top-level navigation, route composition, canonical identity/session, authorization, global error handling, localization context, design-system provider, and observability.
- Each branch owns its domain UI and domain-specific workflows behind a stable integration contract.
- Shared capabilities (identity, authorization, media, content registry, social engine, notifications, audit) remain parent-owned services.
- Do not split every UI component into a separately deployed micro-frontend. Component libraries are shared packages; independently deployable micro-frontends are reserved for meaningful business domains.

This limits runtime complexity while preserving independent development and future deployment where justified. AWS guidance describes the shell/remote composition model and warns about integration, dependency, governance, and testing overhead. See the references below.

## 2. Logical topology

```text
THE LAST COSMIC EXPLOSION (TLCE)
|
+-- TLCE Shell / Host
|   +-- Bootstrap & route composition
|   +-- Identity and session facade
|   +-- Authorization / capability policy
|   +-- Design System provider
|   +-- Localization and accessibility context
|   +-- Telemetry, audit correlation, error boundaries
|
+-- Shared Platform Contracts
|   +-- Actor / Identity contract
|   +-- Content and Media contracts
|   +-- Social Engine contract
|   +-- Notification contract
|   +-- Branch registry and capability manifest
|
+-- Domain branches (internal modules/remotes)
    +-- QuestPulse (Q.P)
    +-- Creative Studio
    +-- Other approved TLCE branches
```

Q.P consumes parent services through adapters. It does not own a second identity, session store, social graph, notification engine, or canonical content registry.

## 3. Composition and loading strategy

### Phase A — modular component boundaries

Begin with framework-neutral contracts and clearly bounded packages in the parent repository. Use lazy route loading and dependency boundaries. This is the default until the parent source, framework, and deployment topology are inspected.

### Phase B — micro-frontend runtime composition

Use runtime federation only when a domain needs an independently managed release lifecycle and the parent runtime can securely load it. The host resolves a trusted branch manifest; it must not accept arbitrary remote URLs from user input or branch code.

A future Module Federation implementation must:
- Pin and validate compatible runtime/shared dependency versions.
- Share framework singletons only when the chosen framework requires it.
- Load immutable, content-hashed assets through a trusted manifest.
- Keep manifest cache lifetime short and asset cache lifetime long.
- Support rollback to a previously approved manifest.
- Fail closed or show a bounded fallback when a remote is unavailable.

The exact federation tool (Webpack, Rspack, Vite integration, or another runtime) is **not selected yet**. Selection depends on the real TLCE source stack and CI/deployment constraints.

## 4. Branch manifest contract

The parent registry is authoritative. A branch manifest is metadata, not an authorization grant.

Required fields:

| Field | Meaning |
|---|---|
| `branchId` | Stable parent-issued identifier, e.g. `questpulse` |
| `version` | SemVer release identifier |
| `entry` | Parent-approved entry reference; never user-supplied |
| `routes` | Namespaced route declarations |
| `requiredCapabilities` | Named parent capabilities required by the branch |
| `apiContractVersion` | Version of parent API contracts consumed |
| `compatibility` | Supported host/API version range |
| `integrity` | Integrity metadata for immutable assets where supported |
| `status` | `draft`, `approved`, `active`, `paused`, or `retired` |

The host validates schema, signature/trust source, compatibility, route namespace, and capability policy before loading a branch. A manifest cannot grant itself permissions.

## 5. Component architecture

Use three levels:

1. **Platform components:** design tokens, accessible primitives, navigation, forms, feedback, localization helpers. Owned centrally and versioned.
2. **Domain components:** Q.P offer cards, filters, publisher workflows, and review surfaces. Owned by Q.P and built on platform components.
3. **Composition components:** shell route slots, branch mount points, loading states, and error boundaries. Owned by the TLCE shell.

Rules:
- Prefer composition over inheritance.
- Keep domain business logic out of generic UI primitives.
- Expose typed inputs, outputs, and events; do not reach into another branch's internal component state.
- Use CSS Modules, scoped styles, or Shadow DOM where appropriate; establish tokens centrally.
- Meet keyboard, focus, screen-reader, reduced-motion, and responsive requirements.
- Avoid duplicate copies of stateful framework runtimes when runtime federation is eventually enabled.

## 6. Cross-branch communication contract

Branches communicate through:
- Parent-owned APIs for authoritative reads/writes.
- Namespaced, versioned events for transient notifications.
- URL and route state for navigable/shareable state.

They must not share mutable internal stores or directly import another branch's private modules.

Event envelope:

```json
{
  "eventId": "parent-generated-unique-id",
  "eventType": "questpulse.offer.published",
  "schemaVersion": 1,
  "occurredAt": "ISO-8601 timestamp",
  "actorId": "parent-actor-id",
  "branchId": "questpulse",
  "correlationId": "parent-trace-id",
  "payload": {}
}
```

The server revalidates actor, scope, and permission for every write. Browser events are signals, never proof of authorization. Sensitive data, credentials, session tokens, and private user data must not be broadcast in event payloads.

## 7. Security and isolation requirements

- Parent identity and authorization are the only authorities.
- Apply least privilege and capability checks at the server/API boundary.
- Treat every remote branch as untrusted input until verified and approved.
- Restrict remote origins using a reviewed Content Security Policy; use explicit CORS origins where cross-origin APIs are required.
- Validate manifest schema, version compatibility, asset integrity, and allowed route prefixes.
- Prevent cross-branch access to private content and media.
- Keep secrets out of browser bundles, manifests, logs, and service-worker caches.
- Add per-branch error boundaries and resource budgets; a branch failure must not crash the shell.
- Record security-relevant actions through the parent audit service.
- Review dependency provenance and run automated vulnerability checks in CI.

## 8. Performance and resilience budgets

Set measurable budgets when the parent build and device baseline are available. Initial acceptance requirements:

- Load only the shell and the active route's required branch code.
- Lazy-load noncritical routes and defer optional media.
- Avoid duplicate framework runtimes and oversized shared kernels.
- Cache immutable hashed assets; revalidate branch manifests.
- Provide loading, unavailable, and retry states without infinite retry loops.
- Record route-level load duration, remote failures, and bundle size by branch.
- Test on constrained mobile networks and lower-memory Android devices before activation.

Numeric budgets must be established from measured TLCE baselines, not invented before source inspection.

## 9. Testing and release gates

Each branch must provide:
- Unit tests for domain logic and components.
- Contract tests for parent APIs and branch manifest.
- Accessibility checks for interactive routes.
- Integration tests for host mount/unmount, routing, localization, and shared design tokens.
- Security tests for capability enforcement, origin policy, manifest validation, and cross-branch isolation.
- End-to-end tests for critical user journeys.
- Performance checks for initial shell load and branch route load.

Release sequence:
1. Build and test branch artifact in isolation.
2. Validate manifest and API compatibility in a staging host.
3. Run integration, security, accessibility, and performance gates.
4. Activate for internal/test audience using a parent-controlled feature flag.
5. Monitor errors and performance; keep a tested rollback target.
6. Expand exposure only after explicit release approval.

## 10. Q.P migration boundary

The existing Q.P repository contains its own prototype publisher API and local identity/session tables. These are not to become authoritative after TLCE integration.

| Existing Q.P concept | Parent owner | Required action |
|---|---|---|
| Publisher user/account | TLCE Identity | Map to parent actor; retain approved publisher profile metadata only |
| Q.P session/cookie | TLCE Identity | Retire as a second identity/session authority |
| Offer/post record | TLCE Content Registry + Q.P domain | Map accepted publication to parent canonical content ID |
| Upload/media | TLCE Media | Use parent media policy and storage contract |
| Moderation | TLCE Authorization + Moderation | Use parent roles, scoped permissions, reason codes, audit |
| Reactions/comments/shares | TLCE Social Engine | Implement once in parent, consumed by Q.P |
| Notifications | TLCE Notifications | Consume parent events/service |

No migration is safe until the actual parent schema and APIs have been inspected.

## 11. Implementation blockers and next engineering actions

The connected GitHub workspace currently exposes the Q.P repository but no TLCE parent repository. The Q.P repository is therefore not a substitute for the parent source.

Before runtime code is integrated:
1. Identify or connect the actual TLCE parent repository.
2. Inspect its framework, build system, routing, identity, authorization, API, database, event, CI, and deployment conventions.
3. Map this contract to real source paths and avoid creating parallel systems.
4. Implement the registry and shell integration in the parent repository on a feature branch.
5. Implement Q.P as an internal branch adapter and domain package.
6. Add tests and documentation, then request review.
7. Do not merge to `main`, deploy, migrate production data, or activate external remotes without the relevant release approval.

## 12. Current delivery status

- [x] Architecture decision recorded.
- [x] Shell, branch, component, and shared-platform ownership defined.
- [x] Manifest, event, security, performance, and test contracts documented.
- [x] Q.P-to-parent ownership/migration boundary documented.
- [ ] Runtime implementation in TLCE parent — blocked on parent repository access.
- [ ] Runtime federation tool selection — blocked on parent stack inspection.
- [ ] Staging integration and device tests — blocked on parent source and environment.
- [ ] Production activation — not performed.

## References

- AWS Prescriptive Guidance, *Create a portal for micro-frontends using Amplify, Angular, and Module Federation*: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/create-amplify-micro-frontend-portal.html
- Nx, *What is Micro Frontend Architecture?*: https://nx.dev/docs/kb/micro-frontend-architecture
- AWS Prescriptive Guidance, *Understanding and implementing microfrontends on AWS*: https://docs.aws.amazon.com/pdfs/prescriptive-guidance/latest/micro-frontends-aws/micro-frontends-aws.pdf

---
**Architecture invariant:** one parent shell, one identity, one shared platform, multiple bounded branches.
