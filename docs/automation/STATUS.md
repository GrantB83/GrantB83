# Automation Status

Update this file in the same PR as the work. Newest package on top of each phase.

Last orchestrator review: 2026-08-22 (proof samples done; hub Queue/Entity/GBP labels created; filter API 403).

## Now

- Control-plane spec + business evaluation live in this folder.
- WhatsApp Cloud API agent exists as draft [PR #2](https://github.com/GrantB83/GrantB83/pull/2). It is **not** live (Coexistence + HTTPS host still Grant).
- **RUNTIME received** (2026-08-22): `grok-bot=yes`, `cursor-plan=ultra`, `on-demand=yes`. Grok Bot routines are the daily ops surface; Cursor Cloud Agents are on-demand for phases/packages.
- **G8 BOT ROSTER locked** (2026-08-22). Live: Ops Chief, Family, Stay (was Old - The Browns), Aqua (was Old - Perfect Water), Yard (was Old - Heavy Metal), Vault (was Old - Files). Unused parked: Old - WhatsApp, Old - Inbox, Old - Calendar, Old - Memory, Old - Revenue, New Bot. Do **not** create duplicate Bots. Do **not** reopen merged [PR #4](https://github.com/GrantB83/GrantB83/pull/4).
- **G1 Layer B browser live** (2026-08-22) for `thebrownsusa@gmail.com`, `grant@hospitality.partners`, `stay@hospitality.partners`, `grant@bvrgroup.co.za` (gmail,drive,calendar). Keep hub on Grok Bot Plugins. Bots switch the Google avatar before acting. This Cloud Agent MCP is still **hub only** `grant830318@gmail.com` (still zero `from:austinisd.org`).
- Forwards, not Google logins (2026-08-22): `grant@thebrowns.co.za` → hub; `accounts@bvrgroup.co.za` → `grant@bvrgroup.co.za`; `grant@hmsand.co.za` → hub. Do not Add account. `mail@hmsand.co.za` stays a **sender** into the hub unless Grant later says it is a login.
- Drive MCP still sees `The Browns USA` (owner `grant@hospitality.partners`) via share. Calendar MCP still the hub list (primary `Africa/Johannesburg`).
- Cloud environment is scoped to `GrantB83/GrantB83` only. Personal env `[4a344631-9c41-11f1-ba66-0e7d0216e441](https://cursor.com/dashboard/cloud-agents/environments/e/4a344631-9c41-11f1-ba66-0e7d0216e441)`.
- Systems of record (`SOR:`) — **unset**. Ask Grant once per entity.
- Family Gmail labels exist on the hub (empty except one WesBank). AISD filters belong on `thebrownsusa@gmail.com`.
- **Hub labels created 2026-08-22** via Cloud Gmail MCP: `Queue/NeedsGrant` (0), `Entity/Hospitality` (0), `Entity/PerfectWater` (0), `Entity/HeavyMetal` (10 stamped from `mail@hmsand.co.za`), `GBP` (20 stamped from `businessprofile-noreply@google.com`). Filter API still **403**. Grant created hub filters 4–5 (2026-08-22): From `businessprofile-noreply@google.com` → `GBP`; From `mail@hmsand.co.za` → `Entity/HeavyMetal`. No Skip Inbox. Do not auto-fill `Queue/NeedsGrant`.

## Phase board

| Phase | Name | State | Next agent | Labour cut (est.) | Blockers |
| --- | --- | --- | --- | --- | --- |
| 0 | Control plane & safety | **in progress** | idle until Monday routines | stop re-briefing agents | `G2` private repos |
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
| 10b | Family digest | **Family Bot live** | first fire Monday 06:20 CT | 10 min/day | S10/S11 off |
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
| 2026-08-22 | BOT ROSTER received: Ops Chief amended, Family live, four sibling Bots (Stay/Aqua/Yard/Vault) being amended. Six unused Bots parked. |
| 2026-08-22 | RUNTIME received: `grok-bot=yes cursor-plan=ultra on-demand=yes`. G1 approval received for `thebrownsusa@gmail.com` gmail,drive,calendar (Grok Bot Layer A/B linking is Grant's action; Cursor MCP still hub-only). |
| 2026-08-22 | Stay / Aqua / Yard / Vault amended. Unused Bots parked. Ops Chief team locked. No full-inbox scan. Next digest Monday 06:30 CT. S10/S11 off. |
| 2026-08-22 | Layer B browser signed in + G1 granted for `thebrownsusa@gmail.com`, `grant@hospitality.partners`, `stay@hospitality.partners`, `grant@bvrgroup.co.za`. Do not replace hub Grok Bot plugin token. Cloud MCP remains hub-only. |
| 2026-08-22 | `grant@thebrowns.co.za` is not a Google login. All mail forwards to `grant830318@gmail.com`. Do not Add account. Read it on the hub. |
| 2026-08-22 | `accounts@bvrgroup.co.za` forwards to `grant@bvrgroup.co.za`. `grant@hmsand.co.za` forwards to the hub. Neither is a Google login. |
| 2026-08-22 | Hub labels `Queue/NeedsGrant`, `Entity/Hospitality`, `Entity/PerfectWater`, `Entity/HeavyMetal`, `GBP` created via MCP. Sample stamped: GBP 20, HeavyMetal 10. Gmail filter create still 403. |
| 2026-08-22 | Hub filters 4–5 live: GBP from `businessprofile-noreply@google.com`; Entity/HeavyMetal from `mail@hmsand.co.za`. No Skip Inbox. |
