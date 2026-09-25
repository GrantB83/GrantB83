# Tasks: GuestFlow Browns Brand Visual Alignment

**Input**: Design documents from `/specs/024-guestflow-browns-brand/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Manual visual testing required per Design QA checklist; automated test snapshot updates included.

**Organization**: Tasks organized by implementation phases (Phase 0 theme → Phase 1-3 staff → Phase 2b guest) aligned with spec requirements and Grant sequencing directive.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=staff brand, US2=guest brand, US3=redirect, US4=WhatsApp)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js web application. Paths:
- Application root: `apps/guestflow/`
- Next.js pages: `apps/guestflow/src/app/`
- Components: `apps/guestflow/src/components/`
- Public assets: `apps/guestflow/public/`
- Config: `apps/guestflow/tailwind.config.ts`, `apps/guestflow/next.config.mjs`
- Tests: `apps/guestflow/__tests__/`, `apps/guestflow/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare workspace and copy design assets

- [ ] T001 Copy Browns logo SVG from uploads/thebrowns-logo-live_079f.svg to apps/guestflow/public/logos/thebrowns-logo-live.svg
- [ ] T002 [P] Copy Browns logo PNG from uploads/The_Browns_Logo_Full_V1-1_43ba.png to apps/guestflow/public/logos/the-browns-logo.png
- [ ] T003 [P] Copy token board PNG from workspace/guestflow-brand/proposal-2026-09-24/tokens/token-board.png to apps/guestflow/public/design/token-board.png (for reference)
- [ ] T004 [P] Copy Design mockups from uploads/ to apps/guestflow/public/design/ for visual QA reference

---

## Phase 2: Foundational (Phase 0 - Theme Foundation)

**Purpose**: Establish Browns design tokens and typography system that ALL surfaces depend on

**⚠️ CRITICAL**: No surface restyle work can begin until this phase is complete

- [ ] T005 [US1] Update Tailwind config colors in apps/guestflow/tailwind.config.ts: Replace primary scale (currently sky blue) with navy scale derived from #0A3775; add secondary scale for gold #FAC72E; add muted #F6F5F3, accent #DCE8F9, border #E0E5EB, mutedForeground #65758B, foreground #1D2530
- [ ] T006 [US1] Add WhatsApp green color to Tailwind config in apps/guestflow/tailwind.config.ts: `whatsapp: '#25D366'` as semantic channel color (never used as brand primary)
- [ ] T007 [US1] Set default borderRadius in Tailwind config apps/guestflow/tailwind.config.ts: `borderRadius: { DEFAULT: '0.5rem' }`
- [ ] T008 [US1] Import Montserrat font (weights 300-700) from next/font/google in apps/guestflow/src/app/layout.tsx; assign to CSS variable `--font-sans` for body/UI elements
- [ ] T009 [US1] Import Playfair_Display font (weights 400-700) from next/font/google in apps/guestflow/src/app/layout.tsx; assign to CSS variable `--font-serif` for headings only
- [ ] T010 [US1] Update Tailwind config fontFamily in apps/guestflow/tailwind.config.ts: Map `sans` to Montserrat CSS var, `serif` to Playfair Display CSS var
- [ ] T011 [US1] Verify globals.css or equivalent CSS entry point (apps/guestflow/src/app/globals.css or src/styles/globals.css) applies fonts correctly: body uses font-sans (Montserrat), h1 uses font-serif (Playfair Display)
- [ ] T012 [US1] Run `npm run dev` in apps/guestflow and verify dev server starts on localhost:3100; check browser DevTools for loaded fonts and theme colors

**Checkpoint**: Foundation ready - all surfaces can now apply Browns tokens via Tailwind utilities

---

## Phase 3: User Story 1 Part 1 (Phase 1 - Staff Login & Shell)

**Goal**: Staff see Browns logo, navy/gold colors, and proper typography on login page and top navigation shell

**Independent Test**: Navigate to /staff-login; verify Browns logo, navy primary, gold secondary, Playfair heading, Montserrat form labels; complete login flow to ensure workflow unchanged

### Implementation for User Story 1 Part 1

- [ ] T013 [P] [US1] Update staff-login page in apps/guestflow/src/app/staff-login/page.tsx: Replace generic logo/placeholder with Browns heritage logo (/logos/thebrowns-logo-live.svg); apply navy bg-primary colors; ensure page heading uses font-serif (Playfair Display); form labels/inputs use font-sans (Montserrat); preserve Email + Password fields + "Access Ops Console" button
- [ ] T014 [P] [US1] Update root layout top nav/shell in apps/guestflow/src/app/layout.tsx: Add Browns heritage logo to top navigation; apply navy bg-primary header colors; ensure nav links use font-sans (Montserrat)
- [ ] T015 [US1] Locate redirect banner component (search codebase for "OUTBOUND" or "redirect" keyword in src/components/ or src/app/); update className/style to use Browns palette (bg-muted #F6F5F3 background, text-primary navy text, border-secondary gold emphasis); preserve banner copy and onClick behavior unchanged
- [ ] T016 [US1] Run `npm run dev`; navigate to http://localhost:3100/staff-login; compare to Design mockup uploads/01-login-proposed_fffc.png; verify Browns logo visible, navy/gold colors applied, Playfair on heading, Montserrat on form labels, warm muted background
- [ ] T017 [US1] Test staff login workflow: Enter test credentials (if available); click "Access Ops Console"; verify redirect to /ops or /inbox works (workflow unchanged); observe top nav shell displays Browns logo and colors
- [ ] T018 [P] [US1] Update automated test snapshots in apps/guestflow/__tests__/staff-login-ui.test.ts: Run `npm run test`; if snapshots fail due to className changes, update with `npm run test -- -u`; verify test logic still valid (no behavior changes)

**Checkpoint**: Staff login page and shell chrome display Browns branding; login workflow unchanged

---

## Phase 4: User Story 1 Part 2 (Phase 2 - Staff Primary Ops Surfaces)

**Goal**: Staff see Browns brand throughout daily ops surfaces (Ops hub, Needs Approval, Arrivals/Departures, Inbox)

**Independent Test**: Navigate through /ops, /needs-approval, /ops/arrivals-departures, / (inbox); verify all use navy headers, gold emphasis, warm muted backgrounds, Montserrat UI

### Implementation for User Story 1 Part 2

- [ ] T019 [P] [US1] Update Ops hub page in apps/guestflow/src/app/ops/page.tsx: Apply navy bg-primary headers on cards; gold bg-secondary emphasis on "Review queue" button; warm muted bg-muted page background; ensure all UI text uses font-sans (Montserrat), no font-serif in cards/buttons
- [ ] T020 [P] [US1] Update Needs Approval page in apps/guestflow/src/app/needs-approval/page.tsx: Apply Browns chrome (navy headers, gold "Review queue", muted backgrounds); style "Approve & Send" button with navy bg-primary; preserve human gate behavior unchanged (no auto-send logic changes)
- [ ] T021 [P] [US1] Update Arrivals & Departures page in apps/guestflow/src/app/ops/arrivals-departures/page.tsx: Apply navy bg-primary table header row; Montserrat font-sans in all table cells (no font-serif in dense data); muted bg-muted row backgrounds; border border-border (#E0E5EB) between rows/columns
- [ ] T022 [P] [US1] Update Inbox shell page (apps/guestflow/src/app/page.tsx or dedicated inbox route if separate): Apply Browns header chrome (navy bg-primary); gold/accent colors on unread indicators; Montserrat font-sans in inbox rows; warm muted bg-muted background
- [ ] T023 [US1] Run `npm run dev`; navigate to http://localhost:3100/ops; compare to Design mockup uploads/02-ops-hub-proposed_6f54.png; verify navy headers, gold buttons, warm muted backgrounds, Montserrat throughout
- [ ] T024 [US1] Navigate to /needs-approval; compare to Design mockup uploads/03-needs-approval-proposed_f857.png; verify Browns colors; click "Approve & Send" on test draft (if available); verify modal/confirmation appears (human gate preserved, no auto-send)
- [ ] T025 [US1] Navigate to /ops/arrivals-departures; verify navy table headers, Montserrat in cells, muted row backgrounds, borders; test date filters work (behavior unchanged)
- [ ] T026 [US1] Navigate to / (inbox root); verify Browns header, unread accents use accent color, Montserrat rows; test inbox navigation works (behavior unchanged)
- [ ] T027 [P] [US1] Update automated test snapshots in apps/guestflow/__tests__/mobile-inbox-ui.test.ts and any other relevant UI tests: Run `npm run test`; update snapshots if className changes detected; verify test logic unchanged

**Checkpoint**: All staff primary ops surfaces display Browns branding; workflows unchanged

---

## Phase 5: User Story 2 (Phase 2b - Guest Portal) — GFM LOCK via CoS

**Goal**: Guests see Browns brand in portal pages across exactly six product-sensitive surfaces (visual restyle only)

**GFM LOCK (25 Sep)**: Phase 2b covers exactly six surfaces:
1. Magic-link entry + expired/invalid states
2. Access codes display (pins/lockbox SoR — NEVER invent codes or values)
3. WiFi SoR / network_ask_staff display
4. Stay summary facts
5. Check-in/arrival chips/CTAs (if present)
6. Contact handoff to +27600200825 / stay@thebrowns.co.za (From/redirect unchanged)

**HARD CONSTRAINT**: Do not change copy logic, gates, or data — restyle chrome/tokens/type/logo only on these six surfaces. Design addendum forthcoming; until then remap existing UI 1:1 onto Phase 0 tokens.

**Independent Test**: Generate test guest magic-link (scripts/smoke-portal.mjs or manual); click link; verify guest portal displays Browns logo, navy/gold colors, Playfair heading, Montserrat UI across all six GFM-locked surfaces; existing data/logic preserved

### Implementation for User Story 2

- [ ] T028 [P] [US2] Update guest portal page in apps/guestflow/src/app/guest/[code]/page.tsx: Add Browns heritage logo (/logos/thebrowns-logo-live.svg); apply Phase 0 Browns tokens (navy bg-primary, gold bg-secondary, muted bg-muted, accent, border colors); Playfair font-serif on main page heading only; Montserrat font-sans for all body text/labels/data; preserve existing data fetching logic unchanged across all six GFM-locked surfaces (magic-link validation, access codes SoR, WiFi display, stay summary, check-in chips, contact handoff)
- [ ] T028a [US2] Restyle magic-link entry state: Apply Browns chrome to valid entry UI; preserve magic-link validation logic unchanged
- [ ] T028b [US2] Restyle expired/invalid magic-link states: Apply Browns error styling (muted-foreground or primary text, border-border); preserve error detection logic and copy unchanged
- [ ] T028c [US2] Restyle access codes display: Apply Browns styling to pins/lockbox display cards; NEVER invent or modify code values (SoR unchanged); use navy/gold/muted palette for chrome only
- [ ] T028d [US2] Restyle WiFi display: Apply Browns chrome to WiFi credentials or network_ask_staff message; preserve WiFi logic and copy unchanged
- [ ] T028e [US2] Restyle stay summary facts: Apply Browns styling to booking details, check-in times, stay dates; preserve data display logic unchanged
- [ ] T028f [US2] Restyle check-in/arrival chips/CTAs: Apply Browns colors to status chips and action buttons (if present); preserve chip logic and CTA behavior unchanged
- [ ] T028g [US2] Restyle contact handoff links: Apply Browns link styling to +27600200825 phone and stay@thebrowns.co.za email; preserve From identity and redirect behavior unchanged (no new channels, no From changes)
- [ ] T029 [P] [US2] Update guest layout in apps/guestflow/src/app/guest/layout.tsx: Apply Browns theme tokens (colors, fonts); ensure consistent chrome with guest portal page; preserve existing layout structure and authentication/access control logic unchanged
- [ ] T030 [US2] Generate test guest access code: Run `node apps/guestflow/scripts/smoke-portal.mjs` (or create manual magic-link URL http://localhost:3100/guest/<test-code>)
- [ ] T031 [US2] Navigate to test guest portal URL with valid code; verify Browns heritage logo visible, navy/gold colors applied, Playfair on heading, Montserrat on body text, warm muted backgrounds across all six GFM-locked surfaces
- [ ] T031a [US2] Test expired/invalid magic-link: Navigate with invalid code; verify error state displays Browns styling; error logic unchanged
- [ ] T032 [US2] Verify guest portal data display on all six surfaces: Check (1) magic-link validation works, (2) access codes render correctly without invention, (3) WiFi displays per SoR flag, (4) stay summary facts accurate, (5) check-in chips show correct states, (6) contact handoff links work (functionality preserved on all surfaces); no new features invented
- [ ] T033 [US2] Test guest portal on mobile viewport (resize browser or use DevTools device emulation); verify responsive design maintained with Browns colors across all six surfaces

**Checkpoint**: Guest portal displays Browns branding; existing portal functionality preserved

---

## Phase 6: User Story 3 (Redirect Banner Restyle)

**Goal**: Redirect mode indicator banner styled with Browns colors while preserving copy and behavior

**Independent Test**: Set OUTBOUND_MODE=redirect in .env.local; restart dev server; navigate to any ops page; verify redirect banner displays with Browns colors (gold emphasis, navy text, muted background); click banner if interactive (behavior unchanged)

### Implementation for User Story 3

- [ ] T034 [US3] Verify redirect banner component location (completed in T015 or search again if not found earlier); ensure styling uses Browns palette: bg-muted (#F6F5F3) background, text-primary (navy) text, border-secondary (gold #FAC72E) for emphasis/border
- [ ] T035 [US3] Set `OUTBOUND_MODE=redirect` in apps/guestflow/.env.local; restart dev server with `npm run dev`
- [ ] T036 [US3] Navigate to http://localhost:3100/ops and other ops pages; verify redirect banner appears with Browns styling (gold emphasis, navy text, warm muted background); verify banner copy unchanged (e.g., "Redirect ON" or equivalent)
- [ ] T037 [US3] If redirect banner is clickable, click it; verify behavior unchanged (leads to same redirect settings or dismissal as before restyle)

**Checkpoint**: Redirect banner styled with Browns colors; copy and behavior unchanged

---

## Phase 7: User Story 4 (Phase 3 - WhatsApp Channel Indicators & Secondary Ops)

**Goal**: WhatsApp green preserved for channel indicators only; secondary ops surfaces (inbound queue, access codes, draft tools) display Browns chrome

**Independent Test**: Navigate to inbound queue and other secondary ops pages; verify WhatsApp green (#25D366) appears only on channel chips/badges; all other chrome (headers, buttons, backgrounds) uses Browns navy/gold/muted palette

### Implementation for User Story 4

- [ ] T038 [P] [US4] Update inbound queue page (apps/guestflow/src/app/ops/inbound-queue/ or apps/guestflow/src/app/inbound-queue/page.tsx): Apply Browns chrome (navy bg-primary headers, muted bg-muted backgrounds); use WhatsApp green bg-whatsapp (#25D366) ONLY on channel-specific chips/badges (not structural headers/buttons); Montserrat font-sans throughout
- [ ] T039 [P] [US4] Locate and update access codes ops page (path TBD; search codebase for "access" or "codes" routes under src/app/): Apply Browns color tokens (navy/gold/muted); Montserrat font; preserve existing access code display/generation logic unchanged
- [ ] T040 [P] [US4] Locate and update draft tools/staff ops utilities (paths TBD; may be under src/app/ops/ or dedicated routes): Apply Browns palette throughout; Montserrat font; preserve existing draft management logic unchanged
- [ ] T041 [US4] Navigate to http://localhost:3100/ops/inbound-queue (or equivalent path); verify Browns chrome applied; WhatsApp green visible only on channel indicators (chips showing "WhatsApp" channel type); verify message list displays correctly (behavior unchanged)
- [ ] T042 [US4] Navigate to access codes page; verify Browns styling applied; test access code generation/display if test data available (functionality preserved)
- [ ] T043 [US4] Navigate to draft tools page; verify Browns styling applied; test draft operations if test data available (functionality preserved)

**Checkpoint**: All secondary ops surfaces display Browns branding; WhatsApp green used only for channel identification; workflows unchanged

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, testing, and documentation updates

- [ ] T044 [P] Run full test suite in apps/guestflow: `npm run test`; verify all tests pass after snapshot updates; no behavior test failures
- [ ] T045 [P] Run linter in apps/guestflow: `npm run lint`; fix any linting errors related to className changes or unused imports
- [ ] T046 Run build in apps/guestflow: `npm run build`; verify Next.js build completes successfully; fonts optimized; static assets (logos) included; no build errors
- [ ] T047 Validate against Design QA checklist from uploads/design-qa-checklist_6554.md: Go through each phase checklist item; verify CSS vars/theme match tokens.json; verify Montserrat/Playfair usage correct; verify contrast ratios; verify logo placement; verify no sky/blue primary remaining
- [ ] T048 Run quickstart.md validation scenarios: Follow specs/024-guestflow-browns-brand/quickstart.md Phase 0-2b validation steps; document any issues found; remediate before PR
- [ ] T049 Contrast validation: Use WebAIM Contrast Checker or similar tool; verify navy #0A3775 on white (PASS AA ~9.4:1); gold #FAC72E on navy (PASS AA large text ~5.2:1); muted foreground #65758B on muted #F6F5F3 (PASS AA ~4.6:1); document any failing combinations; adjust if needed
- [ ] T050 Create before/after screenshots per phase: Capture staff-login before (uploads/01-login_78ef.png baseline) and after (current restyled); ops-hub before (uploads/02-ops-hub_25b8.png baseline) and after; needs-approval before/after; guest portal before/after; save to apps/guestflow/public/qa/ for PR reference
- [ ] T051 Verify Playwright E2E tests still pass (optional): `cd apps/guestflow && npx playwright test`; update visual regression baselines if using screenshots; verify login/navigation flows work
- [ ] T052 Document phase completion in PR body: Create checklist mapping Phase 0 (theme foundation) → Phase 1 (login+shell) → Phase 2 (primary ops) → Phase 2b (guest portal) → Phase 3 (secondary ops) to completed tasks; reference before/after screenshots
- [ ] T053 Commit all changes with conventional commit messages: `feat(guestflow): apply Browns brand visual alignment across staff and guest surfaces` (or break into multiple commits per phase: `feat(guestflow): phase 0 - browns theme foundation`, `feat(guestflow): phase 1 - staff login and shell branding`, etc.)
- [ ] T054 Push feature branch cursor/guestflow-browns-brand-9bcf to remote: `git push -u origin cursor/guestflow-browns-brand-9bcf`
- [ ] T055 Create PR using ManagePullRequest tool: Set action=create_pr, title="GuestFlow Browns Brand Visual Alignment (Phases 0-3 + 2b)", body with phase checklist + before/after notes + Preview URL + Design QA gate + GFM acceptance gate, branch_name=cursor/guestflow-browns-brand-9bcf, base_branch=main (or user's preferred base), draft=true
- [ ] T056 Provide Preview URL for Design visual QA: Deploy to Vercel preview or provide localhost instructions; list URL in PR body and final response to user

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - copy design assets first
- **Foundational (Phase 2)**: Depends on Setup - theme tokens BLOCK all surface restyle work
- **US1 Part 1 (Phase 3)**: Depends on Foundational (Phase 2) - staff login & shell
- **US1 Part 2 (Phase 4)**: Depends on Phase 3 - staff primary ops surfaces
- **US2 (Phase 5)**: Depends on Foundational (Phase 2) - guest portal (can parallel with Phase 3/4 but Grant sequencing prefers after staff surfaces)
- **US3 (Phase 6)**: Depends on Foundational (Phase 2) - redirect banner restyle
- **US4 (Phase 7)**: Depends on Foundational (Phase 2) - secondary ops & WhatsApp indicators
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **User Story 1 (Staff brand)**: Can start after Foundational (Phase 2) - Split into Part 1 (Phase 3) and Part 2 (Phase 4) for sequencing
- **User Story 2 (Guest brand)**: Can start after Foundational (Phase 2) - Implemented in Phase 5; Grant amendment requires staff+guest in same PR
- **User Story 3 (Redirect)**: Can start after Foundational (Phase 2) - Independent of US1/US2; lower priority (P2)
- **User Story 4 (WhatsApp)**: Can start after Foundational (Phase 2) - Independent of US1/US2/US3; lower priority (P3)

### Within Each Phase

- Phase 1 (Setup): All tasks marked [P] can run in parallel (copy different files)
- Phase 2 (Foundational): Tasks can run mostly in parallel except T012 depends on T005-T011 complete; T005-T011 can be done sequentially or in small parallel batches
- Phase 3-7 (User Stories): Within each phase, tasks marked [P] can run in parallel; unmarked tasks have implicit dependencies on prior tasks
- Phase 8 (Polish): T044-T046 can run in parallel; T047-T052 sequential (validation/documentation); T053-T056 sequential (git/PR workflow)

### Parallel Opportunities

- **Setup tasks** (T001-T004): All [P] - copy different files simultaneously
- **Foundational tasks** (T005-T011): Mostly sequential (Tailwind config changes); fonts (T008-T009) can parallel with color config (T005-T007)
- **US1 Part 1 implementation** (T013-T014): Login page and layout can parallel (different files)
- **US1 Part 2 implementation** (T019-T022): Ops hub, Needs Approval, Arrivals, Inbox can all parallel (different files)
- **US2 implementation** (T028-T029): Guest portal page and layout can parallel
- **US4 implementation** (T038-T040): Inbound queue, access codes, draft tools can all parallel (different files)
- **Polish early tasks** (T044-T046): Tests, lint, build can all parallel (different commands)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Sequential for Tailwind config (same file):
Task T005: Update Tailwind colors (primary navy, secondary gold, muted, accent, border, etc.)
Task T006: Add WhatsApp green color
Task T007: Set default borderRadius

# Parallel for font loading (different concerns):
Task T008: Import Montserrat in layout.tsx
Task T009: Import Playfair Display in layout.tsx
```

---

## Parallel Example: Phase 4 (US1 Part 2)

```bash
# All can run in parallel (different files):
Task T019: Update Ops hub page (src/app/ops/page.tsx)
Task T020: Update Needs Approval page (src/app/needs-approval/page.tsx)
Task T021: Update Arrivals/Departures page (src/app/ops/arrivals-departures/page.tsx)
Task T022: Update Inbox shell page (src/app/page.tsx or inbox route)
```

---

## Implementation Strategy

### MVP First (Phase 0 + Phase 1-2 Staff Surfaces)

1. Complete Phase 1: Setup (copy assets)
2. Complete Phase 2: Foundational (theme tokens) - CRITICAL blocker
3. Complete Phase 3: US1 Part 1 (staff login & shell)
4. Complete Phase 4: US1 Part 2 (staff primary ops)
5. **STOP and VALIDATE**: Test staff surfaces independently against Design mockups
6. Deploy/preview for Design QA

### Full Delivery (Staff + Guest per Grant Amendment)

1. Complete MVP (Phases 1-4) → Staff surfaces validated
2. Complete Phase 5: US2 (guest portal) → Guest surfaces added
3. Complete Phase 6: US3 (redirect banner) → Optional enhancement
4. Complete Phase 7: US4 (WhatsApp + secondary ops) → Complete coverage
5. Complete Phase 8: Polish & validation → PR ready
6. **One PR with all surfaces** per Grant directive: "Do NOT ship staff-only and leave guest portal on Inter/sky blue"

### Sequencing per Grant Directive

Grant's amendment specifies:
1. Phase 0 theme foundation (shared) - first (Phase 2 in tasks)
2. Phases 1-3 staff chrome - as already scoped (Phases 3-4, 7 in tasks)
3. Phase 2b guest portal chrome AFTER staff primary ops surfaces, still same PR (Phase 5 in tasks)

This tasks.md follows that sequencing: Setup → Foundation → Staff Login/Shell → Staff Primary Ops → Guest Portal → Redirect/WhatsApp Secondary.

---

## Notes

- [P] tasks = different files, no dependencies - can parallelize
- [Story] label maps task to specific user story per spec.md (US1=staff, US2=guest, US3=redirect, US4=WhatsApp)
- Visual restyle only - no behavior changes, no API modifications, no workflow changes
- One PR delivery required per Grant amendment - all staff + guest surfaces ship together
- No production deploy until Grant CLEAR via CoS
- Design QA checklist validation required per phase before PR ready
- Preserve Approve&Send human gate, OUTBOUND redirect behavior, magic-link auth, WhatsApp Cloud API From identity per constitution
- Contrast ratios MUST meet WCAG AA (4.5:1 normal, 3:1 large text)
- Montserrat for dense UI; Playfair Display ONLY on page H1/empty-state titles (never in tables/buttons per GFM lock)
- WhatsApp green (#25D366) channel-only; never brand primary
- Commit after each logical phase or task group
- Stop at checkpoints to validate independently
- Avoid: inventing features, changing workflows, modifying APIs, force-push, production deploy without CLEAR

**Total Tasks**: 56 tasks across 8 phases

**Task Breakdown by Phase**:
- Phase 1 (Setup): 4 tasks
- Phase 2 (Foundational): 8 tasks
- Phase 3 (US1 Part 1): 6 tasks
- Phase 4 (US1 Part 2): 9 tasks
- Phase 5 (US2): 6 tasks
- Phase 6 (US3): 4 tasks
- Phase 7 (US4): 6 tasks
- Phase 8 (Polish): 13 tasks

**Parallel Opportunities**: 19 tasks marked [P] across all phases

**Independent Test Criteria**:
- US1 Part 1: Login page displays Browns branding; workflow unchanged
- US1 Part 2: Ops surfaces display Browns branding; workflows unchanged
- US2: Guest portal displays Browns branding; data display preserved
- US3: Redirect banner styled with Browns colors; behavior unchanged
- US4: WhatsApp green channel-only; secondary ops display Browns branding

**Suggested MVP Scope**: Phases 1-4 (Setup + Foundation + US1 staff surfaces) for initial validation, then extend to full delivery (all phases) per Grant one-PR requirement.
