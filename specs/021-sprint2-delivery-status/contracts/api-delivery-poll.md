# Contract: Delivery poll fallback

`POST /api/cron/delivery-poll`

## Auth

`x-cron-secret` or `?secret=` must match `CRON_SECRET`. Missing env → `503`.

## Behaviour

1. Select outbound rows where `delivery_status = 'pending'` AND `queued_at` is older than `DELIVERY_POLL_AFTER_MINUTES` (default 10) AND no newer callback (`delivery_updated_at` is null or equals `queued_at`)
2. Limit 50
3. GET Twilio Message or Resend email by stored provider id
4. Apply the same status mapper as webhooks
5. **Never send**

## Success

`200` `{ "success": true, "checked": n, "updated": n }`

## Errors

- `401` bad secret
- `503` cron secret not configured
