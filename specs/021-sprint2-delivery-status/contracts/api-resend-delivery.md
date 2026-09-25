# Contract: Resend delivery webhook

`POST /api/webhooks/resend`

Staff cookie is not required. Secret is required in production.

This route handles **delivery** events only. Inbound guest mail stays on `POST /api/inbound/email`.

## Request

- Content-Type: `application/json`
- Auth: `Authorization: Bearer <RESEND_WEBHOOK_SECRET>` **or** `x-webhook-secret` **or** Svix headers `svix-id`, `svix-timestamp`, `svix-signature`
- Body: `{ "type": "email.delivered" | "email.sent" | "email.bounced" | "email.complained" | "email.failed" | "email.opened" | "email.delivery_delayed", "data": { "email_id": "…" } }`

## Success

- `200` `{ "success": true }`
- Lookup `data.email_id` against `provider_message_id` / `whatsapp_message_id`

## Errors

- `401` invalid/missing secret
- `200` `{ "success": true, "ignored": true }` for unknown id or inbound-only event types
