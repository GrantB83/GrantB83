# Implementation Plan: Sprint 2 Staff Alerts and Nightsbridge Layered Sync

**Branch**: `cursor/sprint2-alerts-nb-sync-6f9b` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/020-sprint2-alerts-nb-sync/spec.md`

**Base**: `cursor/staff-user-management-3989` (PR #215). Do not merge. Do not deploy. Do not run migrations or scripts against Production Turso. No guest sends.

## Summary

Add GuestFlow staff-only email alerts (item H) and layered Nightsbridge sync (item B) behind one shared settings module. Alerts use the existing Resend path with an explicit guest-redirect bypass and recipients from `staff_users.email` (`ALERT_FALLBACK_EMAIL` only when the table is empty). An idempotent Vercel cron evaluates unanswered (30 min / 07:00 digest SAST), NB 14h / batch error / 0 rows / mass-cancel, and resolved notes. Failed Approve&Send calls an exported hook. Site-down uses a new uncached `/api/health/deep` plus a GitHub Actions probe every 10 minutes that emails after two consecutive failures and again on recovery, reading a published active-user list. NB mail is classified on the existing inbound-email path (stay@thebrowns.co.za; hospitality.partners forward is a documented GFM dependency) and never creates UMI threads. Gap detection, ordered fill, conflict matrix, provenance, and twice-daily batch reconciliation (script included, not run) complete L2–L4.

## Technical Context

**Language/Version**: TypeScript 5.5 / Next.js 14.2 App Router (`apps/guestflow`)

**Primary Dependencies**: Existing Next, React, Zod, `@libsql/client`, better-sqlite3, date-fns, xlsx. No `resend` npm package (raw `fetch`). No `typescript.ignoreBuildErrors`. Playwright is an optional script dependency documented for the batch job — not required to build the Next app.

**Storage**: Turso (libsql) Preview/Production; better-sqlite3 local. New tables via `scripts/migrate-sprint2-alerts-nb.js` + runtime `ensureSprint2Schema()`. Script ships; is not run.

**Testing**: Vitest (`npm test` in `apps/guestflow`); `next lint`; `next build` without `ignoreBuildErrors`

**Target Platform**: Vercel Preview for this PR. Production `guestflow.thebrowns.co.za` is out of scope.

**Project Type**: Existing staff-ops web application

**Performance Goals**: Evaluator scans open unanswered threads and last sync run in one or two indexed queries; ingest parse + upsert under 2s; p95 booking-from-email is a product target, not a Preview SLO

**Constraints**: No guest send; redirect unchanged for guests; confirmToken / human Approve&Send unchanged; no Production migrate/deploy; never log secrets or invent token values; never include codes or payment text in alert bodies; keep the diff off parallel Sprint 2 packages (data fixes, contacts, WhatsApp templates, delivery-status UI, mobile inbox)

**Scale/Scope**: One property (BBID 24299). A handful of staff users. Touch `apps/guestflow/**` (focused), `specs/020-sprint2-alerts-nb-sync/**`, `.github/workflows/guestflow-health-check.yml`, and a not-run NB batch workflow/script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
| --- | --- | --- |
| I. Human-Gated Guest Send | PASS | Staff alerts are not guest sends. Approve&Send stays human + confirmToken. Cron/evaluator never send to guests. Redirect bypass is staff-only. |
| II. Fail-Closed Facts | PASS | Gap-fill requires verbatim-in-source. Parse failure → parse_failed + alert, no invented booking. Missing publish token → skip, do not invent a secret. |
| III. Booking SoR vs Comms SoR | PASS | NB remains booking SoR. Email ingest upserts bookings by NB ref. UMI threads are not created from NB mail. |
| IV. Channel Identity Freeze | PASS | No From / number / Twilio purchase changes. `RESEND_FROM_EMAIL` stays the From. |
| V. Extend Live Systems | PASS | Extend Resend inbound, existing ingest, staff_users, health, nightsbridge upsert. No parallel alert product. |
| VI. Retention + lanes | PASS | Hospitality-ops only. No family/trust/medical mix. |

Post-design re-check: still PASS. Complexity is one settings module, one alerts table, NB event/gap/run tables, one evaluator cron, one health workflow, and parsers — justified because H and B share the clock and the 14h rule.

## Project Structure

### Documentation (this feature)

```text
specs/020-sprint2-alerts-nb-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-staff-alerts.md
│   ├── api-health-deep.md
│   └── api-nb-email-ingest.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/ops-settings.ts                 # ONE settings module (H + B)
├── src/lib/sprint2-schema.ts               # alerts, nb_*, booking provenance columns
├── src/lib/staff-alert-email.ts            # sendStaffAlertEmail (skip guest redirect)
├── src/lib/staff-alerts.ts                 # recipients, dedupe, cooldown, evaluate, hook
├── src/lib/publish-alert-emails.ts         # GH Actions variable / Edge Config publish
├── src/lib/nb-email-parse.ts               # deterministic classifiers
├── src/lib/nb-email-ingest.ts              # L1 apply / dedup / order
├── src/lib/nb-gaps.ts                      # L2 missing definitions + log
├── src/lib/nb-gap-fill.ts                  # L3 ordered sources + verbatim
├── src/lib/nb-reconcile.ts                 # L4 conflict matrix + mass-cancel guard
├── src/lib/email.ts                        # add staffAlert / skipRedirect
├── src/lib/umi-schema.ts                   # last_handler_email
├── src/lib/nightsbridge-upsert.ts          # provenance-aware updates + guard hook
├── src/app/api/cron/alerts-evaluate/route.ts
├── src/app/api/health/deep/route.ts
├── src/app/api/inbound/nb-email/route.ts
├── src/app/api/inbound/email/route.ts      # route NB senders to L1
├── src/app/api/inbound/send/route.ts       # last handler + failed-send hook
├── src/app/api/staff/users/route.ts        # publish on add
├── src/app/api/staff/users/[id]/route.ts   # publish on remove
├── src/middleware.ts                      # allow /api/inbound/nb-email
├── vercel.json                            # */10 alerts-evaluate
├── scripts/migrate-sprint2-alerts-nb.js    # NOT RUN
├── scripts/nb-batch-reconcile.ts           # Playwright download + POST; NOT RUN
├── docs/STAFF-ALERTS.md
├── docs/NB-LAYERED-SYNC.md
├── .env.example                            # named envs only
└── __tests__/ + src/lib/__tests__/         # required cases

.github/workflows/guestflow-health-check.yml
.github/workflows/guestflow-nb-batch.yml    # scheduled; does not run here
```

**Structure Decision**: Extend `apps/guestflow` in place. Spec Kit artefacts live only under `specs/020-sprint2-alerts-nb-sync/`.

## Complexity Tracking

> No constitution violations. Shared settings + alerts table are required so H and B do not drift.
