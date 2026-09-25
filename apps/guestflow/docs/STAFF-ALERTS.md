# Staff email alerts — what fires and when

Internal staff mail via existing Resend. **Not a guest send.** Guest outbound redirect is bypassed (`sendEmail({ skipRedirect: true })`). Staff alerts do **not** duplicate Decision L (`app_settings.outbound_redirect`); they skip the shared resolver so an ON toggle still delivers to login emails. Recipients are login emails from the users table (PR #215). `ALERT_FALLBACK_EMAIL` is used only when no users exist. The reserved `legacy@guestflow.local` address is never emailed. Removed users stop receiving immediately. One email per issue per recipient per **2 hours**, plus a resolved note when the issue clears.

Thresholds live in `src/lib/ops-settings.ts` (shared with Nightsbridge sync). Do not copy them.

| Alert | When | Who |
| --- | --- | --- |
| Unanswered inbound | Guest inbound, not spam/staff/test, no outbound or approved send, **30 minutes**, during **07:00–21:00 SAST** (21:00 exclusive), excludes test threads and empty BLOCK bookings | Last handler; else all active users |
| Overnight digest | Inbounds whose 30-minute mark is outside staff hours, still unanswered, excludes test threads and empty BLOCK bookings | One digest at **07:00 SAST** to all active users |
| NB import missed | Last **successful batch** older than **14 hours** | All active users |
| NB batch failed | Batch errors, **0 rows**, or **mass-cancel guard** (>50% disappear) | All active users |
| Approve&Send failed | Twilio/Resend error after human confirm. Hook: `notifyFailedApproveSend` (delivery-status PR can call later) | The user who pressed it |
| Site down | External check every **10 minutes** against uncached `/api/health/deep` (touches Turso). Alert after **2 consecutive failures** | All active users (published list if the app is down) |
| Site recovery | Next successful deep check after an alerted-down state | Same |

Alert body: guest **first name**, **booking ref**, **staff link**. Never access codes or payment text.

Evaluator: idempotent `GET/POST /api/cron/alerts-evaluate` (`CRON_SECRET`). Hobby Vercel rejects sub-daily crons, so the 10-minute tick is GitHub Actions (`.github/workflows/guestflow-alerts-evaluate.yml`). The route is still the Vercel cron contract — add `*/10 * * * *` on Pro later if Grant upgrades. Do not put a sub-daily schedule in `vercel.json` or Preview fails.

## Alert Noise Filters (Exclusions)

Three categories of threads are automatically excluded from unanswered and overnight digest alerts to reduce false positives:

### 1. Test Phone Threads

Threads from known test phone numbers are excluded:
- **Patterns**: `+27000000001` (probe number), `+15124064300`, `+27600200825`
- **Normalization**: Checks both with/without `+` prefix and digits-only format
- **Example**: Thread from `+27000000001` will never trigger alerts

### 2. Smoke Test Markers

Threads with explicit smoke test identifiers are excluded (tightened to avoid false positives):
- **guest_name patterns**: `T-44`, `T-48`, `T-PROBE`, `T-TEST`, `thread 44`, `thread 48`, `inbound thread 44`, `GF-INBOUND-TEST` (case-insensitive)
- **metadata.subject patterns**: `GF-INBOUND-TEST`, `SMOKE TEST`, `TEST MESSAGE` (explicit markers, case-insensitive)
- **Example**: Thread with guest_name "T-48" or metadata `{"subject":"GF-INBOUND-TEST"}` will not alert
- **Non-example**: Generic "T-99" or "T. Richardson" (guest with T. initial) will NOT be excluded

### 3. Empty BLOCK Bookings

Booking placeholder threads with zero actual inbound guest messages are excluded:
- **BLOCK patterns**: `BLOCK`, `BLOCK 5376`, `OWNER BLOCK` (inventory/owner-block shells)
- **Message count**: Must have 0 inbound messages (excludes spam and outbound)
- **Example**: Booking "BLOCK 5376" or "OWNER BLOCK" with no messages will not alert; if a guest message arrives later, alerts resume
- **Non-example**: Booking "BLOCK 5376" with 1+ inbound messages WILL alert (not excluded)
- **Tightened**: Bare guest first names like "Nomsa" or "Sakhile" are NOT excluded (those were example empty shells with NB refs in requirements, not a blanket rule)

### Implementation

Exclusion checks are in `src/lib/staff-alert-filters.ts` and integrated into `evaluateUnanswered()` in `src/lib/staff-alerts.ts`. Filters are applied before alert dispatch using early-return pattern for performance:

1. Test phone check (cheapest - in-memory set lookup)
2. Smoke marker check (cheap - string pattern match)
3. Empty BLOCK check (most expensive - DB query for message count)

All exclusions use rule-based pattern matching rather than hardcoded thread IDs, making them durable across environments.

## Required env / token **names** (do not invent values)

| Name | Where | Purpose |
| --- | --- | --- |
| `ALERT_FALLBACK_EMAIL` | Vercel | Only recipient when `staff_users` is empty |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Vercel + GitHub Actions secrets | Send staff alerts; GHA sends site-down while the app is down |
| `CRON_SECRET` | Vercel + GHA secret | Evaluator + ingest (GHA header `x-cron-secret`) |
| `GUESTFLOW_EVALUATE_URL` | GHA variable (optional) | Full URL to `/api/cron/alerts-evaluate`; else `GUESTFLOW_APP_URL` + path |
| `RESEND_WEBHOOK_SECRET` / `INBOUND_WEBHOOK_SECRET` | Vercel | Inbound email / NB email |
| `GITHUB_ALERTS_TOKEN` | Vercel (optional) | Fine-grained PAT: Actions Variables read/write on `GrantB83/GrantB83` |
| `GITHUB_ALERTS_REPO` | Optional | Default `GrantB83/GrantB83` |
| `GITHUB_ALERTS_VARIABLE` | Optional | Default `GUESTFLOW_ALERT_EMAILS` |
| `GUESTFLOW_ALERT_EMAILS` | GitHub Actions **variable** | Published by the app on user add/remove |
| `GUESTFLOW_HEALTH_URL` | GitHub Actions variable | Full URL to `/api/health/deep` |
| `GUESTFLOW_HEALTH_FAIL_STREAK` / `GUESTFLOW_HEALTH_ALERTED` | GitHub Actions variables | Maintained by the health workflow |
| `EDGE_CONFIG` / `VERCEL_API_TOKEN` / `EDGE_CONFIG_ID` / `EDGE_CONFIG_ALERTS_KEY` | Optional | Alternate publish target |
| `GUESTFLOW_APP_URL` | Optional | Staff link base (default `https://guestflow.thebrowns.co.za`) |

If publish tokens are unset, add/remove still succeeds and publish is skipped (`not_configured`). Never invent a secret.

Migration `npm run db:migrate:sprint2` ships in this PR and is **not run** against Production.
