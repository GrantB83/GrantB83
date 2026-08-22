# Spec: Grok-Directed Automation of Personal, Family & Owned-Business Admin

**Audience:** Grok Bot + Cursor Cloud agents  
**Owner:** Grant Brown (human approver) · Liana Brown (hospitality approver)  
**Control plane:** `GrantB83/GrantB83`  
**Date:** 22 August 2026  
**Scope:** Personal life, family administration, and owned businesses only. No employment workflows.

This spec is written so Grok can run the programme without re-deriving context. If STATUS and this file disagree, STATUS wins for “what is done”; this file wins for “what good looks like”.

---

## 1. Outcome

Human time is limited to:

- approving exceptions and high-value decisions
- guest-care judgement Liana wants to keep
- payments, legal submissions, and family-sensitive documents

Everything else (triage, filing, drafting, scheduling, reconciling, reminding, packing monthly reports) is done by specialised Cloud agents under Grok.

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

---

## 3. Architecture

```text
Grant / Liana
      │
      ▼
Grok Bot (orchestrator) -- launches 1 Cloud agent per package
      │
      ▼
GrantB83 control plane (SPEC, STATUS, prompts, WhatsApp PR #2)
      │
      ├── Gmail / Drive / Calendar MCP
      ├── Entity apps (Perfect Water, Browns, Heavy Metal, Trust)
      ├── Exception queues (drafts only until gated)
      └── Humans (Grant, Liana)
```

### 3.1 Layers

1. **Intake** — WhatsApp Cloud API (PR #2), Gmail, web forms, later OTA/POS webhooks.
2. **Classify** — entity, intent, urgency, data lane, confidence.
3. **System of record** — one object per conversation / order / booking / document / transaction. Start as Git-tracked JSON/SQLite or Supabase if PW-Web-App is unlocked. Do not start a new CRM product.
4. **Actuators** — draft email, draft WA reply, Drive file proposal, calendar proposal, invoice draft, monthly pack.
5. **Audit** — every outbound candidate stored with model, prompt hash, source docs, and gate id.

### 3.2 Why this shape (cost)

- Grok stays cheap: it only chooses the next package and reviews exceptions.
- Cloud agents do the repo work and die.
- Classification uses rules + small models; expensive models only on low-confidence or guest-tone drafts.
- No always-on agent polling Gmail every minute in chat. Use scheduled Cloud agents or a tiny webhook worker.

### 3.3 Shared conversation object (Phase 1 deliverable)

Minimum fields. Implement as `packages/ops-schema` inside this repo until a private ops repo exists.

```yaml
Conversation:
  id: ulid
  entity: hospitality-partners | perfect-water | heavy-metal | gab-trust | household
  channel: whatsapp | email | web | ota | pos
  external_ids: { gmail_thread, wa_message, hiver_label }
  intent: inquiry | order | quote | booking | complaint | invoice | compliance | other
  confidence: 0-1
  status: new | needs-human | draft-ready | waiting-customer | closed
  assignee: grant | liana | staff | agent
  payload: {}          # structured extract only
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
| `family-sorter` | GrantB83 | Drive/Gmail metadata only | open medical/will/tax-emigration bodies |

---

## 5. Phased plan

Each phase is a **work package Grok can assign**. Do not start N+1 until the done criteria in STATUS are checked, unless the phase is explicitly parallel (noted).

### Phase 0 — Control plane & safety

**Goal:** Grok can direct the rest of the programme from this repo.

**Leverage:** this folder; Cloud environment `GrantB83/GrantB83`; existing draft PRs #1 and #2.

**Work**

0. Merge or keep this spec as the source of truth.
1. Ask Grant for `G2` on private repos (list in STATUS).
2. Ask Grant for `G1` if `accounts@bvrgroup.co.za` / `stay@` native mailboxes are not fully visible.
3. Do not expand the Cloud environment with secrets until a phase needs them.
4. Keep sibling brands in the WhatsApp router (CrediMed, AutoPost) **read-only**. Do not build those products here.

**Done when**

- `SPEC.md`, `entity-map.yaml`, `approval-gates.md`, `launch-prompts.md`, `STATUS.md`, `AGENTS.md` exist.
- Grok can assign Phase 1 without rereading the original profile.

**Parallel after this merges:** 1a (email), 2 (Drive taxonomy design), 8 (GBP email drafts). WhatsApp live path stays serial on `G4`/`G5`.

---

### Phase 1 — Unified WhatsApp + email client layer

Highest leverage. Covers Perfect Water, Heavy Metal, and The Browns.

#### 1a. Email classifier (start immediately)

**Role:** `inbox-classifier`  
**Goal:** Every new thread gets `entity + intent + lane` with confidence.

**Work**

1. Add Gmail labels (do not rename Hiver):

   - `Entity/Hospitality`
   - `Entity/PerfectWater`
   - `Entity/HeavyMetal`
   - `Entity/Trust`
   - `Entity/Household`
   - `Intent/Inquiry`
   - `Intent/Order`
   - `Intent/Invoice`
   - `Intent/Bank`
   - `Intent/Compliance`
   - `Intent/Review`
   - `Queue/NeedsGrant`
   - `Queue/NeedsLiana`
   - `Queue/DraftReady`

2. Rule table first (sender/domain), then model fallback. Seed rules from `entity-map.yaml` `observed_senders_to_route`.
3. Dry-run 50 recent inbox threads. Write a confusion matrix in the PR (`docs/automation/samples/email-dry-run.md`). No body quotes from `family` lane.
4. After ≥95% on the bank/CIPC/GBP/Hiver-obvious classes, request `G6` for those classes only.
5. For hospitality inquiries: create a **Gmail draft** in-thread (`A3`). Do not send.

**Done when:** dry-run attached; labels created; 50-thread log exists; auto-label not enabled except where `G6` was given.

#### 1b. WhatsApp structured intake (extend PR #2)

**Role:** `wa-extender`  
**Goal:** Inbound WA becomes a `Conversation` with required slots, not a free-text blob.

**Work**

1. Keep Coexistence warning from PR #2.
2. Add slot-filling per entity (refuse to quote without slots):

   | Entity | Required slots before any price |
   | --- | --- |
   | Hospitality | property, dates, guests, occasion |
   | Perfect Water | store, product (water / filter / equipment), qty, pickup vs delivery |
   | Heavy Metal | product (building sand / plaster sand / aggregate), m³ or tons, delivery suburb |

3. Persist conversations to `data/conversations/` (gitignored contents, schema committed) or Supabase if PW unlocks.
4. Handoff to Liana for hospitality when the guest asks for a human or confidence < 0.7.
5. Simulation fixtures for the three entities; `npm test` must stay green.

**Grant blockers:** `G4`, `G5`, `G3` for Meta secrets. Until then, local simulate only.

**Done when:** PR #2 updated or a follow-on PR; tests cover the three slot schemas; no live send.

#### 1c. Cross-channel thread stitch

**Role:** `docs-steward` + later `inbox-classifier`  
**Goal:** Same guest in email + WhatsApp is one `Conversation`.

**Work:** match on normalised phone / email; never on name alone. Hospitality Hiver ticket id stored on the object.

---

### Phase 2 — Intelligent Drive consolidation

**Role:** `drive-librarian`  
**Goal:** One taxonomy, automated filing **proposals**, family data never leaked into chat.

**Leverage:** `The Browns USA` already has Family, Finance, Legal, Properties, School. Do not flatten it.

**Proposed roots** (create as empty folders only after `H3` for that root):

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

**Naming**

```text
YYYY-MM-DD__entity__doc-type__vendor-or-counterparty__ref.ext
```

**Work**

1. Inventory current Drive roots (metadata only). Write `docs/automation/samples/drive-inventory.md`.
2. Map email attachments (bank PDF, municipal, invoices) → proposed path. Do not move.
3. Family / Tax Emigration / Will / school medical: classify by **filename and folder** only. `N3`.
4. After Grant replies `APPROVE DRIVE MOVE 00_Inbox` (etc.), move only from `00_Inbox`.

**Parallel with Phase 1a.**

**Done when:** inventory + naming spec + empty business roots proposed; no silent moves.

---

### Phase 3 — Banking, categorisation, reconciliation

**Role:** `finance-ingester`  
**Goal:** Statements become categorised transactions; only exceptions reach Grant.

**Feeds (observed)**

| Feed | How it arrives today | Parser |
| --- | --- | --- |
| Standard Bank transact | email to `grant@thebrowns.co.za` | email → CSV/PDF |
| FNB forex / RMB | email | treat as **exception class**, not auto-match |
| WesBank | email | vehicle-finance liability schedule |
| US bank (Bell) | Drive `Receipts 2026` + CSV already present | CSV first |
| QuickBooks | email notifications | confirm whether QBO is system of record |

**Work**

1. Build parsers against **fixtures** (redact account numbers). Never commit raw statements.
2. Category chart: `entity + tax-lane + household-vs-business`.
3. Match rule: date ±2 days **and** amount **and** counterparty token. Amount-only is an exception.
4. Output: `docs/automation/samples/recon-exceptions.md` + later a simple dashboard in aquabuddy if `G2`.
5. Amortisation / VAF: track schedule vs mail; do not pay (`N1`).

**Done when:** one SA feed and one US CSV parse in CI with redacted fixtures; exception queue format agreed.

---

### Phase 4 — Perfect Water order-to-fulfilment

**Role:** `pw-builder`  
**Goal:** QR + WhatsApp orders update stock and only ping humans for exceptions.

**Leverage, in order**

1. Private `PW-Web-App` if `G2` granted.
2. Else `aquabuddy-demo` as the internal console (Nest/Next/Prisma already has inventory, invoicing, recon, compliance, AI message audit).
3. Keep GAS/Sheets as an adapter until Prisma is the source of truth.

**Work**

1. Confirm Loyverse vs custom stock as source of truth.
2. Wire Phase 1 conversation `intent: order` → order row (store-scoped).
3. Low-stock alerts (draft email / WA to Grant, not auto PO).
4. Supplier PO drafts (`H8`).
5. Daily compliance checklist already in aquabuddy: turn on for Louis Trichardt / Thohoyandou separately.
6. Monthly pack inputs (Phase 9) = sales, margin flag, stockouts, unreconciled receipts.

**Done when:** a simulated WA/QR order creates a store-scoped order and decrements fixture stock; no production cutover without `H9`.

---

### Phase 5 — Accommodation booking pipeline

**Role:** `hospitality-builder`  
**Goal:** Inquiry → structured booking → payment request → stay messages, with Liana in the loop.

**Leverage:** TheBrowns-Showcase forms, Hiver, PR #2 WA router, NightsBridge if live.

**Work**

1. Confirm whether NightsBridge or the custom site calendar is canonical. Do not dual-book.
2. Map Hiver states onto `Conversation.status`.
3. Quote engine reads an approved **rate card file** (Grant/Liana supplied). No invented rates (already in PR #2).
4. Payment link is `H7` (PayFast / SnapScan / EFT instructions — confirm current method).
5. Sequences (after `H2`): inquiry ack, quote, confirmation, pre-arrival, checkout, review ask.
6. Housekeeping task = calendar event on a **new** `Hospitality Ops` calendar (`H5`), not the family calendar.

**Done when:** one fixture inquiry produces a draft quote with dates/guests and a Hiver-compatible status; no send.

---

### Phase 6 — Heavy Metal quote-to-delivery

**Role:** `hm-builder`  
**Goal:** WhatsApp-first quotes with volume + location, then delivery notifications.

**Leverage:** `hmsand.co.za`, `mail@hmsand.co.za`, PR #2 brand router. No dedicated repo yet — keep code under `apps/heavy-metal/` in this repo or a new repo Grant creates.

**Work**

1. Grant supplies a price card (product × zone). Until then, bot only collects slots.
2. Delivery calendar + driver notify templates (`H2`).
3. Invoice draft + reminder sequence (`H7`, `H2`).
4. Simple stock decrement + low-stock flag.
5. Municipal / Eskom mail related to the yard files to `40_HeavyMetal/compliance` (Phase 2).

**Done when:** simulate “20 cubes plaster sand to Belfast” collects slots and refuses to invent a price.

---

### Phase 7 — GAB Trust / BVR compliance + vault

**Role:** `drive-librarian` + `docs-steward`  
**Goal:** Deadlines visible; documents findable; no agent files with CIPC/SARS.

**Work**

1. Compliance register in `docs/automation/compliance-register.yaml`: CIPC annual returns, municipal, insurance, forex packs.
2. Calendar proposals only (`A5` → `H5`). Use SA timezone.
3. Vault path `50_GABTrust/` with attorney share as `H4`.
4. Liquidation status board is a markdown table Grant updates; agent only reminds and files incoming mail.
5. Bank ingest from Phase 3 tagged `trust`.

**Done when:** register exists; next 12 months of CIPC/insurance/municipal reminders proposed; no submissions sent.

---

### Phase 8 — Google Business Profile

**Role:** `gbp-drafter`  
**Parallel after Phase 0.**

**Work**

1. Start from `businessprofile-noreply@google.com` threads (already in Gmail).
2. Draft replies in Gmail; never publish until `H6`.
3. Tone cards per location (PW stores vs The Browns vs Heavy Metal).
4. Later: official GBP API if Grant enables it (`G3`).

**Done when:** 10 historical reviews have draft replies in a PR sample file (no personal guest data).

---

### Phase 9 — Cross-entity monthly packs

**Role:** `pack-builder`  
**Depends on:** 1–3 minimum; 4–8 as they come online.

**Pack sections (one PDF/markdown, entity tabs)**

- Exceptions still open (comms, recon, compliance)
- Cash in/out by entity (from Phase 3)
- Hospitality occupancy / inquiry conversion
- PW sales vs stockouts
- HM quotes vs delivered
- Trust deadline heatmap
- Household burn vs budget sheet (totals only)

**Send:** draft email to Grant (`A3`). Monthly send is `H1`.

---

### Phase 10 — Personal / family admin

**Role:** `family-sorter`  
**Goal:** School, vehicles, bills, pets stop interrupting business focus.

**Allowed**

- Label household mail (`Entity/Household`)
- Propose files into `10_Household/` by **filename**
- Remind from calendar metadata (school holidays, insurance renewals)
- Tesla / WesBank / tolls as finance categories

**Forbidden (`N3`)**

- Quoting or summarising medical, will, tax-emigration, or safeguarding documents in chat or PRs
- Messaging a school or government office

**Done when:** household mail is labelled; bill/vehicle reminders sit on the exception list; no family file bodies appear in git.

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
2. `APPROVE GOOGLE ACCOUNT` for native business mailboxes if the connected Gmail is incomplete.
3. `APPROVE WA COEXISTENCE` + `APPROVE WA HOST <url>` before any live WhatsApp.
4. Rate cards: hospitality, Perfect Water, Heavy Metal (files Grant drops in Drive `_Inbox`).
5. Confirm systems of record: Loyverse vs Sheets; NightsBridge vs site calendar; QuickBooks vs spreadsheets.
6. Confirm whether Respond.io is still in front of WhatsApp. If yes, PR #2 must sit behind it or replace it — pick one.

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

| Metric | Target after Phase 1–3 |
| --- | --- |
| Inbox threads needing Grant open >24h | trending down from current 43 unread / 7720 pile |
| Hospitality inquiries with a same-day **draft** | ≥90% |
| Bank / CIPC / GBP mail auto-labelled (after `G6`) | ≥95% precision on those classes |
| Drive files left in `_Inbox` >7 days | falling |
| Unreconciled transactions older than 14 days | exception list only |
| Live client messages sent without `H1` | **zero** |

---

## 10. How Grok runs a week

1. Read `STATUS.md`.
2. If a PR is open for the current package, review it; do not start a sibling package in the same repo area.
3. Copy the next prompt from `launch-prompts.md` into a new Cloud agent on the correct repo.
4. When the agent opens a PR, update STATUS (or tell the agent to).
5. Ask Grant only for gated phrases.
6. After merge, pick the next **parallel-allowed** package.

If Grant says “continue”, interpret that as: execute the next `not started` phase that is unblocked.

---

## 11. First three Cloud agents after this spec merges

1. `phase-01a-email-classifier` on `GrantB83/GrantB83`
2. `phase-02-drive-taxonomy` on `GrantB83/GrantB83` (parallel)
3. `phase-01b-wa-slots` on the PR #2 branch (extend, do not fork a third WhatsApp design)

That is the entire directed start. Do not skip ahead to rebuild Aquabuddy or The Browns until `G2` and Phase 1a samples exist.
