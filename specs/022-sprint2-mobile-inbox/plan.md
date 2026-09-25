# Implementation Plan: Sprint 2 Mobile-Friendly Inbox

**Branch**: `cursor/sprint2-mobile-inbox-7d95` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-sprint2-mobile-inbox/spec.md`

## Summary

Make the existing GuestFlow UMI inbox usable on a phone without changing APIs or send behaviour. Phone is a single pane (list or full-screen thread) with pinned guest facts and a keyboard-safe composer. Tablet is two-panel with a narrower/collapsible list. Desktop stays the current two-panel. Reserve named slots so parallel window-badge, delivery-status, and redirect-toggle PRs rebase cleanly.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14.2 App Router (`apps/guestflow`)

**Primary Dependencies**: React 18, Tailwind 3.4, lucide-react, date-fns. Playwright + Lighthouse are **dev-only** evidence tools.

**Storage**: None. Read existing inbox/thread JSON. Client fixture for screenshots.

**Testing**: Existing Vitest source-contract tests; new Playwright overflow + screenshot spec; Lighthouse mobile accessibility on `/?fixture=1`

**Target Platform**: Staff browser. Phone <768, tablet 768–1199, desktop ≥1200. Vercel Preview (typecheck must pass; no `typescript.ignoreBuildErrors`)

**Project Type**: Existing web application — UI-only change

**Performance Goals**: Inbox remains a single client page; no extra list remount on phone back

**Constraints**: UI only. No API, schema, auth, or send-sink changes. No merge, no deploy, no sends. Mock PII only in evidence. Parallel PRs own badge / delivery status / redirect toggle.

**Scale/Scope**: `apps/guestflow` inbox page + a small inbox component folder + compact banner / hamburger tap-target tweaks + this spec dir + STATUS / labor-ledger

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | Approve&Send still confirm + confirmToken; no auto-send; redirect sinks untouched |
| II. Fail-Closed Facts | PASS | Header shows stored thread fields only; fixture names are invented mocks, never real guests |
| III. Booking SoR vs Comms SoR | PASS | No booking writes |
| IV. Channel Identity Freeze | PASS | Channel chips and send payload unchanged |
| V. Extend Live Systems | PASS | Same `page.tsx` + small shell components; no new product |
| VI. Retention + lanes | PASS | Hospitality inbox only; no family/trust data |

Post-design re-check: still PASS. Complexity is layout + evidence, not a fourth system.

## Project Structure

### Documentation (this feature)

```text
specs/022-sprint2-mobile-inbox/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/inbox-layout-shell.md
├── checklists/requirements.md
├── screenshots/
├── lighthouse-inbox-a11y.json
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/app/page.tsx                          # compose shell; keep fetch + send sequence
├── src/app/layout.tsx                        # viewport / safe-area meta only if needed
├── src/app/globals.css                       # wrap + inbox shell tokens
├── src/components/inbox/InboxLayoutShell.tsx
├── src/components/inbox/ThreadLayoutShell.tsx
├── src/components/inbox/InboxConfirmDialog.tsx
├── src/components/inbox/useInboxBreakpoint.ts
├── src/components/inbox/useVisualViewportInset.ts
├── src/components/inbox/inbox-fixture.ts
├── src/components/outbound-redirect-banner.tsx  # compact on phone
├── src/components/Navigation.tsx                # 44px hamburger
├── __tests__/mobile-inbox-ui.test.ts
├── e2e/mobile-inbox.spec.ts
└── playwright.config.ts
```

**Structure Decision**: Extend the live inbox page. Extract a thin layout shell so `page.tsx` keeps data/send logic and parallel PRs have stable slots. Do not split a new app or route tree.

## Complexity Tracking

> No constitution violations.
