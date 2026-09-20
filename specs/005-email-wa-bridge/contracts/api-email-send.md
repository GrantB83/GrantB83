# Contract: Guest email Send

## `POST /api/inbound/send`

Staff-authenticated. Human-gated in UI (confirm dialog). Never called by cron.

### Request

```json
{
  "threadId": 12,
  "channel": "email",
  "to": "guest@example.com",
  "subject": "Your stay at The Browns",
  "body": "Hi Sam,\n\n…"
}
```

- `channel` omitted or `whatsapp` → existing WhatsApp send (unchanged)
- `channel: "email"` → Resend via `lib/email.ts`
- `channel: "whatsapp_web"` → create `send_jobs` row `queued` (see bridge contract)

### Email success (200)

```json
{
  "success": true,
  "data": {
    "channel": "email",
    "messageId": "re_xxx",
    "timestamp": "2026-09-20T12:00:00.000Z",
    "threadStatus": "sent"
  }
}
```

### Email failure (4xx/5xx)

```json
{ "success": false, "error": "Failed to send email", "details": "…" }
```

Missing `to` / invalid email / missing `RESEND_*` → 400/503, no invented From.

### WhatsApp Web queue success (200) — not delivered

```json
{
  "success": true,
  "queued": true,
  "data": {
    "channel": "whatsapp_web",
    "jobId": 44,
    "jobStatus": "queued",
    "threadStatus": "queued"
  }
}
```

`success: true` here means **accepted**, not delivered. UI MUST show Interim / queued, not Twilio-style sent.

## `GET /api/inbound/send-jobs/:id`

Staff-authenticated poll.

```json
{
  "success": true,
  "job": {
    "id": 44,
    "channel": "whatsapp_web",
    "status": "claimed",
    "errorCode": null,
    "updatedAt": "2026-09-20T12:01:00.000Z"
  }
}
```
