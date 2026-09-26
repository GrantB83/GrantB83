# Implementation Plan: Sprint 4 Inbox Navigability and Redirect Banner Removal

**Branch**: `cursor/sprint4-inbox-navigability-a224` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/028-sprint4-inbox-navigability/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Improve GuestFlow inbox navigability by compacting the thread header (moving contact editors to Details/Edit modal), collapsing the composer (template/care behind disclosure), and making the message transcript the primary scroll surface. Remove the gold/yellow "Redirect ON" visual banner above the navy ops header while preserving redirect behavior. Maintains existing phone navigation (Back + scroll restore), desktop two-pane layout, and all standing locks (redirect sinks, WhatsApp From, no auto-send).

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 + Next.js 14.2

**Primary Dependencies**: Next.js (App Router), React, Tailwind CSS, Lucide React (icons), Zod (validation), date-fns

**Storage**: Turso/libSQL (SQLite-compatible) via @libsql/client and better-sqlite3

**Testing**: Vitest for unit/integration tests, existing layout tests in specs/022/025 and Sprint 3 T+U

**Target Platform**: Web (desktop ≥1200px, tablet 768-1199px, phone <768px); modern browsers supporting CSS flexbox, viewport units, and visualViewport API

**Project Type**: Web application (Next.js App Router) with server and client components, API routes

**Performance Goals**: Smooth 60fps scroll in message transcript; header/composer layout calculations <16ms; phone Back navigation instant (<300ms perceived)

**Constraints**: Must not change OUTBOUND_MODE, redirect sinks, WhatsApp From (+27600200825), auto-send behavior; must preserve existing floor constraints (messages ≥240px/≥35%, composer ≤50%); must maintain phone Back + scroll restore

**Scale/Scope**: Single-property hospitality ops tool (~5-10 staff users, ~100 active guest threads); ~1000 messages per thread typical; inbox components in `apps/guestflow/src/components/inbox/`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Human-Gated Guest Send ✅
**Status**: PASS - No changes to Approve&Send human gate, auto-send, or OUTBOUND_MODE. Redirect behavior stays ON.

### Principle II: Fail-Closed Facts ✅
**Status**: PASS - No guest PII, rates, or contact details invented. Contact editing moved to modal but validation unchanged.

### Principle III: Booking SoR vs Comms SoR ✅
**Status**: PASS - No changes to booking source of record or UMI threading model.

### Principle IV: Channel Identity Freeze ✅
**Status**: PASS - No changes to WhatsApp From (+27600200825), redirect sinks, or channel identities.

### Principle V: Extend Live Systems, Stay Cost-Conscious ✅
**Status**: PASS - Extending existing GuestFlow inbox components (`ThreadLayoutShell`, `InboxLayoutShell`). No new parallel systems. Pure UI layout improvements.

### Principle VI: Retention and Lane Separation ✅
**Status**: PASS - No data retention or lane separation changes.

### Safety Constraints ✅
**Status**: PASS - No auth, JWT, payment, or env-secret changes. No schema migrations. Conventional commits required. No production deploys without Grant approval.

**Constitution Check Result**: ALL GATES PASS - No violations to justify.

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
│   ├── components/
│   │   ├── inbox/
│   │   │   ├── InboxLayoutShell.tsx          # 2-pane list|thread (MODIFY)
│   │   │   ├── ThreadLayoutShell.tsx         # Header|Messages|Composer (MODIFY)
│   │   │   ├── ThreadHeader.tsx              # NEW: Compact header component
│   │   │   ├── ThreadHeaderDetails.tsx       # NEW: Details sheet/modal
│   │   │   ├── ThreadComposer.tsx            # MODIFY: Add template/care disclosure
│   │   │   ├── InboxConfirmDialog.tsx        # Existing Approve&Send dialog
│   │   │   ├── useInboxBreakpoint.ts         # Existing breakpoint hook
│   │   │   ├── useShellDimensions.ts         # Existing dimension hook
│   │   │   ├── useInboxChromeOffset.ts       # MODIFY: Remove Redirect banner offset
│   │   │   └── inbox-types.ts                # Existing types
│   │   └── ops/
│   │       └── OpsHeader.tsx                 # MODIFY: Remove Redirect banner JSX
│   ├── app/
│   │   └── (ops)/
│   │       └── inbox/
│   │           └── page.tsx                  # Inbox page using components
│   ├── lib/
│   │   ├── umi-threads.ts                    # Thread data utilities (unchanged)
│   │   └── __tests__/
│   │       ├── umi-threads.test.ts           # Thread tests (may need updates)
│   │       └── inbox-layout.test.ts          # NEW: Layout tests for compact UI
│   └── styles/
│       └── globals.css                       # Tailwind and custom styles
├── vitest.config.ts                          # Test configuration
└── package.json
```

**Structure Decision**: Next.js App Router monolithic application under `apps/guestflow/`. Components follow existing inbox pattern with `InboxLayoutShell` (outer 2-pane) containing `ThreadLayoutShell` (inner 3-band). New compact components (`ThreadHeader`, `ThreadHeaderDetails`) split responsibilities; existing `ThreadComposer` gains disclosure logic. Redirect banner removal touches `OpsHeader.tsx` and `useInboxChromeOffset.ts`.

## Complexity Tracking

No constitution violations - section not applicable.
