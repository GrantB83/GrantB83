# Data Model: Email Control Center & WhatsApp Web Bridge

## send_jobs

Durable outbound job for the CoS WhatsApp Web clicker (channel may also record `email` if a future queue is needed; Track A email Send writes an immediate Resend result, not a clicker job).

| Field | Type | Constraints |
| --- | --- | --- |
| id | INTEGER PK | AUTOINCREMENT |
| channel | TEXT | required; `whatsapp_web` \| `email` |
| status | TEXT | required; `pending` \| `queued` \| `claimed` \| `sent` \| `failed` \| `blocked` |
| thread_id | INTEGER | required; FK inbound_threads |
| to_address | TEXT | required (E.164 or email) |
| body_text | TEXT | required; non-empty for queue |
| subject | TEXT | nullable (email only) |
| claim_token | TEXT | nullable; set on claim |
| claimed_at | DATETIME | nullable |
| completed_at | DATETIME | nullable |
| error_code | TEXT | nullable (`qr_required`, `aw_snap`, `send_failed`, …) |
| created_at | DATETIME | default CURRENT_TIMESTAMP |
| updated_at | DATETIME | default CURRENT_TIMESTAMP |

**Indexes**: `(status, created_at)`, `(thread_id)`, `(claim_token)`.

### State transitions

```text
(human confirm) → queued
queued → claimed          (bridge claim; one winner)
claimed → sent|failed|blocked  (bridge complete only)
queued → failed|blocked   (allowed if clicker never claimed but reports block)
sent|failed|blocked → (no regress)
```

GuestFlow UI MUST NOT transition a WhatsApp Web job to `sent`.

## inbound_threads (existing)

No new required columns. `source` gains values `email`, `email_forward`, `whatsapp_web` (plus existing sources). `from_number` stores phone **or** email address (existing webhook already allows email).

## inbound_messages (existing)

Outbound email rows: `direction='outbound'`, `whatsapp_provider` null, `whatsapp_message_id` reused for Resend id when present, `send_error` on failure. Body may be stored for thread history (existing WhatsApp pattern stores draft text).

## Email send audit

`audit_log` row: `action='email_send'`, `item_type='inbound_thread'`, `item_id=threadId`, `content_after` JSON with `status`, `to` (may be redacted in logs), `messageId`, `timestamp` — not the full body if redacting.

## Inbound email event (ephemeral)

Normalized ingest payload:

- `from` (email)
- `text` (plain body or `[body unavailable]\nSubject: …`)
- `timestamp` ISO8601
- `source` = `email` or `email_forward`
- `subject` optional (stored in thread `metadata`)
- `externalMessageId` = Resend `email_id` or `message_id` for dedupe

## Validation rules

- Email To MUST look like an email (`@` present); do not invent
- WhatsApp Web `to_address` MUST be a phone (leading `+` or digits); do not invent
- `body_text` MUST be non-empty to queue or send
- Bridge complete `status` MUST be `sent` \| `failed` \| `blocked`
- Claim only from `queued`; complete only from `queued` or `claimed`
