# Contract: Twilio StatusCallback

`POST /api/webhooks/twilio/status`

Staff cookie is not required. Signature is required in production.

## Request

- Content-Type: `application/x-www-form-urlencoded`
- Header: `X-Twilio-Signature`
- Body fields used: `MessageSid` (or `SmsSid`), `MessageStatus` (or `SmsStatus`), `ErrorCode`, `ErrorMessage`

## Signature

HMAC-SHA1 of `{fullURL}{key1}{value1}{key2}{value2}…` with keys sorted, secret `TWILIO_AUTH_TOKEN`. Compare to `X-Twilio-Signature`.

## Success

- `200` with empty body (Twilio convention)
- Matching outbound updated when `MessageSid` equals `provider_message_id` or `whatsapp_message_id`

## Errors

- `401` missing/invalid signature
- `200` unknown SID (ack, no insert, no new thread)

## Mapping

See `delivery-status.ts`: queued/sent/accepted → pending; delivered/read → delivered (+ read flag); failed/undelivered → failed.
