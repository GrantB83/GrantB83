# Scheduled guest-journey drafts (Sprint 5 4a–4g)

Ritual removed: writing T-3 / T-1 / Day-of (and now gate / comfort / departure / review) by hand.

## How scheduling works

1. **Johannesburg clocks** (`Africa/Johannesburg`) in `src/lib/journey-config.ts`:
   - **4a** immediately after a booking exists (job floor 06:00): email **and** WhatsApp Cloud drafts (`official_channel_notice` + gate email). From `+27600200825`.
   - **4b** T−7 at 08:00 — `browns_pre_arrival_welcome` + portal link
   - **4c** arrival day 08:00 — `browns_day_of_reminder` + portal; codes live on the portal from 14:00
   - **4d** 08:00 the morning after the first night if nights > 1 — `browns_mid_stay_checkin`
   - **4e** departure day 08:00 — `browns_checkout_reminder` (checkout 10:00)
   - **4f** departure day 12:00 — **system** portal security rescind (no guest send)
   - **4g** departure day 17:00 — `browns_review_request` + in-repo Google review URL
2. **Run hour** floor remains 06:00 SAST; stages with a later `hourSast` wait. Config: `src/lib/journey-config.ts`.
3. **Triggers** (same idempotent route, never sends):
   - Vercel **daily** cron `0 4 * * *` (04:00 UTC = 06:00 SAST) in `vercel.json`
   - GitHub Actions **hourly** fallback `.github/workflows/guestflow-arrival-drafts-hourly.yml` (Hobby cannot register hourly Vercel cron — that expression fails Preview deploy)
4. The job upserts at most one unsent row per `booking + stage`, writes an editable UMI draft on the booking thread, and sets Needs attention.
5. Staff **Approve&Send + confirmToken**. Cron does not send. T-1 access codes are re-read from `resolveAccessCodesForSuite` at send time.

## Rules

- Skip cancelled and owner `BLOCK` (`isActiveGuestBooking` / `isOwnerBlock` from #221).
- Late bookings get only stages still due today — no backfill.
- Date or suite change regenerates unsent drafts; cancel discards unsent.
- No usable phone and no usable email → Needs-attention `no contact` item, no guest draft.
- Channel: WhatsApp if phone, else email.
- Closed 24h WhatsApp window → matching approved template; if not WhatsApp-approved → `template pending approval`.
- Codes never invented. Missing / unresolved property → `code missing, ask staff` / `codes: property unresolved`.

## Wired to Sprint 2 main (post-rebase)

- **#221** — `resolveAccessCodesForSuite` in `property-resolve.ts` at draft time and Approve&Send (`refreshArrivalDraftCodesAtSend`).
- **#218 / #220** — WhatsApp care window via `getWindowState` → `getCareWindowForThread` (`wa-window.ts`). Template approval via `getWaTemplateByName` + `isWhatsAppApproved` (`wa-templates.ts` / seed). Closed window → approved template required; `browns_day_of_reminder` is local copy only → `template pending approval` when window closed.
- **#219** — `hasGuestContact` / `resolveContactPresence` in `contact-presence.ts` delegate to `validateContactInput` from `contact-apply.ts`.
- **#216 / #220** — Mobile Inbox shell + delivery bubbles unchanged; arrival stage badges are additive on `inbox-types` / Inbox page.
- **#217 pattern** — Hobby-safe daily Vercel cron plus GHA hourly fallback (same as alerts-evaluate).

## Redirect

Current outbound redirect behaviour on this base is unchanged. Decision L / OUTBOUND toggle is a follow-up after that PR merges.

## Migration

`scripts/migrate-arrival-drafts.js` is included and **not run**. Production Turso requires a separate `APPROVE APPLY MIGRATION`.
