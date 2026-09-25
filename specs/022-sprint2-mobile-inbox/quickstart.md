# Quickstart: Sprint 2 Mobile-Friendly Inbox

## Prerequisites

- `apps/guestflow` dependencies installed
- No production deploy, no live send
- Screenshots and Lighthouse use `?fixture=1` only

## Dev

```bash
cd apps/guestflow
npm test
npm run lint
npm run build
npm run dev
```

Open:

- Phone list: `http://localhost:3100/?fixture=1` at 360×800
- Phone thread: add `&thread=1`
- Keyboard sim: add `&keyboard=1`
- Confirm: tap Approve&Send (does not send if you cancel)

## Evidence

```bash
cd apps/guestflow
npx playwright test e2e/mobile-inbox.spec.ts
npx lighthouse http://127.0.0.1:3100/?fixture=1 --only-categories=accessibility --form-factor=mobile --screenEmulation.mobile --output=json --output-path=../../specs/022-sprint2-mobile-inbox/lighthouse-inbox-a11y.json
```

Expected:

- Screenshots under `specs/022-sprint2-mobile-inbox/screenshots/`
- Overflow test passes on all four viewports × four scenes
- Lighthouse accessibility ≥ 90
- `next.config.mjs` does not set `typescript.ignoreBuildErrors`

## Safety check

Cancel the confirm dialog. Network tab must show no `/api/inbound/send`.
