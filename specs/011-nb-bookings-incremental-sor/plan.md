# Implementation Plan: Nightsbridge Bookings Incremental Source of Record

**Branch**: `011-nb-bookings-incremental-sor` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-nb-bookings-incremental-sor/spec.md`

## Summary

Replace the current `INSERT OR REPLACE` booking ingest logic with proper UPSERT (INSERT ... ON CONFLICT DO UPDATE) using durable identity fields (`nightsbridge_booking_id` + fallback natural key). Implement window-based soft-cancel for disappeared bookings. Add import tracking fields (`last_import_at`, `import_batch_id`, `source`). Return detailed summary (`{parsed, inserted, updated, cancelled, unchanged, errors}`). Ensure Turso-safe migrations with backfill and deduplication.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14)

**Primary Dependencies**: 
- Next.js 14 (App Router)
- better-sqlite3 (local dev)
- @libsql/client (Turso production)
- xlsx (Excel parsing)
- date-fns (date operations)

**Storage**: Turso (libSQL/SQLite) with better-sqlite3 for local development

**Testing**: Vitest for unit tests, existing test suite in `__tests__/` and `src/**/__tests__/`

**Target Platform**: Next.js API Routes on Vercel (serverless), Turso managed database

**Project Type**: Web application (Next.js) with API routes for booking ingest

**Performance Goals**: Import completes in <5 seconds for 50 bookings

**Constraints**: 
- Must be Turso-safe (no features unavailable in libSQL)
- Must support both local better-sqlite3 and remote Turso
- Migrations must be idempotent
- No data loss during migration
- Vercel Preview must pass all tests

**Scale/Scope**: Small-scale hospitality operation (~10-50 bookings per day, single tenant)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**No project constitution file found** - using standard best practices:
- ✅ Backwards compatibility: Migration is additive (new columns, no column drops)
- ✅ Data integrity: UNIQUE constraints prevent duplicates, soft-cancel preserves history
- ✅ Testability: Core UPSERT logic can be tested with fixtures
- ✅ Performance: Indexed columns for fast lookups
- ✅ Security: No new auth required (existing CRON_SECRET unchanged)

## Project Structure

### Documentation (this feature)

```text
specs/011-nb-bookings-incremental-sor/
├── plan.md              # This file
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (schema changes)
├── quickstart.md        # Phase 1 output (validation guide)
├── contracts/           # Phase 1 output (API contract)
│   └── api-nightsbridge-ingest.md
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/guestflow/
├── scripts/
│   ├── migrate-phase17-incremental-bookings.js  # NEW migration script
│   └── nightsbridge-upload.ts                   # Existing (unchanged)
├── src/
│   ├── lib/
│   │   ├── db.ts                                # Existing (unchanged)
│   │   ├── guest-contacts.ts                    # Existing (unchanged)
│   │   └── nightsbridge-upsert.ts               # NEW: Core UPSERT logic
│   ├── app/
│   │   └── api/
│   │       └── cron/
│   │           └── nightsbridge-ingest/
│   │               ├── route.ts                 # MODIFIED: Use new UPSERT logic
│   │               └── __tests__/
│   │                   └── route.test.ts        # MODIFIED: Add UPSERT tests
│   └── __tests__/
│       └── nightsbridge-upsert.test.ts          # NEW: Unit tests for UPSERT
└── docs/
    └── SA-OPS-NIGHTSBRIDGE-RUNBOOK.md           # MODIFIED: Document new behavior
```

**Structure Decision**: This feature modifies the existing Nightsbridge ingest route and adds a new core library (`nightsbridge-upsert.ts`) to encapsulate the UPSERT logic. The migration script follows the existing pattern (`migrate-phase17-*.js`). Tests are co-located with the code they test.
