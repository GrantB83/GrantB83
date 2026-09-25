# Contract: Nightsbridge email ingest

## `POST /api/inbound/email` (existing)

When the payload is Nightsbridge property mail (sender host `nightsbridge.co.za` / `nightsbridge.com`, or a known subject pattern, or Google forward-verification), handle via L1 and **do not** create a UMI thread.

Auth unchanged: `RESEND_WEBHOOK_SECRET` or `INBOUND_WEBHOOK_SECRET`.

**L1 success 200**:

```json
{
  "ok": true,
  "nb": true,
  "eventStatus": "applied",
  "type": "NEW_BOOKING",
  "nbRef": "12345678",
  "bookingId": 42
}
```

`eventStatus` is one of `applied` | `stale` | `duplicate` | `ignored` | `parse_failed`.

## `POST /api/inbound/nb-email`

Same auth and payload normalisation as inbound email. Dedicated path for a future Resend webhook. Same L1 handler. Middleware must allow it without a staff session.

## `GET /api/inbound/nb-email`

Status JSON: service name, ready, secured boolean. No secrets.

## Dependency (document, do not block parse)

- Ingest mailbox: `stay@thebrowns.co.za` on the existing Resend inbound webhook.
- Upstream forward `stay@hospitality.partners` → `stay@thebrowns.co.za` is **GFM-owned** and may still be pending. Until it is confirmed, L1 still parses anything that reaches the webhook.
- Google `forwarding-noreply@google.com` is stored on `nb_email_raw` so ops can see the verification code mail.

## Batch ingest (existing `POST /api/cron/nightsbridge-ingest`)

After parse, write `nb_sync_runs`. If row count is 0 → `ZERO_ROWS`. If disappeared ratio > `massCancelDropRatio` → `ROWDROP_GUARD` and skip soft-cancel. Apply conflict matrix + provenance. Do not change the human Approve&Send path.
