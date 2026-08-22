# Automation Status

Update this file in the same PR as the work. Newest package on top of each phase.

Last orchestrator review: 2026-08-22 (spec authored from live Gmail / Drive / Calendar / GitHub / Cloud Agent evidence).

## Now

- Control-plane spec is in this folder.
- WhatsApp Cloud API agent exists as draft [PR #2](https://github.com/GrantB83/GrantB83/pull/2). It is **not** live (Coexistence + HTTPS host still Grant).
- Gmail MCP is connected to `grant830318@gmail.com` (also sees `grant@thebrowns.co.za` traffic).
- Drive MCP sees `The Browns USA` household vault; business entity roots are missing.
- Cloud environment is scoped to `GrantB83/GrantB83` only.

## Phase board

| Phase | Name | State | Next agent | Blockers |
| --- | --- | --- | --- | --- |
| 0 | Control plane & safety | **in progress** | `phase-00` complete once this spec merges | `G2` private repos still invisible |
| 1 | Unified comms | not started | `phase-01a-email-classifier` | `G1` extra mailboxes; `G4`/`G5` WhatsApp live |
| 2 | Drive vault | not started | `phase-02-drive-taxonomy` | `H3` before any real moves |
| 3 | Banking & recon | not started | `phase-03-statement-ingest` | no bank API; CSV / PDF only |
| 4 | Perfect Water OTIF | not started | `phase-04-pw-extend` | `G2` PW-Web-App / aquabuddy |
| 5 | Hospitality booking | not started | `phase-05-browns-pipeline` | confirm NightsBridge access |
| 6 | Heavy Metal Q2D | not started | `phase-06-hm-quotes` | WhatsApp live; price card from Grant |
| 7 | Trust & compliance | not started | `phase-07-trust-vault` | `N2` / `N3` |
| 8 | Google Business Profiles | not started | `phase-08-gbp` | GBP API or email-only drafts |
| 9 | Monthly packs | not started | `phase-09-packs` | needs 1–8 data |
| 10 | Household admin | not started | `phase-10-family` | `N3` content ban |

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
| 2026-08-22 | Draft-only comms until `H1`/`H2`. |
| 2026-08-22 | Do not use X MCP for this programme unless Grant asks (credit cost). |
