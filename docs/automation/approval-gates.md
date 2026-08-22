# Approval Gates

Agents default to **observe → classify → draft → queue**. Sending, paying, filing legally, or sharing privately is gated.

Use this phrase in STATUS.md when a human must act:

`BLOCKED: <gate-id> — <one-line reason>. Approval text required: <EXACT PHRASE>`

## Always allowed (no extra approval)

| ID | Action |
| --- | --- |
| `A1` | Read Gmail / Drive / Calendar metadata and classify locally |
| `A2` | Create or update docs, playbooks, and draft PRs in GitHub |
| `A3` | Create Gmail **drafts** (never send) |
| `A4` | Propose Drive folder names and file titles; do not move files on first pass |
| `A5` | Create Calendar **draft proposals** in STATUS (do not write events yet) |
| `A6` | Unit-test WhatsApp / email routers with fixtures; no live send |
| `A7` | Label **≤50** Gmail threads in a named sample after a dry-run log is attached to the PR |
| `A8` | Write a daily/weekly digest file or Gmail **draft** to Grant from metadata (no `N3` bodies) |

## Needs one-time Grant setup, then allowed

| ID | Action | Approval text |
| --- | --- | --- |
| `G1` | Connect additional Google accounts (business Gmail / Drive) | `APPROVE GOOGLE ACCOUNT <email>` |
| `G2` | Grant Cloud Agent access to a private GitHub repo | `APPROVE REPO ACCESS <repo>` |
| `G3` | Store a named secret in the Cloud environment | `APPROVE SECRET <NAME>` |
| `G4` | Enable WhatsApp Cloud API Coexistence on the live number | `APPROVE WA COEXISTENCE` |
| `G5` | Host the WhatsApp webhook on a public HTTPS URL | `APPROVE WA HOST <url>` |
| `G6` | Allow auto-label of a whole sender class after 95% sample accuracy | `APPROVE AUTO LABEL <class>` |

## Needs per-item or per-batch human approval

| ID | Action | Approval text |
| --- | --- | --- |
| `H1` | Send any client / guest / supplier message | `APPROVE SEND <thread-or-wa-id>` |
| `H2` | Send a templated sequence (pre-arrival, review request, payment reminder) | `APPROVE SEQUENCE <name> <entity>` |
| `H3` | Move or rename Drive files outside `_Inbox` / `_Review` | `APPROVE DRIVE MOVE <folder>` |
| `H4` | Share a Drive file outside Grant/Liana | `APPROVE SHARE <file> <email> <role>` |
| `H5` | Create or change Calendar events | `APPROVE CAL <calendar> <count>` |
| `H6` | Publish a Google Business Profile reply | `APPROVE GBP REPLY <location> <review-id>` |
| `H7` | Generate and send an invoice or payment link | `APPROVE INVOICE <entity> <ref>` |
| `H8` | Place a supplier purchase order | `APPROVE PO <entity> <ref>` |
| `H9` | Apply a schema migration or production deploy | `APPROVE APPLY MIGRATION` / `APPROVE DEPLOY <app>` |
| `H10` | Send a debtor/creditor reminder batch | `APPROVE COLLECT <list-id>` |
| `H11` | Publish a staff / HK / driver run-sheet | `APPROVE RUN SHEET <date>` |

## Never allowed for agents

| ID | Action |
| --- | --- |
| `N1` | Bank payments, forex instructions, or card charges |
| `N2` | Attorney, SARS, CIPC, or municipal **submissions** (draft packs only) |
| `N3` | Opening, reading, or sharing family medical, school-safeguarding, will, or tax-emigration contents in chat |
| `N4` | Registering the live WhatsApp number as a brand-new Cloud API line (drops the phone) |
| `N5` | Hardcoding tokens, logging secrets, force-push, or dropping data |
| `N6` | Employment / job-search automation |
| `N7` | Inventing accommodation rates, water prices, or sand quotes |

## Data lanes

| Lane | Examples | Extra rule |
| --- | --- | --- |
| `family` | School, household, vehicles, pets, wills, tax emigration | Agents may organise filenames and folders only. Do not quote file contents in PRs or chat. |
| `hospitality` | The Browns, Rivendell, stay@ | Liana is a first-class operator. Draft to her queue when guest-facing. |
| `perfect-water` | Franchise orders, inventory, Loyverse | Store-scoped. Never mix Thohoyandou and Louis Trichardt stock. |
| `heavy-metal` | Quotes, deliveries, yard | WhatsApp-first. Confirm volume + delivery location before any quote. |
| `trust` | GAB Trust, B Group Holdings, BVR, properties | Attorney/family share is `H4` only. |
| `shared-finance` | Bank statements, invoices | Classify to entity first. Reconciliation never auto-matches on amount-only. |

## Dual-control

Any action that is both `trust` and `H1`–`H8` also requires Grant. Liana may approve `hospitality` guest drafts tagged `liana-review`.
