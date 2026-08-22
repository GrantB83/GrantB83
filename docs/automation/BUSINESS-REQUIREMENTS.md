# Business admin requirements and gap analysis

**Audience:** Grok Bot + Cursor Cloud agents  
**Date:** 22 August 2026  
**Purpose:** Evaluate each entity as a business (not as a software backlog), list the admin that must keep running, show what the first 10-phase plan missed, and define the labour each expanded phase must remove.

If this file and `SPEC.md` disagree on *what work exists*, this file wins. `SPEC.md` wins on *how an agent implements a package*.

---

## 1. How this group actually spends admin time

Grant and Liana run SA operating companies from Austin. That is not “a few extra emails”. It is **two clocks, no shop-floor presence, and a human as the integration layer**.

| Clock | What happens | Who is awake |
| --- | --- | --- |
| SAST 08:00–17:00 | Orders, guests, trucks, banks, staff, municipalities | Local staff / clients. Grant is usually asleep or just waking for the second half. |
| America/Chicago morning | Grant discovers yesterday’s SA day, replies, unblocks people | Grant (and Liana for guests) |
| America/Chicago evening | SA is already closed. Anything not captured is lost until tomorrow | Grant / Liana |

**SAST is 7–8 hours ahead of Chicago.** A 08:00 Louis Trichardt open is midnight/01:00 in Austin. A 17:00 close is 09:00/10:00. The highest-leverage automation is therefore not a prettier dashboard. It is a **Texas-morning exception digest** plus **same-day structured replies** so Grant does not reconstruct four businesses from WhatsApp scrollback.

Labour today is mostly:

1. Finding the message (which inbox, which WhatsApp, which Hiver state)
2. Reconstructing facts (dates, volumes, store, who paid)
3. Drafting a reply or telling someone on the ground what to do
4. Chasing money
5. Filing the PDF so the bookkeeper / attorney / future-Grant can find it
6. Not missing a statutory or insurance date

Phases that only “classify” or “propose folders” without a **daily usable artefact** do not reduce (1)–(4). The expanded build therefore requires every phase to ship something a human stops doing this week.

---

## 2. Shared admin (highest volume, all entities)

These sit on Grant regardless of which company is “busy”.

| Admin function | Current ritual (human) | Failure if skipped | In original plan? |
| --- | --- | --- | --- |
| Multi-inbox triage | Open Gmail + forwards + Hiver + WhatsApp | Missed booking / angry supplier | Partial (1a) — no daily digest, no SLA |
| After-hours coverage | Ad-hoc. SA morning has no owner | Staff wait; guest goes to OTA | **Missing** |
| Attachment filing | Search Drive / downloads | Duplicate work at VAT / sale / liquidation | Partial (2) — proposals only, no inbox→vault job |
| Invoice vs statement vs receipt | Mixed Finance labels; invoices under-filed | Bookkeeper rework | Partial (3) |
| Debtors / creditors | Manual chase from memory | Cash gap, supplier cutoff | **Missing** |
| Payment-to-invoice match | Eye-ball bank alerts | Double-ask or unapplied cash | Partial (3 categorise, not match) |
| Statutory calendar | CIPC/SARS mail + memory | Penalties, deregistration | Partial (7 reminders) |
| VAT / EMP / bookkeeper pack | Month-end scramble | Accountant fees + Grant hours | **Missing** |
| Intercompany / BVR holding | Mental notes | Mixed books, FX confusion | **Missing** |
| GBP / reputation | Occasional | Rank drop, unanswered 1-star | Partial (8 drafts) |
| Overnight reconstruction | 60–120 min every Texas morning | The hidden tax of remote ops | **Missing** |
| Local staff “what today?” | WhatsApp voice notes | Idle yard / store, wrong delivery | **Missing** (staff of *owned* businesses is in scope; job-search is not) |
| Stale quote / inquiry follow-up | Guilt and memory | Lost occupancy / lost loads | **Missing** |
| Domain, Workspace, hosting | Interrupt-driven | Mail loops, site down | **Missing** (keep tiny) |
| Insurance certificates / claims | On demand | Trucks and guests blocked | **Missing** |
| POPIA / retention | None | Over-retain guest IDs, under-retain contracts | **Missing** (policy only) |

---

## 3. Entity evaluations

Hours below are **conservative remote-owner targets**, not time-and-motion studies. They exist so a phase can be scored. Agents update `labor-ledger.md` with Grant’s corrections after week 1 of each live phase. Do not treat the numbers as accounting.

### 3.1 Perfect Water (retail + wholesale purification)

**Business type:** Multi-site product business. Cash and account customers. Inventory-sensitive. Franchise brand constraints. High margin only if stock and repeat orders stay tight.

**Who feels pain:** Grant (remote GM), any remaining store staff, repeat filter customers, wholesale accounts.

| Admin function | Why it exists | Typical weekly labour now | Automation shape | Original plan? |
| --- | --- | --- | --- | --- |
| Order intake (WA / phone / QR / till) | Core revenue | 2–4 h remote + staff | Structured slots → order row | Partial (4, 1b) |
| Which store / which stock | Two locations must not share imaginary stock | Inside every order | Store-scoped inventory | Yes (4) |
| Fulfilment / “ready for pickup” | Customer chases if silent | 1–2 h | Status WA/SMS draft | **Thin** |
| Loyverse cash-up vs bank | Theft, error, undeposited cash | 1–2 h | Exception if till ≠ deposit | **Missing** |
| Filter / consumable reorder | Stockout kills margin | 0.5–1 h | Low-stock draft PO | Partial (4) |
| Physical stock take | Sheets drift | Monthly 2–4 h | Checklist + variance file | **Missing** |
| Returns, warranties, bottle deposits | Reverse logistics | Ad-hoc 0.5 h | Credit-note draft + stock in | **Missing** |
| Wholesale vs retail | Different prices, payment terms | Hidden in chats | Account vs COD flag | **Missing** |
| Personalised bottled water | Production slot, artwork, due date | Spike | Job card, not a generic order | **Missing** |
| Water quality / filter-change log | Licence to operate, brand | Daily 10–20 min/site | Checklist already in aquabuddy; make it the *only* log | Thin (4.5) |
| Technical / installer schedule | Calendar `PW Technical Schedule` exists | 0.5 h | Job extract → calendar proposal | Thin |
| Franchisor royalty / brand report | Contractual | Monthly 1–2 h | Pack from sales extract | **Missing** |
| Staff shift / cash float | Store opens without Grant | Daily voice notes | Run-sheet (Phase 11) | **Missing** |
| Supplier statements | Cost and rebate | Monthly 1 h | File + match to POs | Thin |
| GBP + repeat-order QR | Local discovery | 0.5 h | Drafts (8) + existing portal | Partial |

**Admin that must stay human:** price list changes, hiring/firing, quality incident judgement, franchisor disputes, any payment.

**Labour outcome if Phases 1b + 4 + 4b + 11 are live:** remote PW admin from ~6–10 h/week toward **~2 h** (exceptions, POs, cash-up mismatches).

### 3.2 The Browns / Hospitality Partners

**Business type:** Luxury stay. Revenue is occupancy × rate × extras, minus OTA commission and voids. The product is a reply in under an hour and a house that is ready. Liana is an operator, not a CC.

**Who feels pain:** Liana (guest voice), Grant (money and systems), cleaner / caretaker on the ground.

| Admin function | Why it exists | Typical weekly labour now | Automation shape | Original plan? |
| --- | --- | --- | --- | --- |
| Inquiry SLA | Lost to Booking.com if slow | 3–5 h | Instant structured ack + draft quote | Partial (1, 5) |
| Availability / overbook | One calendar must win | 1–2 h + panic | Canonical calendar + OTA block | Thin — **OTA missing** |
| Quote → deposit → confirm | Cash before keys | Inside inquiry time | Payment-link draft (`H7`) | Partial (5) |
| OTA inbox + commission | Channel is a second front desk | 1–3 h | Import reservation → same Conversation | **Missing** |
| Date-change / cancel / no-show | Policy + refund math | Ad-hoc | Policy table, no invented refunds | **Missing** |
| Pre-arrival pack | Access, wifi, directions, ETA | 0.5 h per stay | Sequence `H2` | Partial (5) |
| Housekeeping run-sheet | Clean between stays | Daily 15–30 min | Ops calendar + checklist to caretaker | Thin (one event) |
| Linen / maintenance / keys | Failure = bad review | Interrupt | Ticket on stay object | **Missing** |
| Extras / damage / deposit | Margin and disputes | Per stay | Charge list draft | **Missing** |
| Review request + GBP | Next guest’s trust | 0.3 h | Sequence after checkout | Partial (5, 8) |
| Payment chase | Deposit not paid | 0.5–1 h | Aged booking AR (3b) | **Missing** |
| Tourism levy / guest register | If applicable | Per stay | Field on booking; Grant confirms duty | **Missing** |
| Seasonal rate card | Yield | Rare but painful | File replace; bot never invents | Noted |
| Hiver hygiene | 1644 threads already | Ongoing | Status map, not a new helpdesk | Yes |

**Admin that must stay human:** compassionate exceptions, overbook recovery, rate strategy, anything Liana wants to voice.

**Labour outcome if 1a + 1b + 5 + 5b + 12 are live:** guest-admin from ~8–12 h/week (Grant+Liana) toward **~3 h** of review and judgement.

### 3.3 Heavy Metal Sand & Stone

**Business type:** Physical bulk product. Quotes die in hours. Profit is volume × (price − haul − wastage). WhatsApp *is* the sales desk.

**Who feels pain:** Grant (quotes and invoices), yard / driver / hired transport, account customers.

| Admin function | Why it exists | Typical weekly labour now | Automation shape | Original plan? |
| --- | --- | --- | --- | --- |
| Same-day quote | Builders will buy elsewhere | 2–3 h | Slots + zone rate card | Partial (6) — no live price path |
| Access / truck type / offload | Wrong truck = failed delivery | Hidden in chat | Extra slots (gate, tipper vs bag) | **Thin** |
| Account vs COD | Credit risk | Per order | Terms flag; COD default | **Missing** |
| Truck / contractor booking | No truck, no sale | 1–2 h | Run-sheet + template to driver | Thin |
| Load confirm / POD | Disputes on volume | Per load | Photo + template; file to vault | **Missing** |
| Invoice + 7/14/30 chase | Builders pay slow | 1–2 h | AR engine (3b) | Thin (reminders only) |
| Yard stock vs rain / theft / inbound | Can’t sell empty air | 0.5 h | Decrement + weekly photo ask | Partial |
| Eskom / municipal / yard compliance | Yard dies if cut | Interrupt | Phase 2 file + 7 calendar | Thin |
| Related plant mail (`hmplant`) | Confirm link first | Unknown | Do not automate until Grant says it is in-scope | Noted |

**Admin that must stay human:** credit limits, price wars, “load it anyway”, safety incidents.

**Labour outcome if 1b + 6 + 6b + 3b are live:** HM admin from ~5–8 h/week toward **~1.5–2 h**.

### 3.4 GAB Trust / B Group Holdings / BVR

**Business type:** Asset and process administration, not daily sales. Cost of failure is legal and familial, not a lost cube of sand. Grant’s job is **not missing a date** and **not losing a letter**.

**Who feels pain:** Grant, parents/family, attorney, RMB/FNB forex desk.

| Admin function | Why it exists | Typical labour | Automation shape | Original plan? |
| --- | --- | --- | --- | --- |
| CIPC annual returns | Company/trust existence | Spiky | Register + 30/14/7 day digest | Partial (7) |
| SARS correspondence | Tax and emigration overlap | Spiky | Label + vault; no submit | Partial |
| Insurance / rates / levies | Asset protection | Monthly | Calendar + unpaid flag from mail | Thin |
| Liquidation / sale process | Multi-step, attorney-led | Weekly 1–2 h when active | Status board with *next action + owner + date*, not a static table | Thin |
| Attorney pack | They bill for Grant’s chaos | Per request | Vault + index; `H4` share | Thin |
| FNB forex / SDA–FIA style packs | Cross-border cash | Per transfer | Document checklist; Grant submits (`N1`/`N2`) | **Missing** |
| Property-by-property file | “Where is the deed?” | Search time | One folder per asset | Partial |
| If a property is let | Tenant, agent, void | If applicable | Confirm with Grant before building | **Missing** |
| Family status question | WhatsApp from SA family | Ad-hoc | One-page status Grant can forward | **Missing** |
| Intercompany BVR vs ops | Mixed payments | Hidden | Entity tag on every txn (3) | Thin |

**Admin that must stay human:** every filing, every forex instruction, every attorney instruction, any family medical/will/tax-emigration content (`N3`).

**Labour outcome if 2 + 3 + 7 + 7b are live:** trust admin from “background anxiety + search” toward **20–40 min/week** plus real spikes Grant still owns.

### 3.5 Household (so it stops interrupting the businesses)

| Admin function | Automation shape | Original plan? |
| --- | --- | --- |
| US + SA bill due dates | Extract due date from mail headers/snippets; digest | Thin (10 labels only) |
| Vehicles (Tesla + WesBank) | Finance category + renewal dates | Thin |
| School logistics | Metadata / calendar only | Partial |
| Pets, insurance, medical | Filename only | Thin |
| Budget vs actual | Totals from Phase 3 vs existing Budget sheet | **Missing** |
| Dual-tax / emigration paperwork | Vault organise; never summarise bodies | Noted `N3` |

**Labour outcome:** 2–4 h/week of “family mail in the business inbox” toward **Family Command Center** (`FAMILY-COMMAND-CENTER.md`): zero-token filters, `Family/Action` cards, a **separate** family digest, calendar, and budget due-list. Not a slice on the business digest. Medical bodies never enter chat (`N3`).

---

## 4. What the original 10-phase plan missed

Grouped so Grok does not “add features” at random.

### 4.1 Missing control loops (the work repeats every day)

1. **Texas-morning SA digest** — one artefact, all entities, exceptions only.
2. **Coverage SLA** — who owns the inbox in which window; auto-ack when Liana/Grant are offline.
3. **Local staff run-sheet** — owned-business labour direction (stores, yard, housekeeping). Not job-search.
4. **Stale pipeline follow-up** — quotes and inquiries that went quiet.
5. **Stay-day / delivery-day execution** — not just “booking exists” or “quote exists”.

### 4.2 Missing money loops

6. **AR/AP aged lists** and gated collection templates.
7. **Payment-to-invoice matching** (not only transaction category).
8. **Till vs bank** (Perfect Water / any cash).
9. **Bookkeeper / VAT / EMP pack** (QuickBooks is already in the mail).
10. **COD vs account terms** on HM and PW wholesale.

### 4.3 Missing operations loops

11. **OTA / channel manager** as a first-class intake (hospitality).
12. **Housekeeping, linen, maintenance, keys, extras, cancel/refund policy**.
13. **POD / load confirmation / truck type** (Heavy Metal).
14. **Stock take, returns, bottle deposits, personalised-water job cards** (PW).
15. **Franchisor report / royalty extract** (PW).
16. **Cash-up and shift** (PW).

### 4.4 Missing trust / cross-border loops

17. **Forex document checklist** per transfer.
18. **Liquidation next-action board** (owner + date).
19. **Family-safe one-pager** Grant can forward.
20. **Confirm-before-build** on hmplant and any let property.

### 4.5 Missing measurement

21. **Labour ledger** — each live phase must show hours Grant stopped spending, or the phase is not done.

---

## 5. RACI (owned businesses + household only)

| Function | Grant | Liana | Agent | Local staff |
| --- | --- | --- | --- | --- |
| Guest tone / exceptions | C | **A** | Draft | House ready |
| Hospitality money / calendar truth | **A** | C | Draft | — |
| PW / HM price and credit | **A** | I | Slot / flag | Fulfil |
| Payments and forex | **A** | I | Never | — |
| Statutory submit | **A** | I | Draft pack | — |
| Morning digest review | **A** | C (guest slice) | **R** produce | — |
| Family vault content | **A** | **A** | Filename only | — |
| Daily run-sheet | **A** approve | C if guest | **R** draft | **R** execute |

A = account, R = does the work, C = consulted, I = informed.

---

## 6. What “tangible labour reduction” means

A phase is **not done** when a schema exists. It is done when Grant or Liana can point to a ritual they skipped.

| Done test | Pass |
| --- | --- |
| Ritual named | “I used to open X every morning / every Sunday.” |
| Artefact replaces it | Digest, draft, queue, run-sheet, aged-AR list, bookkeeper zip |
| Human time left | Written in the phase (`Human remaining`) |
| Measured | Row in `labor-ledger.md` after 7 live days, or `estimated` if not yet live |
| Safety | No `H*` action fired without the phrase |

**Do not ship a phase that only updates architecture.** If the package is foundational (schema, parsers), it must still produce a **usable sample artefact** Grant can run by hand that week (for example a filled digest from the last 24 h of mail).

---

## 7. Systems of record (decide once, write in STATUS)

Until Grant answers, agents assume the conservative default.

| Domain | Default SoR | Do not |
| --- | --- | --- |
| Guest ticket | Hiver labels | Invent a second helpdesk |
| Guest calendar | NightsBridge if live, else site calendar — **confirm** | Dual-write |
| PW stock | Loyverse if live, else Sheets — **confirm** | Mix stores |
| PW orders | PW-Web-App if `G2`, else aquabuddy-demo + Sheets adapter | Third order book |
| WhatsApp | PR #2 Cloud API **or** Respond.io — **pick one** | Both sending |
| Books | QuickBooks if Grant says yes, else tagged CSV + pack | Silent second ledger |
| Trust docs | Drive `50_GABTrust` | Attorney inbox as vault |
| Household docs | Existing The Browns USA | Duplicate tree |

Grant answers with one line each, e.g. `SOR: hospitality-calendar=nightsbridge`.
