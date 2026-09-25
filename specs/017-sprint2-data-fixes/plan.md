# Implementation Plan: GuestFlow Sprint 2 Data Fixes

**Branch**: `cursor/sprint2-data-fixes-27a6` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-sprint2-data-fixes/spec.md`

## Summary

Make GuestFlow’s daily brief, check-in status, property/codes, exceptions, and Inbox reads correct in Production without sending, migrating Production Turso, or touching rate cards. Shared `isActiveGuestBooking` / `isOwnerBlock` filters cancelled and BLOCK rows. A single lockbox resolver (`resolvePropertyForSuite`) is the only Cottage 278 vs Main House 279 source for display and codes. Inbox GET and thread-open are read-only; threads exist only after a real message; needs-attention is unanswered inbound only. Exceptions map to live columns. `/api/today-stats` is deleted.

## Technical Context

**Language/Version**: TypeScript 5.5, Node 20, Next.js 14.2 App Router

**Primary Dependencies**: GuestFlow existing libs (`@/lib/db` async Turso/SQLite client, access-codes SoR, UMI threads, daily-brief). Vitest 1.x. No new runtime packages.

**Storage**: Existing Turso / SQLite tables only (`bookings`, `property_access_codes`, `inbound_threads`, `inbound_messages`, `guest_tickets`). No Production writes. Scripts default dry-run.

**Testing**: Vitest (`npm test` in `apps/guestflow`). Synthetic fixtures only. Required suites listed in tasks.md.

**Target Platform**: Vercel Preview for `apps/guestflow` (project browns-guestflow). Preview must READY without `typescript.ignoreBuildErrors`.

**Project Type**: Web application (Next.js app under `apps/guestflow/`)

**Performance Goals**: Inbox GET remains a read-only list; no extra writes on open. Brief queries stay date-windowed (today + tomorrow SAST).

**Constraints**: PR only, no merge, no deploy, no guest send, `OUTBOUND_MODE=redirect` unchanged, From `+27600200825` unchanged, Approve&Send human, no Production Turso apply. Parallel PRs (user-mgmt #215, contacts, WhatsApp) — keep this diff inside listed files. Item Q dropped: do not touch rate-cards.

**Scale/Scope**: One GuestFlow tenant (The Browns Dullstroom). Two properties. ~8 lockbox suites in the SoR fixture. Do not scan a full inbox.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | No send-path behaviour change. Drafts without codes stay unsent. |
| II. Fail-Closed Facts | PASS | Unknown property → no codes + `codes: property unresolved`. Check-in with no events → `unknown`. Never invent codes/PII. |
| III. Booking SoR vs Comms SoR | PASS | BLOCK rows stay stored. UMI only read-filters. No stay-fact invention. |
| IV. Channel Identity Freeze | PASS | From number and redirect sinks untouched. |
| V. Extend Live Systems | PASS | Shared helpers in existing GuestFlow libs; no new product. |
| VI. Retention / lanes | PASS | No family/trust data. No retention-rule change. |

Post-design re-check: still PASS. Scripts are dry-run and print counts only. Inbox GET no longer calls `ensureArrivingBookingThreads` or `applyTempHygiene`.

## Project Structure

### Documentation (this feature)

```text
specs/017-sprint2-data-fixes/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-daily-brief.md
│   ├── api-checkin-status.md
│   ├── api-exceptions.md
│   ├── api-umi-inbox-readonly.md
│   └── lockbox-property-resolve.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/booking-filters.ts          # NEW: isOwnerBlock, isActiveGuestBooking, SQL fragment
├── src/lib/property-resolve.ts         # NEW: shared lockbox property + codes resolver
├── src/lib/access-codes.ts             # export suiteMatches / normalizeSuiteName
├── src/lib/daily-brief.ts
├── src/lib/checkin-inference.ts
├── src/lib/db.ts                       # stop demo property seed
├── src/lib/umi-threads.ts              # BLOCK filter; inbox read-only; needs-attention
├── src/lib/nightsbridge-upsert.ts      # property_name when resolved
├── src/lib/ticket-playbooks.ts         # lockbox resolver
├── src/app/api/daily-brief/route.ts
├── src/app/api/daily-brief/enqueue/route.ts
├── src/app/api/checkin-status/route.ts
├── src/app/api/exceptions/route.ts
├── src/app/api/today-stats/route.ts    # DELETE
├── src/app/api/guest-portal/[code]/route.ts
├── src/app/api/welcome-drafts/route.ts
├── src/app/api/packs/welcome-late/route.ts
├── src/app/api/late-checkin/export/route.ts
├── src/app/api/inbound/webhook/route.ts
├── src/app/api/cron/nightsbridge-ingest/route.ts
├── src/app/api/umi/inbox/route.ts      # stays GET-only; listInboxThreads read-only
├── src/app/api/umi/threads/[id]/route.ts
├── src/app/api/comms/route.ts          # same read-only list helper
├── scripts/count-owner-blocks.js       # NEW read-only
├── scripts/migrate-gap1-properties.js  # NEW dry-run
├── scripts/cleanup-umi-empty-threads.js # NEW dry-run, not on deploy
└── src/lib/__tests__/ + __tests__/     # required vitest files
```

**Structure Decision**: Extend `apps/guestflow` only. Two new lib modules plus dry-run scripts. No new app, no rate-card files, no auth files.

## Complexity Tracking

> No constitution violations requiring justification.
