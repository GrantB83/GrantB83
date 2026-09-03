# Spec: Grok-Directed Automation of Personal, Family & Owned-Business Admin

**Audience:** Grok Bot + Cursor Cloud agents  
**Owner:** Grant Brown (human approver) · Liana Brown (hospitality approver)  
**Control plane:** `GrantB83/GrantB83`  
**Date:** 22 August 2026 (existing Grok Bots amended; all Google accounts linkable)  
**Scope:** Personal life, family administration, and owned businesses only. Job-search / employment-hunting is out of scope. **Staff of owned businesses is in scope.**

This spec is written so Grok can run the programme without re-deriving context.

- STATUS wins for “what is done”.
- `BUSINESS-REQUIREMENTS.md` wins for “what admin work exists”.
- This file wins for “how an agent implements a package”.
- `labor-ledger.md` wins for “did this remove human hours”.
- `RUNTIME.md` wins for “which product does this job and what it costs”.
- `GROK-BOT-AMENDMENTS.md` + `bot-roster.yaml` win for “which live Bot is this role”.
- `GOOGLE-ACCOUNTS.md` + `google-accounts.yaml` win for “which Google login to use”.
- `FAMILY-COMMAND-CENTER.md` wins for school / medical / household-money mail.

---

## 1. Outcome

Human time is limited to:

- approving exceptions and high-value decisions
- guest-care judgement Liana wants to keep
- payments, legal submissions, and family-sensitive documents

Everything else (triage, filing, drafting, scheduling, reconciling, chasing debtors, briefing local staff, stay-day and delivery-day execution, reminding, packing weekly/monthly reports) is done by specialised Cloud agents under Grok.

A phase that does not remove a named ritual in `labor-ledger.md` is incomplete, even if the code is elegant. See `BUSINESS-REQUIREMENTS.md` §6.

### Non-goals

- Replacing live sites or POS on day one
- Fully autonomous payments or legal filings
- A new all-in-one SaaS that discards Perfect Water / Browns / Aquabuddy code
- Job-search or MBA automation
- Using X/Twitter unless Grant explicitly asks (paid credits)

---

## 2. Ground truth (verified this run)

Evidence comes from connected Gmail, Drive, Calendar, public GitHub, and Cursor Cloud — not from memory alone.

### 2.1 What already exists and must be reused

| Asset | State | Reuse rule |
| --- | --- | --- |
| [PR #2 WhatsApp Cloud API agent](https://github.com/GrantB83/GrantB83/pull/2) | Draft. Brand router for The Browns, Rivendell, Perfect Water, plus sibling brands. Knowledge-grounded; no invented rates. Human handoff. | **Canonical WhatsApp path.** Extend. Do not register the live number as a new Cloud API line. |
| Hiver on `grant@thebrowns.co.za` | ~1644 threads; Liana / Grant / unassigned / open / pending / closed already modelled | Treat as the current hospitality ticket system. Phase 1 wraps it; do not delete labels. |
| Gmail Finance/* labels | Bank 486, Tax 83, Receipts 63, Invoices 18 | Keep. Expand. Invoices are under-classified. |
| Drive `The Browns USA` | Household vault with Family / Finance / Legal / Properties / School / Tax Emigration | Keep as family lane. Add sibling roots for businesses. |
| `GrantB83/aquabuddy-demo` | Public NestJS + Next.js + Prisma monorepo: inventory, invoicing, bank recon, compliance checklists, AI messaging audit, RBAC | Reference architecture for Perfect Water internal ops. Prefer extending the real private app if Grant grants `G2`. |
| `GrantB83/TheBrowns-Showcase` + Rivendell showcase | React/TS booking-flow sites | Extend booking forms into the Phase 5 pipeline; do not rebuild marketing sites. |
| `GrantB83/twilio-conversations-demo-react` | PW Twilio Conversations | Historical comms experiment. New work goes through PR #2 Cloud API unless Twilio is still the production channel (confirm). |
| Profile skills | HubSpot, Respond.io, NightsBridge, Loyverse, GAS, Supabase, QuickBooks (email observed) | Confirm live credentials before writing new integrations. Prefer adapters over replacements. |
| Calendar `PW Technical Schedule` | Exists | Perfect Water field work lives here. |

### 2.2 What the profile said that this run could not see

These are likely **private repos**. Agents must stop and request `G2` instead of scaffolding duplicates:

- PW-Web-App (QR re-order portal, Node/Express + Supabase + GAS/Sheets)
- perfectwater-scaffold / aquabuddy (non-demo)
- browns-dullstroom-web, HospitalityPartners, booking-platform

Public GitHub for `GrantB83` currently has six repos only.

### 2.3 Operating facts agents keep getting wrong if they guess

- Household is Austin / Circle C; SA ops are remote (Limpopo + Mpumalanga).
- Primary Google Calendar timezone is still `Africa/Johannesburg`. Household decisions use `America/Chicago`.
- Banking is not only FNB + Standard Bank. US statements (Bell Bank) and WesBank vehicle finance are already in the mail/Drive trail.
- FNB traffic in the last year is dominated by **forex** (RMB Private Bank CC), not day-to-day transactional alerts.
- Standard Bank transactional alerts are the high-volume SA bank feed.
- `stay@hospitality.partners` already forwards/copies into the connected Gmail.
- `mail@hmsand.co.za` is an active sender.
- CIPC mail is unlabelled. SARS mail is labelled `Finance/Tax`.
- Google Business Profile notifications already arrive on Gmail — Phase 8 can start as email-drafting before a GBP API.

### 2.4 Gaps closed by the expansion

The first 10-phase draft was strong on **intake and filing** and weak on **running a remote group**. The missing loops — digest, SLA, AR/AP, bookkeeper pack, OTA/stay-day, POD, stock-take/returns/royalty, staff run-sheet, stale follow-up, forex checklist, **and a real Family Command Center** — are listed in `BUSINESS-REQUIREMENTS.md` §4 and implemented as Phases **1d, 1e, 3b, 3c, 4b, 5b, 6b, 7b, 10a–10d, 11, 12**. Daily ops run on **filters + Grok Bot**, not on daily Cloud Automations (`RUNTIME.md`).

---

## 3. Architecture

Full product/cost contract: `RUNTIME.md`. Do not collapse **Grok 4.6 (model)**, **Grok Bot (persistent teammate)**, and **Cloud Agents (ephemeral PR VMs)**.

```text
Zero-token Gmail filters ──► labelled queues only
        │
        ▼
Grok Bot desktop (weekly meter)  one live Bot already set up — https://x.ai/bot
  routines: 06:20 CT family digest, 06:30 CT ops digest, 16:00 SAST run-sheet
        │ exceptions / new code
        ▼
Cursor Cloud Agent (Composer 2.5 or Grok 4.6) ──► draft PR ──► dies
        │
        ▼
Grant / Liana  15–30 min/day  (RED + Family/Action + money)
```

### 3.1 Layers

1. **Zero-token intake** — Gmail filters (`family-filters.yaml` + entity sender table). WhatsApp Cloud API (PR #2). Web forms.
2. **Persistent judgment** — Grok Bot routines on **labelled** mail only, across **every** linked Google login (`GOOGLE-ACCOUNTS.md`). Not a full-inbox scan. Amend existing Bots (`GROK-BOT-AMENDMENTS.md`); do not create duplicates.
3. **Build** — Cloud Agents, one package, Composer 2.5 default, draft PR. Automations at most **weekly** (they always use max context).
4. **System of record** — Conversation object + FamilyAction cards + Drive vaults. No new CRM product.
5. **Actuators** — drafts, file, calendar, digest. Send only after standing `S*` or per-item `H*`.
6. **Audit** — outbound candidate + gate id. Family medical bodies never stored in git.

### 3.2 Why this shape (cost)

- Grok Bot weekly usage is **steps + tokens**. A 7,720-thread walk can empty the week. Filters are $0.
- Cloud Automations **always max context** — wrong for daily classify. Prefer Bot routines; Automation = Sunday pack.
- Cursor Models pool (Grok 4.6 / Composer 2.5) is “generous included”. Do not spend Other Models (Opus, Fast) on filing.
- Cloud Agents auto-run every terminal command and then die — good for code, bad as a 24/7 inbox watcher (VMs hibernate).
- Standing approvals (`S*`) remove Grant from the loop after one sample. Per-item approve is the expensive path.

### 3.3 Shared conversation object (Phase 1 deliverable)

Minimum fields. Implement as `packages/ops-schema` inside this repo until a private ops repo exists.

```yaml
Conversation:
  id: ulid
  entity: hospitality-partners | perfect-water | heavy-metal | gab-trust | household
  channel: whatsapp | email | web | ota | pos
  external_ids: { gmail_thread, wa_message, hiver_label }
  intent: inquiry | order | quote | booking | complaint | invoice | compliance | collection | staff | other
  confidence: 0-1
  sla_due_at: iso8601
  status: new | needs-human | draft-ready | waiting-customer | waiting-staff | closed | dead
  assignee: grant | liana | staff | agent
  payload: {}          # structured extract only
  money: { invoice_ref, amount, terms, applied }
  artifacts: []        # drive ids, invoice refs
  audit: []
```

Orders, bookings, and quotes are subtypes with required fields in `entity-map.yaml` consumers (see Phase 4–6).

---

## 4. Agent roster

Grok may only launch these roles. One role per Cloud agent run.

| Role | Repo | Allowed tools | Forbidden |
| --- | --- | --- | --- |
| `docs-steward` | GrantB83 | git, markdown | live inbox writes beyond STATUS |
| `inbox-classifier` | GrantB83 | Gmail read, labels on ≤50 sample | send, trash, spam |
| `drive-librarian` | GrantB83 | Drive metadata, propose taxonomy | move/share without `H3`/`H4`; read family file bodies |
| `wa-extender` | GrantB83 | code in PR #2 tree | live WA send; new number registration |
| `pw-builder` | aquabuddy-demo or private PW repo | code, tests | invent stock/prices |
| `hospitality-builder` | TheBrowns-Showcase / booking repos | code, tests | invent rates |
| `hm-builder` | GrantB83 until an HM repo exists | schema + quote engine fixtures | live quotes |
| `finance-ingester` | GrantB83 | statement fixtures, parsers | payments (`N1`) |
| `gbp-drafter` | GrantB83 | Gmail read, draft replies | publish reviews (`H6`) |
| `pack-builder` | GrantB83 | generate markdown/PDF drafts | email the pack (`H1`) |
| `digest-builder` | GrantB83 | Gmail/Calendar/Drive metadata → one digest | send (`H1`); open `N3` bodies |
| `collections-clerk` | GrantB83 | aged lists + draft reminders | send (`H10`); change credit limits |
| `bookkeeper-packer` | GrantB83 | month pack from labelled mail + fixtures | submit VAT/EMP (`N2`); pay |
| `ops-dispatcher` | GrantB83 | run-sheet / stay-day / delivery-day drafts | WhatsApp staff unless `H11` |
| `pipeline-chaser` | GrantB83 | stale inquiry/quote list + drafts | send (`H2`/`H10`) |
| `family-sorter` | GrantB83 | Drive/Gmail metadata only | open medical/will/tax-emigration bodies |

---

## 5. Phased plan

Each phase is a **work package Grok can assign**. Do not start N+1 until the done criteria in STATUS are checked, unless the phase is explicitly parallel (noted).

Every phase below uses the same four blocks: **Labour** (ritual removed), **Approach** (workable steps), **Human remaining**, **Done when**.

### Phase 0 — Control plane & safety

**Labour:** stop re-explaining the group to every new agent (~1–2 h per run, forever).  
**Goal:** Grok can direct the rest of the programme from this repo.

**Leverage:** this folder; Cloud environment `GrantB83/GrantB83`; existing draft PRs #1 and #2.

**Approach**

0. Keep `BUSINESS-REQUIREMENTS.md`, this spec, gates, prompts, STATUS, and `labor-ledger.md` as the source of truth.
1. Ask Grant once for SoR lines (`SOR: …`) and `G2` / `G1`.
2. Do not add secrets until a phase needs them.
3. Keep CrediMed / AutoPost in the WhatsApp router **read-only**.

**Human remaining:** Grant answers SoR and approval phrases.  
**Done when:** Grok can assign 1a + 1d without rereading the original profile; ledger exists.

**Parallel after this:** 1a, 1d, 2, 8. WhatsApp live path stays on `G4`/`G5`.

---

### Phase 1 — Unified WhatsApp + email client layer

Highest leverage. Covers Perfect Water, Heavy Metal, and The Browns.

#### 1a. Email classifier (start immediately)

**Role:** `inbox-classifier`  
**Labour:** 5–8 h/week of “what is this and which company?” → ~1 h on `Queue/NeedsGrant`.  
**Goal:** Every new thread gets `entity + intent + lane + SLA clock` with confidence.

**Approach**

1. Add labels (do not rename Hiver): `Entity/{Hospitality,PerfectWater,HeavyMetal,Trust,Household}`, `Intent/{Inquiry,Order,Invoice,Bank,Compliance,Review,Staff,Collection}`, `Queue/{NeedsGrant,NeedsLiana,DraftReady,Digest}`.
2. Rule table first from `entity-map.yaml` `observed_senders_to_route`. Model only on miss.
3. Attach an SLA: hospitality inquiry = 2 working hours SAST; HM quote = 4 working hours SAST; PW order = same SA morning; bank/compliance = same Texas morning. Store `received_at` + `due_at` on the Conversation.
4. Dry-run 50 threads → `docs/automation/samples/email-dry-run.md`. No `family` bodies.
5. After ≥95% on bank/CIPC/GBP/Hiver-obvious classes, request `G6`.
6. Hospitality inquiries: in-thread **Gmail draft** (`A3`) using the rate-card rule (no invented rates). Do not send.
7. Same-day tangible: Grant works only `Queue/NeedsGrant` + `Queue/NeedsLiana` for the sample window.

**Human remaining:** open two queues, not the raw inbox.  
**Done when:** dry-run attached; labels exist; SLA fields defined; auto-label only where `G6` given.

#### 1b. WhatsApp structured intake (extend PR #2)

**Role:** `wa-extender`  
**Labour:** 6–10 h/week of scrollback → ~2 h exception handoffs once live.  
**Goal:** Inbound WA becomes a `Conversation` with required slots, not a free-text blob.

**Approach**

1. Keep Coexistence warning from PR #2. Do not register a new Cloud API number.
2. Resolve Respond.io vs PR #2 **before** go-live (`SOR: whatsapp=…`). One sender.
3. Slot-fill and **refuse to quote** without slots:

   | Entity | Required slots before any price |
   | --- | --- |
   | Hospitality | property, dates, guests, occasion |
   | Perfect Water | store, product (water / filter / equipment), qty, pickup vs delivery, account vs COD |
   | Heavy Metal | product, m³ or tons, delivery suburb, truck/access, account vs COD |

4. Persist to `data/conversations/` (gitignored) or Supabase if PW unlocks.
5. Handoff to Liana when guest asks or hospitality confidence < 0.7.
6. Auto-ack templates (simulate only until `H2`): “got dates, checking calendar”; “need store + product”; “need volume + suburb”.
7. `npm test` / simulate stay green for all three entities.

**Human remaining:** approve first live templates (`H2`); take low-confidence chats.  
**Grant blockers:** `G4`, `G5`, `G3`. Until then, local simulate is still a labour win for *designing* replies once.  
**Done when:** PR #2 extended; three slot schemas tested; no live send.

#### 1c. Cross-channel thread stitch

**Role:** `docs-steward` + later `inbox-classifier`  
**Labour:** stop answering the same guest twice in two channels (~0.5–1 h/week plus error).  
**Approach:** match on normalised phone / email only. Store Hiver id, WA id, Gmail thread on one Conversation.  
**Done when:** fixture guest with email+WA collapses to one id.

#### 1d. Texas-morning SA digest (start immediately — highest labour cut)

**Role:** `digest-builder`  
**Labour:** 60–120 min every Chicago morning reconstructing four businesses → **15–30 min review**. This is the single largest cut in the programme.  
**Goal:** One artefact Grant opens with coffee. Nothing else until the queues it names are empty.

**Approach**

1. Window: previous 24 h in `Africa/Johannesburg`, rendered with both SAST and CT timestamps.
2. Query only: unread / `Queue/*` / Hiver open+pending / bank+CIPC+SARS+GBP senders / `mail@hmsand.co.za` / `stay@`. Cap 80 threads. Do not walk 7720.
3. Output `docs/automation/samples/daily-digest.md` (and later a Gmail draft to Grant, `A3`):

   ```text
   Digest for CT {date}  (covers SAST {date-1 17:00} → {date 17:00})
   RED: SLA broken or money/compliance due
   AMBER: needs Grant/Liana today
   GREEN: filed / waiting on customer / waiting on staff
   Hospitality: {n} inquiries, {n} unconfirmed, {n} arrivals next 72h
   Perfect Water: {n} orders, {n} stock flags
   Heavy Metal: {n} quotes, {n} deliveries today
   Trust: {n} statutory, {n} attorney/bank
   Household: {n} bills due ≤7d (titles only)
   Queues: NeedsGrant {n} · NeedsLiana {n}
   ```

4. Each line is a thread id + one-line fact extract (no `N3` bodies).
5. Same package writes a **Sunday** variant (week exceptions + labour-ledger reminder).
6. After 7 live mornings, Grant fills `labor-ledger.md` actuals.

**Human remaining:** read the digest; click only RED/AMBER.  
**Done when:** one real 24 h sample digest exists in the PR from live metadata; template is stable.

#### 1e. Coverage SLA and after-hours

**Role:** `docs-steward`  
**Labour:** ad-hoc “who is watching SA morning?” (~1 h/week of dropped balls).  
**Approach:** write the SLA table into STATUS (`hospitality 2h SAST`, `HM 4h`, `PW same morning`). Auto-ack copy for outside those windows (drafts only). Escalation: Liana for guests, Grant for money/legal, digest for everything else.  
**Human remaining:** Grant sets holiday coverage in one STATUS line.  
**Done when:** SLA table merged; auto-ack fixtures exist.

---

### Phase 2 — Intelligent Drive consolidation

**Role:** `drive-librarian`  
**Labour:** 1–2 h/week hunting PDFs + month-end re-hunt → 15 min `_Inbox` sweep.  
**Goal:** One taxonomy; filing **job** after `H3`, not a poster of folder names.

**Leverage:** `The Browns USA` already has Family, Finance, Legal, Properties, School. Do not flatten it.

**Approach**

1. Inventory roots (metadata) → `docs/automation/samples/drive-inventory.md`.
2. Proposed roots (create empty only after `H3` for that root):

```text
00_Inbox/
01_Review/
10_Household/          # existing The Browns USA (alias, do not duplicate)
20_Hospitality/
30_PerfectWater/
40_HeavyMetal/
50_GABTrust/
90_Audit/
```

3. Naming: `YYYY-MM-DD__entity__doc-type__counterparty__ref.ext`.
4. Map last 30 days of **attachments** (bank, municipal, invoices) to proposed paths in `samples/drive-file-proposals.md`. That list is the labour product Grant can execute or approve as a batch `H3`.
5. Family / Tax Emigration / Will / school medical: filename + folder only (`N3`).
6. After `APPROVE DRIVE MOVE 00_Inbox`, agent may file **from `_Inbox` only**.
7. Retention note (policy, not a delete job): guest IDs short; contracts long. Write one paragraph in STATUS; do not purge.

**Human remaining:** approve batch moves; never let the agent open sensitive family files.  
**Done when:** inventory + ≥20 real attachment proposals + naming table. Parallel with 1a.

---

### Phase 3 — Banking, categorisation, reconciliation

**Role:** `finance-ingester`  
**Labour:** 2–4 h/week eye-balling bank mail → 30 min exception list.  
**Goal:** Statements become categorised transactions **and** unapplied cash is visible.

**Feeds (observed)**

| Feed | How it arrives today | Parser |
| --- | --- | --- |
| Standard Bank transact | email to `grant@thebrowns.co.za` | email → CSV/PDF |
| FNB forex / RMB | email | **exception class**, never auto-match |
| WesBank | email | vehicle-finance liability |
| US bank (Bell) | Drive `Receipts 2026` + CSV | CSV first |
| QuickBooks | email notifications | confirm `SOR: books=quickbooks` |

**Approach**

1. Redacted fixtures only in git. Real files stay in Drive.
2. Chart: `entity + tax-lane + household-vs-business + intercompany-flag`.
3. Recon match: date ±2 days **and** amount **and** counterparty token. Amount-only → exception.
4. **Payment-to-invoice match** (added): if an open invoice exists with same entity+amount+counterparty, mark `applied`; else `unapplied-cash` on the digest.
5. Till vs bank (PW): if Loyverse/Sheets daily total ≠ deposit, RED line. No Loyverse token until `G3`.
6. VAF / amortisation: schedule vs mail; do not pay (`N1`).
7. Tangible this package: `samples/recon-exceptions.md` filled from fixtures **plus** a worked example of one unapplied-cash row.

**Human remaining:** decide mismatches; every payment (`N1`).  
**Done when:** SA + US parsers in CI; exception + unapplied-cash format agreed.

#### 3b. Debtors and creditors

**Role:** `collections-clerk`  
**Labour:** 2–3 h/week “who hasn’t paid / who must we pay?” → 20 min approve a reminder batch.  
**Approach**

1. Aged lists: 0–7 / 8–14 / 15–30 / 30+ for hospitality deposits, PW accounts, HM invoices, and supplier bills.
2. Source: labelled `Intent/Invoice` mail + any order/booking objects from 4–6. Until those exist, build the list from the last 30 invoice-looking threads (metadata + amounts in snippets only).
3. Templates: polite 7-day, firm 14-day, Grant-only 30-day. Drafts (`A3`). Send is `H10`.
4. Never threaten legal action. Never change credit limits.
5. Creditor side: list due ≤7 days on the digest (Eskom, municipal, WesBank, suppliers) so Grant pays on purpose.

**Human remaining:** `H10` per batch; credit decisions.  
**Done when:** `samples/aged-ar.md` exists from a real mail sample (redact names if needed to initials).

#### 3c. Bookkeeper and statutory pack

**Role:** `bookkeeper-packer`  
**Labour:** 3–6 h every month-end scramble → 30 min pack review.  
**Approach**

1. Confirm `SOR: books=`. Default: zip of tagged PDFs + CSV, emailed as **draft** to Grant (and bookkeeper only after `H1`).
2. Monthly folder `90_Audit/YYYY-MM/{entity}/` with invoices, receipts, statements, till-vs-bank note.
3. VAT / EMP / CIPC rows from `compliance-register.yaml` — **checklist only**, no eFiling (`N2`).
4. QuickBooks: if SoR, export/attach the QBO notification list; do not create a second ledger.
5. Tangible: `samples/bookkeeper-pack.md` describing the zip contents from last month’s labelled mail.

**Human remaining:** submit returns; pay SARS.  
**Done when:** one fictional-month pack template + one real-mail contents list.

---

### Phase 4 — Perfect Water order-to-fulfilment

**Role:** `pw-builder`  
**Labour:** 3–5 h/week re-typing orders and chasing “is it ready?” → ~1 h exceptions + cash-up flags.  
**Goal:** QR + WhatsApp orders update **one** store-scoped book; customers get status drafts; till ≠ bank is visible.

**Leverage, in order:** private `PW-Web-App` if `G2`; else `aquabuddy-demo`; GAS/Sheets as adapter only.

**Approach**

1. Confirm `SOR: pw-stock=loyverse|sheets`.
2. Conversation `intent: order` → order row (store, SKU, qty, pickup/delivery, COD/account).
3. Status machine: `received → confirmed → ready → collected/delivered → paid`. Each step may draft a WA/SMS (`H1`/`H2`).
4. Low-stock → draft PO (`H8`), not an email to the supplier.
5. Daily till-vs-bank line on the digest (Phase 3).
6. Technical jobs from `PW Technical Schedule` appear as jobs, not as shop orders.
7. Fixture path must run without production deploy (`H9`).

**Human remaining:** price changes, credit, quality incidents, `H8` POs.  
**Done when:** simulated WA/QR order decrements fixture stock **and** emits a “ready for pickup” draft object.

#### 4b. Plant ops: stock-take, returns, royalty, quality

**Role:** `pw-builder`  
**Labour:** monthly 2+ h of “what did we actually have / what do we owe the franchisor / what came back”.  
**Approach**

1. Stock-take checklist per store (aquabuddy compliance module if present). Variance file, not a silent rewrite of stock.
2. Returns / warranties / bottle deposits: credit-note draft + stock-in. Personalised water = a **job card** (artwork, due date, qty) separate from bulk water.
3. Franchisor pack: month sales by store from SoR extract → `samples/pw-royalty-draft.md`. Grant sends.
4. Quality: filter-change / sanitation log is the only log; missing day = AMBER on digest.
5. Wholesale accounts inherit Phase 3b terms.

**Human remaining:** accept variances; send franchisor pack.  
**Done when:** one stock-take fixture + one royalty draft from sample numbers.

---

### Phase 5 — Accommodation booking pipeline

**Role:** `hospitality-builder`  
**Labour:** 4–6 h/week writing quotes and chasing deposits → ~1 h Liana/Grant review.  
**Goal:** Inquiry → structured booking → payment request → stay messages, with Liana in the loop.

**Leverage:** TheBrowns-Showcase forms, Hiver, PR #2, NightsBridge if live.

**Approach**

1. `SOR: hospitality-calendar=nightsbridge|site`. Never dual-write.
2. Map Hiver states onto `Conversation.status`.
3. Quote engine reads an approved rate card. Missing card → fail closed (PR #2 rule).
4. Payment method confirmed (`SOR: hospitality-pay=`). Link/EFT draft is `H7`.
5. Sequences after `H2`: ack, quote, confirmation, pre-arrival, checkout, review ask.
6. Deposit not paid by T-7 days → 3b aged list.

**Human remaining:** Liana tone, rate strategy, compassionate exceptions.  
**Done when:** fixture inquiry → draft quote + Hiver-compatible status; no send.

#### 5b. Stay-day ops: OTA, housekeeping, extras, changes

**Role:** `hospitality-builder` + `ops-dispatcher`  
**Labour:** 2–4 h/week of OTA copy-paste, HK WhatsApps, extras, and date-changes.  
**Approach**

1. OTA: ingest reservation email/iCal if NightsBridge does not already. Same Conversation. Commission field required.
2. Cancel / date-change / no-show: a **policy table** Grant supplies. Bot applies table; never invents refunds.
3. Housekeeping run-sheet for next 72 h: property, checkout/check-in times, linen, maintenance flags. New `Hospitality Ops` calendar only (`H5`). Not the family calendar.
4. Extras / damage / deposit: charge-list draft on the stay object.
5. Tourism levy / guest register: fields exist; Grant confirms legal duty before any guest-ID storage. Default: do not store ID images.
6. Keys / wifi / access facts live in a knowledge file the WA bot already uses — update the file, do not invent.

**Human remaining:** approve HK sheet (`H11`); overbook recovery.  
**Done when:** `samples/stay-day-sheet.md` for a fictional 72 h plus one OTA-shaped fixture.

---

### Phase 6 — Heavy Metal quote-to-delivery

**Role:** `hm-builder`  
**Labour:** 2–3 h/week repeating the same quote questions → 30 min price-card exceptions.  
**Goal:** WhatsApp-first quotes with volume, location, access, and terms.

**Leverage:** `hmsand.co.za`, `mail@hmsand.co.za`, PR #2. Code under `apps/heavy-metal/` until a dedicated repo exists.

**Approach**

1. Grant supplies product × zone **and** truck-type notes. Until then, collect slots only.
2. Extra slots: gate/access, tipper vs bags, COD vs account (default COD).
3. Invoice draft (`H7`) + 3b chase. Do not scrape the website for prices.
4. Stock decrement + weekly “photo the pile” prompt on the run-sheet (Phase 11).
5. Eskom/municipal → `40_HeavyMetal/compliance`.
6. `hmplant.co.za` stays out until Grant says `SOR: hmplant=in-scope`.

**Human remaining:** price wars, credit limits, “load it anyway”.  
**Done when:** “20 cubes plaster sand to Belfast” collects slots (including access/terms) and refuses a price without a card.

#### 6b. Delivery execution and POD

**Role:** `ops-dispatcher`  
**Labour:** 1–2 h/week phoning drivers and arguing volume.  
**Approach**

1. Delivery-day list: customer, product, m³, suburb, truck, window.
2. Driver template: load, ETA, on-site, done. Drafts only until `H11`/`H2`.
3. POD: photo + signed note filed as `YYYY-MM-DD__heavy-metal__pod__{customer}__{ref}`. Missing POD = AMBER.
4. Volume dispute → Grant only; bot never “corrects” m³ after the fact.

**Human remaining:** disputes, safety.  
**Done when:** `samples/delivery-day.md` + POD naming examples.

---

### Phase 7 — GAB Trust / BVR compliance + vault

**Role:** `drive-librarian` + `docs-steward`  
**Labour:** 1–3 h/week of search + background anxiety → 20 min digest lines.  
**Goal:** Deadlines visible; next action obvious; no agent files with CIPC/SARS.

**Approach**

1. `docs/automation/compliance-register.yaml`: CIPC, municipal, insurance, forex packs, each with `next_action`, `owner`, `due`.
2. Calendar proposals only (`A5` → `H5`), SAST.
3. Vault `50_GABTrust/{asset}/`. One asset per folder.
4. Liquidation **next-action board** (not a static wiki): `status | blocker | owner | due | last evidence (mail date)`. Agent updates dates from incoming mail; Grant updates legal status.
5. Bank ingest tagged `trust`. Let properties: do not build until `SOR: trust-lets=yes`.

**Human remaining:** every filing and attorney instruction.  
**Done when:** register + 12-month reminder proposals + board template with at least one real mail-dated evidence line (no letter body).

#### 7b. Forex packs and family-safe status

**Role:** `docs-steward`  
**Labour:** 2 h per transfer rebuilding “what RMB asked for last time”.  
**Approach**

1. Forex checklist (names of docs only): source of funds, resolution, FIA/SDA-style forms as Grant lists them. Agent ticks “present in vault / missing”. Never fills values from statements.
2. Attorney share is `H4` of the **index**, not a dump of the family lane.
3. One-page `samples/trust-status-onepager.md` Grant can forward to family: asset nickname, status, next date. No valuations unless Grant typed them.

**Human remaining:** `N1`/`N2` submissions.  
**Done when:** checklist + one-pager template exist.

---

### Phase 8 — Google Business Profile

**Role:** `gbp-drafter`  
**Labour:** 0.5 h/week of ignored or late reviews → 5 min `H6` on drafts.  
**Parallel after Phase 0.**

**Approach:** Gmail from `businessprofile-noreply@google.com` → tone cards per location → 10 anonymised drafts in `samples/gbp-drafts.md`. Never publish until `H6`. GBP API later (`G3`). Unanswered review older than 72 h = AMBER on digest.  
**Human remaining:** publish.  
**Done when:** 10 drafts + tone cards.

---

### Phase 9 — Weekly exception pack and monthly board

**Role:** `pack-builder`  
**Labour:** 2–3 h/month rebuilding a month from chats → 20 min approve.  
**Depends on:** 1d + 3 minimum.

**Approach**

1. **Weekly (Sunday):** roll-up of the seven digests — SLA misses, unapplied cash, stale pipeline, missing PODs, missing quality logs. This is the labour product. Monthly is optional once weekly exists.
2. **Monthly:** cash in/out by entity; occupancy/conversion; PW sales vs stockouts vs royalty draft; HM quote→delivered; trust heatmap; household vs Budget sheet **totals only**.
3. Draft email to Grant (`A3`). Send is `H1`.

**Human remaining:** 20 min decisions, not assembly.  
**Done when:** weekly template filled from sample digests; monthly template exists.

---

### Phase 10 — Family Command Center (school, medical, household money)

**Spec:** `FAMILY-COMMAND-CENTER.md` + `family-filters.yaml`. This is **not** a leftover. It is a first-class daily system so kids’ school, medical, bills, and budget stop landing in the business inbox.

**Labour:** 2–4 h/week of interrupt-driven family mail → **10 min morning + 5 min evening** on `Family/Action` only.  
**Runtime:** Zero-token filters do the volume. Grok Bot **Family** reads labelled mail only. Cloud Agents **build** filters/templates; they do not run every morning (`RUNTIME.md`).

#### 10a. Filters and labels (do first — $0, no Bot)

**Role:** `family-sorter`  
**Approach**

1. Create Gmail labels in `family-filters.yaml`.
2. Enable filters: `from:austinisd.org` → `Family/School`; action-words → also `Family/Action`; WesBank → `Family/Finance`. Do **not** Trash. Do **not** skip inbox until `S10`.
3. Leave `household-budget-sheet` disabled (too broad).
4. Dry-run: 20 recent AISD threads correctly labelled. Log counts only in `samples/family-filter-dry-run.md` — no bodies.
5. Keep `Personal/Family` and `Entity/Household` as aliases if already used.

**Human remaining:** none after labels exist.  
**Done when:** labels + AISD filter live; dry-run attached.

#### 10b. Family digest (Grok Bot routine)

**Role:** `digest-builder` then Grok Bot Family  
**Approach**

1. Template `samples/family-digest.md`: Action cards, school FYI count, medical *file* count (no titles that leak), bills due ≤7d, budget total vs cap.
2. 06:20 CT weekday + 18:00 CT optional. Weekly Sunday 17:00 CT.
3. Separate from the business digest so AISD never buries a guest inquiry.
4. Bot instructions: copy the standing prompt in `FAMILY-COMMAND-CENTER.md` §9.

**Human remaining:** process Action cards.  
**Done when:** one real family digest Grant used instead of opening the inbox.

#### 10c. Family calendar

**Role:** `family-sorter`  
**Approach:** Extract dates from **subjects/snippets** of `Family/School` and Action medical mail → events on calendar `Family`, timezone `America/Chicago`. Titles only. After `S11`, auto-create; before that, list proposals in the digest.  
**Done when:** next 14 days of school dates visible without copy-paste.

#### 10d. Household budget and bills

**Role:** `family-sorter` + `finance-ingester`  
**Approach:** Due-date table (payee, amount, due, thread id) from `Family/Finance`. Month **totals** vs existing Drive `Budget` sheet. Tesla / WesBank / utilities as household categories in Phase 3. No advice.  
**Done when:** bills ≤7d appear on the family digest and a totals line exists for the current month.

### Phase 11 — Local staff run-sheet (owned-business staff only)

**Role:** `ops-dispatcher`  
**Labour:** 2–4 h/week of voice notes “please do X today” → 15 min approve one sheet.  
**Goal:** Store, yard, and housekeeping know the day’s work without Grant reconstructing it on WhatsApp.

**Approach**

1. 16:00 SAST (or Grant’s Chicago morning): draft `samples/run-sheet.md` from digest + calendars.

   ```text
   Date (SAST)
   PW Louis Trichardt: {orders to make, cash-up, quality log}
   PW Thohoyandou: {…}
   HM yard: {loads, inbound, stock photo}
   Hospitality: {HK from stay-day sheet}
   Blockers needing Grant
   ```

2. Publish path: Drive doc + Gmail draft to Grant. Staff WhatsApp send is `H11` (Grant may forward by hand forever — still a labour win).
3. Do not build HR/payroll/hiring. Cash float and “who is on shift” are operational, not job-search (`N6` still holds).
4. If there is no remaining local staff, STATUS says so and this phase only emits the hospitality HK slice.

**Human remaining:** `H11` or manual forward; people issues.  
**Done when:** one real-date run-sheet drafted from live calendar + mail metadata.

### Phase 12 — Stale pipeline follow-up

**Role:** `pipeline-chaser`  
**Labour:** 1–2 h/week of “I should follow up that quote” → 10 min approve the stale list.  
**Goal:** No silent death of hospitality inquiries or HM/PW quotes.

**Approach**

1. Rules: hospitality no reply 24 h; HM quote no decision 48 h; PW wholesale quote 72 h; unpaid deposit T-7 (handoff to 3b).
2. Output `samples/stale-pipeline.md` + draft messages. Send `H2`.
3. After two nudges, mark `dead` and stop. Humans may resurrect.

**Human remaining:** approve sends; decide when to kill a deal.  
**Done when:** stale list + two fixture drafts (hospitality + HM).

---

---

## 6. Secrets & credentials (names only)

Store in Cursor Cloud environment secrets. Never in git.

| Name | Phase | Notes |
| --- | --- | --- |
| `WHATSAPP_APP_SECRET` | 1b | PR #2 HMAC |
| `WHATSAPP_VERIFY_TOKEN` | 1b | webhook verify |
| `WHATSAPP_ACCESS_TOKEN` | 1b | send path; unused until `H1` |
| `OPENAI_API_KEY` or Grok/xAI key | 1a/1b | optional; rules first |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE` | 4 | only if PW-Web-App |
| `DATABASE_URL` | 4 | aquabuddy; never log |
| `JWT_SECRET` | 4/5 | do not rotate in an agent PR |
| `LOYVERSE_API_TOKEN` | 4 | do-not-touch pattern from AquaBuddy rules |
| `NIGHTSBRIDGE_*` | 5 | if confirmed live |
| `GBP_API_*` | 8 | optional |

---

## 7. Grant-only setup checklist

Grok asks for these with the exact approval phrases. Do not nag more than once per item.

1. `APPROVE REPO ACCESS` for any private PW / Browns / booking repo that should be extended.
2. Live Grok Bot is the desktop Bot already set up (`bot-roster.yaml`, `G8` optional `LIVE BOT:` name or share URL). Do not recreate the retired six-role team.
3. `APPROVE GOOGLE ACCOUNT <email> gmail,drive,calendar` for **every** login in `google-accounts.yaml` (not hub-only). Extra names via `GOOGLE ACCOUNTS:`.
3. `APPROVE WA COEXISTENCE` + `APPROVE WA HOST <url>` before any live WhatsApp.
4. Rate cards: hospitality, Perfect Water, Heavy Metal (files Grant drops in Drive `_Inbox`).
5. Confirm systems of record: Loyverse vs Sheets; NightsBridge vs site calendar; QuickBooks vs spreadsheets.
6. Confirm whether Respond.io is still in front of WhatsApp. If yes, PR #2 must sit behind it or replace it — pick one.
7. SoR one-liners: `SOR: hospitality-calendar=`, `SOR: pw-stock=`, `SOR: books=`, `SOR: whatsapp=`, `SOR: hospitality-pay=`, `SOR: hmplant=`, `SOR: trust-lets=`.
8. Rate cards + cancel/refund policy + HM zone card dropped in Drive `_Inbox`.
9. After each live phase week, fill `labor-ledger.md` actuals.

---

## 8. Cost controls

- One Cloud agent per package. No “do the whole profile” runs.
- Email classification: rules before LLM. Batch 50, then stop.
- WhatsApp: local `npm run simulate` until hosted.
- Drive: metadata listing, not full-text of PDFs, until Phase 3 fixtures.
- X MCP: off.
- Prefer cheap/fast models for file moves and label rules; reserve large models for guest-tone drafts and recon exceptions.
- Kill a run if it starts scanning the entire 7720-thread inbox.

---

## 9. Success metrics (review monthly)

| Metric | Target once named phases are live |
| --- | --- |
| Texas morning reconstruct time | ≤30 min (Phase 1d) |
| Inbox threads needing Grant open >24h | falling from ~43 unread / 7720 pile (1a) |
| Hospitality inquiries with same-day **draft** | ≥90% (1a/5) |
| SLA breaches appearing only on digest | 100% visible, not lost in scrollback (1d/1e) |
| Bank / CIPC / GBP auto-labelled (after `G6`) | ≥95% precision |
| Unapplied cash older than 7 days | on 3b list, not in Grant’s head |
| Drive files left in `_Inbox` >7 days | falling (2) |
| Live client messages sent without `H1`/`H10` | **zero** |
| Combined Grant+Liana admin hours | steering target 8–12 h/week after 1a, 1b, 1d, 3, 5, 6, 11 |

---

## 10. How Grok runs a week

1. Read `STATUS.md` and `BUSINESS-REQUIREMENTS.md` §4 if choosing a new package.
2. If a PR is open for the current package, review it; do not start a sibling package in the same repo area.
3. Copy the next prompt from `launch-prompts.md` into a new Cloud agent on the correct repo.
4. When the agent opens a PR, update STATUS and the matching `labor-ledger.md` row.
5. Ask Grant only for gated phrases and SoR lines.
6. After merge, pick the next **parallel-allowed** package that still removes a named ritual.

If Grant says “continue”, run `phase-10a-family-filters`, then `phase-01a-email-classifier`, then `phase-01d-daily-digest` + `phase-10b-family-digest`.

---

## 11. First Cloud agents after this expansion merges

Ship labour cuts first, not architecture.

1. `phase-10a-family-filters` — $0 AISD/school routing so family mail leaves the business pile.
2. `phase-01a-email-classifier` — business queues.
3. `phase-01d-daily-digest` **and** `phase-10b-family-digest` — two digests, not one mixed blob.
4. `phase-02-drive-taxonomy` (parallel).
5. `phase-01b-wa-slots` on PR #2.

If Grant says “continue”: use the **already-set-up desktop Grok Bot** (`GROK-BOT-AMENDMENTS.md`, [x.ai/bot](https://x.ai/bot)) and **link every Google account** (`GOOGLE-ACCOUNTS.md`), then **10a then 1a then 1d/10b**. Do not rebuild Aquabuddy first. Do not recreate the retired six-role team.
