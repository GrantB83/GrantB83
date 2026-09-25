# Quickstart: Sprint 2 alerts + NB sync

Validation only. **Do not** apply Production migrate, **do not** send guest mail, **do not** deploy.

## Prerequisites

- Branch based on `cursor/staff-user-management-3989` (users table).
- `apps/guestflow` dependencies already installed (`npm ci` if needed).
- Named env (values come from Vercel / GitHub; do not invent):

| Name | Used for |
| --- | --- |
| `ALERT_FALLBACK_EMAIL` | Recipients when `staff_users` is empty |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Staff alert send + GHA site-down send |
| `RESEND_WEBHOOK_SECRET` / `INBOUND_WEBHOOK_SECRET` | Inbound email / NB email |
| `CRON_SECRET` | Evaluator + existing ingest |
| `GITHUB_ALERTS_TOKEN` | Optional. Fine-grained PAT: Actions Variables read/write on `GrantB83/GrantB83` |
| `GITHUB_ALERTS_REPO` | Optional. Default `GrantB83/GrantB83` |
| `GITHUB_ALERTS_VARIABLE` | Optional. Default `GUESTFLOW_ALERT_EMAILS` |
| `EDGE_CONFIG` / `VERCEL_API_TOKEN` / `EDGE_CONFIG_ID` / `EDGE_CONFIG_ALERTS_KEY` | Optional Edge Config publish |
| `GUESTFLOW_HEALTH_URL` | GHA variable. URL of `/api/health/deep` |
| `NB_USER` / `NB_PASS` | Documented for the batch script; **do not run** here |
| `OPENAI_API_KEY` | Optional LLM parse fallback |

## Commands

```bash
cd apps/guestflow
npx tsc --noEmit
npm test
npx next lint
npx next build
```

Expect: TypeScript clean **without** `typescript.ignoreBuildErrors`. Vitest includes:

- SAST 07:00 / 21:00 edges and overnight digest
- Dedupe / 2h cooldown per recipient
- Recipients: last handler, all users, fallback, removed user
- NB 14h missed-import
- Health 1-fail / 2-fail / recovery
- NB parse, duplicates, gap detection, conflict matrix

## Manual Preview checks (after Vercel READY)

1. `GET /api/health/deep` returns `touched: true` and `Cache-Control: no-store`.
2. `GET /api/health` still works (shallow).
3. Staff login still email+password. Users add/remove still work.
4. Do **not** press Approve&Send to a real guest. Do **not** run `db:migrate:sprint2` against Production.

## Forwarder dependency

GFM confirms `stay@hospitality.partners` → `stay@thebrowns.co.za`. Ingest is already wired on `POST /api/inbound/email`. Until the forward is live, only mail that already reaches Resend inbound is parsed.
