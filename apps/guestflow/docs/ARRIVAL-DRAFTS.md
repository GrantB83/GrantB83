# Scheduled arrival drafts (Sprint 2 item G)

Ritual removed: writing the same T-3 welcome, T-1 check-in/codes, and day-of reminder by hand.

## How scheduling works

1. **Johannesburg date** (`Africa/Johannesburg`) decides which stage is due:
   - T-3 when `check_in` is today + 3 calendar days
   - T-1 when `check_in` is tomorrow
   - Day-of when `check_in` is today
2. **Run hour** (default 06:00 SAST) lives with those offsets in one file: `src/lib/arrival-drafts-config.ts`. Triggers before that hour are a no-op.
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
