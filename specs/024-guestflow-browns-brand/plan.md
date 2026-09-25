# Implementation Plan: GuestFlow Browns Brand Visual Alignment

**Branch**: `cursor/guestflow-browns-brand-9bcf` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/024-guestflow-browns-brand/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Align GuestFlow staff UI and guest portal visual appearance with The Browns guesthouse brand by remapping color palette (navy #0A3775, gold #FAC72E), typography (Playfair Display headings, Montserrat UI), and logo (Browns heritage CI mark) from thebrowns.co.za onto existing GuestFlow surfaces. This is a **visual-only restyle**: no workflow changes, no feature invention, no API modifications. Implementation uses Tailwind CSS theme extension plus shared design tokens to remap existing components. Sequenced as Phase 0 (theme foundation) → Phases 1-3 (staff surfaces) → Phase 2b (guest portal), all in one PR for Design visual QA and GFM acceptance before production ship.

**GFM LOCK (25 Sep via CoS)**: Phase 2b guest portal covers exactly six product-sensitive surfaces (visual restyle only): (1) magic-link entry + expired/invalid states, (2) access codes display (pins/lockbox SoR), (3) WiFi SoR / network_ask_staff, (4) stay summary facts, (5) check-in/arrival chips/CTAs, (6) contact handoff to +27600200825. Do NOT change copy logic, gates, or data — remap existing UI 1:1 onto Phase 0 tokens until Design addendum arrives.

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 (App Router), React 18.3

**Primary Dependencies**: 
- Tailwind CSS 3.4 (utility-first CSS framework with theme configuration)
- Lucide React 0.436 (icon library)
- Next.js App Router (file-based routing, Server Components)
- PostCSS 8.4 (CSS processing)

**Storage**: N/A (visual restyle does not touch data layer; existing Turso/libSQL database unchanged)

**Testing**: 
- Vitest 1.0 (unit/integration tests)
- Playwright (E2E tests in e2e/ directory)
- Manual visual testing via `npm run dev` on localhost:3100

**Target Platform**: Web (browser-based staff UI + guest portal; responsive design for mobile inbox already exists)

**Project Type**: Web application (Next.js) — visual restyle of existing UI surfaces

**Performance Goals**: 
- No performance regression from visual changes (CSS-only changes should not impact runtime)
- Font loading optimized via Next.js font optimization
- Page load times remain <2s (existing baseline)

**Constraints**: 
- WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text) required on all Browns palette colors
- No workflow changes (email+password login flow, Approve&Send human gate, redirect behavior all preserved)
- No API/route modifications unless required for shared theme imports
- One PR delivery (staff + guest surfaces ship together)
- No production deploy until Grant CLEAR via CoS

**Scale/Scope**: 
- 10 primary surfaces to restyle: staff-login, ops hub, needs approval, arrivals/departures, inbox, inbound queue, access codes, draft tools, guest portal page, guest layout
- ~20 React components estimated (based on observed GuestFlow UI structure)
- Zero data model changes
- Zero API endpoint changes (except if CSS/theme imports needed)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I (Human-Gated Guest Send)**: ✓ PASS — Visual restyle does not touch Approve&Send logic, auto-send behavior, or outbound sinks. Human gate preserved.

**Principle II (Fail-Closed Facts)**: ✓ PASS — No guest PII, rates, ETAs, access codes, or contact details invented. Visual changes only.

**Principle III (Booking SoR vs Comms SoR)**: ✓ PASS — No changes to Nightsbridge integration or UMI conversation threading.

**Principle IV (Channel Identity Freeze)**: ✓ PASS — WhatsApp green (#25D366) preserved for channel indicators; no From identity changes.

**Principle V (Extend Live Systems, Stay Cost-Conscious)**: ✓ PASS — Extends existing GuestFlow UI surfaces (no parallel products); one Cloud Agent per Spec-Kit workflow; visual changes only (cheap token cost).

**Principle VI (Retention and Lane Separation)**: ✓ PASS — No changes to data retention, Drive/label/vault lanes, or scope expansion.

**Safety Constraints**: ✓ PASS — No auth/JWT/payment/env-secret changes; no force-push/schema migrations/DNS; no bank/attorney/family messages; draft/queue default preserved.

**Development Workflow**: ✓ PASS — Spec Kit phases run in order (specify → plan → tasks → implement → converge); lint/build/test quality gates applied; one PR, no merge, no production deploy without Grant CLEAR.

**GATE RESULT**: ALL PASS — No constitution violations. No complexity justification required.

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
apps/guestflow/                           # Next.js application root
├── src/
│   ├── app/                              # Next.js App Router pages
│   │   ├── staff-login/                  # Phase 1: Staff login page
│   │   │   └── page.tsx
│   │   ├── ops/                          # Phase 2: Ops hub and related
│   │   │   ├── page.tsx
│   │   │   └── arrivals-departures/
│   │   │       └── page.tsx
│   │   ├── needs-approval/               # Phase 2: Needs Approval
│   │   │   └── page.tsx
│   │   ├── inbound-queue/                # Phase 3: Inbound queue (deprecated path; check /ops/inbound-queue too)
│   │   │   └── page.tsx
│   │   ├── guest/                        # Phase 2b: Guest portal
│   │   │   ├── layout.tsx
│   │   │   └── [code]/
│   │   │       └── page.tsx
│   │   ├── layout.tsx                    # Root layout (Phase 1: top nav/shell)
│   │   └── page.tsx                      # Root page (may be inbox shell)
│   ├── components/                       # Shared UI components
│   │   ├── ui/                           # Generic UI primitives
│   │   ├── staff/                        # Staff-specific components
│   │   └── guest/                        # Guest-specific components
│   ├── lib/                              # Utilities (portal-url.ts, etc.)
│   └── styles/                           # Global styles (if separate from Tailwind)
│       └── globals.css                   # Phase 0: CSS variables / @tailwind directives
├── public/                               # Static assets
│   └── logos/                            # Phase 1: Browns heritage logo SVG/PNG
├── tailwind.config.ts                    # Phase 0: Theme configuration (colors, fonts, radius)
├── postcss.config.mjs
├── next.config.mjs
├── package.json
├── __tests__/                            # Vitest unit/integration tests
│   ├── staff-login-ui.test.ts            # May need snapshot updates
│   └── mobile-inbox-ui.test.ts           # May need snapshot updates
└── e2e/                                  # Playwright E2E tests
    └── mobile-inbox.spec.ts              # May need visual regression updates
```

**Structure Decision**: Next.js App Router web application (Option 2 analog). Visual restyle touches:
- **Phase 0**: `tailwind.config.ts`, `src/styles/globals.css` (or equivalent CSS entry point), font loading configuration
- **Phase 1**: `src/app/staff-login/page.tsx`, `src/app/layout.tsx` (top nav/shell), redirect banner component (TBD location), Browns logo assets in `public/logos/`
- **Phase 2**: `src/app/ops/page.tsx`, `src/app/needs-approval/page.tsx`, `src/app/ops/arrivals-departures/page.tsx`, inbox shell (may be root `page.tsx` or dedicated route)
- **Phase 3**: Inbound queue page, access codes ops tools, draft tools (exact paths TBD during convergence; likely under `/ops` or dedicated routes)
- **Phase 2b**: `src/app/guest/[code]/page.tsx`, `src/app/guest/layout.tsx`

Visual changes are primarily className/style prop updates to apply Browns theme tokens. Minimal or no changes to business logic, API routes (`src/app/api/**`), data lib (`src/lib/**`), or test assertions (except snapshots).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A — No constitution violations detected. This is a visual restyle with minimal complexity increase (shared theme tokens, font loading, className remapping).
