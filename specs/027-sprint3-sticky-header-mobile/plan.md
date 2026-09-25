# Implementation Plan: Sprint 3 Sticky Header and Mobile Inbox Width

**Branch**: `cursor/027-sprint3-sticky-header-mobile-0f4e` | **Date**: September 25, 2026 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/027-sprint3-sticky-header-mobile/spec.md`

## Summary

Keep the authenticated navy header plus Outbound Redirect banner/control visible while GuestFlow inbox panes scroll (Sprint 3 T), and widen phone list/thread content so previews are readable at ~390 CSS px (Sprint 3 U). Approach: pin the staff chrome stack as one fixed viewport attachment, measure that stack once for `useInboxChromeOffset` / `useShellDimensions`, lock outer page scroll on `/`, and tighten phone pane gutters / header stacking without regressing #235 height floors, independent pane scroll, or `LIST_SCROLL_KEY` Back restore.

## Technical Context

**Language/Version**: TypeScript 5.5, JavaScript ES2022

**Primary Dependencies**: Next.js 14.2 (App Router), React 18.3, TailwindCSS 3.4, Lucide React 0.436

**Storage**: None. Layout-only. Existing `LIST_SCROLL_KEY` sessionStorage contract is preserved, not redesigned.

**Testing**: Vitest 1.0 source-scan and layout-calculation tests; Playwright/browser fixture screenshots at ~390×844 and ~1280×800

**Target Platform**: Staff web inbox — desktop ~1280×800, phone ~390×844 (Grant phone-width use)

**Project Type**: Next.js web application (`apps/guestflow`)

**Performance Goals**: Sticky chrome must not cause layout thrash on scroll; offset remasure on resize / chrome height change only; 60fps pane scroll

**Constraints**:
- Do not regress #235 floors (~1280×800: messages ≥240px or ≥35% shell; composer ≤50%)
- Do not double-count sticky chrome height
- One primary scroll per inbox pane; no new outer-page dual-scroll
- Approve&Send + confirmToken unchanged; no auto-send
- Redirect stays ON; no go-live flip
- WhatsApp From stays `+27600200825`
- Out of scope: Ultra meter (S), stay@ From (R), brand token restyle beyond sticky/width
- Draft PR only; GFM Preview ACCEPT is the merge gate

**Scale/Scope**: Staff chrome wrapper + inbox shell CSS/layout. No API, schema, or send-path changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I. Human-Gated Guest Send (NON-NEGOTIABLE)
**Status**: ✅ PASS — Layout only. FR-008 forbids Approve&Send / confirmToken / auto-send changes.

### Principle II. Fail-Closed Facts
**Status**: ✅ PASS — No PII, rates, or contacts invented. Fixture guests remain invented-only.

### Principle III. Booking SoR vs Comms SoR
**Status**: ✅ PASS — No booking or UMI data model changes.

### Principle IV. Channel Identity Freeze
**Status**: ✅ PASS — FR-009 freezes WhatsApp From at `+27600200825`. Redirect sinks unchanged.

### Principle V. Extend Live Systems, Stay Cost-Conscious
**Status**: ✅ PASS — Extends existing `Navigation`, outbound banner, `useInboxChromeOffset`, `InboxLayoutShell`, `ThreadLayoutShell`, `.inbox-shell`. One agent, one package, one draft PR.

### Principle VI. Retention and Lane Separation
**Status**: ✅ PASS — No retention or cross-entity data changes.

**Conclusion**: All constitution principles pass. No violations require justification.

## Project Structure

### Documentation (this feature)

```text
specs/027-sprint3-sticky-header-mobile/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chrome-layout-contracts.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Wrap staff chrome; staff-main offset; inbox-lock opt-out
│   │   ├── globals.css                # .ops-chrome fixed stack; phone pane gutters; inbox-lock
│   │   └── page.tsx                   # inbox-lock on html/body; phone list/thread pad classes
│   └── components/
│       ├── StaffChrome.tsx            # NEW: fixed stack + --ops-chrome-height
│       ├── Navigation.tsx             # Remove in-flow sticky (parent is fixed)
│       ├── outbound-redirect-banner.tsx
│       └── inbox/
│           ├── useInboxChromeOffset.ts
│           ├── useShellDimensions.ts
│           ├── InboxLayoutShell.tsx
│           └── ThreadLayoutShell.tsx
└── __tests__/
    ├── mobile-inbox-ui.test.ts
    └── layout/
        ├── sticky-chrome.test.ts
        └── mobile-pane-width.test.ts
```

**Structure Decision**: Extend the live GuestFlow Next.js app. No new package or parallel inbox.

## Complexity Tracking

> No constitution violations.
