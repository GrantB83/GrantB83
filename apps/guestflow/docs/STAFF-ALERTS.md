# Staff email alerts — what fires and when

Internal staff mail via existing Resend. **Not a guest send.** Guest outbound redirect is bypassed (`sendEmail({ skipRedirect: true })`). Staff alerts do **not** duplicate Decision L (`app_settings.outbound_redirect`); they skip the shared resolver so an ON toggle still delivers to login emails. Recipients are login emails from the users table (PR #215). `ALERT_FALLBACK_EMAIL` is used only when no users exist. The reserved `legacy@guestflow.local` address is never emailed. Removed users stop receiving immediately. One email per issue per recipient per **2 hours**, plus a resolved note when the issue clears.

Thresholds live in `src/lib/ops-settings.ts` (shared with Nightsbridge sync). Do not copy them.

| Alert | When | Who |
| --- | --- | --- |
| Unanswered inbound | Guest inbound, not spam/staff/test, no outbound or approved send, **30 minutes**, during **07:00–21:00 SAST** (21:00 exclusive) | Last handler; else all active users |
| Overnight digest | Inbounds whose 30-minute mark is outside staff hours, still unanswered | One digest at **07:00 SAST** to all active users |
| NB import missed | Last **successful batch** older than **14 hours** | All active users |
| NB batch failed | Batch errors, **0 rows**, or **mass-cancel guard** (>50% disappear) | All active users |
| Approve&Send failed | Twilio/Resend error after human confirm. Hook: `notifyFailedApproveSend` (delivery-status PR can call later) | The user who pressed it |
| Site down | External check every **10 minutes** against uncached `/api/health/deep` (touches Turso). Alert after **2 consecutive failures** | All active users (published list if the app is down) |
| Site recovery | Next successful deep check after an alerted-down state | Same |

Alert body: guest **first name**, **booking ref**, **staff link**. Never access codes or payment text.

Evaluator: `GET/POST /api/cron/alerts-evaluate` every 10 minutes (`CRON_SECRET`). Idempotent.

## Required env / token **names** (do not invent values)

| Name | Where | Purpose |
| --- | --- | --- |
| `ALERT_FALLBACK_EMAIL` | Vercel | Only recipient when `staff_users` is empty |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Vercel + GitHub Actions secrets | Send staff alerts; GHA sends site-down while the app is down |
| `CRON_SECRET` | Vercel | Evaluator + ingest |
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
