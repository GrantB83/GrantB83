# Delivery status + resend (Sprint 2)

**Ritual removed:** Opening Twilio / Resend consoles to guess whether yesterday’s guest reply arrived, then copy-pasting the same text again.

**Artefact for this week:** Inbox bubbles on `/` show Pending / Delivered (read) / Failed. Failed and stuck-Pending (15 min, `DELIVERY_STUCK_PENDING_MINUTES`) offer **Resend** with a confirm dialog and a fresh confirmToken. Redirect still sinks to the test To. From stays `+27600200825`.

## Unchanged safety

- Approve&Send stays human. Cron/poll **never send**.
- One-time confirmToken. Reuse is rejected.
- No Production Turso migrate in this package. Script exists: `npm run db:migrate:delivery-status` (needs `APPROVE APPLY MIGRATION`).

## Parallel PRs (do not merge this into those diffs)

| PR | How this package stays compatible |
| --- | --- |
| user-mgmt #215 | `getStaffIdentityFromRequest()` records who pressed Resend via signed-in staff email (`actorStamp`). |
| WhatsApp 24h + templates (#218) | `src/lib/wa-window.ts` → `getCareWindowForThread` + `listWaTemplates`. Closed window → offer template, no free-form send. |
| Alerts (#217) | `onSendFailed` → `notifyFailedApproveSend` (actor or last handler). |
| Mobile (#216) | `OutboundDeliveryBubble` fills `data-inbox-slot="bubble-status"` on the mobile thread shell. |

## Envs / webhook URLs (not configured by this agent)

| Name / URL | Purpose |
| --- | --- |
| `POST /api/webhooks/twilio/status` | Twilio StatusCallback. Verified with `TWILIO_AUTH_TOKEN`. |
| `POST /api/webhooks/resend` | Resend **delivery** events (not inbound mail). `RESEND_WEBHOOK_SECRET` or Svix headers. |
| `POST /api/cron/delivery-poll` | Poll after 10 min (`DELIVERY_POLL_AFTER_MINUTES`) if no callback. `CRON_SECRET`. |
| `NEXT_PUBLIC_BASE_URL` or `VERCEL_URL` | Absolute StatusCallback URL. Not hardcoded to production. |
| `DELIVERY_STUCK_PENDING_MINUTES` | Default 15. |
| `STAFF_IDENTITY` | Optional override for the current staff helper. |

Point Twilio StatusCallback and the Resend delivery webhook at the **Preview** host first. Do not send live guest traffic.

## Staff how-to

1. Approve&Send as today.
2. Bubble starts **Pending**. Delivered/read or Failed (plain words) after callback or poll.
3. Redirect sends show **sent to test sink**.
4. Failed or stuck-Pending → **Resend**. Stuck warns about a possible duplicate.
5. One resend in flight per original. The new row stores `resend_of` and who pressed it.
