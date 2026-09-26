# Data Model: Sprint 6

No new tables. No production migration.

## InboxThread (list)

| Field | List rule |
|-------|-----------|
| id, bookerName, suite, checkIn, checkOut, nightsbridgeBookingId | Unchanged |
| preview, hasOpenDraft, needsAttention, sortBucket, pendingReply | Batched, not per-thread queries |
| careWindow | Slim: `{ state, label }` only. `lastWabaInboundAt`, `remainingMs`, `windowExpiresAt` deferred to thread open |
| fromNumber | Unchanged (not last4 on list cards) |

Pagination: after existing sort (arriving → pending → recent), apply `limit` (default 25, max 50) and keyset `cursor` = `{ lastMessageAt, id }` of the last row on the previous page.

## WaWebSentinelTarget

| Field | Rule |
|-------|------|
| threadId | Required |
| bookerName | Existing thread/booking name; never invented |
| last4 | Last 4 digits of stored from-number when it is a phone; else omitted |
| messageId | Sentinel inbound row id |
| sentinel | Exactly `[body unavailable]` or `[metadata-only]` |
| bookingLinked | True when `inbound_threads.booking_id` is set |

Query universe: `whatsapp_web` inbound, body exact match, thread not `linked`, and (open stay by SAST dates **or** message in last 14 days).

## Recovered stay body

When Ship B replace-in-place writes a non-sentinel `message_text`:

1. `body_unavailable = 0`
2. If thread is booking-linked AND recovered text is not independently spam/marketing → `is_spam = 0` and status not `spam`
3. If recovered text independently matches spam phrases → keep Filtered (no invent, no unmask)

## ComposerDraft (client)

One store: `draft`, `channel`, `selectedTemplate`, `templateVars`, `emailTo`. Compact and pop-out are views. `popOutOpen` is UI-only.

## Validation

- Sentinel list MUST NOT return `[observe-probe]` (different token; not in Sprint 6 target list).
- Refresh MUST NOT write a body that was not in the source payload.
- Inbox MUST NOT invent threads to fill a page.
