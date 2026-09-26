# Quickstart: Sprint 6 validation

## Prerequisites

- `apps/guestflow` deps installed
- Vitest from `apps/guestflow`

## Unit / contract

```bash
cd apps/guestflow
npx vitest run __tests__/umi-inbox.test.ts __tests__/umi-wa-web-sentinels.test.ts __tests__/sprint6-inbox-ui.test.ts src/lib/__tests__/umi-threads.test.ts src/lib/__tests__/wa-web-body.test.ts
```

Expect: limit honor; sentinel list exact bodies; booking-linked reclassify; tooltip copy; no Template & Care; search padding class ≥ `pl-10`.

## Local UI

```bash
cd apps/guestflow
npm run dev
```

Open `http://localhost:3100/?fixture=1`:

1. Header is two compact rows; type “Search” — S is clear of the glass.
2. Open a fixture thread; hover/focus channel, templates, attach, expand — exact SoR strings.
3. Type a draft, Expand editor, edit, Esc — same draft. Approve & Send visible in overlay (do not confirm on Prod).
4. `?thread=` deep-link still opens the thread.

## Preview / Prod (QA after tip)

See [VERIFY-PACK](../../verify/sprint-6/VERIFY-PACK.md):

- Time `GET /api/umi/inbox?limit=25` vs `limit=10` (counts differ; warm ≤3s).
- Thread 46: sentinel list includes it; Refresh bodies / Ship B pull; read real text; Filtered cleared if booking-linked.
- No Redirect flip. No Approve&Send unless testing sinks.
