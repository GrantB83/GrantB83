# Contract: UMI Inbox read-only

## `GET /api/umi/inbox` and `GET /api/umi/threads/:id`

- Read-only. Zero INSERT/UPDATE/DELETE/ALTER as a result of the request.
- Must not call `ensureArrivingBookingThreads` or `applyTempHygiene`.
- `GET /api/comms` uses the same read-only list helper.

## Thread create

Allowed only on inbound ingest or outbound send when a real message is stored.

## `needsAttention`

`true` only when the thread has ≥1 inbound message and no outbound at or after that inbound.

Never `true` for zero-message threads.

## Codes reason

When a draft/portal omit codes: attach `codes: property unresolved`. That reason is not a substitute for unanswered-inbound `needsAttention`.
