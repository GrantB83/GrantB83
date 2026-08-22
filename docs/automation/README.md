# Brown Ops Automation Control Plane

Grok Bot directs Cursor Cloud agents from this folder. This is the map, not the apps.

## Start here

| File | Purpose |
| --- | --- |
| [RUNTIME.md](RUNTIME.md) | Grok Bot vs Cloud Agents vs filters — cost and who does what |
| [GROK-BOT-AMENDMENTS.md](GROK-BOT-AMENDMENTS.md) | Amend existing Grok Bots — do not create a second team |
| [bot-roster.yaml](bot-roster.yaml) | Live Bot name → plan role (Grant fills `existing_name`) |
| [GOOGLE-ACCOUNTS.md](GOOGLE-ACCOUNTS.md) | Link **all** Gmail / Drive / Calendar logins |
| [google-accounts.yaml](google-accounts.yaml) | Identity registry + link status |
| [FAMILY-COMMAND-CENTER.md](FAMILY-COMMAND-CENTER.md) | School, medical, household finance, budget |
| [family-filters.yaml](family-filters.yaml) | Zero-token Gmail routing |
| [usa-budget.yaml](usa-budget.yaml) | USA household Budget locks (sheet, Bell, 7th close) |
| [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) | Per-entity admin evaluation, gaps, RACI, labour tests |
| [SPEC.md](SPEC.md) | Phased build, workable approach, done criteria |
| [labor-ledger.md](labor-ledger.md) | Hours removed per phase — Grant fills actuals |
| [entity-map.yaml](entity-map.yaml) | Machine-readable entities, inboxes, calendars, repos, labels |
| [approval-gates.md](approval-gates.md) | What agents may do without asking, and what they must queue |
| [launch-prompts.md](launch-prompts.md) | Copy-paste prompts Grok uses to spawn each Cloud agent |
| [STATUS.md](STATUS.md) | Living checklist. Every agent updates this before it stops |

## Operating model

```text
Grant / Liana  →  existing Grok Bots (amended, not duplicated)
                      │
                      ├─ reads SPEC + STATUS
                      ├─ uses every linked Google login (not hub-only)
                      ├─ picks next work package
                      ├─ launches 1 Cursor Cloud agent
                      └─ reviews PR / exception queue
```

Heavy token work belongs in a Cloud agent against a specific repo. Grok keeps the conversation short and only reasons about exceptions, approvals, and the next package.

## Current entry points already in flight

- [PR #2](https://github.com/GrantB83/GrantB83/pull/2) — WhatsApp Cloud API agent for Hospitality Partners (draft)
- [PR #1](https://github.com/GrantB83/GrantB83/pull/1) — Cloud Agent environment for this profile repo (draft)

Do not replace those PRs. Extend them.
