# WhatsApp Web bridge contract (Interim)

Label in GuestFlow UI: **Interim · WhatsApp Web**.

This is **not** live Twilio / Cloud API. GuestFlow never reports success until the CoS Chrome clicker completes a job as `sent`. Queue, pending, and claimed are not success.

Do **not** convert or port `+27836458313`. No SMS vendors.

## Auth

All `/api/bridge/*` calls:

- `Authorization: Bearer $BRIDGE_JOB_SECRET`, or
- `x-bridge-secret: $BRIDGE_JOB_SECRET`

Fallback (if `BRIDGE_JOB_SECRET` unset): `CRON_SECRET`, then `INBOUND_WEBHOOK_SECRET`.

Production base: `https://guestflow.thebrowns.co.za`

## Staff flow

1. Guest thread → channel **Interim · WhatsApp Web** → **Send** → confirm.
2. GuestFlow creates `send_jobs` row `status=queued` and returns `jobId`.
3. UI polls `GET /api/inbound/send-jobs/:id` (staff cookie).
4. Show queued/claimed as interim. `blocked` / `failed` = red error banner, not a Twilio-style success.

## Clicker loop

### 1. List

`GET /api/bridge/jobs?status=queued`

```json
{
  "success": true,
  "jobs": [
    {
      "id": 44,
      "channel": "whatsapp_web",
      "status": "queued",
      "threadId": 12,
      "to": "+27821234567",
      "body": "Hi Sam,\n\nSee you Friday.",
      "subject": null
    }
  ]
}
```

### 2. Claim

`POST /api/bridge/jobs/:id/claim`

409 if not queued. One winner. Status becomes `claimed`.

### 3. Type one bubble

- Open WhatsApp Web to `to` (E.164).
- Type `body` as **one bubble**.
- Newlines (`\n`) → **Shift+Enter**. Do not send mid-body. Do not split into multiple bubbles.
- Enter / click Send once at the end.

### 4. Complete

`POST /api/bridge/jobs/:id/complete`

| Clicker outcome | Body |
| --- | --- |
| Message left the composer | `{ "status": "sent" }` |
| Type/send error | `{ "status": "failed", "error": "timeout" }` |
| QR login screen | `{ "status": "blocked", "error": "qr_required" }` |
| Chrome Aw Snap / crash | `{ "status": "blocked", "error": "aw_snap" }` |

GuestFlow UI must not call complete. Only the clicker marks `sent`.

## Inbound MVP

Guest lines observed on WhatsApp Web → existing inbound shape:

`POST /api/inbound/webhook`

```json
{
  "from": "+27821234567",
  "text": "Thanks, see you Friday",
  "timestamp": "2026-09-20T12:00:00.000Z",
  "source": "whatsapp_web",
  "externalMessageId": "optional-dedupe-key"
}
```

Header: `Authorization: Bearer $INBOUND_WEBHOOK_SECRET`.

## Schema

`send_jobs`: id, channel (`whatsapp_web`\|`email`), status (`pending`\|`queued`\|`claimed`\|`sent`\|`failed`\|`blocked`), thread_id, to_address, body_text, subject, claim_token, claimed_at, completed_at, error_code, created_at, updated_at.

Local/Turso: `npm run db:migrate:send-jobs` in `apps/guestflow` (idempotent; apply to production only with Grant `APPROVE APPLY MIGRATION`).
