# Research: Sprint 5 Inbox, Journey, and Guest Portal

## R1 — Composer shell vs split pane

**Decision**: Zone C is a flex overlay footer on `ThreadLayoutShell`; Zone B is the only `overflow-y` surface. Remove Template & Care disclosure from `page.tsx`.

**Rationale**: Design SoR fail-closes on the split history/draft pane (evidence 02, 05) and clipped CTAs (06). Sticky height floors alone do not pass.

**Alternatives considered**: Keep accordion but collapse it — rejected (CUT is hard). Second modal for pending drafts — rejected (SoR: tap loads composer).

## R2 — Viewport / taskbar

**Decision**: Inbox shell uses `100dvh`/`100svh` fallbacks; Zone C `padding-bottom: max(12px, env(safe-area-inset-bottom))`. Keep `useVisualViewportInset` for keyboard.

**Rationale**: `100vh` alone is the 06-class failure on Windows taskbar + browser chrome.

**Alternatives considered**: Extra spacer div guessed at 48px — rejected; use dvh + safe-area + existing keyboard inset.

## R3 — Journey vs old arrival stages

**Decision**: New `journey-config.ts` is the active stage SoR (`4a`–`4g` with SAST hours). `runArrivalDraftsJob` emits those stages. Historical `t-3`/`t-1`/`day-of` rows remain readable; job no longer creates them.

**Rationale**: Kick replaces T-3/T-1/Day-of with 4a–4g. Booking horizon must include T−7 arrivals and same-day departures, not only check-in today→+3.

**Alternatives considered**: Keep T-3 and add 4a–4g in parallel — rejected (dual journeys). New cron routes — rejected (extend existing hourly job).

## R4 — Template mapping (no new Meta submit)

| Stage | Named templates | Channel |
|-------|-----------------|---------|
| 4a | `official_channel_notice` (WA) + email body in `journey-templates` | email AND whatsapp_cloud |
| 4b | `browns_pre_arrival_welcome` | preferred contact |
| 4c | `browns_day_of_reminder` | preferred contact |
| 4d | `browns_mid_stay_checkin` | preferred contact; skip if nights ≤ 1 |
| 4e | `browns_checkout_reminder` | preferred contact |
| 4f | none (system rescind via portal security clock) | — |
| 4g | `browns_review_request` + `GRANT_REVIEW_URL` | preferred contact |

**Rationale**: Catalogue already exists (`wa-templates-seed.ts`). Grant review URL is in-repo (`https://g.page/r/CZafj2WHDxDjEBM/review`) — not NeedsGrant.

**Alternatives considered**: Submit new Meta templates for 4a email+WA gate — rejected (no new Meta submit).

## R5 — Portal security clock

**Decision**: `portal-security.ts` evaluates SAST instants: open at check-in date 14:00 Africa/Johannesburg; close at check-out date 12:00. `shouldShowAccessCodes` delegates here. Wi‑Fi **password** uses the same gate; SSID string in-window is the product name “The Browns Guests”. Password value comes from access-codes SoR / env — never hardcoded `#thebrowns#`.

**Rationale**: Kick clock is explicit. Hardcoding the live password would commit a secret.

**Alternatives considered**: Keep “24h before check-in through end of checkout day” — rejected (wrong window). Show SSID always — allowed for name-only, but password stays gated; product copy says no Wi‑Fi password pre-window.

## R6 — Room links and Wolery

**Decision**: `room-catalog.ts` maps known suite aliases (Garden, Master, Loft, Falcon, Eagle, Crane, Trout, Robin, Wolery→Heritage Cottage). Public URL is the verified homepage `https://www.thebrowns.co.za/` (gallery is photos only). Unknown suites keep the booked string, homepage link, and `mappingGap`.

**Rationale**: No per-room path is in-repo or verified as a stable slug. Inventing `/garden-suite` would violate fail-closed.

**Alternatives considered**: Scrape live slugs at build time — rejected (fragile, out of scope).

## R7 — Contact Save payload

**Decision**: Details modal labels Guest phone/email; POST body stays `{ phone, email }` matching `/api/umi/threads/[id]/contacts`. Drop the current `staffPhone`/`staffEmail` keys (API ignores them).

**Rationale**: “Save works” is S2. Labels were wrong; payload was also wrong.

**Alternatives considered**: Accept both key names in the API — rejected (unnecessary; one contract).

## R8 — Attach icon

**Decision**: Toolbar attach icon present, `aria-label` Attach, disabled with title that upload is NeedsGrant / no SoR.

**Rationale**: SoR asks for the icon and “existing caps”. No inbox upload API exists.

## R9 — VERIFY PACK path

**Decision**: `specs/verify/sprint-5/VERIFY-PACK.md` to match prior `specs/verify/*` packs.

**Rationale**: Kick allows this or an apps/guestflow path; prior ships used `specs/verify/`.
