# Quickstart: Delivery status + resend

**Feature**: [spec.md](./spec.md)  
**Do not** run the migrate script against Production. **Do not** send live messages.

## Prerequisites

- `apps/guestflow` dependencies installed
- Vitest (`npm test`)
- Preview env may set webhook secrets later; this package only documents them

## Validate without providers

From `apps/guestflow`:

```bash
npm test -- delivery-status delivery-webhooks delivery-resend
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all targeted tests pass; `tsc` has no errors; build does **not** set `typescript.ignoreBuildErrors`.

## Mapping sanity (no network)

1. `mapProviderStatus('delivered')` → bubble `delivered`
2. Apply `sent` after `delivered` → still `delivered`
3. `isStuckPending` at 16 minutes with a 15-minute threshold → true
4. Closed `getWindowState` on resend → no send, template offer

## Webhook URLs to configure later (not in this PR)

| Provider | URL | Secret / verify |
| --- | --- | --- |
| Twilio StatusCallback | `https://<preview-or-prod>/api/webhooks/twilio/status` | `TWILIO_AUTH_TOKEN` signature |
| Resend delivery | `https://<preview-or-prod>/api/webhooks/resend` | `RESEND_WEBHOOK_SECRET` |
| Poll cron | `POST /api/cron/delivery-poll` | `CRON_SECRET` |

Optional env: `DELIVERY_STUCK_PENDING_MINUTES` (default 15), `DELIVERY_POLL_AFTER_MINUTES` (default 10), `NEXT_PUBLIC_BASE_URL` (StatusCallback absolute URL).

## Staff check on Preview (after Coding sets env)

1. Approve&Send a sandbox/redirect message
2. Confirm the bubble starts Pending
3. POST a signed fixture status → Delivered / Failed
4. Confirm Failed/stuck shows Resend + Needs attention
5. Confirm dialog + confirmToken; second click rejected while in flight

## Migration (Grant only)

```bash
# Preview / local sqlite only after APPROVE APPLY MIGRATION
npm run db:migrate:delivery-status
```

This agent does not run that command against Production Turso.
