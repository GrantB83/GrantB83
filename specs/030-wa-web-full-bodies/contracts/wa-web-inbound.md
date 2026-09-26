# Contract: WhatsApp Web inbound + backfill (Ship B)

Supersedes the UMI v2.1 note that empty WhatsApp Web text becomes `[body unavailable]`.

Auth unchanged: `Authorization: Bearer $INBOUND_WEBHOOK_SECRET` (backfill also accepts `WA_WEB_BACKFILL_SECRET` / `x-webhook-secret` / `x-bridge-secret`).

## POST /api/inbound/webhook (`source=whatsapp_web`)

Required: `from`, `timestamp`, `externalMessageId`.

```json
{
  "from": "+27821234567",
  "text": "What time is check-in?",
  "timestamp": "2026-09-20T12:00:00.000Z",
  "source": "whatsapp_web",
  "externalMessageId": "waweb-28-1",
  "displayName": "Sam Guest",
  "contactName": "Sam Guest",
  "pushName": "Sam",
  "chatTitle": "Sam Guest",
  "metadata": {
    "observedOn": "+27836458313",
    "contactName": "Sam Guest",
    "pushName": "Sam",
    "chatTitle": "Sam Guest"
  }
}
```

| Incoming `text` | Result |
| --- | --- |
| Real guest body | Persist that body. `metadataOnly: false` |
| Empty / `[metadata-only]` / `[body unavailable]` / `[observe-probe]` | **Do not insert** a fake row. `{ success: true, skipped: true, reason: "empty_or_sentinel_body" }`. May still refresh an existing temp title if a real source name is present |
| Same `externalMessageId` with real body over a sentinel | In-place replace. `{ replaced: true }` |
| Same durable key as an existing real Cloud/Web body | `{ duplicate: true }` — no second row |

Display name: persist first non-phone-like of contactName / pushName / notifyName / chatTitle / displayName onto unmatched `guest_name`. Never invent.

Locks: no send. Redirect / From unchanged.

## POST /api/umi/backfill/wa-web

One-shot. Same auth. Body:

```json
{
  "messages": [
    {
      "from": "+27821234567",
      "text": "Full body",
      "timestamp": "2026-09-12T10:00:00.000Z",
      "externalMessageId": "waweb-28-1",
      "displayName": "Sam Guest",
      "metadata": { "observedOn": "+27836458313", "chatTitle": "Sam Guest" }
    }
  ]
}
```

Rules:

- Ignore brand-new inserts older than 14 SAST days unless they match an existing WhatsApp Web sentinel (open metadata-only replace)
- Sentinel + real text → update in place (`replaced++`)
- Already-real same key → `duplicates++`
- Empty/sentinel incoming → `skippedEmpty++` (no invent)
- Cloud already has the same guest line → duplicate; leftover WhatsApp Web sentinel removed

Response:

```json
{
  "success": true,
  "accepted": 0,
  "replaced": 1,
  "duplicates": 1,
  "skippedEmpty": 0,
  "ignoredTooOld": 0,
  "threadsTouched": 1,
  "windowDays": 14
}
```

## GET /api/umi/threads/:id

Unchanged shape. `messages[].body` MUST be the stored `message_text`. After replace, thread 28 bodies are non-sentinel. `bookerName` uses `booking_guest_name || guest_name || from_number`.

S10 evidence (not a new endpoint): Prod `?thread=28` before/after (or Preview of the same rows) plus a counted inbox scan of `whatsapp_web` rows whose body is exactly `[metadata-only]` or `[body unavailable]`. Pack: `../EVIDENCE.md`.

## Out of contract

Composer, Link modal, Cloud conversion of `+27836458313`, Redirect flip, email `[body unavailable]` composition.
