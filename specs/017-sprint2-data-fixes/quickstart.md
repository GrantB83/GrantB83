# Quickstart: Sprint 2 Data Fixes

Validation only. Do not send, merge, deploy, or apply Production Turso.

## Prerequisites

- Repo at `apps/guestflow/`
- `npm ci` if `node_modules` is missing
- No Production `DATABASE_URL` writes

## Automated

```bash
cd apps/guestflow
npm run lint
npx tsc --noEmit
npm test
```

Expect green. Do not add `typescript.ignoreBuildErrors`.

## Script commands (do not run against Production)

```bash
# Read-only BLOCK marker counts (no names)
node apps/guestflow/scripts/count-owner-blocks.js

# Demo properties / FK counts; add --apply only after a separate OK
node apps/guestflow/scripts/migrate-gap1-properties.js

# List empty threads; clear false flags only with --apply after GFM
node apps/guestflow/scripts/cleanup-umi-empty-threads.js
```

## Preview GET-only smoke (after Preview is READY)

Use Preview, never Production write-on-GET endpoints (`/api/umi/inbox`, `/api/comms`, `/api/welcome-drafts`, `/api/guest-portal/*` stay uncalled against Production).

- `GET /api/daily-brief?tenant_id=1` → 200, no cancelled/BLOCK guests, no “Property TBD”
- `GET /api/checkin-status` → 200, SAST date, no BLOCK/cancelled
- `GET /api/exceptions` → 200
- `GET /api/today-stats` → 404

## Manual Inbox proof (local/Preview fixtures)

Opening Inbox and a thread performs zero DB writes. Empty thread not flagged. Unanswered inbound flagged.
