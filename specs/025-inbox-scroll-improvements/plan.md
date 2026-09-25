# Implementation Plan: Inbox Scroll and Layout Improvements

**Branch**: `cursor/inbox-scroll-improvements-6349` | **Date**: September 25, 2026 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-inbox-scroll-improvements/spec.md`

## Summary

Resolve nested scroll conflicts and cramped panes in the GuestFlow soft inbox by ensuring independent scrolling for the thread list and message transcript, establishing minimum heights for readable message areas (~240px or 35% of shell on desktop), and implementing responsive composer chrome that collapses on short viewports to preserve message transcript space. The technical approach involves adjusting flexbox layouts, refining the `useInboxChromeOffset` hook to avoid double-counting operations nav height, implementing conditional composer height caps and collapsible UI elements, and adding layout validation tests for minimum pane heights.

## Technical Context

**Language/Version**: TypeScript 5.5, JavaScript ES2022

**Primary Dependencies**: Next.js 14.2 (App Router), React 18.3, TailwindCSS 3.4, date-fns 3.6, Lucide React 0.436

**Storage**: SQLite via @libsql/client 0.18 and better-sqlite3 11.0 (not directly relevant to this layout feature)

**Testing**: Vitest 1.0 for unit/integration tests

**Target Platform**: Web browsers (desktop ~1280×800, tablet, mobile 375-428px wide), Chrome/Safari/Firefox latest

**Project Type**: Next.js web application (GuestFlow hospitality management system)

**Performance Goals**: Scroll interactions must feel native (< 16ms frame time for 60fps), scroll restoration < 100ms, layout calculations should not block rendering

**Constraints**: 
- Must not regress existing soft-inbox search (PR #228) or Approve&Send gate functionality
- Must preserve `LIST_SCROLL_KEY` scroll restoration mechanism
- Must not introduce brand fonts (Montserrat/Playfair) or modify SQL queries unless necessary for layout changes
- Must not change auto-send or outbound redirect logic
- Draft PR only; production merge requires GuestFlow Manager Preview PASS (agent does not perform merge)

**Scale/Scope**: Single-page application with ~10-50 threads visible in list, thread views with 1-100+ messages, mobile and desktop responsive layout

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I. Human-Gated Guest Send (NON-NEGOTIABLE)
**Status**: ✅ PASS — Layout changes do not affect send logic or Approve&Send gates. FR-009 explicitly requires no regression to Approve&Send behavior.

### Principle II. Fail-Closed Facts
**Status**: ✅ PASS — No facts, rates, PII, or contact details are invented or modified by layout changes.

### Principle III. Booking SoR vs Comms SoR
**Status**: ✅ PASS — Layout does not touch booking data or communications source of record.

### Principle IV. Channel Identity Freeze
**Status**: ✅ PASS — No changes to WhatsApp numbers, email identities, or channel configuration.

### Principle V. Extend Live Systems, Stay Cost-Conscious
**Status**: ✅ PASS — Extends existing GuestFlow inbox components (`InboxLayoutShell`, `ThreadLayoutShell`) and CSS (`.inbox-shell`) without creating parallel systems. One agent, one package.

### Principle VI. Retention and Lane Separation
**Status**: ✅ PASS — Layout changes do not affect data retention or cross-entity data lanes.

**Conclusion**: All constitution principles pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/025-inbox-scroll-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/
│   │   ├── page.tsx                         # Main inbox page (thread list + thread view orchestration)
│   │   └── globals.css                      # .inbox-shell CSS, scroll styles
│   ├── components/
│   │   └── inbox/
│   │       ├── InboxLayoutShell.tsx         # Shell layout (list + thread panes)
│   │       ├── ThreadLayoutShell.tsx        # Thread layout (header + messages + composer)
│   │       ├── inbox-types.ts               # TypeScript types for inbox components
│   │       ├── useInboxChromeOffset.ts      # Hook for top offset (operations nav height)
│   │       └── useVisualViewportInset.ts    # Hook for keyboard inset (bottom offset)
│   └── lib/
│       └── umi-channels.ts                  # Channel badges and types
└── tests/                                   # Vitest tests for layout validation

apps/guestflow/__tests__/                    # Alternative test location if present
```

**Structure Decision**: GuestFlow is a Next.js App Router application under `apps/guestflow/`. The inbox UI is organized under `src/app/page.tsx` (main page) and `src/components/inbox/` (layout shells and hooks). Layout styles are in `src/app/globals.css`. This feature modifies existing layout components and styles without introducing new top-level directories. Testing infrastructure uses Vitest in `tests/` or `__tests__/` directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. This section is not applicable.
