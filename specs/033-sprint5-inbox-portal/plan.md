# Implementation Plan: Sprint 5 Inbox, Journey, and Guest Portal

**Branch**: `cursor/guestflow-sprint5-inbox-3f33` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/033-sprint5-inbox-portal/spec.md`

## Summary

Staff inbox gains Guest (not Staff) contact labels, a WhatsApp-style one-scroll thread with a bottom overlay composer (Design SoR Zone A/B/C), and a lean list whose status lives in one header chip language. The stay journey expands from T-3/T-1/Day-of to 4a–4g in `Africa/Johannesburg`, still draft→Approve&Send only. The Guest Portal replaces legacy /checkin and /info: rooms + verified thebrowns links + local info always after the contact gate; gate/lockbox/Wi‑Fi password only 14:00 SAST check-in day through 12:00 SAST departure; Wolery displays as Heritage Cottage; SSID “The Browns Guests”.

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14 (App Router), React 18

**Primary Dependencies**: Existing GuestFlow inbox (`apps/guestflow/src/app/page.tsx`, inbox components), arrival-drafts job, `wa_templates` catalogue, guest portal token route, access-codes SoR

**Storage**: Existing Turso/SQLite tables (`arrival_drafts`, `inbound_messages`, `guest_tokens`, `property_access_codes`, `bookings`). No production migration. New stage strings `4a`–`4g` write into existing `arrival_drafts.stage`.

**Testing**: Vitest (`apps/guestflow` `npm test`). Source-contract tests for UI strings/layout. Unit tests for security window, chips, room display, journey due logic.

**Target Platform**: GuestFlow Preview on Vercel; staff desktop ~1280×800 and phone ~390; guest portal mobile-readable

**Project Type**: Web application (staff inbox + guest portal)

**Performance Goals**: Inbox remains single-shell; Zone B is the only thread scroll; composer overlay does not add a second page

**Constraints**: Constitution I–IV (human send, fail-closed facts, booking SoR, From +27600200825). Redirect ON. No new Meta submit. No invented codes. No hardcoded Wi‑Fi password in repo. MERGE HOLD.

**Scale/Scope**: One property group (The Browns). Five items in one PR.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| I. Human-Gated Guest Send | PASS — 4a–4g drafts only; 4f system rescind; Approve&Send + confirmToken unchanged |
| II. Fail-Closed Facts | PASS — missing mapping = staff gap; no invented codes/PII/rates; review URL in-repo or NeedsGrant |
| III. Booking SoR vs Comms SoR | PASS — Nightsbridge bookings unchanged; UMI drafts only |
| IV. Channel Identity Freeze | PASS — From +27600200825; no +2783 convert; Redirect sinks stay |
| V. Extend Live Systems | PASS — extend inbox, arrival-drafts, portal; no new product |
| VI. Retention / lanes | PASS — hospitality only |

Post-design re-check: PASS. No new auth/JWT/payment/secret handling. No production schema apply.

## Project Structure

### Documentation (this feature)

```text
specs/033-sprint5-inbox-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-contracts.md
│   └── journey-portal.md
├── checklists/requirements.md
└── tasks.md

specs/verify/sprint-5/VERIFY-PACK.md
docs/automation/STATUS.md
docs/automation/labor-ledger.md
apps/guestflow/docs/SPRINT5-INBOX-PORTAL.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/app/page.tsx
├── src/app/globals.css
├── src/app/guest/[code]/page.tsx
├── src/app/api/guest-portal/[code]/route.ts
├── src/components/inbox/
│   ├── ThreadHeader.tsx
│   ├── ThreadHeaderDetails.tsx
│   ├── ThreadLayoutShell.tsx
│   ├── ThreadComposer.tsx          # new
│   ├── HeaderStatusChips.tsx       # new
│   ├── inbox-types.ts
│   └── inbox-fixture.ts
├── src/lib/
│   ├── arrival-drafts.ts
│   ├── arrival-drafts-config.ts
│   ├── arrival-templates.ts
│   ├── journey-config.ts           # new
│   ├── portal-security.ts          # new
│   ├── room-catalog.ts             # new
│   ├── header-chips.ts             # new
│   ├── token.ts
│   ├── umi-threads.ts
│   └── wa-templates-seed.ts
└── src/lib/__tests__/
    ├── arrival-drafts.test.ts
    ├── portal-security.test.ts
    ├── header-chips.test.ts
    ├── room-catalog.test.ts
    └── journey-config.test.ts
```

**Structure Decision**: Extend live GuestFlow app. No new package.

## Complexity Tracking

No constitution violations requiring justification.
