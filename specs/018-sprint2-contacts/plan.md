# Implementation Plan: Sprint 2 Contact Details

**Branch**: `cursor/sprint2-contacts-1336` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-sprint2-contacts/spec.md`

## Summary

Persist guest phone and email from Nightsbridge Arrivals & Departures as the source of record, classify OTA relay addresses, fill only missing fields from Client report and stay@ inbound, and add validated staff/guest entry. Collapse multi-room bookings (5667) to one booking, one contact set, and one booker thread. Precedence is documented in code: A&D → staff → guest → Client report → stay@. No auto-send, no Production Turso writes, migrations dry-run only.

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14 (App Router), Node 20

**Primary Dependencies**: existing GuestFlow (`xlsx`, `date-fns`, Vitest, `@libsql/client`, `better-sqlite3`)

**Storage**: Turso/libSQL in production; local SQLite in tests. Additive `bookings` columns + `booking_contacts` provenance table via `ensureContactSchema`. Migration/backfill scripts default `--dry-run`.

**Testing**: Vitest (`apps/guestflow` `npm test`). Synthetic phones/emails only.

**Target Platform**: Vercel Preview for GuestFlow. Preview MUST typecheck (`typescript.ignoreBuildErrors` stays unset).

**Project Type**: Web application (`apps/guestflow/`)

**Performance Goals**: Ingest and contact apply stay in-process; no extra LLM calls in this package

**Constraints**: One PR, do not merge, no deploy, no Production Turso writes, no sends. Parallel Sprint 2 PRs exist — keep the diff on contacts + multi-room. Redirect ON, confirmToken and Approve&Send unchanged.

**Scale/Scope**: Single property (The Browns Dullstroom). Focused lib + route + two staff surfaces + guest portal form.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | Staff/guest contact forms persist only. No send path added. Approve&Send / confirmToken untouched. |
| II. Fail-Closed Facts | PASS | Empty/invalid stays empty. Ambiguous stay@ match writes nothing. No invented PII. |
| III. Booking SoR vs Comms SoR | PASS | Nightsbridge booking id remains identity. One booker thread per booking. Contacts attach to the booking. |
| IV. Channel Identity Freeze | PASS | No number or From changes. |
| V. Extend Live Systems | PASS | Extends A&D ingest, UMI inbound, bookings page, inbox thread, guest portal. No parallel product. |
| VI. Retention and Lane Separation | PASS | guest_contacts 5-year retention unchanged. Hospitality lane only. |

Post-design re-check: still PASS. Scripts are dry-run by default (Safety Constraints).

## Project Structure

### Documentation (this feature)

```text
specs/018-sprint2-contacts/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api-contacts.md
├── checklists/requirements.md
├── spec.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/src/lib/contact-provenance.ts
apps/guestflow/src/lib/contact-schema.ts
apps/guestflow/src/lib/contact-apply.ts
apps/guestflow/src/lib/arrivals-departures-parse.ts
apps/guestflow/src/lib/client-report-parse.ts
apps/guestflow/src/lib/stay-at-match.ts
apps/guestflow/src/lib/nightsbridge-upsert.ts          # persist email + merge rooms
apps/guestflow/src/lib/guest-contacts.ts               # email-only upsert already allowed
apps/guestflow/src/lib/umi-threads.ts                  # expose email + provenance on thread
apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts
apps/guestflow/src/app/api/cron/nightsbridge-client-import/route.ts
apps/guestflow/src/app/api/ops/bookings/[id]/contacts/route.ts
apps/guestflow/src/app/api/umi/threads/[id]/contacts/route.ts
apps/guestflow/src/app/api/guest-portal/[code]/contacts/route.ts
apps/guestflow/src/app/api/inbound/email/route.ts
apps/guestflow/src/app/api/ops/arrivals-departures/route.ts
apps/guestflow/src/app/api/bookings/route.ts
apps/guestflow/src/app/page.tsx
apps/guestflow/src/app/ops/bookings/page.tsx
apps/guestflow/src/app/guest/[code]/page.tsx
apps/guestflow/scripts/migrate-sprint2-contacts.js
apps/guestflow/scripts/backfill-booking-contacts.js
apps/guestflow/src/lib/__tests__/contact-provenance.test.ts
apps/guestflow/src/lib/__tests__/contact-apply.test.ts
apps/guestflow/src/lib/__tests__/client-report-parse.test.ts
apps/guestflow/src/lib/__tests__/stay-at-match.test.ts
apps/guestflow/src/lib/__tests__/arrivals-departures-parse.test.ts
apps/guestflow/src/lib/__tests__/multi-room-5667.test.ts
apps/guestflow/docs/SPRINT2-CONTACTS.md
```

## Phase 0 / Phase 1

See [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api-contacts.md](./contracts/api-contacts.md), [quickstart.md](./quickstart.md).
