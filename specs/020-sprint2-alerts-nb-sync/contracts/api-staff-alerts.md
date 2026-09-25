# Contract: Staff alerts

## `GET` / `POST` `/api/cron/alerts-evaluate`

Idempotent evaluator. Auth: `Authorization: Bearer $CRON_SECRET` or `x-cron-secret` (same pattern as nightsbridge-ingest).

**Schedule**: Vercel cron `*/10 * * * *`.

**Behaviour**:
1. Ensure sprint2 + staff + umi schemas.
2. Evaluate unanswered (staff hours + digest at 07:00 SAST).
3. Evaluate NB missed-import (last ok batch vs `nbMissedImportHours`) and un-alerted batch error / zero-row / rowdrop codes on `nb_sync_runs`.
4. Evaluate resolved notes for open alerts whose issue has cleared.
5. Does **not** send guest messages.

**Response 200**:

```json
{
  "ok": true,
  "evaluatedAt": "2026-09-25T05:10:00.000Z",
  "sent": 0,
  "skipped": 0,
  "resolved": 0,
  "kinds": {
    "unanswered": 0,
    "unanswered_digest": 0,
    "nb_missed": 0,
    "nb_batch": 0
  }
}
```

**401** if secret configured and missing/wrong.

## Hook `notifyFailedApproveSend(input)`

Module: `apps/guestflow/src/lib/staff-alerts.ts`.

```ts
export async function notifyFailedApproveSend(input: {
  db: DbClient
  actorEmail: string | null | undefined
  threadId: number
  bookingRef?: string | null
  guestFirstName?: string | null
  channel?: string
  attemptId?: string
}): Promise<{ sent: number; skipped: number }>
```

Recipient: `actorEmail` if that user still exists; else fallback only when no users exist (do not blast all users). Delivery-status PR may call this later. Email body: first name + booking ref + staff link. No error dump, no codes, no payment text.

## Publish `publishActiveAlertEmails(db)`

Called after successful user add/remove. Writes comma-separated login emails (excluding reserved legacy) to:

1. GitHub Actions variable `GITHUB_ALERTS_VARIABLE` (default `GUESTFLOW_ALERT_EMAILS`) on `GITHUB_ALERTS_REPO` (default `GrantB83/GrantB83`) using `GITHUB_ALERTS_TOKEN`
2. Optional Edge Config key `EDGE_CONFIG_ALERTS_KEY` (default `guestflow_alert_emails`) when Edge Config write envs are present

Missing tokens → `{ published: false, reason: 'not_configured' }`. Never invent a token.
