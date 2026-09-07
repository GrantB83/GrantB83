# Runtime: Grok Bot, Cursor, and Cloud Agents

**Sources (23 Aug 2026 rethink):** [CAPABILITIES.md](CAPABILITIES.md) is the fact sheet. Vendor pages: [Grok Bot use cases](https://docs.x.ai/grok-bot/use-cases), [computer](https://docs.x.ai/grok-bot/computer-and-apps), [routines](https://docs.x.ai/grok-bot/skills-routines-and-automations), [Cloud Agents](https://cursor.com/docs/cloud-agent.md), [Automations](https://cursor.com/docs/cloud-agent/automations.md), [plans](https://cursor.com/help/grok-bot/plans.md).

This file is the **platform contract**. If a phase fights these characteristics, the phase is wrong. If this file fights `CAPABILITIES.md`, this file is wrong.

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
- This Cloud environment already has Gmail / Drive / Calendar MCP on the **hub only**. Cloud Agents may lock a decision they can see on the hub. They cannot see AISD and they cannot keep a thebrownsusa / Monarch session. Do not use them as a Family digest fallback.

---

## 2. Cost characteristics that redesign the build

1. **Grok Bot runs the household.** Official method: Bot description → one real task → correct → skill → routine. Do not invent a Cloud Agent digest or a keyword Action filter.
2. **Token cost is dominated by context.** A daily Cloud Automation at max context that re-reads `SPEC.md` is the wrong tool. Grok Bot routines do not clone this repo.
3. **Grok Bot weekly meter is precious.** Use it for judgment on **labelled** Family/* / queues, not 7,720 unlabelled threads. Usage is steps + tokens, not message count ([plans](https://cursor.com/help/grok-bot/plans.md)).
4. **Composer 2.5** or **Cursor Models Grok** for **build** Cloud Agents (code / lock files). Family classify is not a Cloud Agent job.
5. **Rules before models for routing.** Gmail filters answer *who mailed*. Family AI answers Action / This Week / FYI.
6. **One Cloud Agent per repo package, then die.** Subscriptions only to keep a PR green. Never daily mail.
7. **Human time is also a cost.** Per-item `APPROVE SEND` on every newsletter is a failed design. `S*` after a sample. Teach Family by doing one Sunday, not by pasting a novel.

**Steering spend (order of magnitude, not a quote)**

| Daily job | Right surface | Why |
| --- | --- | --- |
| Label AISD / bank / CIPC | Gmail filter | $0, instant, no weekly meter |
| Family + business **action cards** | Grok Bot on labelled `Family/*` / queues | Persistent computer; AI decides; no repo clone |
| Texas-morning / Sunday Family digest | **Family Bot routine** | Official Chief of Staff pattern. Not a Cloud Agent. |
| Sunday *code* pack / weekly AR template | Cloud Agent only if the output is a PR | Automations always max context — do not cron the Family digest |
| New feature / parser / WA slots | Cloud Agent on Composer or Grok 4.6 (Cursor Models) | PR is the review gate |
| Guest-tone or legal edge | Grok Bot or interactive Cursor | Human still owns send |

This account is `RUNTIME: grok-bot=yes cursor-plan=ultra on-demand=yes`. There is no Cloud Agent digest fallback. If Grok Bot were ever off, Grant would launch Family work himself — still not a daily Automation.

---

## 3. Capability map (what we may rely on)

### Grok Bot can

- Stay up 24/7 on its own computer; jobs do not die when Grant closes the laptop.
- Use the **Gmail plugin** (named in Help). Drive / Calendar / Monarch / AISD portals: **browser** on the shared computer. Grant types the password; the Bot does not see it. Plugins are account-wide; browser sessions are shared by every Bot.
- Learn a workflow **by watching once** (draft skill, ≤10 min, desktop). Then a **routine** on a schedule. Official: do not start with a giant written OS.
- Run **many Bots** (Ops Chief, Family, Stay, Aqua, Yard, Vault). They DM each other. Group chat 2–6. A Bot is not a login wall — one computer per person.
- **Launch Cursor Cloud Agents** for repo work (team toggle, default on). They cannot use this Bot computer’s Google sessions.
- Come back only when approval is required — standing never-do in the Bot description (`N*`, `S10`/`S11`).

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

- Daily mail, Family digest, Budget close, Monarch export (wrong computer; no session).
- Daily max-context Automations.
- Long-running “stay alive and watch Gmail” (idle VMs hibernate).
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

### Bot roster — amend what exists (do not create a second team)

Grant already has Grok Bots. Map them with `BOT ROSTER:` (`G8`). Standing prompts and alias table: `GROK-BOT-AMENDMENTS.md` + `bot-roster.yaml`.

| Section | Plan role | Routine | Reads | Pings human when |
| --- | --- | --- | --- | --- |
| Family | **Family** (absorb Home / School / Calendar) | 06:20 CT | `Family/*` + `thebrownsusa@gmail.com` | `Family/Action` cards (sign, pay, attend) |
| Ops | **Ops Chief** (absorb Inbox / Mail / Chief) | 06:30 CT | `Queue/NeedsGrant`, Hiver open, bank/CIPC/GBP | RED SLA, money, legal |
| Hospitality | **Stay** (absorb WhatsApp / Concierge) | on new `Entity/Hospitality` | Hiver + stay@ + hospitality Google logins | Liana if tone/confidence low |
| PW | **Aqua** | on `Entity/PerfectWater` | `accounts@bvrgroup.co.za` + PW calendar | stockout, till≠bank |
| HM | **Yard** | on `Entity/HeavyMetal` | `grant@hmsand.co.za` / `mail@hmsand.co.za` | no price card, POD missing |
| Trust | **Vault** (absorb Drive/Legal if that is its job) | on `Entity/Trust` | CIPC/SARS/forex; filenames only on will/emigration | due ≤14 days |

Ops Chief may message the others. Grant is not the router. **Unused** Bots (MBA, job-search, CrediMed deep-dive) stay parked.

### Google accounts — every login, not the hub only

Plugins are shared across Bots and are typically **one OAuth identity per plugin** unless the UI offers Add account. That is not enough for this household.

Required path: `GOOGLE-ACCOUNTS.md` Layers A (plugin) + B (Bot-computer browser, all Google avatars) + C (forward / share so Cloud MCP and $0 filters still work). Registry: `google-accounts.yaml`.

School filters must be created on the mailbox that actually receives AISD (likely `thebrownsusa@gmail.com`), not only on `grant830318@gmail.com`.

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
| Grok Bot is a keyword filter + Action labels only | Official Bot **reads and decides** (Chief of Staff / Expense Manager) | Filters route; Family AI classifies labelled threads |
| Daily Cloud Agent / Automation for Family digest | Wrong computer, hub-only MCP, max context, dies | Family Bot routine. Teach one Sunday. |
| Giant amend pastes every lock | Official path is description → one task → skill → routine | Short role text. Correct in the Family thread. |
| Per-item approve every draft | Recreates the labour we are removing | Standing `S*` after a sample |
| Phase 10 = a future Cloud Agent package | Family is already live | Cloud Agent only to **record** locks in git |
| One orchestrator chat does everything | Context rot + cost | Specialist Bots + dying Cloud Agents for PRs |

---

## 6. Entitlement check (Grant, once)

Reply with one line so agents stop guessing:

`RUNTIME: grok-bot=yes|no cursor-plan=pro|pro+|ultra|teams on-demand=yes|no`

If `grok-bot=no`, STATUS switches Family + digest routines to “Grant launches `phase-01d` / `phase-10b` from Cursor chat on weekday mornings” until he upgrades or links SuperGrok Plus/Heavy.
