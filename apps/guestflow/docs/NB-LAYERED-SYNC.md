# Nightsbridge layered sync

Replaces waiting on a twice-daily file as the only source. **No guest sends. No auto-send.**

## Layers

1. **L1 email ingest** — Nightsbridge property mail on the existing Resend inbound path (`POST /api/inbound/email`). Dedicated `POST /api/inbound/nb-email` is also available. **Never creates a UMI / guest thread.**
2. **L2 gap detection** — phone / email / room / dates / status against missing, placeholder, intermediary, and relay-only rules.
3. **L3 gap-fill** — notes (verbatim) → report columns → GuestFlow history (same `guest_name_norm`) → staff-needed. Verified contacts are never overwritten.
4. **L4 batch reconciliation** — existing XLSX ingest plus conflict matrix, mass-cancel guard, `nb_sync_runs`. Playwright download script is included and **not run** here.

## Mailbox dependency (GFM)

- Ingest mailbox: **`stay@thebrowns.co.za`** (already on the Resend inbound webhook).
- Upstream **`stay@hospitality.partners` → `stay@thebrowns.co.za`** is GFM-owned and may still be pending. Parsers are ready; they only see mail that reaches Resend.
- Google forward-verification mail is stored on `nb_email_raw`.

## Property gate

Only BBID **24299** / The Browns. Sister properties 18053 and 24847 are ignored.

## 14-hour freshness

Shared `OPS_SETTINGS.nbMissedImportHours` (14). Last successful **batch** older than that → staff alert to all active users. Batch `ZERO_ROWS`, `ERROR`, `ROWDROP_GUARD` also alert.

## Conflict highlights

- Report wins dates / room / name / pax unless a newer email arrived after `last_report_at`.
- Email wins channel / amounts.
- Notes stored separately (`notes_email`, `notes_report`).
- Staff/guest verified contacts never overwritten.
- Soft-cancel skipped if more than **50%** of the window would disappear.

## Scripts (do not run against Production)

- `npm run db:migrate:sprint2`
- `npx tsx scripts/nb-batch-reconcile.ts` (needs `NB_USER` / `NB_PASS` / `CRON_SECRET` — owner prerequisite, not executed in this PR)
