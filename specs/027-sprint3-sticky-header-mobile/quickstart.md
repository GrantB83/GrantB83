# Quickstart: Sprint 3 Sticky Header and Mobile Inbox Width

**Feature**: 027-sprint3-sticky-header-mobile
**Date**: September 25, 2026

## Prerequisites

- Repo `GrantB83/GrantB83` on this feature branch
- `apps/guestflow` dependencies installed
- No Production Turso writes, no live send

## Validate artifacts

```bash
test -f specs/027-sprint3-sticky-header-mobile/spec.md
test -f specs/027-sprint3-sticky-header-mobile/plan.md
test -f specs/027-sprint3-sticky-header-mobile/tasks.md
python3 -c "import json; json.load(open('.specify/feature.json'))"
```

Expected: files exist; feature.json points at `specs/027-sprint3-sticky-header-mobile`.

## Unit / contract tests

```bash
cd apps/guestflow
npx vitest run __tests__/layout/sticky-chrome.test.ts __tests__/layout/mobile-pane-width.test.ts __tests__/layout/message-height.test.ts __tests__/layout/composer-height.test.ts __tests__/layout/mobile-scroll-restore.test.ts __tests__/mobile-inbox-ui.test.ts
```

Expected: all pass. Message/composer floors still encode #235 math. Sticky tests require `[data-ops-chrome]` measurement and inbox-lock. Width tests require phone gutter + ≥90% usable width.

## Visual proof (fixture, invented guests)

```bash
cd apps/guestflow
npm run dev
```

1. Open `http://127.0.0.1:3100/?fixture=1` at **1280×800**
2. Scroll list and thread — navy header + Redirect banner stay on screen
3. Confirm message area still meets ≥240px or ≥35% shell; composer ≤50%
4. Open the same URL at **390×844**
5. Phone list: preview and search/needs-attention stack readable across the pane
6. Open a fixture thread: header box + bubbles use the shell; Approve&Send visible
7. Scroll list, open thread, Back — list scroll restores
8. Capture screenshots: phone list, phone thread (required before merge)

## Safety checks (observe only)

- Approve&Send still uses confirmToken; no `window.confirm` send
- No change to WhatsApp From `+27600200825`
- Redirect remains ON; no go-live flip
- Draft PR only — MERGE HOLD until GFM Preview ACCEPT
