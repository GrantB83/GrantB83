# Implementation Plan: Staff Ops Daily Brief (Ops Hub)

**Branch**: `cursor/guestflow-daily-brief-ops-hub-59c7` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-staff-ops-daily-brief/spec.md`

## Summary

Upgrade the existing Phase 17 `/ops/daily-brief` page and export API into a production staff Ops Hub daily brief backed by GuestFlow booking data. Extract brief-building logic into a testable library (`src/lib/daily-brief.ts`) mirroring `tools/browns-daily-ops-brief` output patterns. Add a staff-authenticated `GET /api/daily-brief` that queries the existing `bookings` table, derives today/tomorrow sections and exceptions, and powers the UI plus copy/export. Default workflow is view + copy/export only — no auto-send, no new WhatsApp paths, no staff-ops draft enqueue (no existing approval queue type).

## Technical Context

**Language/Version**: TypeScript 5.5, Node.js 20+

**Primary Dependencies**: Next.js 14.2 (App Router), better-sqlite3 11.0 / @libsql/client, date-fns 3.6

**Storage**: Existing `bookings`, `properties`, `tenants` tables in SQLite (local) / Turso (Vercel)

**Testing**: Vitest 1.0 — unit tests for `daily-brief.ts` builder

**Target Platform**: Next.js App Router on Vercel; staff-only via `STAFF_PASSWORD` middleware

**Project Type**: Web application — internal ops tool under `apps/guestflow/`

**Performance Goals**: Brief API <1s for ≤100 bookings; page interactive after first fetch

**Constraints**: No NB scrape, no invented rates/amounts, draft-only exports, Africa/Johannesburg date boundaries, reuse existing export route patterns

**Scale/Scope**: Single Browns Dullstroom tenant, ~10–50 active bookings/week

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

AGENTS.md hard rules applied:

- ✅ Edit only `apps/guestflow/` + Spec Kit artifacts
- ✅ No auto-send; draft/export only
- ✅ Reuse existing booking ingest (Turso/SQLite), no NB browser automation
- ✅ No Twilio/WABA/KYC changes
- ✅ Unit tests for brief builder
- ✅ Conventional commits

No project constitution populated — proceeding with AGENTS.md governance.

## Project Structure

### Documentation (this feature)

```text
specs/002-staff-ops-daily-brief/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-daily-brief.md
├── tasks.md
├── checklists/
│   └── requirements.md
└── spec.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── lib/
│   │   ├── daily-brief.ts              # NEW: brief builder + export formatters
│   │   └── __tests__/
│   │       └── daily-brief.test.ts     # NEW: unit tests
│   ├── app/
│   │   ├── api/
│   │   │   └── daily-brief/
│   │   │       ├── route.ts            # NEW: GET structured brief
│   │   │       └── export/
│   │   │           └── route.ts        # MODIFY: use daily-brief lib
│   │   └── ops/
│   │       └── daily-brief/
│   │           └── page.tsx            # MODIFY: Ops Hub UX, today/tomorrow, copy
│   └── DEPLOY.md                       # MODIFY: short ops note (section only)
└── scripts/
    └── smoke-ops.mjs                   # MODIFY: assert draft-only copy on page
```

**Structure Decision**: Extend existing GuestFlow Next.js app. Core logic lives in `src/lib/daily-brief.ts` (shared by GET API, export POST, and page). No new packages or CLI tools.

## Complexity Tracking

> No violations — reuses Phase 17 page/export and CLI brief format patterns.
