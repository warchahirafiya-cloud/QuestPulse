# TLCE Social Engine — Internal API Contract

**Status:** Proposed contract; no live routes are implied.
**Consumer:** QuestPulse internal branch.
**Provider:** TLCE Core Social Engine.

## 1. Contract rules

- All routes are internal, authenticated, and branch-authorized.
- Actor identity is derived exclusively from the TLCE session/token; never accept `actor_id` from clients.
- Every target resolves through the parent content registry and verifies branch, visibility, lifecycle, and moderation state.
- Use JSON, HTTPS, request IDs, bounded payloads, cursor pagination, and stable machine-readable error codes.
- Mutations are idempotent where possible and use transactions with an outbox record.
- API versioning is parent-owned. Route examples below are illustrative until TLCE conventions are inspected.

## 2. Reaction endpoints

### Set or replace current reaction
`PUT /api/v1/social/{targetType}/{targetId}/reaction`

Request:
```json
{ "type": "like" }
```

Response:
```json
{
  "targetId": "opaque-id",
  "viewerReaction": "like",
  "counts": { "like": 12 },
  "requestId": "opaque-request-id"
}
```

### Remove current reaction
`DELETE /api/v1/social/{targetType}/{targetId}/reaction`

Response contains the updated viewer state and server-derived counts. Repeating the same delete must not decrement counts twice.

### Read reaction summary
`GET /api/v1/social/{targetType}/{targetId}/reactions`

Returns aggregate counts and the current viewer's reaction, if authenticated and authorized.

## 3. Comment endpoints

- `GET /api/v1/social/{targetType}/{targetId}/comments?cursor={cursor}&limit=20`
- `POST /api/v1/social/{targetType}/{targetId}/comments`
- `PATCH /api/v1/social/comments/{commentId}`
- `DELETE /api/v1/social/comments/{commentId}`
- `POST /api/v1/social/comments/{commentId}/report`

Create request:
```json
{ "body": "Comment text", "parentCommentId": null }
```

Rules:
- MVP permits root comments and one-level replies only.
- Author may edit/delete own comment subject to policy; moderators use a distinct permission and audited action.
- Deleted comments use a tombstone/soft-delete state where policy requires thread integrity.
- Output is plain text or safely encoded content; never render user-supplied HTML.
- List endpoints exclude hidden/deleted content for ordinary viewers and use stable cursor ordering.

## 4. Share endpoints

`POST /api/v1/social/{targetType}/{targetId}/shares`

Request:
```json
{ "channel": "copy_link", "confirmation": "user_action", "dedupeKey": "client-generated-opaque-key" }
```

Allowed initial channels: `copy_link`, `native_share`. The frontend records a share only after explicit copy-link action or successful completion reported by the native share API. Opening a share sheet alone is not a completed share. Do not claim a third-party post was published.

## 5. Moderation and reporting

- `POST /api/v1/social/reports`
- `GET /api/v1/admin/social/reports?status=pending&cursor=...`
- `PATCH /api/v1/admin/social/reports/{reportId}`
- `PATCH /api/v1/admin/social/comments/{commentId}/moderation`

Admin routes require parent moderation permissions, branch scope, reason codes, and audit logging. A publisher must not moderate reports against their own content unless a separate policy explicitly permits a limited action.

## 6. Error model

Use consistent responses:
- `400 VALIDATION_ERROR`: invalid body/query.
- `401 AUTHENTICATION_REQUIRED`: no valid parent session.
- `403 FORBIDDEN`: authenticated but lacks branch/object permission.
- `404 TARGET_NOT_FOUND`: target absent or intentionally undisclosed.
- `409 STATE_CONFLICT`: target state disallows action.
- `413 PAYLOAD_TOO_LARGE`: body exceeds limit.
- `429 RATE_LIMITED`: rate limit reached.
- `500 INTERNAL_ERROR`: generic server failure; do not leak stack traces.

## 7. Domain events

Publish through parent outbox/event bus:
- `social.reaction.created`
- `social.reaction.removed`
- `social.comment.created`
- `social.comment.updated`
- `social.comment.deleted`
- `social.share.recorded`
- `social.report.created`
- `social.moderation.actioned`

Event envelope:
```json
{
  "eventId": "opaque-id",
  "eventType": "social.comment.created",
  "schemaVersion": 1,
  "branchId": "questpulse",
  "targetType": "offer",
  "targetId": "opaque-id",
  "occurredAt": "UTC timestamp",
  "actorId": "opaque-id"
}
```

Do not include comment body, email, credentials, session tokens, or unnecessary personal data in event payloads. Consumers must be idempotent.

## 8. Security requirements

- CSRF defense for cookie-authenticated state changes; strict origin and CORS allowlist.
- Per-account and per-IP rate limits; anti-spam and abuse detection.
- Object-level authorization for every target and comment.
- Input validation, output encoding, safe link handling, and request-size limits.
- No client-authoritative counters or actor IDs.
- Audit moderator operations and apply retention/deletion policy.
- Never convert likes, comments, or shares into cash/reward eligibility without a separately approved fraud-resistant policy.

## 9. Contract acceptance tests

1. Anonymous request cannot mutate social state.
2. User cannot act as another actor by submitting a forged actor ID.
3. User cannot react/comment/share on private, hidden, expired, or unapproved content.
4. Repeated like request results in one reaction.
5. Repeated unlike request does not decrement twice.
6. Concurrent requests preserve unique constraints and correct counters.
7. Reply depth greater than one is rejected in MVP.
8. Comment output cannot execute HTML/script.
9. Copy-link/native-share event is recorded only after user confirmation.
10. Moderation changes are permission-checked and audited.
11. Event delivery retries do not duplicate notifications or counters.
12. Branch Q.P requests cannot access another branch's private content.
