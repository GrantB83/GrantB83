# Implementation Plan: Fix Composer Crush on Unmatched/Window-Closed Threads

**Branch**: `cursor/fix-composer-crush-f4a8` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-fix-composer-crush/spec.md`

## Summary

Fix GuestFlow soft-inbox composer being crushed off-screen when viewing unmatched temp threads with window-closed status. The issue is caused by the unmatched booking-link panel and duplicate care-window chrome consuming vertical space without proper flex constraints, pushing the composer below the viewport. The fix implements a strict 3-zone flex layout: Chrome (flex: 0 0 auto, capped height), Transcript (flex: 1 1 auto, scrollable), Composer (flex: 0 0 auto, min-height reserved).

## Technical Context

**Language/Version**: TypeScript / Next.js 14.2 / React 18.3

**Primary Dependencies**: Next.js (React framework), Tailwind CSS (styling), date-fns (date formatting), Lucide React (icons)

**Storage**: LibSQL / better-sqlite3 (local development database)

**Testing**: Vitest (unit tests), manual browser testing at ~1280×800 desktop and ~390px mobile viewports

**Target Platform**: Web application (browsers: Chrome, Safari, Firefox; devices: desktop ~1280×800, mobile ~390px)

**Project Type**: Next.js web application (Server Components + Client Components, App Router)

**Performance Goals**: Instant layout (no jank), composer always visible without page scroll, transcript scrolls smoothly at 60fps

**Constraints**: 
- Must not break matched thread composer visibility (regression test required)
- Must preserve scroll floors from PR #235 where they don't conflict
- Must not reintroduce gold Redirect banner strip (removed in PR #244)
- Must not modify Redirect ON/OFF functionality
- Desktop reference viewport ~1280×800, mobile reference ~390px
- Unmatched panel default collapsed (one-line strip), expanded capped at ≤~96px

**Scale/Scope**: Single-page app (SPA) with ~30 routes, ~432 source files, soft-inbox serves ~10-50 threads/day for hospitality staff operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Human-Gated Guest Send ✅ PASS
- **Gate**: Changes must not bypass Approve&Send requirement
- **Status**: PASS — layout fix only, no outbound logic changes

### Principle II: Fail-Closed Facts ✅ PASS
- **Gate**: Changes must not invent or guess guest data
- **Status**: PASS — UI layout only, no data logic changes

### Principle III: Booking SoR vs Comms SoR ✅ PASS
- **Gate**: Changes must not replace Nightsbridge or invent booking lines
- **Status**: PASS — no booking data changes

### Principle IV: Channel Identity Freeze ✅ PASS
- **Gate**: Changes must not add numbers, convert personal WA, or change From identities
- **Status**: PASS — no channel identity changes

### Principle V: Extend Live Systems, Stay Cost-Conscious ✅ PASS
- **Gate**: Prefer extending live inbox over new products; one agent per package
- **Status**: PASS — extends existing ThreadLayoutShell and page.tsx only

### Principle VI: Retention and Lane Separation ✅ PASS
- **Gate**: Must not mix family/trust/business lanes or change retention
- **Status**: PASS — UI layout only

## Project Structure

### Documentation (this feature)

```text
specs/029-fix-composer-crush/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (technical investigation)
├── data-model.md        # Phase 1 output (component props/state)
├── quickstart.md        # Phase 1 output (validation scenarios)
├── contracts/           # Phase 1 output (component interface contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created yet)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/
│   │   └── page.tsx                          # Main inbox page (thread rendering logic)
│   ├── components/
│   │   └── inbox/
│   │       ├── ThreadLayoutShell.tsx         # 3-zone flex layout (main fix target)
│   │       ├── ThreadHeader.tsx              # Thread identity header (chrome zone)
│   │       ├── InboxLayoutShell.tsx          # Desktop/mobile layout wrapper
│   │       ├── OutboundDeliveryBubble.tsx    # Message delivery status
│   │       ├── ThreadHeaderDetails.tsx       # Booking details sheet
│   │       ├── InboxConfirmDialog.tsx        # Confirmation dialogs
│   │       ├── useInboxBreakpoint.ts         # Responsive breakpoint hook
│   │       ├── useInboxChromeOffset.ts       # Chrome height calculation
│   │       ├── useShellDimensions.ts         # Shell height calculations
│   │       ├── useVisualViewportInset.ts     # Keyboard inset detection
│   │       └── inbox-types.ts                # TypeScript interfaces
│   └── lib/
│       └── (business logic, not modified)
└── tests/
    └── (vitest tests, may add layout tests)
```

**Structure Decision**: Next.js App Router application with component-based architecture. The fix targets `ThreadLayoutShell.tsx` (flex layout structure) and `page.tsx` (unmatched panel rendering). The 3-zone layout (Chrome → Transcript → Composer) is enforced via Tailwind CSS flex utilities with explicit flex-shrink/flex-grow constraints.

## Complexity Tracking

> No Constitution violations — table skipped.

---

## Phase 1 Complete: Re-check Constitution

*Re-evaluated after design artifacts (research.md, data-model.md, contracts/, quickstart.md) completed.*

### Principle I: Human-Gated Guest Send ✅ PASS
- **Re-check**: Design confirms layout-only changes; Approve&Send requirement unchanged
- **Status**: PASS

### Principle II: Fail-Closed Facts ✅ PASS
- **Re-check**: No data logic changes; unmatched panel links to existing booking candidates only
- **Status**: PASS

### Principle III: Booking SoR vs Comms SoR ✅ PASS
- **Re-check**: No booking data mutations; link action calls existing API endpoint
- **Status**: PASS

### Principle IV: Channel Identity Freeze ✅ PASS
- **Re-check**: No channel configuration changes
- **Status**: PASS

### Principle V: Extend Live Systems, Stay Cost-Conscious ✅ PASS
- **Re-check**: Design extends ThreadLayoutShell and page.tsx only; no new components or parallel systems
- **Status**: PASS

### Principle VI: Retention and Lane Separation ✅ PASS
- **Re-check**: No data retention or lane mixing changes
- **Status**: PASS

**Final Verdict**: All Constitution gates PASS. Ready for `/speckit-tasks` phase.
