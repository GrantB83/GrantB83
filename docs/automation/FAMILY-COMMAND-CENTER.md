# Family Command Center

**Purpose:** Absorb the daily flood of school, medical, household-finance, and budget mail/instructions **without** Grant or Liana reading the raw inbox, and **without** burning Grok Bot or Cloud Agent tokens on newsletters.

**Lane:** `family`. Medical / tax-emigration / will **bodies** stay out of chats and PRs (`N3`). Agents may use **headers, due dates, appointment times, and “form to sign”** — never diagnoses, results, or document text.

**Related:** Phase 10a–10d in `SPEC.md`, filters in `family-filters.yaml`, labels below.

---

## 1. The problem

School (AISD / Mills and other campuses), medical portals, household banks, insurance, and budget pings arrive in the **same** Gmail that holds Standard Bank, Hiver, and CIPC. That is why family admin “interrupts business”: it is not a separate system. Volume is high; most items are FYI; a few need a parent today.

A Cloud Agent that summarises every school PDF is the wrong design (cost + `N3`). A parent who searches the inbox at 22:00 is the current design.

---

## 2. Target parent ritual (≤10 minutes, twice a day)

1. Open **Family digest** (06:20 CT and optional 18:00 CT).
2. Do only `Family/Action` cards: sign, pay, attend, reply.
3. Everything else is already labelled, filed, and on the Family calendar.

No scrolling AISD newsletters. No hunting “was that vaccine form filed?”. No mixing guest inquiries with pickup-map emails.

---

## 3. Architecture (least tokens, least humans)

```text
Inbound Gmail
    │
    ├─ ZERO-TOKEN filters  →  Family/School|Medical|Finance|Budget
    │                         skip-inbox after S10 standing approval
    │
    ├─ Action heuristics   →  Family/Action  (stays in inbox)
    │   due, sign, permission, volunteer, appointment, pay, overdue
    │
    └─ Grok Bot "Family" routine (labelled mail ONLY)
          ├─ file attachments → 10_Household / existing The Browns USA
          ├─ calendar events  → Family calendar (school + appt times)
          ├─ budget lines     → Budget sheet totals / bill due list
          └─ digest draft     → Grant + Liana
```

Cloud Agents **build** this (filters, schema, digest template). They do **not** run it every morning.

---

## 4. Label taxonomy

Create under Gmail (nested). Do not delete `Personal/Family`.

| Label | Meaning | Inbox after `S10` |
| --- | --- | --- |
| `Family/School` | AISD, campus, teacher, volunteer FYI | skip inbox |
| `Family/Medical` | Portals, reminders, results **files** | skip inbox; Action if a date/signature |
| `Family/Finance` | Household bank (Bell daily flash on thebrownsusa), insurance, WesBank, Tesla, utilities | skip inbox unless due ≤7d |
| `Family/Budget` | Budget sheet pings, category questions | skip inbox |
| `Family/Calendar` | Extracted events (agent-applied) | skip inbox |
| `Family/FileOnly` | Filed; no parent action | skip inbox |
| `Family/Action` | Parent must do something **this week** | **stay in inbox**, starred |

Business labels (`Entity/*`, Hiver, `Finance/*` for companies) never get these.

---

## 5. Action card (the only thing parents read)

```yaml
FamilyAction:
  id: ulid
  kind: sign | pay | attend | reply | buy | other
  due_at: iso8601          # date only is ok
  title: 80 chars          # "Mills volunteer sheet due Fri" — no medical detail
  source: { gmail_thread, drive_id }
  assignee: grant | liana | either
  status: open | done | snoozed
```

Rules:

- School: title may include campus + form name + due date.
- Medical: title may include **person first name + “appointment/form/bill” + time**. Never test names, conditions, or PDF text.
- Finance: payee + amount + due date only.
- If unsure whether it is an action: **Action**, not FileOnly (false positive is cheaper than a missed permission slip).

---

## 6. Filing (Drive)

Use existing **The Browns USA** tree. Do not create a second household vault.

| Source | Folder |
| --- | --- |
| School FYI / maps / choice sheets | `School/` |
| Medical PDFs | existing medical area **by filename only**; agent does not open |
| Bills / bank CSV | `Finance/` + `Receipts 2026` pattern |
| Budget | existing `Budget` spreadsheet (totals / due list tab) |
| Unknown | `Scratch/` then Family Bot proposes a move |

Naming: `YYYY-MM-DD__household__school|medical|bill__{counterparty}__{ref}`.

`H3` / `S10` required before bulk moves. First pass: proposals in `samples/family-file-proposals.md`.

---

## 7. Calendar

Calendar `Family` already exists (plus `School Holidays`).

After `APPROVE FAMILY CAL`:

- AISD / campus events with a date → all-day or timed event on `Family`, title only.
- Medical appointment times from **subject/snippet** → timed event titled `{FirstName} appt` — no clinic notes in the description.
- Do not write the **Private** daily-routine calendar.
- Timezone: `America/Chicago` for these events even if the Google primary is still SAST.

---

## 8. Budget

Existing Drive `Budget` sheet stays the SoR.

- Incoming household bills → due-date row (payee, amount, due, source thread).
- Phase 3 household categories feed **monthly totals only** into the sheet (no family narrative).
- Grok Bot Family does not “give financial advice”. It flags over-budget **totals** if Grant has set a cap cell.
- **Bell daily flash** (2026-08-22): Gmail filter on `thebrownsusa@gmail.com` only — From `donotreply@customercenter.net` → `Family/Finance`, from-only, no Skip Inbox. Books stay the 7th Monarch CSV + Bell statement, not the flash.

---

## 9. Grok Bot “Family” standing instructions

Amend the **existing** household / school / calendar Bot (`GROK-BOT-AMENDMENTS.md` §3.2). Do not create a second Family Bot.

Gmail plugin on the hub is **not** enough. Also sign in `thebrownsusa@gmail.com` (and any Liana login) on the Bot computer — AISD is not on `grant830318@gmail.com`. Create `family-filters.yaml` filters on **that** mailbox too.

```text
You are Family. You only read Gmail labels Family/School, Family/Medical,
Family/Finance, Family/Budget, Family/Action.

06:20 America/Chicago every weekday (and Sunday 17:00 CT weekly):
1. Do not search the whole inbox.
2. For each Family/Action: one card (kind, due, title, assignee).
3. File FYI attachments by filename into The Browns USA. Do not open medical PDFs.
4. Propose or create Family calendar events only if standing approval S11 is on.
5. Draft the Family digest to Grant and Liana. Do not send medical body text.
6. If something looks like a business thread, leave it and tell Ops Chief.

Never: pay, give medical advice, email a school, quote a lab result, use X.
```

Teach by doing one Monday morning together; save as routine.

---

## 10. What “done” means

| Layer | Done |
| --- | --- |
| 10a Filters | AISD and listed senders auto-labelled; sample 20 threads correct |
| 10b Digest | Two real family digests Grant used instead of the inbox |
| 10c Calendar | School dates appearing on Family without Grant copy-paste |
| 10d Budget | Bills ≤7d on the digest; month totals vs Budget sheet |
| Autonomy | After `S10`/`S11`, Grant only opens `Family/Action` |

Labour target: **2–4 h/week of family-inbox interrupt → 10 min morning + 5 min evening**.
