# Implementation Plan: Staff Ops Copy-Only Approvals

**Branch**: `cursor/staff-ops-copy-only-approvals-ce6c` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Unblock `specs/003-daily-brief-staff-enqueue/` by implementing `staff_ops_drafts` + copy-only approval path.

## Summary

PR #188 set `enqueueSupported: false` because `/api/approvals` is guest-oriented and Send requires `guest_phone`. This PR adds a dedicated `staff_ops_drafts` table, unions it into approvals as `type='staff_ops'` with `copy_only: true`, wires `POST /api/daily-brief/enqueue`, and updates UI to enqueue → approve → copy (never Send).

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: `daily-brief.ts`, `daily-brief-enqueue.ts`, `/api/approvals`, `/needs-approval`, Turso/libSQL via `getDbAsync()`

**Storage**: New `staff_ops_drafts` table (Turso-safe migration + runtime `CREATE TABLE IF NOT EXISTS`)

**Testing**: Vitest — enqueue gate, idempotency, staff_ops PATCH (no send)

**Constraints**: Copy-only; no Twilio/WABA/H11 auto-send; no invented rates/PII

## Constitution Check

- ✅ Touch only `apps/guestflow/` + `specs/` (003 preserved, 004 added)
- ✅ Fail-closed: no guest Send reuse for staff_ops
- ✅ Reuse PR #187 brief builder text only
- ✅ Idempotent pending per tenant+date

## Project Structure

```text
specs/004-staff-ops-copy-only-approvals/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-daily-brief-enqueue.md
│   └── api-approvals-staff-ops.md
└── checklists/requirements.md

apps/guestflow/
├── scripts/migrate-add-staff-ops-drafts.js
├── src/lib/staff-ops-drafts.ts
├── src/lib/daily-brief-enqueue.ts          # async gate + enqueue helpers
├── src/app/api/daily-brief/enqueue/route.ts
├── src/app/api/approvals/route.ts          # staff_ops union + PATCH
├── src/app/ops/daily-brief/page.tsx        # Enqueue button
└── src/app/needs-approval/page.tsx         # copy-only UI
```

## Phase 0: Why #188 blocked enqueue

| Finding | Evidence |
|---------|----------|
| No staff-ops type in approvals | `apps/guestflow/src/app/api/approvals/route.ts` — inbound, welcome, late_checkin, tickets only |
| Send requires guest phone | `needs-approval/page.tsx` `handleSend` → `/api/whatsapp/send` with `guestPhone` |
| Prior research | `specs/003-daily-brief-staff-enqueue/research.md` Decision: blocked |

**Unblock path**: New `staff_ops_drafts` + approvals union with `copy_only: true`; forbid guest Send UI/API for this type.

## Phase 1: Data + API

1. Migration script + `ensureStaffOpsDraftsTable()` on init/enqueue
2. `staff-ops-drafts.ts`: insert (idempotent), table-exists check
3. `POST /api/daily-brief/enqueue` — server-side brief generation
4. `GET /api/approvals` — staff_ops union with metadata `{ copy_only: true, brief_date }`
5. `PATCH /api/approvals` — type-aware approve/reject for staff_ops; return `copyContent`

## Phase 2: UI

1. `/ops/daily-brief` — Enqueue button when `enqueueSupported`
2. `/needs-approval` — staff_ops label, hide Send, Copy WhatsApp text after approve
3. `getStaffOpsEnqueueGate(db)` — true when table exists

## Phase 3: Tests & DEPLOY

1. Update `daily-brief-enqueue.test.ts` + add staff-ops-drafts tests
2. DEPLOY.md section: enqueue/approve/copy; copy-only; no send
