# Implementation Plan: Alert Noise Filter for Test and Empty Threads

**Branch**: `cursor/026-alert-noise-filter-4428` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/026-alert-noise-filter/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Reduce false-positive staff alerts by excluding three categories of threads from unanswered/overnight alert evaluation:
1. Test/probe threads (phone +27000000001, test markers like T-44/T-48)
2. Inbound-smoke test threads (GF-INBOUND-TEST, thread 48 style markers)
3. Empty BLOCK/owner-block booking shells with 0 actual inbound guest messages

Technical approach: Enhance the existing `evaluateUnanswered` function in `staff-alerts.ts` with rule-based pattern matching for thread exclusion, avoiding hardcoded thread IDs. The solution will add helper functions to check for test patterns, smoke test markers, and empty BLOCK bookings by counting actual inbound messages.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js runtime, Vercel Functions)

**Primary Dependencies**: 
- `@libsql/client` (Turso/libSQL database client)
- Existing GuestFlow libs: `staff-alerts.ts`, `umi-threads.ts`, `ops-settings.ts`
- Resend API (staff alert email delivery)

**Storage**: Turso (libSQL) with tables `inbound_threads`, `inbound_messages`, `bookings`, `staff_alerts`

**Testing**: Vitest (existing test infrastructure at `apps/guestflow/__tests__/`)

**Target Platform**: Vercel Edge Functions (cron-triggered alert evaluator at `/api/cron/alerts-evaluate`)

**Project Type**: Web service enhancement (existing GuestFlow hospitality management system)

**Performance Goals**: 
- Alert evaluation completes within cron window (10-minute intervals)
- No regression in legitimate alert delivery latency
- Exclusion checks add <50ms to per-thread evaluation

**Constraints**: 
- Draft PR only, no production merge until GFM acceptance
- No changes to WhatsApp send paths, OUTBOUND_MODE, or Approve&Send flows
- No auto-send modifications
- Must use rule-based patterns, not hardcoded thread IDs (IDs are examples)
- Must maintain existing spam filter independence

**Scale/Scope**: 
- ~50-100 active threads evaluated per cron run
- Support for pattern matching across thousands of historical threads
- Three exclusion categories with independent test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Human-Gated Guest Send
✅ **PASS** - This feature modifies staff alert logic only. No guest-facing WhatsApp, email, or SMS send paths are touched. No auto-send is introduced. OUTBOUND_MODE and Approve&Send flows remain unchanged.

### Principle II: Fail-Closed Facts
✅ **PASS** - Feature excludes threads based on pattern matching and message counts. No guest data is invented. Unknown or ambiguous threads continue to alert (fail-open to safety).

### Principle III: Booking SoR vs Comms SoR
✅ **PASS** - Feature reads from existing UMI `inbound_threads` and `bookings` tables. No booking data is written or invented. Nightsbridge remains booking SoR.

### Principle IV: Channel Identity Freeze
✅ **PASS** - No changes to phone numbers, From identities, or channel routing. Feature operates on existing thread metadata only.

### Principle V: Extend Live Systems, Stay Cost-Conscious
✅ **PASS** - Extends existing `staff-alerts.ts` evaluation logic. One focused work package. No parallel alert system. No inbox scanning (cron-triggered evaluation of pending_reply threads only).

### Principle VI: Retention and Lane Separation
✅ **PASS** - No retention policy changes. No cross-lane data access. Feature operates within GuestFlow hospitality lane.

### Safety Constraints
✅ **PASS** - No auth/JWT/payment changes. No production deployments (draft PR only). No schema migrations (uses existing tables and columns).

**Overall Gate Status**: ✅ **PASS** - All constitution principles satisfied. No complexity violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── lib/
│   │   ├── staff-alerts.ts          # MODIFY: Add exclusion logic to evaluateUnanswered()
│   │   ├── staff-alert-filters.ts   # NEW: Pattern matching helpers
│   │   ├── ops-settings.ts          # READ: Existing settings/thresholds
│   │   ├── umi-threads.ts           # READ: Thread/booking query patterns
│   │   └── staff-users-schema.ts    # READ: Existing test peer logic
│   └── app/
│       └── api/cron/
│           └── alerts-evaluate/
│               └── route.ts         # READ: Cron route that calls evaluateUnanswered()
└── __tests__/
    ├── staff-alerts.test.ts         # MODIFY: Add exclusion test cases
    └── staff-alert-filters.test.ts  # NEW: Unit tests for new patterns

specs/026-alert-noise-filter/
├── spec.md
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
└── contracts/                       # Phase 1 output (if applicable)
```

**Structure Decision**: GuestFlow is a Next.js/TypeScript web application under `apps/guestflow/`. This feature modifies the existing staff alert evaluation logic in `src/lib/staff-alerts.ts` and adds a new module `staff-alert-filters.ts` for pattern-matching helpers. Tests live in `__tests__/` using Vitest. No frontend changes required (staff alerts are server-side cron-triggered).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All constitution principles pass. This feature extends the existing alert system without adding architectural complexity.
