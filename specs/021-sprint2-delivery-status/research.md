# Research: Sprint 2 Delivery Status + Resend

**Date**: 2026-09-25  
**Feature**: [spec.md](./spec.md)

## 1. Where to store provider IDs and status

**Decision**: Additive columns on existing `inbound_messages` outbound rows. Keep writing `whatsapp_message_id` for backward compatibility and add `provider_message_id` as the webhook lookup key.

**Rationale**: Send already persists Twilio SID / Resend id in `whatsapp_message_id`. A parallel deliveries table would dual-write and fight Principle V. Parallel Sprint 2 PRs add other columns; we only add delivery-specific names.

**Alternatives considered**: New `message_deliveries` table (cleaner isolation, more joins and migrate risk). JSON blob on `metadata` (unqueryable for poll/stuck).

## 2. Twilio StatusCallback verification

**Decision**: HMAC-SHA1 of `fullURL + concatenated sorted POST params`, compared to `X-Twilio-Signature`, using `TWILIO_AUTH_TOKEN`. Production rejects missing token or bad signature. Tests use a fixture token.

**Rationale**: Matches the existing inbound webhook algorithm in `apps/guestflow/src/app/api/inbound/webhook/route.ts`. Extract the verifier into `twilio-signature.ts` so status and inbound share one implementation without rewriting inbound ingest.

**Alternatives considered**: Twilio SDK `validateRequest` (extra dependency). Shared-secret header (not what Twilio sends).

## 3. Resend delivery webhook verification

**Decision**: Reuse `verifySharedSecret` against `RESEND_WEBHOOK_SECRET` (Bearer or `x-webhook-secret`), same as inbound email. Also accept Svix-style `svix-id` / `svix-timestamp` / `svix-signature` when those headers are present (Resend’s hosted webhook signing).

**Rationale**: Grant already configured inbound email with the shared-secret pattern. Delivery events must not be mixed into `/api/inbound/email` (that path ingests guest mail).

**Alternatives considered**: Svix-only (breaks existing secret style). HMAC of raw body without Svix headers (not Resend’s default).

## 4. Out-of-order status

**Decision**: Integer ranks — pending (queued/sent/accepted) = 10, delivered = 20, read = 30, failed (failed/undelivered/bounced/complained) = 40. Apply only when `newRank >= currentRank`. Failed is sticky. Read is a flag on the Delivered bubble, not a separate bubble.

**Rationale**: Twilio and Resend can replay or reorder. Staff must not see a Delivered message flip back to Pending.

**Alternatives considered**: Last-write-wins (fails US1/AC4). Timestamp-only (providers do not always send comparable timestamps).

## 5. Poll vs webhook

**Decision**: Webhooks are primary. Cron `POST /api/cron/delivery-poll` (CRON_SECRET) selects outbound `pending` with `queued_at` older than 10 minutes and no later `delivery_updated_at`, then GETs Twilio Message / Resend email. Cap 50. Never sends.

**Rationale**: Brief requires a 10-minute fallback. Vercel cron is already used for Nightsbridge reminders. Do not add Production cron secrets in this package — document the URL only.

**Alternatives considered**: Client-side poll from the inbox (wastes staff sessions). Immediate poll on every page load (rate-limit risk).

## 6. Stuck threshold

**Decision**: `DELIVERY_STUCK_PENDING_MINUTES` default `15`. Computed at read time from `queued_at` + `delivery_status === 'pending'`. No extra stored status required.

**Rationale**: Config as specified. Computed stuck stays correct if the threshold changes.

## 7. Resend + confirmToken

**Decision**: New `POST /api/inbound/resend` consumes a confirmToken issued with `purpose: 'resend'` + `messageId`. Issue path skips “thread must be approved” and instead requires the target outbound to be Failed or stuck-Pending. Send helpers (`sendWhatsAppMessage`, `sendEmail`, `sendSms`) stay the only network senders — redirect already lives there.

**Rationale**: After a successful send the thread is `sent`/`failed`, so the current confirm-token gate would block recovery. Resend is still human + one-time token. Reusing `/api/inbound/send` would require a fake re-approve of the latest inbound draft.

**Alternatives considered**: Re-approve the thread (confusing UX). Internal token minted without UI confirm (violates Principle I).

## 8. 24h window and templates

**Decision**: `getWindowState(threadId)` and `findApprovedTemplateFor({ threadId, purpose, body })` in `wa-window.ts`. Default stub: window open, no template. Tests inject a closed window. TODO comments point at the WhatsApp PR.

**Rationale**: That PR is in flight. Duplicating a 24h clock here would fork SoR.

## 9. Staff identity and alerts hook

**Decision**: `getStaffIdentity()` returns `process.env.STAFF_IDENTITY || 'Grant'` — the actor already used in send/audit. Document that #215 replaces this with user email. `onSendFailed({ threadId, messageId, channel, errorPlain })` is a no-op export called on immediate send failure and on Failed receipts.

**Rationale**: No staff-identity helper exists today; creating one avoids scattering `'Grant'`. Alerts PR must not be blocked on a missing hook.

## 10. Public StatusCallback URL

**Decision**: `NEXT_PUBLIC_BASE_URL` or `https://${VERCEL_URL}` + `/api/webhooks/twilio/status`. If neither is set, omit StatusCallback (sandbox/dev) and rely on poll.

**Rationale**: Avoid hardcoding production hosts. Preview URLs change per deploy.
