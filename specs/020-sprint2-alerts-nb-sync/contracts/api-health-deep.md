# Contract: Deep health and site-down probe

## `GET /api/health/deep`

Public (middleware already allows `/api/health*`). **Uncached**.

Headers: `Cache-Control: no-store, no-cache, must-revalidate`

Body on success **200**:

```json
{
  "status": "ok",
  "service": "guestflow",
  "check": "deep",
  "database": "turso",
  "touched": true,
  "timestamp": "2026-09-25T05:10:00.000Z"
}
```

Touches the database (`SELECT 1` via `getDbAsync()`). On failure **503**:

```json
{
  "status": "error",
  "service": "guestflow",
  "check": "deep",
  "touched": false,
  "timestamp": "..."
}
```

Must not be statically cached. Distinct from `GET /api/health` (which may stay as today).

## GitHub Actions `guestflow-health-check.yml`

- `on.schedule`: `*/10 * * * *` plus `workflow_dispatch`
- Env/secrets (names only; do not invent values):
  - `GUESTFLOW_HEALTH_URL` — full URL to `/api/health/deep` (repo variable)
  - `GUESTFLOW_ALERT_EMAILS` — published by the app (Actions variable)
  - `ALERT_FALLBACK_EMAIL` — used when the published list is empty
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — existing names, for sending while the app is down
  - `GUESTFLOW_HEALTH_FAIL_STREAK` — integer variable maintained by the workflow
  - `GUESTFLOW_HEALTH_ALERTED` — `0`/`1` so recovery can fire
- Rule: streak 1 → no email. streak ≥ 2 → site-down email once (cooldown also applied if the app path records it). Next success after alerted → recovery email, reset streak and alerted.
- Recipients: published list, else fallback. Never guest sinks.
