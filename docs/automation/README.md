# Brown Ops Automation Control Plane

Grok Bot **runs** the household and businesses. Cursor Cloud Agents **record locks or write code**, then die. This folder is the map, not the daily operator.

## Start here

| File | Purpose |
| --- | --- |
| [CAPABILITIES.md](CAPABILITIES.md) | What Grok Bot / Cloud Agents / Automations can actually do (2026-08-23) |
| [RUNTIME.md](RUNTIME.md) | Who does what, cost, standing rules |
| [GROK-BOT-AMENDMENTS.md](GROK-BOT-AMENDMENTS.md) | Amend existing Grok Bots — do not create a second team |
| [bot-roster.yaml](bot-roster.yaml) | Live Bot name → plan role (Grant fills `existing_name`) |
| [GOOGLE-ACCOUNTS.md](GOOGLE-ACCOUNTS.md) | Link **all** Gmail / Drive / Calendar logins |
| [google-accounts.yaml](google-accounts.yaml) | Identity registry + link status |
| [FAMILY-COMMAND-CENTER.md](FAMILY-COMMAND-CENTER.md) | School, medical, household finance, budget |
| [family-filters.yaml](family-filters.yaml) | Zero-token Gmail routing |
| [usa-budget.yaml](usa-budget.yaml) | USA household Budget locks (sheet, Bell, 7th close) |
| [monarch-category-map.yaml](monarch-category-map.yaml) | Monarch category → Budget line (names only) |
| [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) | Per-entity admin evaluation, gaps, RACI, labour tests |
| [SPEC.md](SPEC.md) | Phased build, workable approach, done criteria |
| [labor-ledger.md](labor-ledger.md) | Hours removed per phase — Grant fills actuals |
| [entity-map.yaml](entity-map.yaml) | Machine-readable entities, inboxes, calendars, repos, labels |
| [approval-gates.md](approval-gates.md) | What agents may do without asking, and what they must queue |
| [launch-prompts.md](launch-prompts.md) | Copy-paste prompts Grok uses to spawn each Cloud agent |
| [STATUS.md](STATUS.md) | Living checklist. Every agent updates this before it stops |

## Operating model

```text
Grant / Liana  →  existing Grok Bots (message them; teach once)
                      │
                      ├─ Family / Ops Chief / Stay / Aqua / Yard / Vault do the work
                      ├─ in Gmail, Drive, browser, Budget sheet
                      └─ ping humans for RED, Action, money, dead sessions

Cloud Agent    →  only when the output is a git PR (locks, WhatsApp code)
```

Do not launch a Cloud Agent to write the Sunday Family digest or close the Budget.

## Current entry points already in flight

- [PR #2](https://github.com/GrantB83/GrantB83/pull/2) — WhatsApp Cloud API agent for Hospitality Partners (draft)
- [PR #1](https://github.com/GrantB83/GrantB83/pull/1) — Cloud Agent environment for this profile repo (draft)

Do not replace those PRs. Extend them.
