# What the products actually do

Researched 2026-08-23 from official docs, not launch quotes. If a lock fights this file, the lock is wrong.

**Grok Bot docs:** [overview](https://docs.x.ai/grok-bot/overview) · [use cases](https://docs.x.ai/grok-bot/use-cases) · [computer](https://docs.x.ai/grok-bot/computer-and-apps) · [skills/routines](https://docs.x.ai/grok-bot/skills-routines-and-automations) · [approvals](https://docs.x.ai/grok-bot/approvals-security-and-privacy) · [teams](https://docs.x.ai/grok-bot/teams-and-enterprises) · [plans](https://cursor.com/help/grok-bot/plans)

**Cursor Cloud Agents:** [cloud-agent](https://cursor.com/docs/cloud-agent) · [capabilities](https://cursor.com/docs/cloud-agent/capabilities) · [automations](https://cursor.com/docs/cloud-agent/automations) · [security](https://cursor.com/docs/cloud-agent/security)

---

## 1. Three products (do not collapse)

| | **Grok Bot** | **Cursor Cloud Agent** | **Cursor Automations** |
| --- | --- | --- | --- |
| Job | Named teammate. Does the work in Gmail, Drive, browser, sheets | Isolated coding VM. Clone → change → **draft PR** | Saved Cloud Agent on a cron or GitHub/Slack event |
| Computer | **One Linux VM per person.** All Bots share it (logins, files, cookies) | **New VM per run.** Recycled when idle | Same as Cloud Agent |
| Memory | Role, chat, skills, routines, browser sessions persist | Conversation persists. Workspace does **not**. No Google login carry-over | Same as Cloud Agent |
| Google | Gmail plugin is named. Drive/Calendar: plugin if present, else **browser** (Grant types password; Bot does not see it) | Only if an MCP is attached. This VM is **hub-only** | Same MCP rules; **always max context** |
| Teach | Follow-along → draft **skill** → later a **routine** (schedule or Slack/GitHub event) | Prompt + repo. No “watch me once” | Trigger + prompt |
| Team | Bots DM each other. Group chat 2–6. Ops Chief pattern is official | Parallel isolated VMs. Do not share a desktop | — |
| Launch the other | Team toggle: Bots **may launch Cloud Agents** (default on) | Does **not** drive the Grok Bot computer | — |
| Bill | **Weekly** Grok Bot bucket (Ultra = highest). Then on-demand | **API token rates** for the chosen model | Same rates + **max context, no toggle** |
| This household | Family, Ops Chief, Stay, Aqua, Yard, Vault | This repo’s locks, WhatsApp PR, one-shot packages | **Not** for daily mail |

Cursor **desktop Agent** is Grant-in-the-IDE. Not a daily ops surface.

---

## 2. Official Grok Bot way (what we should have copied)

From [use-cases](https://docs.x.ai/grok-bot/use-cases):

1. Put the job, sources, output, and never-do in the **Bot description**.
2. Run **one real task**.
3. Correct it.
4. Save a **skill**.
5. Test on a second input.
6. Make a **routine** only when failures are defined.
7. Keep send / pay / calendar-write behind approval.

Official **Chief of Staff** owns a source-linked digest (email + calendar). Official **Expense Manager** matches inbox + Drive + a spreadsheet. That is Family + the 7th close. Start read-and-prepare; do not send school mail; do not change meetings until `S11`.

**Not official:** 200-line amend pastes, grant-phrase catalogs, or a Cloud Agent that “designs” the digest every week.

---

## 3. Hard limits we must keep

**Grok Bot**

- All Bots share one computer. A Bot is **not** a security wall.
- Do not paste passwords into chat. Use the secret card or Grant types on the computer.
- One computer-use task per Bot screen at a time.
- Up to 50 Bots+groups; 50 routines per Bot.
- Do not scan 7,000 unlabelled threads. Weekly meter is steps + tokens.
- Legacy Privacy Mode blocks Grok Bot.

**Cloud Agents**

- Draft PR, then the VM dies. No Monarch session. No thebrownsusa login.
- Automations = max context. Wrong for “read Friday’s school mail.”
- No first-party Gmail/Drive/Calendar product. Hub MCP here cannot see AISD.
- Long-running + multi-repo is not available.

**Never (household rules, not vendor limits):** N1 pay · N2 statutory submit · N3 medical/will/tax-emigration bodies in chat or git · N4 new WA number · N5 secrets/force-push · N6 job-search · N7 invented prices.

---

## 4. What we had wrong (2026-08-23 rethink)

| We did | Why it fought the products |
| --- | --- |
| Treated Family like a cheap keyword filter + “Action labels only” | Grok Bot’s job is to **read and decide**. Action words missed forms and a meeting. |
| Wrote the daily ops system as Cloud Agent yaml / SPEC phases | Cloud Agents build **code PRs**. They cannot keep a Monarch session or write the live Budget as thebrownsusa. |
| Asked Grant to paste giant Family amends | Official path is description + one real Sunday + corrections + skill/routine. |
| Left “tiny Cloud Agent digest” as a fallback | This VM is hub-only and dies. Family already proved sheet-write on TEST CLOSE. |
| Aimed Sunday packs at Cloud Automations | Family Sunday 17:00 CT is a **Grok Bot routine**, not a max-context clone of this repo. |

**Keep (this matched the products):** Bot roster · Family closes the 7th · TEST CLOSE on test tabs · filters **route** senders only · hub-only Cloud MCP · no daily Cloud Automation · N-rules · `S10`/`S11` as Grant’s gates.

---

## 5. What we do now

```text
$0 filters     →  put AISD / Bell / WesBank into Family/*
Grok Bot       →  decide, digest, close books, file, ping Grant
Cloud Agent    →  lock a decision in git, or write code (WA). Draft PR. Die.
Grant / Liana  →  RED + Action cards + money + passwords if a session is dead
```

Do **not** start a Cloud Agent to “fix the Family digest.” Message Family. Teach one Sunday. Save the routine.

Do **not** start a Cloud Agent to close the Budget. Family already can, as thebrownsusa.

Do start a Cloud Agent when the output is a **repo change** (locks, WhatsApp agent, a new filter spec Grant asked to record).

---

## 6. Public jobs that fit this household (2026-08-23)

X search from this VM is **blocked** until Grant onboards that X account at https://console.x.com. Below is from official “jobs Bots are doing today” ([more plans](https://x.ai/news/grok-bot-more-plans)), [use-cases](https://docs.x.ai/grok-bot/use-cases), Cursor forum, and Automations docs — not a live X crawl.

| Public job | Fits | How we use it | Do not |
| --- | --- | --- | --- |
| **Inbox manager** | Family + Ops Chief | Work the labelled lane. Leave only mail that needs a person. AI decides Action / This Week / FYI. | Full 7k inbox. Keyword Action lists. |
| **Chief of Staff digest** | Family 06:20 / Sunday 17:00 · Ops Chief 06:30 | Source-linked cards. Teach one real Sunday. | Cloud Agent digest. Daily Automation. |
| **Expense Manager** | Family 7th close | Monarch + Budget sheet as thebrownsusa. TEST CLOSE already proved the write. | This Cloud VM closing books. |
| **Office manager** | Stay / Aqua / Yard | Browser the real portals (Hiver, NightsBridge, Loyverse, mail@). Work lands in the tool. | Invent rates. New WA Cloud API number. |
| **Digital declutterer** | Vault / Family Drive | Audit Drive + subscriptions. Discard only after Grant says. | Bulk delete before `S10`. |
| **Sales prospector** | Stay | Draft guest follow-ups. Grant/Liana send. | Auto-send (`H1`/`H2`). |
| **Bug reproduction → Cloud Agent** | WhatsApp / entity apps | Family/Ops Chief may *ask* a Cloud Agent for a **PR**. Forum: launch can fail (GitHub rate-limit). If it fails, Grant starts the Cloud Agent from Cursor. | Daily mail via Cloud Agent. |
| **Cursor Automations** | Code only | PR review, CI babysit, Slack *bug* triage, codebase digest. | Family school mail. Budget close. |

**Forum caveats we keep:** all Bots share one computer; some Google sites still ask each Bot to sign in; Grok Bot → Cloud Agent launch is not guaranteed.

**Skip for now:** meeting stand-in, website builder, unsupervised refunds, game artist.
