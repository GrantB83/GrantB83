# Automation Status

Update this file in the same PR as the work. Newest package on top of each phase.

Last orchestrator review: 2026-08-22 (Grant completed Bot-map + Google-link setup actions; Cloud MCP still hub-only).

## Now

- Control-plane spec + business evaluation live in this folder.
- WhatsApp Cloud API agent exists as draft [PR #2](https://github.com/GrantB83/GrantB83/pull/2). It is **not** live (Coexistence + HTTPS host still Grant).
- **G8 / G1 setup actions completed** in the environment panel (2026-08-22). Live Bot names were **not** pasted into this chat — `bot-roster.yaml` `existing_name` stays null until `BOT ROSTER:` is sent. Do **not** create duplicate Bots.
- This Cloud Agent Gmail/Drive/Calendar MCP is still **hub only** `grant830318@gmail.com` (re-checked after the G1 action: still zero `from:austinisd.org`). Grok Bot plugin/browser sessions live on the Bot computer, not on this VM.
- Drive MCP still sees `The Browns USA` (owner `grant@hospitality.partners`). Calendar MCP still the hub list (primary `Africa/Johannesburg`).
- Cloud environment is scoped to `GrantB83/GrantB83` only. Personal env `[4a344631-9c41-11f1-ba66-0e7d0216e441](https://cursor.com/dashboard/cloud-agents/environments/e/4a344631-9c41-11f1-ba66-0e7d0216e441)`.
- Systems of record (`SOR:`) — **unset**. Ask Grant once.
- Grok Bot entitlement (`RUNTIME:`) — **unset**. Ask Grant once.
- Family Gmail labels **created on the hub**. Filter API 403. AISD filters still belong on `thebrownsusa@gmail.com`.

## Phase board

| Phase | Name | State | Next agent | Labour cut (est.) | Blockers |
| --- | --- | --- | --- | --- | --- |
| 0 | Control plane & safety | **in progress** | env Save + optional `BOT ROSTER:` names | stop re-briefing agents | `G2` private repos |
| 1a | Email classifier + SLA | not started | `phase-01a-email-classifier` | 5–8h → 1h | `G1`; `G6` after sample |
| 1b | WhatsApp slots | not started | `phase-01b-wa-slots` | 6–10h → 2h once live | `G4`/`G5`; `SOR: whatsapp=` |
| 1c | Channel stitch | not started | after 1a/1b | dual-reply errors | — |
| 1d | Texas-morning digest | not started | `phase-01d-daily-digest` | 7–10h → 0.5–1h | none to draft a sample |
| 1e | Coverage SLA | not started | `phase-01e-sla` | dropped balls | Grant holiday line |
| 2 | Drive vault + file proposals | not started | `phase-02-drive-taxonomy` | 1–2h → 0.25h | `H3` before moves |
| 3 | Bank recon + unapplied cash | not started | `phase-03-statement-ingest` | 2–4h → 0.5h | CSV/PDF only |
| 3b | Debtors / creditors | not started | `phase-03b-collections` | 2–3h → 0.3h | `H10` to send |
| 3c | Bookkeeper / VAT pack | not started | `phase-03c-bookkeeper` | 3–6h/mo → 0.5h | `SOR: books=` |
| 4 | PW order-to-fulfilment | not started | `phase-04-pw-extend` | 3–5h → 1h | `G2`; `SOR: pw-stock=` |
| 4b | PW stock-take / royalty / quality | not started | `phase-04b-pw-plant` | monthly 2h+ → 0.5h | 4 |
| 5 | Hospitality quote pipeline | not started | `phase-05-browns-pipeline` | 4–6h → 1h | `SOR: hospitality-calendar=` |
| 5b | Stay-day / OTA / HK | not started | `phase-05b-stay-day` | 2–4h → 0.5h | 5 |
| 6 | HM quotes | not started | `phase-06-hm-quotes` | 2–3h → 0.5h | price card |
| 6b | Delivery + POD | not started | `phase-06b-delivery` | 1–2h → 0.3h | 6 |
| 7 | Trust register + next actions | not started | `phase-07-trust-vault` | 1–3h → 0.3h | `N2` / `N3` |
| 7b | Forex checklist + family one-pager | not started | `phase-07b-forex` | 2h/event → 0.5h | Grant doc list |
| 8 | GBP drafts | not started | `phase-08-gbp` | 0.5h → 0.1h | `H6` to publish |
| 9 | Weekly roll-up / monthly | not started | `phase-09-packs` | 2–3h/mo → 0.4h | 1d + 3 |
| 10a | Family filters | **labels live on hub only** | Grant: add filters on **thebrownsusa** + hub (403) | 2–4h → 0 on FYI | filter scope; `G1` thebrownsusa |
| 10b | Family digest | not started | `phase-10b-family-digest` + Family Bot | 10 min/day | `RUNTIME: grok-bot=` |
| 10c | Family calendar | not started | after 10b | copy-paste → 0 | `S11` |
| 10d | Budget / bills | not started | after 10a | hunt → due list | Budget sheet |
| 11 | Local staff run-sheet | not started | `phase-11-run-sheet` | 2–4h → 0.3h | `H11`; staff exist? |
| 12 | Stale pipeline | not started | `phase-12-stale` | 1–2h → 0.2h | `H2` |

## Evidence captured 2026-08-22 (no secrets)

- Inbox ~7720 threads / ~43 unread. Classification exists (Hiver + Finance) but entity coverage is thin.
- Hiver hospitality desk: ~1644 threads; Liana lane already exists.
- Finance/Bank 486 threads; Finance/Invoices only 18 — invoices are under-filed.
- Standard Bank transactional mail is active; FNB mail is mostly forex / RMB Private Bank.
- SARS and CIPC mail is active and only partly labelled (tax yes, CIPC no).
- Google Business Profile notifications land on Gmail.
- `mail@hmsand.co.za` is live.
- Household Drive taxonomy was started 2026-08-20.
- Public GitHub does **not** contain PW-Web-App, perfectwater-scaffold, or a Heavy Metal repo.

## Decision log

| Date | Decision |
| --- | --- |
| 2026-08-22 | GrantB83 is the orchestration repo. Entity apps stay in their own repos. |
| 2026-08-22 | Extend PR #2 WhatsApp agent; do not register a new Cloud API number. |
| 2026-08-22 | Draft-only comms until `H1`/`H2`/`H10`/`H11`. |
| 2026-08-22 | Do not use X MCP for this programme unless Grant asks (credit cost). |
| 2026-08-22 | Expand plan for digest, AR/AP, bookkeeper pack, stay-day, POD, staff run-sheet, stale follow-up, forex checklist. Every phase must cut a named ritual. |
| 2026-08-22 | Owned-business staff ops are in scope. Job-search remains out. |
| 2026-08-22 | Daily ops = Gmail filters + Grok Bot routines. Cloud Automations at most weekly (max context). Standing `S*` approvals replace per-item where sampled. |
| 2026-08-22 | Family Command Center is first-class. Labels live. Do not put medical bodies in digests. |
| 2026-08-22 | Amend existing Grok Bots; do not create a parallel team. Map with `BOT ROSTER:`. |
| 2026-08-22 | Every Google login is first-class (Gmail + Drive + Calendar). Hub-only MCP is insufficient. School filters belong on `thebrownsusa@gmail.com`. |
| 2026-08-22 | Grant completed G8 Bot-map and G1 all-Google-accounts setup actions. Cloud MCP remains hub-only; Grok Bot linking is outside this VM. |
