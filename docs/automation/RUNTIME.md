# Runtime: Grok Bot, Cursor, and Cloud Agents

**Sources (22 Aug 2026):** [Cloud Agents](https://cursor.com/docs/cloud-agent.md), [Capabilities](https://cursor.com/docs/cloud-agent/capabilities.md), [Automations](https://cursor.com/docs/cloud-agent/automations.md), [Models & Pricing](https://cursor.com/docs/models-and-pricing.md), [Grok Bot getting started](https://cursor.com/help/grok-bot/getting-started.md), [Grok Bot plans](https://cursor.com/help/grok-bot/plans.md), [Grok Bot plugins](https://cursor.com/help/grok-bot/connect-plugins.md), [xAI Grok Bot announcement](https://x.ai/news/introducing-grok-bot).

This file is the **platform contract**. If a phase fights these characteristics, the phase is wrong.

---

## 1. Three different products (do not collapse them)

| Product | What it actually is | Lifetime | How it reaches Gmail | How it is billed |
| --- | --- | --- | --- | --- |
| **Grok 4.6 in Cursor** | A **model** in the Agent / Cloud Agent picker | Per turn | Only if an MCP is attached | **Cursor Models** pool (“generous included”). On-demand ~$2 in / $6 out per 1M; Fast is 2×. Cache read $0.50 |
| **Grok Bot** | A **separate Cursor/xAI product**: persistent agents with their own cloud computer, plugins, memory, and **routines** | Always-on; learns; Bots message each other | **Gmail plugin** (first-party). Can also browser-sign-in. Not a Cloud Agent trigger | **Weekly** included usage on Pro+ / Ultra / Teams (or linked SuperGrok Plus/Heavy). **Not on Cursor Pro.** Extra hits shared on-demand. Dollar caps **unpublished** |
| **Cursor Cloud Agent** | Ephemeral Ubuntu VM: clone repo → work → draft PR. Computer use, MCP, subscriptions | Hibernates when idle; snapshots 90 days inactive | **No first-party Gmail.** Only a Gmail MCP you attach | Same **API token rates** as local Agent for the chosen model. Automations **always max context** (no toggle) |
| **Cursor Automations** | Saved Cloud Agent jobs on cron / GitHub / Slack / webhook | Recurring | Same as Cloud Agent | Same tokens + **always max context** → structurally expensive for “read 80 emails” |
| **Zero-token Google** | Gmail filters, labels, Drive folder placement | Forever | Native | **$0** |

**Plan gates**

- Cloud Agents: any paid Cursor plan (including Start). On-demand billing must be enabled.
- Automations: **not on Start**. Pro and up.
- Grok Bot: **Pro+, Ultra, or Teams** (every member). Pro alone cannot run Grok Bot unless SuperGrok Plus/Heavy is linked.
- This Cloud environment already has Gmail / Drive / Calendar MCP — Cloud Agents *can* triage mail **when launched**, but a **daily Automation** that clones the repo at max context is the wrong tool for volume.

---

## 2. Cost characteristics that redesign the build

1. **Token cost is dominated by context, not cleverness.** A daily Cloud Automation at max context that re-reads `SPEC.md` + the repo to label mail will burn more than Grok Bot reading `Family/Action` only.
2. **Grok Bot weekly meter is precious.** Use it for *judgment and routines*, not for walking 7,720 threads. One fat overnight scan can exhaust a trial or a weekly bucket ([plans](https://cursor.com/help/grok-bot/plans.md): usage is steps + tokens, not message count).
3. **Composer 2.5** ($0.50 / $2.50 per 1M) or **Cursor Models Grok** is the default for **build** Cloud Agents. Do not pick Claude Opus / Fast Grok for classify-and-file.
4. **Rules before models.** Gmail filters and sender tables are free and more reliable than an LLM for AISD, Standard Bank, CIPC, GBP.
5. **Cache the control plane.** Cloud Agents must read `RUNTIME.md` + the *one* phase prompt, not the whole history of the profile. Keep launch prompts short.
6. **One Cloud Agent per build package, then die.** Subscriptions (`/subscribe`, timers up to 180 days) only for “keep this PR green”, not for daily mail.
7. **Human time is also a cost.** Per-item `APPROVE SEND` on every school newsletter is a failed design. Standing approvals exist so the human is the exception path.

**Steering spend (order of magnitude, not a quote)**

| Daily job | Right surface | Why |
| --- | --- | --- |
| Label AISD / bank / CIPC | Gmail filter | $0, instant, no weekly meter |
| Family + business **action cards** | Grok Bot routine on **labelled** queues only | Weekly meter; Gmail plugin; no repo clone |
| Texas-morning digest | Grok Bot routine (preferred) or a **tiny** Cloud Agent with Gmail MCP and **no extra repo files** | If Automation: attach repo but prompt “do not read SPEC; write digest only” — still max context, so prefer Bot |
| Sunday pack / weekly AR | Cloud Automation cron | Once a week can afford max context |
| New feature / parser / WA slots | Cloud Agent on Composer or Grok 4.6 (Cursor Models) | PR is the review gate |
| Guest-tone or legal edge | Grok Bot or interactive Cursor | Human still owns send |

If Grok Bot is **not** entitled on this Cursor account: daily work falls back to Gmail filters + one Cloud Agent launched from Grok-in-Cursor chat (model, not Bot) with MCP. Do not invent a third orchestrator.

---

## 3. Capability map (what we may rely on)

### Grok Bot can

- Stay up 24/7 on its own computer; jobs do not die when Grant closes the laptop.
- Use **Gmail, Notion, Slack** plugins; browser-sign-in for tools without APIs (NightsBridge, Loyverse, FNB) — Grant types the password on the Bot computer; the Bot does not see it.
- Learn a workflow **by watching once**, save it as a **routine**, run it on a schedule.
- Run **many Bots** (Ops Chief, Family, PW, Hospitality, HM, Trust) in sidebar sections; they can pass work and only ping Grant for judgment ([announcement](https://x.ai/news/introducing-grok-bot)).
- Launch or instruct Cursor Cloud Agents for repo work (this programme’s original intent).
- Come back only when approval is required — **if** standing policies are written.

### Grok Bot must not be used for

- Scanning the entire inbox every run.
- Holding bank payments or eFiling.
- Reading / quoting family medical or tax-emigration **bodies** into a group thread or a PR (`N3`).
- Unbounded “just handle my life” prompts (they eat the weekly meter).

### Cloud Agents can

- Full VM + browser to test code they wrote.
- MCP (HTTP recommended; this run already has Gmail/Drive/Calendar).
- Draft PRs; subscribe to CI/review; auto-fix GH Actions CI on Teams.
- Computer use to click a UI they built — **not** a substitute for Grok Bot’s signed-in Gmail plugin on a daily loop.
- Parallel runs; one conversation is busy (`409`) until it ends.

### Cloud Agents must not be used for

- Daily max-context mail walks (Automations always max context).
- Long-running “stay alive and watch Gmail” (idle VMs hibernate; this is not Grok Bot).
- Expecting a dirty local tree (cloud starts from git).

---

## 4. Operating model (least human intervention)

```text
                    ┌─────────────────────────────────────┐
                    │  ZERO-TOKEN  (always, no Grant)     │
                    │  Gmail filters · labels · skip-inbox│
                    │  after standing approval            │
                    └──────────────┬──────────────────────┘
                                   │ only labelled leftovers
                    ┌──────────────▼──────────────────────┐
                    │  GROK BOT team  (weekly meter)      │
                    │  Ops Chief · Family · (optional     │
                    │  PW / Hospitality / HM / Trust)     │
                    │  Routines: 06:30 CT digest,         │
                    │  16:00 SAST run-sheet, Sunday pack  │
                    └──────────────┬──────────────────────┘
                         exceptions │ build work
                    ┌──────────────▼──────────────────────┐
                    │  CURSOR CLOUD AGENT  (dies after PR)│
                    │  Composer 2.5 / Grok 4.6            │
                    │  one phase prompt, draft PR         │
                    └──────────────┬──────────────────────┘
                                   │ merge / H* only if needed
                    ┌──────────────▼──────────────────────┐
                    │  GRANT / LIANA   ~15–30 min/day     │
                    │  RED cards + Family/Action + money  │
                    └─────────────────────────────────────┘
```

### Standing approvals (human once, machine forever)

Replace per-item gates after a measured sample. See `approval-gates.md` `S*`.

| After this is true | Grant says | Then agents may forever |
| --- | --- | --- |
| ≥95% on a sender class | `APPROVE AUTO LABEL <class>` | Label + optional skip-inbox |
| Sequence wording signed off | `APPROVE SEQUENCE <name>` | Send that template without `H1` |
| Family school senders mapped | `APPROVE FAMILY FILE school` | File + calendar from those senders |
| Family bills mapped | `APPROVE FAMILY FILE bills` | File + due-date on digest |
| Digest format signed off 7 days | `APPROVE DIGEST AUTO` | Gmail draft digest every morning, no ask |
| Run-sheet format signed off | `APPROVE RUN SHEET AUTO` | Draft daily; still no staff WhatsApp unless `H11` |

**Still always human:** payments (`N1`), statutory submit (`N2`), medical *decisions*, guest-tone exceptions, new credit, first send of a new template.

### Bot roster Grant creates once (sidebar sections)

| Section | Bot | Routine | Reads | Pings human when |
| --- | --- | --- | --- | --- |
| Family | **Family** | 06:20 CT | `Family/*` labels only | `Family/Action` cards (sign, pay, attend) |
| Ops | **Ops Chief** | 06:30 CT | `Queue/NeedsGrant`, Hiver open, bank/CIPC/GBP | RED SLA, money, legal |
| Hospitality | **Stay** | on new `Entity/Hospitality` | Hiver + stay@ | Liana if tone/confidence low |
| PW | **Aqua** | on `Entity/PerfectWater` | orders / till flag | stockout, till≠bank |
| HM | **Yard** | on `Entity/HeavyMetal` | quotes / deliveries | no price card, POD missing |
| Trust | **Vault** | on `Entity/Trust` | CIPC/SARS/forex | due ≤14 days |

Ops Chief may message the others. Grant is not the router.

### How Grok Bot launches Cloud Agents

Prompt pattern (keep it short — do not paste the original life profile):

```text
Cloud Agent on GrantB83/GrantB83 using Composer 2.5 (or Grok 4.6 if the package is WA/schema).
Read only: AGENTS.md, docs/automation/RUNTIME.md, the named launch prompt.
Do that package. Draft PR. Update STATUS + labor-ledger. Stop.
Do not scan the full inbox. Do not use X. Do not send mail.
```

---

## 5. What changed in the phased build because of this

| Old assumption | Why it was wrong | New rule |
| --- | --- | --- |
| Grok Bot is the daily inbox walker | Weekly meter + 7720 threads | Filters first; Bot reads queues |
| Daily Cloud Automation for digest | Automations = max context = expensive | Grok Bot routine preferred; Automation at most **weekly** |
| Per-item approve every draft | Recreates the labour we are removing | Standing `S*` after a sample |
| Phase 10 = light household labels | School/medical/budget is high-volume daily | **Family Command Center** (Phase 10a–10d) is first-class, zero-token + Family Bot |
| One orchestrator chat does everything | Context rot + cost | Specialist Bots + dying Cloud Agents |

---

## 6. Entitlement check (Grant, once)

Reply with one line so agents stop guessing:

`RUNTIME: grok-bot=yes|no cursor-plan=pro|pro+|ultra|teams on-demand=yes|no`

If `grok-bot=no`, STATUS switches Family + digest routines to “Grant launches `phase-01d` / `phase-10b` from Cursor chat on weekday mornings” until he upgrades or links SuperGrok Plus/Heavy.
