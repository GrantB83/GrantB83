# Contract: Inbound email + WhatsApp Web ingest

## `POST /api/inbound/email`

No staff cookie. Secret header required when `RESEND_WEBHOOK_SECRET` or `INBOUND_WEBHOOK_SECRET` is set.

Headers (any one):
- `Authorization: Bearer <secret>`
- `x-webhook-secret: <secret>`

### Resend envelope

```json
{
  "type": "email.received",
  "created_at": "2026-09-20T12:00:00.000Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "guest@example.com",
    "to": ["noreply@guestflow.thebrowns.co.za"],
    "subject": "Dates in October",
    "message_id": "<111@example.com>"
  }
}
```

Handler fetches `GET https://api.resend.com/emails/receiving/{email_id}` with `RESEND_API_KEY` for `text`/`html`.

### Normalized fixture (tests / CoS forward)

```json
{
  "from": "guest@example.com",
  "text": "Hi, is 12–14 Oct available?",
  "timestamp": "2026-09-20T12:00:00.000Z",
  "source": "email",
  "subject": "Dates in October",
  "externalMessageId": "test-email-1"
}
```

### Success

Same shape as JSON inbound webhook: `{ success, messageId, threadId, classification, draftReply, queuedForApproval }`.

### Errors

- 401 invalid/missing secret
- 400 missing from/text/timestamp after normalize
- 200 `{ success: true, duplicate: true }` on `externalMessageId` replay

## `POST /api/inbound/webhook`

Existing JSON Bearer path. Additional allowed `source`: `whatsapp_web` (same `{ from, text, timestamp, source, externalMessageId }`).
