# Brown Ops Automation Control Plane

Grok Bot directs Cursor Cloud agents from this folder. This is the map, not the apps.

## Start here

| File | Purpose |
| --- | --- |
| [BUSINESS-REQUIREMENTS.md](BUSINESS-REQUIREMENTS.md) | Per-entity admin evaluation, gaps, RACI, labour tests |
| [SPEC.md](SPEC.md) | Phased build, workable approach, done criteria |
| [labor-ledger.md](labor-ledger.md) | Hours removed per phase — Grant fills actuals |
| [entity-map.yaml](entity-map.yaml) | Machine-readable entities, inboxes, calendars, repos, labels |
| [approval-gates.md](approval-gates.md) | What agents may do without asking, and what they must queue |
| [launch-prompts.md](launch-prompts.md) | Copy-paste prompts Grok uses to spawn each Cloud agent |
| [STATUS.md](STATUS.md) | Living checklist. Every agent updates this before it stops |

## Operating model

```text
Grant / Liana  →  Grok Bot (orchestrator)
                      │
                      ├─ reads SPEC + STATUS
                      ├─ picks next work package
                      ├─ launches 1 Cursor Cloud agent
                      └─ reviews PR / exception queue
```

Heavy token work belongs in a Cloud agent against a specific repo. Grok keeps the conversation short and only reasons about exceptions, approvals, and the next package.

## Current entry points already in flight

- [PR #2](https://github.com/GrantB83/GrantB83/pull/2) — WhatsApp Cloud API agent for Hospitality Partners (draft)
- [PR #1](https://github.com/GrantB83/GrantB83/pull/1) — Cloud Agent environment for this profile repo (draft)

Do not replace those PRs. Extend them.
