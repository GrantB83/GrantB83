# Implementation Plan: Daily Brief Staff Enqueue

**Branch**: `cursor/daily-brief-enqueue-d5d7` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-daily-brief-staff-enqueue/spec.md`

## Summary

Investigate whether PR #187 daily brief can enqueue into an existing staff approval queue. **Verdict: blocked.** GuestFlow `/api/approvals` exposes five draft types; none support staff-group daily ops brief without inventing a queue or misusing guest Send paths. This PR documents the blocker, exposes `enqueueSupported: false` on GET `/api/daily-brief`, updates UI copy, adds unit tests, and preserves copy/export.

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: Existing `daily-brief.ts`, `/api/approvals`, `/needs-approval` page

**Storage**: No schema changes

**Testing**: Vitest — `daily-brief-enqueue.test.ts` for gate helper

**Constraints**: No auto-send, no new tables, no Twilio/WABA, no NB scrape

## Constitution Check

- ✅ `apps/guestflow/` + Spec Kit artifacts only
- ✅ Fail-closed: no invented queue
- ✅ Reuse PR #187 brief builder text only
- ✅ Draft-only / H11 copy workflow documented

## Project Structure

```text
specs/003-daily-brief-staff-enqueue/
├── spec.md
├── plan.md
├── research.md
├── tasks.md
├── quickstart.md
├── data-model.md
├── contracts/api-daily-brief-enqueue.md
└── checklists/requirements.md

apps/guestflow/
├── src/lib/daily-brief-enqueue.ts          # enqueue gate (supported=false)
├── src/lib/__tests__/daily-brief-enqueue.test.ts
├── src/app/api/daily-brief/route.ts        # +enqueueSupported fields
└── src/app/ops/daily-brief/page.tsx       # blocker UI copy
```

## Phase 0: Map existing patterns

| Component | Path | Role |
|-----------|------|------|
| Daily brief page | `/ops/daily-brief` | PR #187 view + copy/export |
| Brief API | `GET /api/daily-brief` | Returns `briefText` |
| Approvals API | `GET /api/approvals` | Merges inbound, tickets, welcome, late_checkin |
| Needs approval UI | `/needs-approval` | Approve + Send (guest phone) |
| Staff auth | `middleware.ts` + `STAFF_PASSWORD` | Unchanged |

## Phase 1: Enqueue safety verdict

**Safe to reuse?** **No.**

Evidence:

1. No `staff_ops` or `daily_brief` type in approvals SQL (`apps/guestflow/src/app/api/approvals/route.ts`)
2. Send path requires `guest_phone` (`apps/guestflow/src/app/needs-approval/page.tsx` handleSend)
3. Prior research in `specs/002-staff-ops-daily-brief/research.md` Decision 5

**Action**: Do not add Enqueue button or POST handler. Document blocker.

## Phase 2: Implementation (blocker path)

1. Add `getStaffOpsEnqueueGate()` in `daily-brief-enqueue.ts`
2. Extend GET `/api/daily-brief` response with gate fields
3. Update daily brief page banner with enqueue blocker + link to `/needs-approval` for context
4. Add ops note under DEPLOY.md daily brief section
5. Unit tests for gate helper

## Phase 3: Converge

- Mark tasks complete in `tasks.md`
- Append convergence notes documenting blocked User Story 1
