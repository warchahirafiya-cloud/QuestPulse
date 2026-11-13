# TLCE Social Engagement Engine — QuestPulse Integration Specification

**Status:** Architecture specification only; not a production implementation.
**Parent application:** THE LAST COSMIC EXPLOSION (TLCE)
**Internal branch:** QuestPulse (Q.P)

## 1. Architectural rule

Likes, comments, and shares belong to the **shared TLCE Social Engine**. QuestPulse consumes that engine through internal contracts and events. Do not create a separate QuestPulse identity system, social graph, engagement database, or independent notification service.

The existing QuestPulse repository contains a Node.js/Express + SQLite API scaffold and a static GitHub Pages frontend. The public site and API scaffold are not currently a deployed, connected social service. This document does not claim that the parent TLCE backend exists or that these features are live.

## 2. Engagement capabilities

### 2.1 Likes / reactions
- Authenticated users can add or remove one reaction per user and target.
- MVP reaction: `like`; the data model may support a controlled future set such as `love`, `insightful`, and `helpful`.
- Enforce uniqueness on (actor_id, target_type, target_id, reaction_type); use an atomic upsert/delete so retries cannot inflate counts.
- Return the viewer's reaction state and aggregate counts with each feed item.
- Prevent reactions to deleted, hidden, expired, or non-public content according to parent policy.

### 2.2 Comments
- Authenticated users can create, edit, and delete their own comments, subject to retention and audit policy.
- Support one-level replies in the first release; deeper nesting can be introduced only after UX and moderation review.
- Validate text length and encoding server-side; escape output at render time; never render user HTML.
- Add report, hide, lock, and moderation-review states. Rate-limit creation and edits; detect repeated spam and suspicious links.
- Notify the post owner and relevant participants through the shared TLCE Notifications service, respecting mute and privacy settings.
- Keep an auditable moderation trail; do not silently erase moderator actions.

### 2.3 Shares
- Provide a native share-sheet action when supported (`navigator.share`) and a copy-link fallback.
- Generate a stable canonical public URL for content that is eligible to be shared.
- Record a share event only after a confirmed share-sheet completion or explicit copy-link action; distinguish `native_share`, `copy_link`, and future approved destinations.
- Never claim that an external share was published when the app only opened a share sheet or copied a link.
- Do not expose private content, private account data, or moderation-only details in share previews.
- Apply per-user and per-target deduplication windows to analytics; do not use raw share counts as a reward or ranking signal without anti-abuse controls.

## 3. Shared data model (parent-owned)

Suggested logical tables; adapt names to the parent database conventions:

- `reactions(id, actor_id, target_type, target_id, reaction_type, created_at)`
  - Unique: `(actor_id, target_type, target_id, reaction_type)`
  - Index: `(target_type, target_id, created_at)`
- `comments(id, target_type, target_id, author_id, parent_comment_id, body, status, created_at, updated_at, deleted_at)`
  - Foreign keys to shared identity/content where supported.
  - Index: `(target_type, target_id, status, created_at)` and `(author_id, created_at)`.
- `share_events(id, actor_id, target_type, target_id, channel, created_at, dedupe_key)`
  - Unique dedupe key where appropriate; index by target and time.
- `content_reports(id, reporter_id, target_type, target_id, reason, details, status, created_at, reviewed_by, reviewed_at)`
- `moderation_actions(id, moderator_id, target_type, target_id, action, reason, created_at)`

All content targets must be resolved by the parent content registry. QuestPulse records must carry the internal branch identifier and be authorized against branch policy. The parent owns canonical IDs, identity, permissions, and aggregate counts.

## 4. Internal API contract (illustrative)

All routes require the shared TLCE session and branch authorization. These are proposed contracts, not currently deployed endpoints.

- `PUT /internal/social/{targetType}/{targetId}/reactions/me` — set the current user's reaction; idempotent.
- `DELETE /internal/social/{targetType}/{targetId}/reactions/me` — remove the current user's reaction.
- `GET /internal/social/{targetType}/{targetId}/reactions` — paginated/aggregated reaction summary.
- `GET /internal/social/{targetType}/{targetId}/comments?cursor=...` — cursor-paginated visible comments.
- `POST /internal/social/{targetType}/{targetId}/comments` — create comment or reply.
- `PATCH /internal/social/comments/{commentId}` — edit own comment or authorized moderation action.
- `DELETE /internal/social/comments/{commentId}` — soft-delete according to policy.
- `POST /internal/social/{targetType}/{targetId}/shares` — record a confirmed share/copy event.
- `POST /internal/social/reports` — report content or comment.

Use cursor pagination, bounded page sizes, consistent error codes, request IDs, and server-side validation. Do not accept actor IDs from the client; derive identity from the authenticated session.

## 5. Domain events

Publish parent-owned events through the internal event bus:
- `social.reaction.created`
- `social.reaction.removed`
- `social.comment.created`
- `social.comment.updated`
- `social.comment.hidden`
- `social.share.recorded`
- `social.content.reported`
- `social.moderation.actioned`

Events include stable event ID, branch ID, target ID/type, actor ID where policy permits, timestamp, and schema version. Consumers must be idempotent. Do not place comment bodies, emails, session tokens, or other unnecessary personal data in event payloads.

## 6. Security, privacy, and integrity controls

- Shared authentication, RBAC, branch-level authorization, and object-level access checks on every request.
- CSRF protection for cookie-authenticated mutations; strict origin policy; HTTPS only.
- Rate limits per account and IP, anti-spam controls, payload limits, and safe URL handling.
- Parameterized SQL, output escaping, and safe rendering; no client-supplied counts.
- Soft deletion and retention rules consistent with the parent privacy policy; support account deletion and data export as required.
- Audit moderator actions and protect audit records from ordinary publishers.
- Aggregate counts are server-derived. Use transactions for mutation + event/outbox write to avoid lost notifications or double counts.
- Shares and reactions must not grant rewards, cash value, or ranking boosts by themselves; if gamification is later approved, add fraud controls and a separate reviewed policy.

## 7. UI behavior and accessibility

Each eligible post card should show:
- Like button with selected state, accessible label, and count.
- Comment action with count and a paginated discussion view.
- Share action with native share-sheet and copy-link fallback.
- Loading, empty, retry, and error states; keyboard operation and visible focus.
- Arabic/English labels and RTL/LTR layout using the parent localization system.

Do not show controls for anonymous visitors as if they can complete an action. Prompt for sign-in through the shared TLCE identity flow.

## 8. Delivery sequence

1. Inspect the actual TLCE parent repository and settle its identity, database, event-bus, and deployment contracts.
2. Implement the shared Social Engine in the parent core, with migrations and API tests.
3. Add branch authorization and QuestPulse target adapters; do not fork the engine into Q.P.
4. Add UI controls to the Q.P branch and connect them only after the parent API is deployed.
5. Run authorization, abuse, concurrency, privacy, accessibility, and integration tests.
6. Enable gradually behind a feature flag; retain moderation and rollback controls.

## 9. Current implementation boundary

No code, database migration, live API route, frontend control, or deployment has been changed by this specification. The current QuestPulse scaffold remains as-is until the parent TLCE source and integration contracts are inspected and implementation is explicitly carried out.
