# Contract: Inbox window fields + inbound send guard

## Inbox list `GET /api/umi/inbox`

Each thread MAY include:

```json
{
  "careWindow": {
    "state": "open",
    "label": "Window open, closes in 14h 0m",
    "windowExpiresAt": "2026-09-26T10:00:00.000Z",
    "closingSoon": false
  }
}
```

`state` is `open` | `closing_soon` | `closed`. Web-only threads are `closed`.

## Thread detail `GET /api/umi/threads/:id`

Same `careWindow` object. Also used by the composer badge.

## `POST /api/inbound/send`

Existing fields unchanged (`threadId`, `confirmToken`, `channel`, `to`, `subject`, `body`).

New optional fields:

```json
{
  "contentSid": "HXxxxxxxxx",
  "contentVariables": { "1": "Alex", "2": "Falcon" }
}
```

### WhatsApp Cloud free-text (no contentSid)

| Window | HTTP | Twilio |
|--------|------|--------|
| open | existing 200/4xx/5xx | called (or sandbox) |
| closed | **409** `{ "success": false, "error": "WhatsApp customer-care window is closed. Send an approved template." }` | **not called** |
| email / SMS / whatsapp_web | unchanged | n/a |

409 is evaluated before confirmToken consume.

### WhatsApp Cloud template (contentSid present)

Allowed when window is closed. Still requires confirmToken and approval eligibility. Redirect applies to `To`. Provider call uses `ContentSid` + `ContentVariables`.
