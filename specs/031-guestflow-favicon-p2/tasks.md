# Tasks: GuestFlow Favicon P2

**Input**: `/specs/031-guestflow-favicon-p2/`

## Phase 1: Spec Kit & assets

- [x] T001 Spec Kit `spec.md` with operator job + S1–S10
- [x] T002 `plan.md`, `research.md`, `quickstart.md`, requirements checklist
- [x] T003 Generate `public/favicon.ico`, `icon-16.png`, `icon-32.png`, `apple-touch-icon.png` from `the-browns-logo.png` emblem crop
- [x] T004 Add `scripts/generate-favicon.mjs` for reproducible regeneration

## Phase 2: Wire metadata

- [x] T005 Add `metadata.icons` in `apps/guestflow/src/app/layout.tsx` (no other layout behavior changes)

## Phase 3: Verify

- [x] T006 `npm run build` in `apps/guestflow`
- [x] T007 Local `curl -sI /favicon.ico` → 200 + image content-type
- [x] T008 Tab screenshots: `/staff-login` + guest portal on Preview/local
- [x] T009 PR body: curl evidence, Preview URL, **MERGE HOLD** for GFM after Design PASS

## Phase 4: Convergence

- [x] T010 `CONVERGENCE.md` — all spec/plan/tasks satisfied
