# API Contract: Daily Brief Enqueue Gate

**Endpoint**: `GET /api/daily-brief` (extended)

## Additional response fields

| Field | Type | Description |
|-------|------|-------------|
| `enqueueSupported` | `boolean` | `false` until staff-ops queue exists |
| `enqueueBlocker` | `string \| null` | Human-readable reason when unsupported |
| `approvalQueuePath` | `string` | `'/needs-approval'` — existing queue (no staff-ops type today) |

## POST enqueue — not implemented

No `POST /api/daily-brief/enqueue` in this PR (fail-closed).

Future contract (if unblocked):

```http
POST /api/daily-brief/enqueue
Content-Type: application/json

{
  "tenant_id": 1,
  "target_date": "2026-09-18",
  "brief_text": "<from generateWhatsAppBrief only>"
}
```

Response `201` with `{ "success": true, "draftId": number, "status": "pending_approval" }` — **no send**.

## Errors

When `enqueueSupported` is false, clients MUST use copy/export only. No error on GET; gate fields inform UI.
