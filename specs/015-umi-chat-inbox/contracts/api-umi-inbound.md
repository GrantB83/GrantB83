# Contract: UMI inbound + backfill

## POST /api/inbound/webhook

Existing auth: Bearer `INBOUND_WEBHOOK_SECRET` or Twilio signature.

Change: `source=whatsapp_web` MUST accept and persist `text` (full body). Empty text → `[body unavailable]`, not `[metadata-only]`.

Twilio SMS (`From` not `whatsapp:`) → channel `sms`. Twilio/Meta WhatsApp → `whatsapp_cloud`.

Dedup: if `external_message_id` exists OR `dedup_key` matches, return `{ success: true, duplicate: true, messageId, threadId }` without a second row.

After persist: match booking/temp (data-model). If not spam, auto-draft + optional `draft_jobs`. Never send.

## POST /api/inbound/email

Existing auth: `RESEND_WEBHOOK_SECRET` or `INBOUND_WEBHOOK_SECRET`.

Change: compose stored body with source tag + sender for UI (`source_tag=email`, `sender_address`). Lift product HOLD: ingest immediately when webhook delivers. Do not invent inbox addresses.

In-scope documented inboxes (confirm only): `stay@thebrowns.co.za`, `stay@hospitality.partners`, `grant@hospitality.partners`.

## POST /api/umi/backfill/wa-web

Auth: same inbound webhook secret. One-time two-week window.

```json
{
  "messages": [
    {
      "from": "+27820000000",
      "text": "Full body",
      "timestamp": "2026-09-12T10:00:00.000Z",
      "externalMessageId": "wamid.xxx",
      "metadata": { "observedOn": "+27836458313" }
    }
  ]
}
```

Ignore items older than 14 days from `now` (SAST date). Idempotent. Response: `{ success, accepted, duplicates, ignoredTooOld, threadsTouched }`.

## POST /api/inbound/send

Existing confirmToken + approve gate. Add `channel: 'sms'`. Default channel = thread `last_inbound_channel` if body omits channel. SMS From = `TWILIO_SMS_FROM` or existing Twilio family; if unusable, `400` with reason, no send. Redirect sinks unchanged (`whatsapp` and `email` resolvers; SMS uses WA sink number family when redirecting phone channels).

## GET /api/health

Unchanged outboundRedirect block. May add `umi: "v2.1"` flag.
