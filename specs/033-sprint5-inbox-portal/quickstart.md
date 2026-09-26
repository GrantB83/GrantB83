# Quickstart — Sprint 5 validation

## Prerequisites

- `apps/guestflow` dependencies installed
- Local or Preview env; Redirect ON
- Optional: `/?fixture=1` for inbox layout without Turso

## Automated

```bash
cd apps/guestflow
npx vitest run src/lib/__tests__/portal-security.test.ts src/lib/__tests__/header-chips.test.ts src/lib/__tests__/room-catalog.test.ts src/lib/__tests__/journey-config.test.ts src/lib/__tests__/arrival-drafts.test.ts __tests__/sprint5-inbox-ui.test.ts
npm test
npx tsc --noEmit
```

Expected: all new tests pass; existing send/redirect tests still pass; no `Staff phone` in inbox Details.

## Manual inbox (S4/S5/S10)

1. Open Preview `/?fixture=1` at ~1280×800 with OS taskbar visible.
2. Confirm list rows have no chip row; open a thread.
3. History is the only scroll; composer is bottom overlay; no Template & Care.
4. Focus the field — it expands; Approve & Send and Cancel sit above the taskbar (≥12px).
5. Repeat at ~390: list OR thread; composer usable.
6. Open Details: Guest phone/email; Save.

## Manual portal (S10)

1. Pre-window token: rooms + links + local info; copy that codes appear check-in day; no password.
2. During window: SSID The Browns Guests; codes only if SoR has them.
3. After departure 12:00: security gone.

## Job-script (Design/QA)

See `specs/verify/sprint-5/VERIFY-PACK.md`.
