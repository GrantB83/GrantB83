# Quickstart: UMI v2.1 Preview validation

## Prerequisites

- Staff session on Preview (existing staff auth).
- `OUTBOUND_MODE=redirect` + sinks still set (do not flip live).
- Local: `cd apps/guestflow && npm test` then `npm run lint` and `npm run build`.

## Inbox home

1. Open Preview `/`.
2. Expect chat inbox, not the old Today board as the work surface.
3. Top nav: Inbox, Arrivals & Departures, Bookings, Ops. No **Needs approval**.
4. `/ops` primary tools do not list Needs Approval. More Tools still opens secondary packs.

## Sort + needs-attention

1. Use fixtures or seeded bookings: one arriving today/tomorrow SAST, one with unanswered inbound, one quiet older stay.
2. List order: arriving → pending → recent.
3. Toggle needs-attention: open drafts, temps, pending replies, welcome/late drafts appear; empty state if none.

## Inbound channels (Preview / signed webhook)

Do not send to real guests. Use fixtures against Preview or local.

1. WhatsApp Cloud / Twilio WA → booking thread, Cloud badge, draft, no send.
2. WhatsApp Web with a real `text` → full body stored, Web badge (not `[metadata-only]`).
3. Replay same Web+Cloud fingerprint → `duplicate: true`, one bubble.
4. Email webhook → thread immediately; bubble starts with source=email + sender.
5. Twilio SMS → SMS badge; default compose channel SMS.

## Temp link + hygiene

1. Inbound from unknown contact → temp thread + Link to booking.
2. Link to a real booking id → history on booking thread; temp closed.
3. Two candidate bookings → staff must pick; no auto-pick.

## Approve&Send (redirect only)

1. Open draft in-thread. Edit. Approve. Confirm token. Send.
2. Confirm redirect sink, not guest To.
3. Send without token still refuses.
4. staff_ops on `/needs-approval` (not in nav) remains copy-only.

## Backfill

1. `POST /api/umi/backfill/wa-web` with two-week messages; run twice.
2. Counts: accepted first run; duplicates second run; older-than-14d ignored.

## Retention language

Confirm Coding brief / UMI doc states **5 years after last stay then delete**.
