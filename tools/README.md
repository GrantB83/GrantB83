# Tools Catalog

Command-line utilities for CoS, bot desks, and owned-business operations. Each tool is **offline**, **read-only**, and works with CSV/file exports only.

## Index

| Tool | Purpose | Desk(s) | Safety Note |
|------|---------|---------|-------------|
| [csv-fixture-harness](#csv-fixture-harness) | Validate CSV fixtures: headers, row counts, blanks, currency violations | Perfect Water / Ledger / Browns / Vault | **Read-only**. Never modifies files. No invented amounts. |
| [pw-bank-csv-normalize](#pw-bank-csv-normalize) | Normalize SA bank CSVs to Xero format for receipt recon | Perfect Water / CoS | **Offline**. No invented amounts. Blanks → rejected.csv. |
| [pw-grv-csv-normalize](#pw-grv-csv-normalize) | Normalize messy GRV / goods-received CSVs to standard schema for inventory ops | Perfect Water / CoS | **Offline**. No invented quantities. Blanks → rejected.csv. |
| [pw-stocktake-csv-normalize](#pw-stocktake-csv-normalize) | Normalize store stocktake CSVs to standard schema for recon | Perfect Water / CoS | **Offline**. No invented quantities. Blanks → rejected.csv. |
| [pw-grv-vs-stocktake-diff](#pw-grv-vs-stocktake-diff) | Compare normalized GRV vs stocktake CSV by Store+SKU for inventory recon | Perfect Water / CoS | **Offline**. No invented quantities. Amounts stay in files. Delta = counted - received. |
| [loyverse-xero-recon](#loyverse-xero-recon) | Reconcile Loyverse POS sales with Xero accounting | Perfect Water / CoS | **No API keys**. Offline CSV only. No invented amounts. |
| [pw-loyverse-daily-sales-digest](#pw-loyverse-daily-sales-digest) | Generate Perfect Water daily sales digest from Loyverse CSV exports | Perfect Water / CoS | **Offline**. No Loyverse API. No invented amounts. Amounts stay in files. |
| [pw-ordered-vs-sold-diff](#pw-ordered-vs-sold-diff) | Compare ordered exports vs sold/Loyverse exports by SKU/Item for CoS | Perfect Water / CoS | **Offline**. No invented quantities. Blanks → rejected. Amounts stay in files. |
| [pw-rejected-csv-digest](#pw-rejected-csv-digest) | Digest rejected.csv files into human review pack WITHOUT pasting quantities/amounts into prose | Perfect Water / CoS | **Offline**. No invented amounts. Amounts stay in files, not prose. Read-only. |
| [pw-bank-rejected-pipeline-pack](#pw-bank-rejected-pipeline-pack) | Offline orchestrator combining pw-bank-csv-normalize and pw-rejected-csv-digest for PW bank reconciliation pipeline | Perfect Water / CoS | **Offline orchestrator**. Never invents amounts. Default ON rejected digest with PR #114 skip flags. PR #116 manifest accuracy. |
| [pw-inventory-recon-pack](#pw-inventory-recon-pack) | Orchestrate PW inventory recon pack (pw-grv-csv-normalize + pw-stocktake-csv-normalize + pw-grv-vs-stocktake-diff + optional pw-rejected-csv-digest) | Perfect Water / CoS | **Offline orchestrator**. Amounts stay in files. PACK.md = index + counts only. H3 gate reminder. Never invents quantities. |
| [pw-grv-stocktake-pipeline-pack](#pw-grv-stocktake-pipeline-pack) | Wire GRV + stocktake normalize → diff → optional inventory-recon into one offline pipeline pack | Perfect Water / CoS | **Offline orchestrator**. Never invents quantities. PR #114 boolean skip flags. PR #116 accurate manifest. H3 gate. |
| [attachment-filename-index](#attachment-filename-index) | Index Drive/mail attachment filenames without opening file bodies | Vault / CoS / Perfect Water | **No file body reads**. Never extracts amounts. Filename classification only. |
| [vault-filename-due-queue](#vault-filename-due-queue) | Extract due date hints from CIPC/SARS/trust filenames without opening bodies | Vault / CoS | **No file body reads**. Never invents dates or legal positions. Heuristic extraction only. |
| [vault-entity-due-pack](#vault-entity-due-pack) | Group filename-due-queue items into per-entity research packs for Vault weekday ops | Vault / CoS | **Filename heuristics only**. No file body reads. Never invents dates/amounts. Entity classification is guidance. |
| [vault-due-digest-pack](#vault-due-digest-pack) | Assemble weekday Vault due digest by orchestrating vault-filename-due-queue and vault-entity-due-pack | Vault / CoS | **Filename heuristics only**. No file body reads. Never invents dates/amounts. Never submits to SARS/CIPC. |
| [vault-due-digest-post-checklist](#vault-due-digest-post-checklist) | Validate vault-due-digest-pack output before Vault weekday ops with go/no-go checklist | Vault / CoS | **Offline only**. Never opens file bodies. Never invents dates/amounts. N2 gate reminder. Exit 1 if checks fail. |
| [vault-due-digest-pipeline-pack](#vault-due-digest-pipeline-pack) | Offline CLI orchestrator combining vault-due-digest-pack with vault-due-digest-post-checklist for Vault weekday operations | Vault / CoS | **Offline orchestrator**. Never opens file bodies. Never submits to SARS/CIPC. Flexible boolean parsing. Accurate manifest when checklist skipped. |
| [budget-merchant-matcher](#budget-merchant-matcher) | Match budget transactions against merchant rules | Ledger / CoS | **Amounts pass-through only**. Never invented. Keep amounts in files, not chat. |
| [ledger-unmatched-merchant-queue](#ledger-unmatched-merchant-queue) | Build research queue for unmatched merchants from budget CSV | Ledger / CoS | **Offline**. No invented amounts. Amounts stay in files, not prose. Research aid only. |
| [ledger-merchant-alias-suggest](#ledger-merchant-alias-suggest) | Suggest merchant→alias mappings from unmatched queue using heuristic token overlap | Ledger / CoS | **Offline**. No invented amounts. Never writes Budget sheet. Heuristic scoring only. |
| [ledger-alias-apply-checklist](#ledger-alias-apply-checklist) | Generate H2-ready apply checklist from ledger-merchant-alias-suggest output before Budget sheet writes | Ledger / CoS | **Offline**. Never writes sheet. Never invents amounts/aliases. Names/patterns only. H2 approval required. |
| [ledger-alias-pipeline-pack](#ledger-alias-pipeline-pack) | Wire suggest → apply-checklist into one offline pipeline pack with PACK.md + manifest.json | Ledger / CoS | **Offline orchestrator**. Never writes Budget. Never invents amounts. Default ON checklist with PR #114 skip flags. |
| [ledger-month-close-pack](#ledger-month-close-pack) | Build offline month-end close pack: CSV inventory, header sanity, APPROVAL checklist | Ledger / CoS | **Offline**. Amounts stay in files, never in digest prose. H2 approval required. |
| [ledger-month-close-pipeline-pack](#ledger-month-close-pipeline-pack) | Assemble month-close pipeline pack from unmatched-queue → alias-suggest → alias-checklist → close-pack | Ledger / CoS | **Offline**. No amounts in PACK.md prose. H2 before sheet writes. Never writes Budget. |
| [suno-package-prep](#suno-package-prep) | Package kid lyrics for manual Suno paste workflow | Studio | **No browser automation**. No Suno API. No auto-send. Manual paste only. |
| [studio-suno-package-validate](#studio-suno-package-validate) | Validate Suno job packages before Studio spends browser time | Studio / BrownieTunez | **Offline only**. Read-only. No Suno/YouTube APIs. Preflight validator. |
| [studio-lyric-package-stub](#studio-lyric-package-stub) | Create stub package folders from lyric text for Studio validation | Studio / BrownieTunez | **Offline only**. Never uploads. Never invents lyrics. Exact copy only. |
| [studio-youtube-preflight-pack](#studio-youtube-preflight-pack) | Offline preflight for YouTube upload approval workflow with Drive link and gate validation | Studio / BrownieTunez | **Offline only**. Never uploads. No YouTube/Suno/Drive APIs. Drive approval link BLOCKING. |
| [studio-brownie-pipeline-pack](#studio-brownie-pipeline-pack) | Offline CLI orchestrator for BrownieTunez pipeline: lyric-package-stub → suno-validate → youtube-preflight | Studio / BrownieTunez | **Offline orchestrator**. Never uploads to YouTube. Never invents lyrics. Kids BrownieTunez only. Default ON stages with skip flags. |
| [family-school-subject-digest](#family-school-subject-digest) | Generate family school/admin digest from email subjects | Family Command Center | **No LLM**. Keyword classification only. DRAFT ONLY. Never sends. |
| [family-school-due-queue](#family-school-due-queue) | Extract due/deadline signals from school email subjects or filename lists | Family Command Center / CoS | **Offline only**. Never opens bodies/attachments. Never invents dates. Heuristic extraction. DRAFT ONLY. |
| [family-morning-digest-pack](#family-morning-digest-pack) | Assemble morning digest pack with clear Kids School / Family separation, optional ICS calendar events and school due queue | Family Command Center / CoS | **Offline**. DRAFT ONLY. Never sends. Clear section separation. No duplicate items. Calendar and due queue pass-through only. |
| [family-digest-post-checklist](#family-digest-post-checklist) | Validate family-morning-digest-pack output before WhatsApp Admin posting with go/no-go checklist | Family Command Center / CoS | **Offline only**. Never sends. Never invents school facts. Pre-WhatsApp validation. Exit 1 if checks fail. |
| [family-morning-digest-pipeline-pack](#family-morning-digest-pipeline-pack) | Offline pipeline pack assembler combining family-morning-digest-pack and family-digest-post-checklist for Family / CoS morning workflow | Family Command Center / CoS | **Offline only**. Never sends. Never invents school facts. Assembles morning pack + post-checklist. Kids School vs Family separation preserved. |
| [family-calendar-ics-digest](#family-calendar-ics-digest) | Parse exported .ics calendar files into numbered digest for date window | Family Command Center / CoS | **Offline only**. Never invents events or times. Pass-through data only. DRAFT ONLY. |
| [browns-inquiry-intake](#browns-inquiry-intake) | Extract structured booking/quote JSON from inquiry text | SA Ops / CoS | **No LLM**. No auto-send. Never invents rates. WhatsApp stays on CoS. |
| [hm-quote-intake](#hm-quote-intake) | Extract structured quote JSON from Heavy Metal WhatsApp inquiry text | SA Ops / Heavy Metal | **No LLM**. No auto-send. Never invents volume/price/location. WhatsApp stays on CoS. |
| [hm-quote-to-pod](#hm-quote-to-pod) | Map quote.json into pod.json stub for hm-delivery-pod-draft field bridge | SA Ops / Heavy Metal | **Offline**. No LLM. Never invents volume/signature/price. Field bridge only. |
| [hm-delivery-pod-draft](#hm-delivery-pod-draft) | Generate DRAFT proof-of-delivery notes from Heavy Metal delivery data | SA Ops / Heavy Metal | **Offline**. No auto-send. Never invents volumes/signatures. JSON or paste text input. |
| [hm-quote-pipeline-pack](#hm-quote-pipeline-pack) | Orchestrate Heavy Metal quote pipeline into one pack for single inquiry | SA Ops / Heavy Metal | **Offline orchestrator**. Never invents volume/price/location/signature. Never sends WhatsApp. H1 gate reminder. |
| [browns-guest-facts-pack](#browns-guest-facts-pack) | Extract structured guest facts from markdown into JSON and snippets | SA Ops / CoS | **Never invents**. Offline only. No fabricated passwords/rates/times. Missing fields flagged. |
| [browns-guest-comms-draft](#browns-guest-comms-draft) | Generate DRAFT guest communications from booking JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents times or rates. Manual approval required. |
| [browns-quote-invoice-draft](#browns-quote-invoice-draft) | Generate DRAFT quote/invoice communications from booking/quote JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Missing amounts = availability-only. |
| [browns-inquiry-quote-pipeline-pack](#browns-inquiry-quote-pipeline-pack) | Orchestrate Browns inquiry → quote draft into one pack for Dullstroom / The Browns | SA Ops / CoS | **Offline orchestrator**. Never invents rates. Never auto-sends. H7 gate reminder. [RATE CARD REQUIRED] flag when amounts missing. |
| [browns-nightsbridge-bookings-adapter](#browns-nightsbridge-bookings-adapter) | Transform Nightsbridge day sheets into bookings.json for daily-ops-brief | SA Ops / CoS | **Offline only**. Never invents data. Flags missing fields. Feed into daily-ops-brief. |
| [browns-daily-ops-brief](#browns-daily-ops-brief) | Generate daily ops team brief from bookings | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Manual team WhatsApp send. |
| [browns-late-checkin-queue](#browns-late-checkin-queue) | Generate late/after-hours check-in queue for CoS coordination | SA Ops / CoS | **DRAFT ONLY**. Never invents times/phones. Offline only. Manual CoS WhatsApp send. |
| [browns-booking-change-check](#browns-booking-change-check) | Diff two booking snapshots and report changes for last-minute CT-pack verification | SA Ops / CoS | **Offline only**. Never invents data. DRAFT ONLY. No auto-send. Pre-post checklist. |
| [browns-ota-rate-worksheet](#browns-ota-rate-worksheet) | Generate OTA rate worksheets for Nightsbridge entry | SA Ops / CoS | **No API**. Never invents rates. Blanks stay blank. Grant approval required. |
| [browns-ct-pack-assemble](#browns-ct-pack-assemble) | Assemble CoS Browns CT (Centurion Township) timed packs from sibling tool outputs | SA Ops / CoS | **Offline orchestrator**. Calls sibling tools via npm run. Never auto-send. Draft-only. |
| [browns-ct-pack-post-checklist](#browns-ct-pack-post-checklist) | Pre-WhatsApp post checklist from browns-ct-pack-assemble output folder before 20:00 / 09:00 / 21:00 CT Admin posts | SA Ops / CoS | **Offline only**. Read-only pack validation. Never invents guest phones/rates/ETAs. CoS owns WhatsApp. Exit 1 if checks fail. |
| [browns-ct-pack-pipeline-pack](#browns-ct-pack-pipeline-pack) | Orchestrate Browns CT pack pipeline: booking-change-check → ct-pack-assemble → optional ct-pack-post-checklist | SA Ops / CoS | **Offline orchestrator**. Never auto-sends. Flexible boolean parsing. Accurate manifest when checklist skipped. DRAFT ONLY. |
| [browns-welcome-draft-pack](#browns-welcome-draft-pack) | Generate same-day/upcoming welcome message stubs for CoS WhatsApp Admin from bookings | SA Ops / CoS | **Offline only**. Never invents guest phone or amounts. Placeholders when unknown. DRAFT ONLY. |
| [sa-texas-morning-exception-pack](#sa-texas-morning-exception-pack) | Assemble SA Ops Texas-morning exception digest for Heavy Metal + hospitality / The Browns | SA Ops / CoS | **DRAFT ONLY**. CoS owns WhatsApp. Never invents rates/volumes/guest facts. Perfect Water excluded. |
| [sa-texas-exception-post-checklist](#sa-texas-exception-post-checklist) | Pre-WhatsApp post checklist from sa-texas-morning-exception-pack output folder | SA Ops / CoS | **Offline only**. Read-only pack validation. Never invents rates/volumes/guest facts. CoS owns WhatsApp. |
| [sa-texas-exception-pipeline-pack](#sa-texas-exception-pipeline-pack) | Offline CLI pipeline pack assembler combining sa-texas-morning-exception-pack and sa-texas-exception-post-checklist for SA Ops / CoS weekday Texas-morning workflow | SA Ops / CoS | **Offline orchestrator**. Never auto-sends. Flexible boolean parsing. Accurate manifest when checklist skipped (PR #116). DRAFT ONLY. |
| [career-jd-hard-gates-score](#career-jd-hard-gates-score) | Score job descriptions against career hard gates for apply decisions | Career / CoS | **Offline only**. Never invents comp. Facts-only reminder. Career bot owns apply. |
| [career-cover-letter-facts-lint](#career-cover-letter-facts-lint) | Lint cover letter drafts against allowed facts to prevent invented claims | Career / CoS | **Offline only**. Never invents comp/titles/employers. Facts-only reminder. Career bot owns apply. |
| [career-application-packet-assemble](#career-application-packet-assemble) | Assemble dated application packet with score, lint, facts, and APPROVAL checklist | Career / CoS | **Offline orchestrator**. Calls sibling tools or accepts prebuilt reports. Never auto-apply. Score ≥8 floor. |
| [career-hunt-run-log](#career-hunt-run-log) | Append career hunt runs into durable offline log for live-improve tracking | Career / CoS | **Offline only**. Append-only (never rewrites prior lines). Never invents scores or employers. Career bot owns apply. |
| [career-live-improve-digest](#career-live-improve-digest) | Generate live-improve digest from career-hunt-run-log output for Career learning.md | Career / CoS | **Offline only**. Never invents scores/employers. Career bot owns apply. Never auto-updates learning.md. |
| [career-weekday-improve-pack](#career-weekday-improve-pack) | Orchestrate career-hunt-run-log outputs into career-live-improve-digest results for folding into learning.md | Career / CoS | **Offline only**. Never invents scores/employers. Career bot owns apply. Never auto-updates learning.md. |
| [career-weekday-improve-pipeline-pack](#career-weekday-improve-pipeline-pack) | Offline CLI pipeline pack assembler combining career tools for Career weekday improve workflow | Career / CoS | **Offline only**. Never invents scores/employers/compensation. Career owns apply + learning.md fold-in. Hard gates unchanged. Flexible boolean flags. |
| [tools-catalog-doctor](#tools-catalog-doctor) | Validate tools/README.md catalog integrity: check index completeness, detect duplicates | CoS / Repository | **Read-only**. CI-style checks. Never modifies catalog. Structural validation only. |
| [drive-pdf-upload-prep](#drive-pdf-upload-prep) | Prepare PDFs for Google Drive MCP upload with auto-compression for large files | Perfect Water / CoS / Hospitality | **Offline only**. No Drive API. Never invents data. Compression is lossy (greyscale). |
| [drive-create-file-validate](#drive-create-file-validate) | Validate Drive create_file JSON payloads before MCP upload | Perfect Water / CoS / Hospitality / Coding | **Offline only**. No Drive API. Preflight validator. CI-friendly exit codes. |
| [pw-invoice-docno-index](#pw-invoice-docno-index) | Index Perfect Water / CoS invoice Doc Nos from filenames to prevent duplicate uploads | Perfect Water / CoS | **Offline only**. Basename-only. Never opens PDFs. No invented Doc Nos. |

---

## csv-fixture-harness

**One-line:** Validate CSV fixtures for data quality: check headers, required columns, row counts, blank cells, and currency violations.

**Owning desk(s):** Perfect Water / Ledger / Browns / Vault

**Location:** `tools/csv-fixture-harness/`

### Install and Run

```bash
cd tools/csv-fixture-harness
npm install
npm run build

# Basic validation
npm run check -- --csv data.csv

# Check required headers
npm run check -- --csv data.csv --require-headers Date,Amount

# Check for currency violations
npm run check -- --csv data.csv --forbid-currency-in Notes,Description

# Multiple checks combined
npm run check -- \
  --csv data.csv \
  --require-headers Date,Amount,Merchant \
  --forbid-currency-in Notes \
  --min-rows 10 \
  --outdir reports/
```

### Critical Safety Note

- ✅ **Read-only** - Never modifies input files
- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented amounts** - Only validates existing data
- ✅ **Currency detection** - Flags $, R, ZAR, USD tokens in forbidden columns
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ⚠️ **Helps catch bot errors** - Detects when amounts leak into notes fields

[→ Full README](./csv-fixture-harness/README.md)

---

## pw-bank-csv-normalize

**One-line:** Normalize SA bank statement CSVs into Xero-shaped format for Perfect Water receipt reconciliation.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-bank-csv-normalize/`

### Install and Run

```bash
cd tools/pw-bank-csv-normalize
npm install
npm run build

# Auto-detect format
npm run normalize -- --input bank-statement.csv --outdir out/

# Specific bank profile
npm run normalize -- --input fnb-export.csv --outdir out/ --profile fnb

# Xero import format (with Payee)
npm run normalize -- --input xero-import.csv --outdir out/ --profile xero-import
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented amounts** - Blank/unparseable → rejected.csv
- ✅ **No invented references** - Missing reference → rejected.csv (unless fallback possible)
- ✅ **Read-only** - No write-back to bank systems
- ✅ **File-based** - All amounts stay in files

### Integration with loyverse-xero-recon

This tool normalizes bank CSVs into the format that `loyverse-xero-recon` receipt mode expects:

```bash
# Step 1: Normalize bank CSV
cd tools/pw-bank-csv-normalize
npm run normalize -- --input bank-jan.csv --outdir normalized/

# Step 2: Feed into receipt recon
cd ../loyverse-xero-recon
npm run recon -- --mode receipt \
  --loyverse exports/loyverse-jan.csv \
  --xero ../pw-bank-csv-normalize/normalized/xero-bank-normalized.csv \
  --output recon-reports/
```

**Supported profiles:** auto (default), fnb, standard, absa, nedbank, payfast, yoco, generic, xero-import

**Output:** `xero-bank-normalized.csv` with headers exactly: `Date,Reference,Amount,Description`

[→ Full README](./pw-bank-csv-normalize/README.md)

---

## pw-grv-csv-normalize

**One-line:** Normalize messy GRV (goods-received voucher) CSVs into standard schema for Perfect Water / CoS inventory operations.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-grv-csv-normalize/`

### Install and Run

```bash
cd tools/pw-grv-csv-normalize
npm install
npm run build

# Auto-detect format
npm run normalize -- --in grv.csv --outdir out/

# Specific profile
npm run normalize -- --in loyverse-export.csv --outdir out/ --profile loyverse

# Custom column names
npm run normalize -- --in grv.csv --outdir out/ \
  --store-col "Location" \
  --item-col "Product" \
  --qty-col "Qty Received"
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - Blank/unparseable → rejected.csv
- ✅ **No invented references** - Missing supplier/docno → blank field (not rejected)
- ✅ **Read-only** - No write-back to Loyverse or source systems
- ✅ **File-based** - All quantities stay in files

### Standard Schema

Outputs `grv-normalized.csv` with headers exactly: `Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes`

Required fields (must be present and non-blank):
- **Store** - Store/location name
- **SKU/Item** - SKU or item name
- **ReceivedQty** - Received quantity (must be parseable number)
- **Unit** - Unit of measure

Optional fields:
- **ReceivedAt** - Date received (YYYY-MM-DD or original format)
- **Supplier** - Supplier name
- **DocNo** - Document/GRV/invoice number
- **Notes** - Additional notes from unmapped columns

**Supported profiles:** auto (default), generic, loyverse

**Output files:** `grv-normalized.csv`, `rejected.csv`, `missing-fields.md`, `APPROVAL.md`, `manifest.json`, `report.md` (row counts only)

**Use cases:**
- Supplier invoice reconciliation - Match received quantities to invoiced quantities
- Stock-on-hand verification - Compare GRV data to stocktake results
- Cost-of-sales tracking - Track goods received by store and supplier
- Data quality auditing - Identify missing or unparseable GRV data

[→ Full README](./pw-grv-csv-normalize/README.md)

---

## pw-stocktake-csv-normalize

**One-line:** Normalize store stocktake CSVs into a standard schema for Perfect Water / CoS reconciliation.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-stocktake-csv-normalize/`

### Install and Run

```bash
cd tools/pw-stocktake-csv-normalize
npm install
npm run build

# Auto-detect format
npm run normalize -- --input stocktake.csv --outdir out/

# Specific profile
npm run normalize -- --input loyverse-export.csv --outdir out/ --profile loyverse

# Generic stocktake
npm run normalize -- --input manual-count.csv --outdir out/ --profile generic
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - Blank/unparseable → rejected.csv
- ✅ **Read-only** - No write-back to Loyverse or inventory systems
- ✅ **File-based** - All quantities stay in files
- ⚠️ **Never invents items or stores** - Missing SKU/Item or Store → rejected.csv

### Standard Schema

Outputs `stocktake-normalized.csv` with headers:

- **Store** - Store/location name (required)
- **SKU/Item** - SKU or item name (required)
- **CountedQty** - Counted quantity (required, must be parseable number)
- **Unit** - Unit of measure (required)
- **CountedAt** - Date counted (optional, YYYY-MM-DD)
- **Notes** - Additional notes (optional)

**Supported profiles:** auto (default), generic, loyverse

**Output files:** `stocktake-normalized.csv`, `rejected.csv`, `missing-fields.md`, `APPROVAL.md`, `manifest.json`, `report.md` (row counts only)

[→ Full README](./pw-stocktake-csv-normalize/README.md)

---

## pw-grv-vs-stocktake-diff

**One-line:** Compare normalized GRV (goods-received) CSV against normalized stocktake CSV by Store + SKU/Item for Perfect Water / CoS inventory reconciliation.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-grv-vs-stocktake-diff/`

### Install and Run

```bash
cd tools/pw-grv-vs-stocktake-diff
npm install
npm run build

# Basic usage with pre-normalized CSVs
npm run diff -- --grv grv-normalized.csv --stocktake stocktake-normalized.csv --outdir out/

# Orchestrator mode (run sibling tools first)
npm run diff -- \
  --run-grv-normalize --grv-raw raw-grv.csv \
  --run-stocktake-normalize --stock-raw raw-stocktake.csv \
  --outdir out/

# Custom column names
npm run diff -- \
  --grv grv.csv \
  --stocktake stock.csv \
  --outdir out/ \
  --store-col "Location" \
  --key-col "Product"
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **File-based** - All amounts stay in files
- ✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md
- ✅ **Exit 1 on bad input** - Malformed CSVs caught early
- ✅ **Orchestrator support** - Can shell out to sibling normalizer tools via npm run
- ⚠️ **Amounts stay in files** - Bots must not paste quantities into chat
- ⚠️ **Perfect Water owns ops** - PW owns all inventory adjustment decisions

### Comparison Logic

Compares by **Store|SKU/Item** key:
- **Delta = Counted - Received**
- Positive delta → More counted than received (possible GRV undercount or stocktake overcount)
- Negative delta → Less counted than received (possible shrinkage or stocktake error)
- Missing in stocktake → Received but not counted
- Missing in GRV → Counted but no GRV record

### Output Files

- `diff.json` - Structured diff data (Store, Item, Received, Counted, Delta, Unit)
- `diff.md` - Human-readable diff table sorted by absolute delta
- `missing-keys.md` - Items missing in one side or rejected rows
- `APPROVAL.md` - Safety gates and approval workflow (H3 gate)
- `manifest.json` - Run metadata

### Use Cases

1. **Monthly inventory reconciliation** - Compare month's GRV vs month-end stocktake
2. **Shrinkage detection** - Identify items with negative deltas
3. **Stocktake error detection** - Large deltas may indicate counting mistakes
4. **GRV discrepancy investigation** - Items counted but no GRV → unrecorded receipts?
5. **Cost-of-sales verification** - Validate stock movements match receipts

### Integration with Sibling Tools

Preferred inputs from:
- `pw-grv-csv-normalize` → `grv-normalized.csv`
- `pw-stocktake-csv-normalize` → `stocktake-normalized.csv`

Or use orchestrator flags to run normalizers first:
```bash
npm run diff -- \
  --run-grv-normalize --grv-raw loyverse-grv.csv \
  --run-stocktake-normalize --stock-raw loyverse-stocktake.csv \
  --outdir out/
```

[→ Full README](./pw-grv-vs-stocktake-diff/README.md)

---

## loyverse-xero-recon

**One-line:** Reconcile Loyverse POS sales data with Xero accounting records, identifying gaps and mismatches.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/loyverse-xero-recon/`

### Install and Run

```bash
cd tools/loyverse-xero-recon
npm install
npm run build

# Receipt mode (individual transactions)
npm run recon -- --mode receipt \
  --loyverse exports/loyverse-jan.csv \
  --xero exports/xero-jan.csv \
  --output reports/

# Summary mode (monthly aggregates)
npm run recon:summary -- \
  --loyverse exports/summaries/ \
  --xero exports/p-and-l/ \
  --output reports/
```

### Critical Safety Note

- ✅ **No API keys or OAuth** - CSV exports only
- ✅ **Offline only** - No live connections
- ✅ **No invented amounts** - Reports only what exists in source CSVs
- ✅ **Read-only** - No write-back to Loyverse or Xero

[→ Full README](./loyverse-xero-recon/README.md)

---

## pw-loyverse-daily-sales-digest

**One-line:** Generate Perfect Water daily sales digest from Loyverse CSV exports for ops review.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-loyverse-daily-sales-digest/`

### Install and Run

```bash
cd tools/pw-loyverse-daily-sales-digest
npm install
npm run build

# Basic usage
npm run digest -- --csv loyverse-day.csv --outdir out/

# Custom column names
npm run digest -- \
  --csv exports/sales.csv \
  --outdir reports/ \
  --store-col "Location" \
  --item-col "Product" \
  --qty-col "Qty" \
  --amount-col "Total"
```

### Critical Safety Note

- ✅ **Offline only** - No Loyverse API
- ✅ **No invented amounts** - Pass-through from CSV only
- ✅ **Read-only** - Never modifies source CSV
- ✅ **File-based** - All amounts stay in files
- ⚠️ **Amounts stay in files** - Remind bots not to paste amounts into chat
- ⚠️ **PW owns ops decisions** - Perfect Water owns all pricing/sales actions

### Output Files

- `digest.json` - Structured rollup data (stores, items, totals)
- `digest.md` - Human-readable digest with store/item breakdowns
- `missing-fields.md` - Data quality report
- `APPROVAL.md` - Safety gates and ownership
- `manifest.json` - Run metadata

[→ Full README](./pw-loyverse-daily-sales-digest/README.md)

---

## pw-ordered-vs-sold-diff

**One-line:** Compare ordered exports vs sold/Loyverse exports by SKU/Item (+ optional Store) for Perfect Water / CoS cost-of-sales reconciliation.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-ordered-vs-sold-diff/`

### Install and Run

```bash
cd tools/pw-ordered-vs-sold-diff
npm install
npm run build

# Basic usage (no Store)
npm run diff -- --ordered ordered.csv --sold sold.csv --outdir out/

# With Store column for per-store comparison
npm run diff -- \
  --ordered ordered.csv \
  --sold sold.csv \
  --outdir out/ \
  --store-col Store

# Custom column names
npm run diff -- \
  --ordered ordered.csv \
  --sold sold.csv \
  --outdir out/ \
  --key-col "Product" \
  --qty-col "Qty"
```

### Critical Safety Note

- ✅ **Offline only** - No Loyverse API or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **File-based** - All amounts stay in files
- ✅ **Blank/unparseable qty → rejected** - Invalid rows reported in missing-keys.md
- ✅ **Exit 1 on bad input** - Malformed CSVs caught early
- ⚠️ **Helps catch CoS discrepancies** - Flags items ordered but not sold, or sold but not ordered
- ⚠️ **Amounts stay in files** - Bots must not paste quantities into chat

### Output Files

- `diff.json` - Structured diff data (machine-readable)
- `diff.md` - Human-readable diff with ordered/sold/delta
- `missing-keys.md` - Items present in one CSV but not the other, plus rejected rows
- `APPROVAL.md` - Safety gates and approval workflow
- `manifest.json` - Run metadata

### Use Case

Perfect Water maintains ordered-vs-sold comparisons on Drive. This tool provides offline CSV diff: ordered export vs sold/Loyverse export by SKU/Item (+ optional Store). Useful for:

- Cost-of-sales reconciliation
- Stock discrepancy investigation
- Detecting unrecorded orders
- Identifying unsold stock

[→ Full README](./pw-ordered-vs-sold-diff/README.md)

---

## pw-rejected-csv-digest

**One-line:** Digest rejected.csv files into human review pack WITHOUT pasting quantities/amounts into prose.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-rejected-csv-digest/`

### Install and Run

```bash
cd tools/pw-rejected-csv-digest
npm install
npm run build

# Single file
npm run digest -- --csv rejected.csv --outdir out/

# Multiple files with custom labels
npm run digest -- \
  --csv grv-rejected.csv --label "GRV August" \
  --csv stocktake-rejected.csv --label "Stocktake LT" \
  --outdir out/

# Directory scan (all rejected*.csv files)
npm run digest -- --dir exports/ --outdir out/

# Required headers check
npm run digest -- --csv rejected.csv --outdir out/ \
  --require-headers "Store,SKU,ReceivedQty,Unit"
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Amounts stay in files** - NEVER pasted into DIGEST.md prose
- ✅ **Read-only** - Does not modify source CSVs
- ✅ **File-based** - All quantities stay in files
- ✅ **Exit 1 on bad input** - Unreadable or empty CSVs rejected
- ⚠️ **Perfect Water owns ops decisions** - No auto-upload or inventory system writes
- ⚠️ **Bots must not paste amounts** - When referencing this digest, refer to files only

### Output Files

- `DIGEST.md` - Numbered findings with row counts and reason buckets (no amounts in prose)
- `reasons.json` - Machine-readable reason → count + sample indices
- `missing-headers.md` - Files with unexpected/empty headers
- `APPROVAL.md` - Safety checklist
- `manifest.json` - Run metadata

### Use Case

Digest one or more `rejected.csv` files produced by sibling normalizers (pw-grv-csv-normalize, pw-stocktake-csv-normalize, pw-bank-csv-normalize, pw-ordered-vs-sold-diff, etc.) into a structured human review pack. Classifies rejection reasons heuristically from common columns (RejectionReason, Error, Notes) or from blank required fields. Perfect Water / CoS can review multi-file rejection patterns without hunting through individual CSVs.

[→ Full README](./pw-rejected-csv-digest/README.md)

---

## pw-bank-rejected-pipeline-pack

**One-line:** Offline CLI orchestrator combining pw-bank-csv-normalize and pw-rejected-csv-digest for Perfect Water bank reconciliation pipeline.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-bank-rejected-pipeline-pack/`

### Install and Run

```bash
cd tools/pw-bank-rejected-pipeline-pack
npm install
npm run build

# Mode A: Raw bank CSV with normalization
npm run pack -- --bank-csv bank.csv --run-normalize --outdir pack-out/

# Mode B: Prebuilt normalized output (default: with rejected digest)
npm run pack -- --normalized-outdir normalized/ --outdir pack-out/

# Mode B: Skip rejected digest (PR #114 boolean flags)
npm run pack -- --normalized-outdir normalized/ --no-run-rejected-digest --outdir pack-out/
npm run pack -- --normalized-outdir normalized/ --run-rejected-digest=false --outdir pack-out/
```

### Critical Safety Note

- ✅ **Offline only** - No bank login, no network calls, no payments
- ✅ **Never invents amounts** - All rands from source bank CSV only
- ✅ **Read-only** - Never writes back to bank systems
- ✅ **File-based** - Figures stay in files/sheet, not chat
- ✅ **Default ON rejected digest** - With PR #114 boolean skip flags
- ✅ **PR #116 manifest accuracy** - Only lists files actually present
- ⚠️ **Perfect Water owns ops** - Draft digests only, PW makes final decisions
- ⚠️ **H3 gate** - Bank reconciliation decisions require approval per approval-gates.md

### Output Files

- `PACK.md` - Index with normalized/rejected counts only (NO amount tables in prose)
- `APPROVAL.md` - H3-style gate reminder, PW ownership, offline-only constraint
- `manifest.json` - Run metadata (PR #116: only lists present files)
- Copies: `xero-bank-normalized.csv`, `rejected.csv`, `missing-fields.md`, `report.md`
- Optional: `DIGEST-DIGEST.md`, `DIGEST-reasons.json`, `DIGEST-missing-headers.md`, `DIGEST-APPROVAL.md` (if rejected digest run)

### Use Case

Wire bank CSV normalize → rejected-csv digest into one offline pipeline pack (same pattern as pw-inventory-recon-pack). Cash integrity is current Perfect Water priority. Accepts bank CSV with normalization, OR existing normalized bank outdir. Optionally runs pw-bank-csv-normalize. Runs pw-rejected-csv-digest on rejected inputs (default ON, PR #114 boolean skip). One outdir with PACK.md + manifest.json accurate to present files (PR #116). Never invents amounts. Never pays. Figures stay in files, not chat.

[→ Full README](./pw-bank-rejected-pipeline-pack/README.md)

---

## pw-inventory-recon-pack

**One-line:** Offline orchestrator for Perfect Water inventory recon pack assembly (pw-grv-csv-normalize + pw-stocktake-csv-normalize + pw-grv-vs-stocktake-diff + optional pw-rejected-csv-digest).

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-inventory-recon-pack/`

### Install and Run

```bash
cd tools/pw-inventory-recon-pack
npm install
npm run build

# Mode A: Prebuilt diff outputs
npm run pack -- --diff-outdir ../pw-grv-vs-stocktake-diff/out --outdir pack-out/

# Mode B: Prebuilt normalized CSVs
npm run pack -- \
  --grv grv-normalized.csv \
  --stocktake stocktake-normalized.csv \
  --outdir pack-out/

# Mode C: Raw CSVs with full orchestration
npm run pack -- \
  --grv-raw raw-grv.csv \
  --stock-raw raw-stocktake.csv \
  --run-normalize \
  --run-rejected-digest \
  --outdir pack-out/
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented quantities** - All amounts from source CSVs only
- ✅ **Read-only** - Never modifies source CSV files or inventory systems
- ✅ **File-based** - All amounts stay in files
- ✅ **PACK.md = counts only** - Index with row/key counts, no quantity/amount tables in prose
- ✅ **Exit 1 on bad input** - Missing inputs or sibling tool failures caught early
- ⚠️ **Perfect Water owns ops** - PW owns all inventory decisions
- ⚠️ **H3 gate** - Inventory decisions require approval per approval-gates.md

### Output Files

- `PACK.md` - Index with row/key counts only (NO quantity/amount tables in prose)
- `APPROVAL.md` - H3-style gate reminder, PW ownership, offline-only constraint
- `manifest.json` - Run metadata
- Copies/pointers: `diff.md`, `diff.json`, `missing-keys.md`, `DIGEST.md` (if rejected digest run)

### Use Case

Assemble a complete Perfect Water inventory reconciliation pack by orchestrating sibling tools and bundling outputs into one deliverable. Supports three input modes: prebuilt diff outputs, prebuilt normalized CSVs, or raw CSVs with normalization. Optionally runs pw-rejected-csv-digest on rejected.csv outputs. Amounts and quantities stay in files, never in PACK.md prose.

[→ Full README](./pw-inventory-recon-pack/README.md)

---

## attachment-filename-index

**One-line:** Index attachment and Drive filenames into structured checklists without opening file bodies.

**Owning desk(s):** Vault / CoS / Perfect Water

**Location:** `tools/attachment-filename-index/`

### Install and Run

```bash
cd tools/attachment-filename-index
npm install
npm run build

# Directory scan mode
npm run index -- --dir /vault/documents --output reports/

# Filename list mode
npm run index -- --files exported-filenames.txt --output reports/

# With mail subject matching
npm run index -- \
  --files filenames.txt \
  --subjects mail-subjects.csv \
  --output reports/
```

### Critical Safety Note

- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **No Drive/Gmail API** - Offline only
- ✅ **No amounts** - Never extracts or invents monetary values
- ✅ **Read-only** - Does not move, rename, or modify files
- ⚠️ **Sensitive files:** Family medical, tax-emigration, will files are filename-only; bodies never enter indexing

[→ Full README](./attachment-filename-index/README.md)

---

## vault-filename-due-queue

**One-line:** Extract due date and category hints from CIPC/SARS/trust filenames without opening file bodies.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-filename-due-queue/`

### Install and Run

```bash
cd tools/vault-filename-due-queue
npm install
npm run build

# Filename list mode
npm run queue -- --files filenames.txt --outdir out/

# Directory scan mode
npm run queue -- --dir /vault/documents --outdir reports/
```

### Critical Safety Note

- ✅ **No file body reads** - Only processes basenames/filenames
- ✅ **Offline only** - No APIs or network calls
- ✅ **No invented dates** - Date tokens extracted from filenames only
- ✅ **No invented amounts** - Never handles monetary values
- ✅ **No legal positions** - Category hints are heuristic, not advice
- ⚠️ **Vault owns next actions** - All CIPC/SARS filings require human approval (N2 gate)

### Document Categories

21 categories: CIPC (annual-return, change-form, certificate), SARS (annual-tax-return, provisional-tax, vat-return, emp-return, correspondence), BEE (affidavit, certificate), Trust (distribution, resolution, compliance), Property (rates, levies), plus insurance-renewal, forex-application, bank-statement, attorney-letter, other-compliance, unknown.

### Output Files

- `queue.json` - Structured queue data with categories, dates, confidence
- `queue.md` - Numbered list (priority queue with dates, research queue without)
- `missing-signals.md` - Files without category or date hints
- `APPROVAL.md` - Safety gates and Vault ownership notice
- `manifest.json` - Run metadata

[→ Full README](./vault-filename-due-queue/README.md)

---

## vault-entity-due-pack

**One-line:** Group filename-due-queue items (or raw filename lists) into per-entity research packs for Vault weekday ops.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-entity-due-pack/`

### Install and Run

```bash
cd tools/vault-entity-due-pack
npm install
npm run build

# Queue JSON mode (preferred)
npm run pack -- --queue ../vault-filename-due-queue/out/queue.json --outdir out/

# Filename list mode
npm run pack -- --filenames filenames.txt --outdir out/

# With custom entity mappings
npm run pack -- --queue queue.json --entities entities.json --outdir out/
```

### Critical Safety Note

- ✅ **Filename heuristics only** - No file bodies opened
- ✅ **No invented dates** - Date tokens from source queue only
- ✅ **No invented amounts** - Never handles monetary values
- ✅ **No legal positions** - Entity classification is heuristic guidance only
- ⚠️ **Vault owns research** - All CIPC/SARS filings require human approval (N2 gate)
- ⚠️ **Never post figures in chat** - Amounts stay in files, never in prose

### Default Entity Heuristics

7 entities: gab-trust (GAB, Trust), b-group (BVR, Holdings), cipc, sars (Tax), plimmer, charisse, unknown.

### Output Structure

- `by-entity/<slug>/pack.md` - Entity-specific research pack with numbered items
- `by-entity/<slug>/items.json` - Structured item data
- `master.md` - Overview with counts per entity
- `unknown.md` - Unmatched basenames
- `APPROVAL.md` - H-gate safety rules and Vault ownership
- `manifest.json` - Run metadata

### Integration with vault-filename-due-queue

```bash
# Step 1: Generate due queue from filenames
cd tools/vault-filename-due-queue
npm run queue -- --files vault-filenames.txt --outdir due-queue/

# Step 2: Group by entity
cd ../vault-entity-due-pack
npm run pack -- --queue ../vault-filename-due-queue/due-queue/queue.json --outdir entity-packs/
```

[→ Full README](./vault-entity-due-pack/README.md)

---

## vault-due-digest-pack

**One-line:** Assemble weekday Vault due digest by orchestrating vault-filename-due-queue and vault-entity-due-pack.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-due-digest-pack/`

### Install and Run

```bash
cd tools/vault-due-digest-pack
npm install
npm run build

# Full orchestration: runs both sibling tools
npm run digest -- --filenames filenames.txt --outdir out/

# Use existing queue.json
npm run digest -- --queue queue.json --outdir out/

# Use existing entity packs
npm run digest -- --packs by-entity/ --outdir out/
```

### Critical Safety Note

- ✅ **Filename heuristics only** - No file bodies opened
- ✅ **No invented dates/amounts** - Pass-through from sibling tools only
- ✅ **Never submits to SARS/CIPC** - Vault owns all research and next actions
- ⚠️ **N2 approval gate** - All compliance filings require human approval
- ⚠️ **Never post figures in chat** - Amounts stay in files, never in prose

### Output Structure

- `DIGEST.md` - Master overview with numbered entity summaries
- `by-entity/<slug>/pack.md` - Entity-specific research packs
- `by-entity/<slug>/items.json` - Structured item data
- `missing-signals.md` - Items without due dates or entity matches
- `APPROVAL.md` - H-gate safety rules and Vault ownership
- `manifest.json` - Run metadata

### Integration Pattern

```bash
# One-step digest generation (recommended)
cd tools/vault-due-digest-pack
npm run digest -- --filenames vault-filenames.txt --outdir weekday-digest/

# Manual multi-step workflow
cd tools/vault-filename-due-queue
npm run queue -- --files filenames.txt --outdir queue/
cd ../vault-entity-due-pack
npm run pack -- --queue ../vault-filename-due-queue/queue/queue.json --outdir packs/
cd ../vault-due-digest-pack
npm run digest -- --packs ../vault-entity-due-pack/packs/by-entity/ --outdir digest/
```

[→ Full README](./vault-due-digest-pack/README.md)

---

## vault-due-digest-post-checklist

**One-line:** Offline CLI to generate pre-action checklist from vault-due-digest-pack output before CIPC/SARS/trust research or filing steps.

**Owning desk(s):** Vault / CoS

**Location:** `tools/vault-due-digest-post-checklist/`

### Install and Run

```bash
cd tools/vault-due-digest-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./digest-pack-2026-09-02

# With date label and output directory
npm run checklist -- --pack ./digest-pack-2026-09-02 --as-of 2026-09-02 --outdir reports/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No file body reads, no network calls
- ✅ **Read-only** - Validates pack structure only (filename/markdown heuristics)
- ✅ **Never invents** - No dates, amounts, or legal positions fabricated
- ✅ **Never submits** - Vault owns all CIPC/SARS/trust filings (N2 gate)
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ⚠️ **N2 gate reminder** - Human approval required before SARS/CIPC submit

### Checks Performed

1. Required overview (DIGEST.md or master.md) present
2. APPROVAL.md present with relevant keywords
3. by-entity/ directory exists (warns if missing)
4. DIGEST/master does NOT contain currency tokens (amounts must stay in files)
5. N2 gate reminder: human approval before any statutory filing

### Output Files

- **ACTION-CHECKLIST.md** - Numbered go/no-go for Vault weekday ops
- **ISSUES.md** - Failures and warnings only
- **APPROVAL.md** - Vault research gates and N2 reminder
- **manifest.json** - Machine-readable metadata

### Integration with vault-due-digest-pack

This tool validates the output from `vault-due-digest-pack` before research:

```bash
# Step 1: Generate due digest pack
cd tools/vault-due-digest-pack
npm run pack -- --filenames vault-filenames.txt --run-filename-queue --run-entity-pack --outdir digest/

# Step 2: Validate pack before research
cd ../vault-due-digest-post-checklist
npm run checklist -- --pack ../vault-due-digest-pack/digest/ --outdir checklist/

# Step 3: Review ACTION-CHECKLIST.md and ISSUES.md
# Step 4: Vault proceeds with research (never auto-submits)
```

[→ Full README](./vault-due-digest-post-checklist/README.md)

---

## budget-merchant-matcher

**One-line:** Match budget transaction exports against known merchant rules to identify unclassified merchants.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/budget-merchant-matcher/`

### Install and Run

```bash
cd tools/budget-merchant-matcher
npm install
npm run build

npm run match -- \
  --transactions exports/jan-2024.csv \
  --rules merchant-rules.csv \
  --output reports/
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Amounts pass-through only** - Never invented or modified from source CSV
- ✅ **Read-only** - Analysis tool only, no payments
- ⚠️ **Keep amounts in report files** - Bots must not paste amounts into chat
- ⚠️ **For ledger maintenance only** - Not for financial advice or decision-making

[→ Full README](./budget-merchant-matcher/README.md)

---

## ledger-unmatched-merchant-queue

**One-line:** Build an offline research queue for unmatched merchants from budget CSV exports.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-unmatched-merchant-queue/`

### Install and Run

```bash
cd tools/ledger-unmatched-merchant-queue
npm install
npm run build

# Basic usage
npm run queue -- --input transactions.csv --outdir out/

# With status column
npm run queue -- \
  --input transactions.csv \
  --outdir out/ \
  --status-col MatchStatus \
  --unmatched-values "unmatched,unknown"

# Custom merchant column and limit
npm run queue -- \
  --input transactions.csv \
  --outdir out/ \
  --merchant-col Payee \
  --limit 50
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **No invented amounts or merchant identities** - Only processes existing data
- ✅ **Amounts stay in files** - Not printed in digest prose (refer to queue.json)
- ⚠️ **Research aid only** - Ledger owns manual Google Sheet updates
- ⚠️ **H2 approval required** - Before any sheet writes or merchant rule changes

### Output Files

- `queue.json` - Structured merchant data with sample row references, counts, date ranges
- `queue.md` - Human-readable numbered research list (merchant name + count only, NO amounts)
- `missing-fields.md` - Data quality report
- `APPROVAL.md` - Safety gates and workflow guidance
- `manifest.json` - Run metadata and statistics

### Integration with budget-merchant-matcher

1. Export budget transactions to CSV
2. Run `budget-merchant-matcher` to apply known rules
3. Run `ledger-unmatched-merchant-queue` on matcher output to research remaining unknowns
4. Update merchant rules based on research findings
5. Re-run matcher with updated rules

[→ Full README](./ledger-unmatched-merchant-queue/README.md)

---

## ledger-merchant-alias-suggest

**One-line:** Suggest merchant→alias mappings from unmatched merchant queue against known aliases file using heuristic token overlap (Jaccard similarity).

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-merchant-alias-suggest/`

### Install and Run

```bash
cd tools/ledger-merchant-alias-suggest
npm install
npm run build

# From unmatched queue JSON
npm run suggest -- \
  --unmatched path/to/queue.json \
  --aliases known-aliases.json \
  --outdir out/

# From plain text merchant list
npm run suggest -- \
  --merchants merchants.txt \
  --aliases known-aliases.json \
  --outdir out/

# Custom minimum score
npm run suggest -- \
  --unmatched queue.json \
  --aliases aliases.json \
  --min-score 0.5 \
  --outdir out/
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **Heuristic scoring only** - Token overlap (Jaccard similarity), not AI/LLM
- ✅ **No invented amounts** - Tool never handles transaction amounts
- ✅ **No auto-apply** - Never writes to live Budget sheet
- ⚠️ **Research aid only** - Human review required for every suggestion
- ⚠️ **H2 approval required** - Before any Google Sheet writes or alias rule changes

### Scoring Algorithm

Uses Jaccard similarity: tokenize merchant name and alias pattern (normalize case, remove punctuation), then calculate intersection / union of token sets.

**Confidence levels:**
- High: score ≥ 0.7
- Medium: score 0.5–0.7
- Low: score 0.4–0.5 (below `--min-score` defaults to no match)

### Output Files

- `suggestions.json` - Structured suggestion data
- `suggestions.md` - Human-readable ranked suggestions by confidence
- `no-match.md` - Merchants with no matches above threshold
- `APPROVAL.md` - Safety gates and next steps
- `manifest.json` - Run metadata

### Integration with ledger-unmatched-merchant-queue

```bash
# Step 1: Build unmatched queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- --input transactions.csv --outdir queue-out/

# Step 2: Suggest aliases
cd ../ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched ../ledger-unmatched-merchant-queue/queue-out/queue.json \
  --aliases known-aliases.json \
  --outdir suggestions/

# Step 3: Review suggestions.md and no-match.md
# Step 4: Update aliases.json with new patterns
# Step 5: Get H2 approval before applying to Budget sheet
```

[→ Full README](./ledger-merchant-alias-suggest/README.md)

---

## ledger-alias-apply-checklist

**One-line:** Generate H2-ready apply checklist from ledger-merchant-alias-suggest output before any USA Budget sheet write.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-alias-apply-checklist/`

### Install and Run

```bash
cd tools/ledger-alias-apply-checklist
npm install
npm run build

# From JSON output
npm run apply -- \
  --suggestions path/to/suggestions.json \
  --outdir out/

# From markdown outputs
npm run apply -- \
  --suggestions-md path/to/suggestions.md \
  --no-match path/to/no-match.md \
  --outdir out/

# With month label
npm run apply -- \
  --suggestions suggestions.json \
  --month 2026-09 \
  --outdir out/
```

### Critical Safety Note

- ✅ **Offline only** - No Google Sheets API or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **H2 approval required** - Never writes to Budget sheet; Ledger owns sheet writes
- ✅ **No invented amounts or aliases** - Pass-through from suggestion tool only
- ✅ **Names/patterns only** - No transaction amounts in prose
- ⚠️ **Approval gate enforced** - Coding/CoS never write Budget directly

### Behavior

1. Parse suggestions from JSON or markdown (ledger-merchant-alias-suggest output)
2. Group by confidence (high/medium/low) using score thresholds
3. Generate `APPLY-CHECKLIST.md` - numbered merchant→alias mappings for human tick-off
4. Generate `SKIPPED.md` - low-confidence / no-match items for manual research
5. Generate `APPROVAL.md` - H2 gate workflow guidance
6. Exit 1 on missing/malformed suggestions

### Example Workflow

```bash
# Step 1: Generate suggestions (previous tool)
cd tools/ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched queue.json \
  --aliases aliases.json \
  --outdir suggestions/

# Step 2: Generate apply checklist
cd ../ledger-alias-apply-checklist
npm run apply -- \
  --suggestions ../ledger-merchant-alias-suggest/suggestions/suggestions.json \
  --no-match ../ledger-merchant-alias-suggest/suggestions/no-match.md \
  --month 2026-09 \
  --outdir checklist/

# Step 3: Review APPLY-CHECKLIST.md and get H2 approval
# Step 4: Ledger applies approved aliases to Budget sheet manually
```

[→ Full README](./ledger-alias-apply-checklist/README.md)

---

## ledger-alias-pipeline-pack

**One-line:** Offline CLI pipeline pack orchestrating ledger-merchant-alias-suggest → ledger-alias-apply-checklist into one outdir with PACK.md + manifest.json.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-alias-pipeline-pack/`

### Install and Run

```bash
cd tools/ledger-alias-pipeline-pack
npm install
npm run build

# Option 1: Use existing suggest output (preferred)
npm run pipeline -- --suggest-outdir ../ledger-merchant-alias-suggest/out/

# Option 2: Run suggest first
npm run pipeline -- \
  --run-suggest \
  --unmatched-queue ../ledger-unmatched-merchant-queue/out/queue.json \
  --aliases aliases.json \
  --month 2026-09

# Skip apply-checklist (PR #114 boolean flag patterns)
npm run pipeline -- --suggest-outdir out/ --run-apply-checklist=false
npm run pipeline -- --suggest-outdir out/ --no-run-apply-checklist
```

### Critical Safety Note

- ✅ **Offline only** - No Google Sheets API or network calls
- ✅ **Read-only assembly** - Never modifies source files
- ✅ **No invented data** - Never fabricates amounts, aliases, or merchant identities
- ✅ **H2 approval required** - Never writes to Budget sheet
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ⚠️ **Ledger owns sheet writes** - Manual application after approval

### Behavior

1. Input Mode 1: Use existing suggest output directory (preferred)
2. Input Mode 2: Run suggest tool first with provided inputs
3. Copy suggest outputs (suggestions.json, suggestions.md, no-match.md, APPROVAL.md)
4. Optionally run apply-checklist (default ON, PR #114 skip flags)
5. Generate PACK.md (pipeline pack index) and manifest.json
6. Exit 1 if suggest output missing/invalid or tools fail

### Example Workflow

```bash
# Full pipeline from unmatched queue
cd tools/ledger-alias-pipeline-pack
npm run pipeline -- \
  --run-suggest \
  --unmatched-queue ../ledger-unmatched-merchant-queue/out/queue.json \
  --aliases aliases.json \
  --month 2026-09 \
  --outdir pipeline-packs/

# Or use existing suggest output
npm run pipeline -- \
  --suggest-outdir ../ledger-merchant-alias-suggest/out/ \
  --month 2026-09

# Review outputs
cat out/ledger-alias-pack-2026-09/PACK.md
cat out/ledger-alias-pack-2026-09/APPLY-CHECKLIST.md
```

[→ Full README](./ledger-alias-pipeline-pack/README.md)

---

## ledger-month-close-pack

**One-line:** Build offline USA Budget month-end close pack: CSV inventory, header sanity, unmatched-merchant queue pointer, APPROVAL checklist.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-month-close-pack/`

### Install and Run

```bash
cd tools/ledger-month-close-pack
npm install
npm run build

# Basic pack
npm run pack -- --month 2024-01 --exports-dir exports/ --outdir out/

# With header validation
npm run pack -- \
  --month 2024-01 \
  --exports-dir exports/ \
  --outdir out/ \
  --require-headers Date,Amount,Merchant

# With unmatched queue
npm run pack -- \
  --month 2024-01 \
  --exports-dir exports/ \
  --outdir out/ \
  --unmatched-queue path/to/queue.md
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies source CSV files
- ✅ **Amounts stay in files** - Headers and filenames only in markdown; amounts NEVER in prose
- ✅ **No invented amounts** - Only reports what exists in source CSVs
- ✅ **H2 approval required** - Before any Google Sheet writes
- ⚠️ **Ledger owns sheet writes** - Coding/CoS never writes directly to Sheets
- ⚠️ **Manual verification required** - Review all reports before any updates

### Output Files

- `manifest.json` - Machine-readable pack metadata
- `inventory.json` - Machine-readable CSV file details
- `inventory.md` - Human-readable inventory (filenames, sizes, headers only)
- `CLOSE.md` - Month-close checklist
- `APPROVAL.md` - Safety gates and workflow guidance
- `unmatched-queue.md` - Unmatched merchants (if provided via --unmatched-queue)

### Integration with budget-merchant-matcher and ledger-unmatched-merchant-queue

1. Export budget transactions to CSV
2. Run `budget-merchant-matcher` to classify merchants
3. Run `ledger-unmatched-merchant-queue` on unmatched.csv output
4. Run `ledger-month-close-pack` to assemble the final close pack with all reports

[→ Full README](./ledger-month-close-pack/README.md)

---

## ledger-month-close-pipeline-pack

**One-line:** Offline CLI tool assembling unmatched-merchant-queue → merchant-alias-suggest → alias-apply-checklist → month-close-pack artifacts into one pipeline pack.

**Owning desk(s):** Ledger / CoS

**Location:** `tools/ledger-month-close-pipeline-pack/`

### Install and Run

```bash
cd tools/ledger-month-close-pipeline-pack
npm install
npm run build

# Assemble from prebuilt stage outputs (preferred)
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/out/ \
  --suggest-outdir ../ledger-merchant-alias-suggest/out/ \
  --alias-checklist-outdir ../ledger-alias-apply-checklist/out/ \
  --close-outdir ../ledger-month-close-pack/out/ \
  --outdir pipeline-pack/

# With partial stages (not all stages required)
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/out/ \
  --close-outdir ../ledger-month-close-pack/out/ \
  --outdir pipeline-pack/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No Google Sheets API or network calls
- ✅ **Read-only** - Never modifies stage output files
- ✅ **No amounts in PACK.md** - Amounts stay in stage output files only
- ✅ **H2 approval required** - Before any Google Sheet writes
- ✅ **Exit 1 on zero stages** - At least one stage input must be present
- ⚠️ **Ledger owns sheet writes** - Coding/CoS never writes Budget directly
- ⚠️ **Never writes Budget sheet** - Google Sheets API is never called

### Pipeline Flow

```
ledger-unmatched-merchant-queue → ledger-merchant-alias-suggest → 
ledger-alias-apply-checklist → ledger-month-close-pack → 
ledger-month-close-pipeline-pack (this tool)
```

### Output Files

- `PACK.md` - Pipeline pack index with stage presence summary (NO amount tables)
- `APPROVAL.md` - H2 gate workflow guidance
- `manifest.json` - Machine-readable metadata with stage presence flags
- `queue.md` - Unmatched merchant research queue (if stage present)
- `suggestions.md` - Alias suggestions (if stage present)
- `APPLY-CHECKLIST.md` - Human tick-off checklist (if stage present)
- `CLOSE.md` - Month-close sanity checks (if stage present)
- `CLOSE-APPROVAL.md` - Month-close approval gates (if stage present)

### Integration with Pipeline Tools

Full pipeline example:

```bash
# Step 1: Build unmatched merchant queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- --input exports/jan-2024.csv --outdir unmatched-out/

# Step 2: Suggest aliases
cd ../ledger-merchant-alias-suggest
npm run suggest -- --unmatched ../ledger-unmatched-merchant-queue/unmatched-out/queue.json --aliases aliases.json --outdir suggest-out/

# Step 3: Generate apply checklist
cd ../ledger-alias-apply-checklist
npm run apply -- --suggestions ../ledger-merchant-alias-suggest/suggest-out/suggestions.json --month 2024-01 --outdir checklist-out/

# Step 4: Build month-close pack
cd ../ledger-month-close-pack
npm run pack -- --month 2024-01 --exports-dir ~/exports/january/ --outdir close-out/

# Step 5: Assemble pipeline pack
cd ../ledger-month-close-pipeline-pack
npm run pack -- \
  --month 2024-01 \
  --unmatched-outdir ../ledger-unmatched-merchant-queue/unmatched-out/ \
  --suggest-outdir ../ledger-merchant-alias-suggest/suggest-out/ \
  --alias-checklist-outdir ../ledger-alias-apply-checklist/checklist-out/ \
  --close-outdir ../ledger-month-close-pack/close-out/ \
  --outdir pipeline-pack-jan-2024/

# Step 6: Review PACK.md and follow APPROVAL.md workflow
```

[→ Full README](./ledger-month-close-pipeline-pack/README.md)

---

## suno-package-prep

**One-line:** Prepare Suno job packages from kid lyrics and metadata for manual Chrome paste workflow.

**Owning desk(s):** Studio / BrownieTunez

**Location:** `tools/suno-package-prep/`

### Install and Run

```bash
cd tools/suno-package-prep
npm install
npm run build

npm run prep -- \
  --lyrics my-song.txt \
  --meta my-meta.json
```

### Critical Safety Note

- ✅ **No browser automation** - Manual paste workflow only
- ✅ **No Suno API calls** - Official or unofficial
- ✅ **No auto-send** - No YouTube upload, no WhatsApp sending
- ✅ **100% offline** - All outputs are for manual paste into Suno's UI
- ⚠️ **Manual step required** - Follow the generated `checklist.md` for Chrome workflow

[→ Full README](./suno-package-prep/README.md)

---

## studio-suno-package-validate

**One-line:** Validate Suno job packages before Studio spends browser time on manual Chrome paste workflow.

**Owning desk(s):** Studio / BrownieTunez

**Location:** `tools/studio-suno-package-validate/`

### Install and Run

```bash
cd tools/studio-suno-package-validate
npm install
npm run build

# Basic validation
npm run validate -- --dir path/to/job-folder

# With custom output directory
npm run validate -- --dir path/to/job-folder --outdir reports/

# Strict mode (exit 1 on validation failures)
npm run validate -- --dir path/to/job-folder --strict
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies job folders
- ✅ **No Suno API** - Official or unofficial
- ✅ **No YouTube API** - No upload automation
- ✅ **No browser automation** - Manual paste workflow only
- ✅ **Preflight validator** - Catch issues before Chrome session

### Validation Checks

1. **Required Files Present** - lyrics.cleaned.txt, checklist.md, manifest.json
2. **Metadata JSON Shape** - Valid metadata structure in manifest.json
3. **Lyrics Not Empty** - Non-whitespace content in lyrics file
4. **No PII Patterns** - No email addresses or phone numbers in lyrics
5. **Manual Paste Checklist** - Checklist mentions manual workflow only

### Integration with suno-package-prep

This tool validates packages created by `suno-package-prep`:

```bash
# Step 1: Create job package
cd tools/suno-package-prep
npm run prep -- --lyrics song.txt --meta meta.json

# Step 2: Validate package
cd ../studio-suno-package-validate
npm run validate -- --dir ../suno-package-prep/suno-jobs/song-2026-09-02/

# Step 3: If validation passes, proceed with manual Chrome/Suno paste
```

**Output:** `report.json`, `report.md` (numbered pass/fail), `APPROVAL.md` (safety gates), `manifest.json`

**Exit codes:** 0 if validate ran; 1 if --strict and any fail, or bad input

[→ Full README](./studio-suno-package-validate/README.md)

---

## studio-lyric-package-stub

**One-line:** Create stub package folders from lyric text (+ optional metadata) for Studio / BrownieTunez validation with studio-suno-package-validate.

**Owning desk(s):** Studio / BrownieTunez

**Location:** `tools/studio-lyric-package-stub/`

### Install and Run

```bash
cd tools/studio-lyric-package-stub
npm install
npm run build

# Basic usage (title derived from first lyric line)
npm run stub -- --lyrics path/to/lyrics.txt --outdir out/my-song/

# With title and artist
npm run stub -- \
  --lyrics lyrics.txt \
  --title "Sunshine Day" \
  --artist "Emma" \
  --outdir out/sunshine-day/

# With all metadata
npm run stub -- \
  --lyrics lyrics.txt \
  --title "Happy Birthday" \
  --artist "Katelyn" \
  --mood "Celebratory and joyful" \
  --notes notes.md \
  --outdir out/happy-birthday/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls or network requests
- ✅ **Never uploads** - No YouTube/Suno/Drive uploads
- ✅ **Never invents lyrics** - Exact copy from input file
- ✅ **Read-only source** - Input lyrics file not modified
- ✅ **Title derivation** - Derives safe stub title from first lyric line if --title omitted
- ✅ **Exit 1 on empty** - Rejects empty or whitespace-only lyrics
- ⚠️ **Stub package only** - For validation purposes before manual Studio workflow

### Package Structure

Creates package folder with:
- `lyrics.cleaned.txt` - Exact copy of input lyrics (never rewritten)
- `meta.json` - Metadata: title, artist?, mood?, source: "stub", createdAt, titleDerived?
- `checklist.md` - Notes from --notes file or placeholder checklist
- `APPROVAL.md` - Drive approval reminder (no auto-upload)
- `manifest.json` - Package manifest with metadata and file paths

### Integration with studio-suno-package-validate

This tool creates stub packages that can be validated by `studio-suno-package-validate`:

```bash
# Step 1: Create stub package
cd tools/studio-lyric-package-stub
npm run stub -- --lyrics song.txt --title "My Song" --outdir out/my-song/

# Step 2: Validate package
cd ../studio-suno-package-validate
npm run validate -- --dir ../studio-lyric-package-stub/out/my-song/

# Step 3: If validation passes, proceed with manual Studio workflow
```

**Recommended next step:** Run `studio-suno-package-validate` on output directory to verify package before Studio work.

[→ Full README](./studio-lyric-package-stub/README.md)

---

## studio-youtube-preflight-pack

**One-line:** Offline preflight tool for Studio/BrownieTunez YouTube upload approval workflow - validates packages, checks Drive link, ensures hard gates held.

**Owning desk(s):** Studio / BrownieTunez

**Location:** `tools/studio-youtube-preflight-pack/`

### Install and Run

```bash
cd tools/studio-youtube-preflight-pack
npm install
npm run build

# Basic preflight with Drive URL
npm run preflight -- --dir path/to/package --drive-url "https://drive.google.com/..."

# With Drive URL file
npm run preflight -- --dir path/to/package --drive-url-file drive-link.txt

# With video check
npm run preflight -- --dir path/to/package --drive-url "https://..." --video video.mp4

# With validation (option 1: prebuilt report)
npm run preflight -- --dir path/to/package --validate-report report.json --drive-url "https://..."

# With validation (option 2: shell out to validate tool)
npm run preflight -- --dir path/to/package --run-validate --drive-url "https://..."

# Strict mode (exit 1 on failures)
npm run preflight -- --dir path/to/package --drive-url "https://..." --strict
```

### Critical Safety Note

- ✅ **Offline only** - No YouTube/Suno/Drive API calls
- ✅ **Never uploads** - This tool never uploads anything anywhere
- ✅ **Never invents** - No invented lyrics, titles, or URLs
- ✅ **Drive approval BLOCKING** - CoS chat Drive link required for Grant approval
- ✅ **Video check is path-only** - No media decoding (existence check only)
- ✅ **Read-only** - No file modifications
- ⚠️ **Hard gates enforced** - APPROVAL.md documents that Grant must approve in CoS before any YouTube upload

### Preflight Checks

1. **Required files present** - lyrics.cleaned.txt, checklist.md, manifest.json
2. **Validate report pass** (if `--validate-report` or `--run-validate`)
3. **Drive approval link** (BLOCKING - CoS chat link required)
4. **Video file exists** (if `--video`, path existence only)
5. **PII pattern scan** (emails/phones in lyrics, warning only)

### Integration with Sibling Tools

This tool completes the Studio workflow pipeline:

```bash
# Step 1: Create stub package
cd tools/studio-lyric-package-stub
npm run stub -- --lyrics song.txt --title "My Song" --outdir out/my-song/

# Step 2: Validate package
cd ../studio-suno-package-validate
npm run validate -- --dir ../studio-lyric-package-stub/out/my-song/

# Step 3: Preflight before YouTube upload request (THIS TOOL)
cd ../studio-youtube-preflight-pack
npm run preflight -- \
  --dir ../studio-lyric-package-stub/out/my-song/ \
  --validate-report ../studio-suno-package-validate/out/report.json \
  --drive-url "https://drive.google.com/file/d/abc123/view" \
  --video my-song.mp4

# Step 4: If preflight passes, request CoS/Grant approval for YouTube upload
```

**Output:** `PREFLIGHT.md` (numbered checks), `APPROVAL.md` (explicit gate rules), `missing.md` (what's blocking), `manifest.json`

**Exit codes:** 0 if preflight ran; 1 if --strict and any required check fails, or bad input

[→ Full README](./studio-youtube-preflight-pack/README.md)

---

## family-school-subject-digest

**One-line:** Generate family school/admin morning digest from email subject lines.

**Owning desk(s):** Family Command Center

**Location:** `tools/family-school-subject-digest/`

### Install and Run

```bash
cd tools/family-school-subject-digest
npm install
npm run build

# Basic usage
npm run digest -- --input subjects.txt --outdir out/

# With custom date and timezone
npm run digest -- --input subjects.txt --date 2026-09-15 --timezone America/Chicago

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls of any kind
- ✅ **No LLM** - Keyword classification heuristics only
- ✅ **No invented data** - Due dates and amounts only extracted if explicitly present
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email
- ✅ **No school facts** - Never invents teacher names, school policies, or deadlines
- ⚠️ **Family bot owns send path** - WhatsApp digest sending via Family bot / CoS only
- ⚠️ **For Grant/Liana only** - Not for automated client/school communication

[→ Full README](./family-school-subject-digest/README.md)

---

## family-school-due-queue

**One-line:** Extract due/deadline signals from school email subjects or filename lists for Family / CoS morning digest.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-school-due-queue/`

### Install and Run

```bash
cd tools/family-school-due-queue
npm install
npm run build

# From email subjects only
npm run queue -- --subjects subjects.txt --outdir out/

# From filenames only
npm run queue -- --files filenames.txt --outdir out/

# From both subjects and filenames
npm run queue -- --subjects subjects.txt --files filenames.txt --outdir out/

# With custom as-of date
npm run queue -- --subjects subjects.txt --as-of 2026-09-15 --outdir out/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No Gmail API or network calls
- ✅ **Subjects/filenames only** - Never opens email bodies or attachments
- ✅ **No invented dates** - Only extracts dates explicitly present in text
- ✅ **Heuristic extraction** - Date/keyword signals may have false positives
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email automatically
- ⚠️ **Family bot owns send path** - WhatsApp digest posting via Family bot / CoS only
- ⚠️ **For Grant/Liana only** - Not for automated school communication

### Heuristic Patterns

**Date formats:**
- ISO dates (YYYY-MM-DD)
- US dates (M/D, MM/DD/YYYY)
- Relative dates (due Friday, by Monday)

**Action keywords:**
- due, deadline, by, before
- permission slip, form, rsvp, sign
- picture day, volunteer, field trip
- registration, enrollment
- parent conference, report card
- reminder, urgent, submission

### Output Files

- `queue.json` - Structured queue data with due dates and signals
- `queue.md` - Numbered human-readable list (sorted by due date)
- `missing-signals.md` - Items with no recognized signals
- `APPROVAL.md` - Safety gates and ownership
- `manifest.json` - Run metadata

### Integration with family-morning-digest-pack

This tool feeds into `family-morning-digest-pack` for automated morning digest assembly:

```bash
# Step 1: Extract due queue
cd tools/family-school-due-queue
npm run queue -- --subjects subjects.txt --outdir due-queue/

# Step 2: Assemble morning digest
cd ../family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects ../family-school-due-queue/due-queue/queue.json
```

[→ Full README](./family-school-due-queue/README.md)

---

## family-morning-digest-pack

**One-line:** Offline CLI assembler for Family / CoS weekday morning digest pack with clear school/family separation.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-morning-digest-pack/`

### Install and Run

```bash
cd tools/family-morning-digest-pack
npm install
npm run build

# Option 1: Let this tool call family-school-subject-digest
npm run pack -- --date 2026-09-02 --subjects subjects.txt --outdir out/ --run-subject-digest

# Option 2: Use pre-generated items.json from family-school-subject-digest
npm run pack -- --date 2026-09-02 --subjects digest-output/items.json --outdir out/

# Option 3: Include calendar events from ICS file
npm run pack -- --date 2026-09-02 --subjects subjects.txt --ics calendar.ics --outdir out/ --run-subject-digest --run-ics-digest

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls of any kind
- ✅ **DRAFT ONLY** - Never sends to WhatsApp
- ✅ **No WhatsApp API** - WhatsApp posting stays on CoS
- ✅ **Clear separation** - Kids School and Family Admin lists are distinct
- ✅ **No duplication** - Each item appears exactly once
- ✅ **Full sentences** - Per Family skill tone
- ✅ **No invented data** - Never fabricates school facts or due dates
- ✅ **Calendar pass-through only** - ICS events copied verbatim, never invented
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review APPROVAL.md before every post

### Output Files

Creates pack folder: `<outdir>/pack-YYYY-MM-DD/`

- **PACK.md** - Index and checklist with item counts and review steps
- **school.md** - Kids School items only (numbered 1-N)
- **family.md** - Family Admin items only (numbered N+1 onward, no school repeats)
- **calendar.md** - Calendar events from ICS digest (if `--run-ics-digest` provided)
- **calendar-events.json** - Structured calendar event data (if `--run-ics-digest` provided)
- **APPROVAL.md** - Review document with safety gates
- **manifest.json** - Machine-readable pack metadata

### Integration with family-school-subject-digest and family-calendar-ics-digest

This tool preferably consumes outputs from `family-school-subject-digest` and optionally from `family-calendar-ics-digest`:

```bash
# Step 1: Run subject digest
cd tools/family-school-subject-digest
npm run digest -- --input subjects.txt --outdir digest-out/

# Step 2: Assemble morning pack (with subjects only)
cd ../family-morning-digest-pack
npm run pack -- \
  --date 2026-09-02 \
  --subjects ../family-school-subject-digest/digest-out/digest-TIMESTAMP/items.json

# Or with calendar events from ICS file
npm run pack -- \
  --date 2026-09-02 \
  --subjects subjects.txt \
  --ics calendar.ics \
  --run-subject-digest \
  --run-ics-digest
```

Or use `--run-subject-digest` and/or `--run-ics-digest` to call sibling tools in one command.

[→ Full README](./family-morning-digest-pack/README.md)

---

## family-digest-post-checklist

**One-line:** Offline CLI to validate family-morning-digest-pack output before WhatsApp Admin posting with go/no-go checklist.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-digest-post-checklist/`

### Install and Run

```bash
cd tools/family-digest-post-checklist
npm install
npm run build

# Basic usage
npm run check -- --pack path/to/pack-2026-09-02

# With explicit date and output directory
npm run check -- --pack path/to/pack --date 2026-09-02 --outdir reports/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only checks** - Never modifies pack files
- ✅ **No invented data** - Never fabricates school facts or due dates
- ✅ **Exit codes** - 0 = pass, 1 = fail (scriptable)
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review POST-CHECKLIST.md and APPROVAL.md before every post

### Behavior

**Input:** `--pack` path to a pack folder produced by family-morning-digest-pack

**Checks (heuristic, read-only):**
1. Required files present (PACK.md, school.md, family.md)
2. school.md and family.md both exist and are non-empty OR explicitly empty-with-header
3. No obvious duplicate line items between school.md and family.md
4. APPROVAL.md present in pack
5. Warn if calendar/due sections referenced in PACK.md but files missing

**Outputs in `--outdir`:**
- POST-CHECKLIST.md — Numbered go/no-go ticks for Family
- ISSUES.md — Failures/warnings only
- APPROVAL.md — Family/CoS owns send; full sentences; offline only
- manifest.json — Metadata

**Exit codes:**
- 0 — All checks passed
- 1 — Pack path missing, required files absent, or checks failed

### Integration with family-morning-digest-pack

Run immediately after `family-morning-digest-pack`:

```bash
# Step 1: Generate morning digest pack
cd tools/family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Step 2: Validate pack before posting
cd ../family-digest-post-checklist
npm run check -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Step 3: Review outputs and post (manual)
cat out/POST-CHECKLIST.md
cat out/APPROVAL.md
# Family / CoS posts to WhatsApp Admin - Grant & Liana Private
```

[→ Full README](./family-digest-post-checklist/README.md)

---

## family-morning-digest-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining family-morning-digest-pack and family-digest-post-checklist for Family / CoS morning workflow.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-morning-digest-pipeline-pack/`

### Install and Run

```bash
cd tools/family-morning-digest-pipeline-pack
npm install
npm run build

# Option 1: Use existing morning pack (preferred)
npm run pipeline -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Option 2: Generate morning pack first
npm run pipeline -- --run-morning-pack --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only assembly** - Never modifies source pack files
- ✅ **No invented data** - Never fabricates school facts or due dates
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review PACK.md, POST-CHECKLIST.md, and ISSUES.md before every post

### Example Workflow

```bash
# Step 1: Generate morning pack (or use existing)
cd tools/family-morning-digest-pack
npm run pack -- --date 2026-09-02 --subjects subjects.txt --run-subject-digest

# Step 2: Assemble pipeline pack with validation
cd ../family-morning-digest-pipeline-pack
npm run pipeline -- --pack ../family-morning-digest-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/pipeline-pack-2026-09-02/PACK.md
cat out/pipeline-pack-2026-09-02/POST-CHECKLIST.md

# Step 4: If all checks pass, Family / CoS posts to WhatsApp Admin
```

[→ Full README](./family-morning-digest-pipeline-pack/README.md)

---

## family-calendar-ics-digest

**One-line:** Offline CLI to parse .ics calendar exports and generate Family / CoS morning digest.

**Owning desk(s):** Family Command Center / CoS

**Location:** `tools/family-calendar-ics-digest/`

### Install and Run

```bash
cd tools/family-calendar-ics-digest
npm install
npm run build

# Basic usage
npm run digest -- --ics calendar.ics --from 2026-09-02 --to 2026-09-05 --outdir out/

# With custom timezone
npm run digest -- --ics calendar.ics --from 2026-09-01 --to 2026-09-30 --timezone America/New_York

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No calendar API calls
- ✅ **Read-only** - Never modifies .ics files or live calendars
- ✅ **Pass-through only** - Never invents events, times, or locations
- ✅ **Date filtering** - Only includes VEVENT entries within specified date range
- ✅ **DRAFT ONLY** - Output is for review; does not send notifications
- ⚠️ **Family bot / CoS owns WhatsApp** - Manual approval required before posting digest
- ⚠️ **Not a calendar sync** - This is a one-time export parser, not a live calendar integration

### Output Files

- `events.json` - Structured event data array with uid, summary, dtstart, dtend, location, description
- `digest.md` - Numbered digest with full sentences, grouped by date
- `missing-fields.md` - Events with incomplete data (missing SUMMARY/DTSTART/LOCATION)
- `APPROVAL.md` - Safety gates and ownership notice
- `manifest.json` - Run metadata and statistics

### Why This Tool Exists

Family morning digest sometimes needs calendar events from an exported .ics file (school/admin calendars). This offline parser extracts events in a date window and generates a numbered digest. Never invents events or times.

[→ Full README](./family-calendar-ics-digest/README.md)

---

## browns-guest-facts-pack

**One-line:** Extract structured guest facts from markdown knowledge files into JSON and snippet files.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-guest-facts-pack/`

**Note:** Supports both section-heading-based and prose-based knowledge files. Extracts facts heuristically from headings and body text.

### Install and Run

```bash
cd tools/browns-guest-facts-pack
npm install
npm run build

# Basic usage
npm run pack -- --facts stay-knowledge/the-browns.md --outdir out/

# With seed samples (for tone reference only)
npm run pack -- \
  --facts stay-knowledge/the-browns.md \
  --seeds seeds/ \
  --outdir out/

# Test with fixture
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Never invents facts** - Missing fields are explicitly flagged
- ✅ **Offline only** - No APIs or network calls
- ✅ **No fabricated passwords** - If Wi-Fi password is not in source, omitted and reported
- ✅ **No rates or amounts** - Does not handle pricing
- ✅ **Source-faithful extraction** - Heuristic parsing of stated facts only
- ⚠️ **For draft communications only** - Outputs feed `browns-guest-comms-draft`

[→ Full README](./browns-guest-facts-pack/README.md)

---

## browns-inquiry-intake

**One-line:** Extract structured booking and quote JSON from freeform inquiry text (email/WhatsApp paste).

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-inquiry-intake/`

### Install and Run

```bash
cd tools/browns-inquiry-intake
npm install
npm run build

# Extract from text file
npm run intake -- --text inquiry.txt --outdir out/

# Extract from stdin
cat inquiry.txt | npm run intake -- --stdin

# Extract only booking or quote mode
npm run intake -- --text inquiry.txt --mode booking
```

### Critical Safety Note

- ✅ **No LLM API calls** - Heuristic extraction only
- ✅ **No WhatsApp Cloud API** - WhatsApp stays on CoS
- ✅ **No auto-send** - DRAFT outputs only
- ✅ **Never invents rates or amounts** - Only extracts if explicitly present with currency
- ✅ **Offline only** - No Gmail, NightsBridge, or browser
- ⚠️ **Human approval required** - Always review APPROVAL.md before using outputs

[→ Full README](./browns-inquiry-intake/README.md)

---

## hm-quote-intake

**One-line:** Extract structured quote JSON from Heavy Metal Sand & Stone WhatsApp inquiry text.

**Owning desk(s):** SA Ops / Heavy Metal

**Location:** `tools/hm-quote-intake/`

### Install and Run

```bash
cd tools/hm-quote-intake
npm install
npm run build

# Extract from text file
npm run intake -- --text inquiry.txt --outdir out/

# Extract from stdin
cat inquiry.txt | npm run intake -- --stdin

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **No LLM API calls** - Heuristic extraction only
- ✅ **No WhatsApp Cloud API** - WhatsApp stays on CoS
- ✅ **No auto-send** - DRAFT outputs only
- ✅ **Never invents rates, volumes, or locations** - Only extracts if explicitly present
- ✅ **Offline only** - No APIs or network calls
- ⚠️ **Human approval required** - Always review APPROVAL.md before using outputs
- ⚠️ **H1 gate required** - `APPROVE SEND <thread-or-wa-id>` for every quote
- ⚠️ **Confirm volume + location** - Before any quote per lane:heavy-metal rules

### Output Files

- `quote.json` - Structured quote data (customer, materials, volume, delivery, pricing)
- `draft-reply.md` - Draft WhatsApp reply with placeholders (never invents rates)
- `missing-fields.md` - Checklist of fields to fill manually
- `APPROVAL.md` - Review document with safety checklist and approval gates
- `manifest.json` - Extraction metadata

### Extracted Fields

**Customer:** name, phone (SA formats)  
**Materials:** sand, stone, gravel, crusher dust, fill, aggregate, rock, pebble, ballast, G5, G7  
**Volume:** quantity + unit (m³, ton, load)  
**Delivery:** location, date needed  
**Pricing:** per-unit price, total price, currency (ONLY if explicitly present)

### Entity Context

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Automation Target:** structured-whatsapp-quotes

[→ Full README](./hm-quote-intake/README.md)

---

## hm-quote-to-pod

**One-line:** Map quote.json (from hm-quote-intake) into pod.json stub suitable for hm-delivery-pod-draft.

**Owning desk(s):** SA Ops / Heavy Metal

**Location:** `tools/hm-quote-to-pod/`

### Install and Run

```bash
cd tools/hm-quote-to-pod
npm install
npm run build

# Basic mapping
npm run map -- --quote path/to/quote.json

# Custom output directory
npm run map -- --quote quote.json --outdir out/

# With additional notes
npm run map -- --quote quote.json --notes "Rush delivery"

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No LLM, no APIs, no network calls
- ✅ **Field bridge only** - Maps known fields, leaves missing fields undefined
- ✅ **Never invents volume** - If missing in quote, stays missing in pod
- ✅ **Never invents signature** - signedBy always undefined (manual only)
- ✅ **Never invents price** - Pricing not carried to pod.json
- ✅ **Takes first material** - If multiple materials in quote, uses materials[0]
- ✅ **Read-only** - Never modifies source quote.json
- ⚠️ **Human review required** - Always review APPROVAL.md before using pod.json

### Field Mapping

**From quote.json to pod.json:**

| Quote Field        | POD Field         | Notes                              |
|--------------------|-------------------|------------------------------------|
| customerName       | customer          | Direct copy                        |
| customerPhone      | phone             | Direct copy                        |
| materials[0]       | material          | First material only                |
| volume             | volume            | Only if present (never invented)   |
| volumeUnit         | unit              | Direct copy                        |
| deliveryLocation   | deliveryLocation  | Direct copy                        |
| dateNeeded         | deliveredAt       | Placeholder (update with actual)   |
| notes              | notes             | Copy + append --notes if provided  |
| —                  | vehicle           | Not in quote; left undefined       |
| —                  | driver            | Not in quote; left undefined       |
| —                  | signedBy          | NEVER populated (manual only)      |

### Output Files

- `pod.json` - Mapped POD stub for hm-delivery-pod-draft
- `mapping.md` - Field-by-field mapping report (carried vs missing)
- `APPROVAL.md` - Review document with safety checklist
- `manifest.json` - Metadata about the mapping

### Use Case

Bridges the gap between `hm-quote-intake` output and `hm-delivery-pod-draft` input:

```bash
# Step 1: Extract quote from inquiry
cd tools/hm-quote-intake
npm run intake -- --text inquiry.txt --outdir quote-out/

# Step 2: Map quote to POD stub
cd ../hm-quote-to-pod
npm run map -- --quote ../hm-quote-intake/quote-out/quote.json --outdir pod-stub/

# Step 3: [Manual] Edit pod.json to add vehicle, driver, actual delivery time

# Step 4: Generate POD draft
cd ../hm-delivery-pod-draft
npm run draft -- --pod ../hm-quote-to-pod/pod-stub/pod.json
```

### Entity Context

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Automation Target:** Bridge step in structured-whatsapp-quotes → POD generation workflow

[→ Full README](./hm-quote-to-pod/README.md)

---

## hm-delivery-pod-draft

**One-line:** Generate DRAFT proof-of-delivery notes from Heavy Metal Sand & Stone delivery data (structured JSON or paste text).

**Owning desk(s):** SA Ops / Heavy Metal

**Location:** `tools/hm-delivery-pod-draft/`

### Install and Run

```bash
cd tools/hm-delivery-pod-draft
npm install
npm run build

# From structured JSON
npm run draft -- --pod pod.json --outdir out/

# From paste text (driver notes, WhatsApp)
npm run draft -- --text paste.txt --outdir out/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **No WhatsApp Cloud API** - WhatsApp stays on CoS
- ✅ **No auto-send** - DRAFT outputs only
- ✅ **Never invents volumes** - Only extracts if explicitly present
- ✅ **Never invents signatures** - signedBy field ONLY if actually present; unsigned deliveries are valid
- ⚠️ **Human approval required** - Always review APPROVAL.md before using outputs
- ⚠️ **Confirm volume + location** - Before any communication per lane:heavy-metal rules

### Input Modes

**Structured JSON (`--pod`):**
```json
{
  "customer": "Pieter van der Merwe",
  "phone": "+27823456789",
  "material": "Sand",
  "volume": 12,
  "unit": "m³",
  "deliveryLocation": "123 Main Road, Dullstroom",
  "deliveredAt": "2026-09-02 14:30",
  "vehicle": "GP 123 ABC",
  "driver": "Johannes Malema",
  "notes": "Delivered to side gate.",
  "signedBy": "P. van der Merwe"
}
```

**Paste Text (`--text`):**
```
Customer: Johan Botha
Phone: 0827654321

Material: Stone
Volume: 15 m³
Location: 45 Industrial Drive, Dullstroom
Date: 2026-09-02 10:15

Vehicle: MP 456 XYZ
Driver: Thabo Mbeki

Signed by: J. Botha
```

### Output Files

- `pod.json` - Normalized POD data
- `pod.md` - DRAFT proof-of-delivery note (marked as DRAFT)
- `missing-fields.md` - Checklist of fields to fill manually
- `APPROVAL.md` - Review document with safety checklist
- `manifest.json` - Generation metadata

### Field Extraction

**Required (flagged if missing):** customer, material, volume, unit, deliveryLocation, deliveredAt  
**Optional (tracked):** phone, vehicle, driver, notes, **signedBy** (NEVER invented)

### Signature Handling

**CRITICAL:** The tool NEVER invents the `signedBy` field.
- If delivery was signed for → record it
- If delivery was NOT signed for → field stays `undefined`
- Unsigned deliveries are valid
- Tool explicitly flags unsigned status in pod.md
- APPROVAL.md emphasizes never inventing signatures

### Entity Context

- **Lane:** heavy-metal
- **Trading Name:** Heavy Metal Sand & Stone
- **Location:** Dullstroom (yard)
- **Emails:** grant@hmsand.co.za, mail@hmsand.co.za
- **Automation Target:** delivery-day-and-pod

[→ Full README](./hm-delivery-pod-draft/README.md)

---

## hm-quote-pipeline-pack

**One-line:** Offline CLI orchestrator for Heavy Metal quote pipeline: hm-quote-intake → hm-quote-to-pod → optional hm-delivery-pod-draft for single inquiry.

**Owning desk(s):** SA Ops / Heavy Metal

**Location:** `tools/hm-quote-pipeline-pack/`

### Install and Run

```bash
cd tools/hm-quote-pipeline-pack
npm install
npm run build

# Use prebuilt outputs (recommended)
npm run pack -- \
  --outdir out/pack-20260902/ \
  --quote-outdir ../hm-quote-intake/out/intake-20260902/ \
  --pod-outdir ../hm-quote-to-pod/out/map-20260902/

# Run intake and map tools
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-map

# Full pipeline
npm run pack -- \
  --outdir out/pack-20260902/ \
  --run-intake --text inquiry.txt \
  --run-map \
  --run-pod

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline orchestrator** - Shells out to sibling tools or copies prebuilt outputs
- ✅ **Never invents volume/price/location/signature** - Only packages existing data
- ✅ **Never sends WhatsApp** - Pack assembly only, no sends
- ✅ **Missing fields tracked** - No invented rates/volumes in prose
- ✅ **H1 gate reminder** - APPROVAL.md includes `APPROVE SEND <whatsapp-id>` requirement
- ⚠️ **Approval required** - Review APPROVAL.md before every quote send
- ⚠️ **Confirm volume + location** - Before any quote per lane:heavy-metal rules

### Output Files

- `PACK.md` - Pack index with quote/pod summary and missing fields list
- `APPROVAL.md` - Approval checklist with H1 gate reminder and safety checks
- `quote.json` - Copy of quote (if provided)
- `pod.json` - Copy of pod (if provided)
- `pod.md` - Copy of pod draft (if provided)
- `manifest.json` - Pack metadata

### Integration

**Workflow position:**

```
hm-quote-intake → quote.json
       ↓
 hm-quote-to-pod → pod.json
       ↓
hm-delivery-pod-draft → pod.md (optional)
       ↓
hm-quote-pipeline-pack → PACK + APPROVAL
       ↓
   Manual review + H1 approval
       ↓
   Send via CoS WhatsApp
```

**Orchestration modes:**
1. **Prebuilt** (recommended): Copy existing outputs via `--quote-outdir`, `--pod-outdir`
2. **Shell out**: Run sibling tools via `--run-intake`, `--run-map`, `--run-pod`

**Approval gates:**
- **H1**: `APPROVE SEND <whatsapp-id>` required for every quote
- **lane:heavy-metal**: Confirm volume + location before any quote
- **N7**: Never invent rates, volumes, locations, signatures

[→ Full README](./hm-quote-pipeline-pack/README.md)

---

## browns-guest-comms-draft

**One-line:** Generate DRAFT guest welcome communications (WhatsApp/email) from booking JSON.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-guest-comms-draft/`

### Install and Run

```bash
cd tools/browns-guest-comms-draft
npm install
npm run build

# Basic usage
npm run draft -- --booking booking.json --outdir out/

# With seed samples and brand facts
npm run draft -- \
  --booking booking.json \
  --seeds /workspace/redacted-seeds/ \
  --facts /workspace/stay-knowledge/the-browns.md \
  --outdir drafts/
```

### Critical Safety Note

- ✅ **DRAFT ONLY** - Never sends WhatsApp or email
- ✅ **Offline only** - No Gmail/WhatsApp/NightsBridge APIs
- ✅ **Never invents rates or check-in times** - Uses placeholders or omits
- ✅ **Seed-based tone** - Learns from redacted samples (no PII in git)
- ✅ **Optional guest phone support** - When `guestPhone` present in booking JSON, included in team/admin drafts with `wa.me` link helper for CoS WhatsApp packs; omitted from guest-facing messages
- ⚠️ **Approval gates** - H1/H2 required per `docs/automation/approval-gates.md`
- ⚠️ **CoS only for WhatsApp** - Sends must use Coexistence of Service

[→ Full README](./browns-guest-comms-draft/README.md)

---

## browns-quote-invoice-draft

**One-line:** Generate DRAFT quote and proforma invoice communications from booking/quote JSON.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-quote-invoice-draft/`

### Install and Run

```bash
cd tools/browns-quote-invoice-draft
npm install
npm run build

# With amounts (full quote)
npm run draft -- --quote quote.json --outdir out/

# Without amounts (availability confirmation only)
npm run draft -- --quote quote-no-amounts.json --outdir out/
```

### Critical Safety Note

- ✅ **DRAFT ONLY** - Never sends email or WhatsApp
- ✅ **Never invents rates or amounts** - Missing amounts = availability-only drafts
- ✅ **No payment processing** - No payment links or transactions
- ✅ **Offline only** - No APIs or network calls
- ⚠️ **Grant approval required** - Review APPROVAL.md before every send
- ⚠️ **CoS only for WhatsApp** - Sends must use Coexistence of Service

[→ Full README](./browns-quote-invoice-draft/README.md)

---

## browns-inquiry-quote-pipeline-pack

**One-line:** Orchestrate Browns inquiry → quote draft into one offline pipeline pack for Dullstroom / The Browns.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-inquiry-quote-pipeline-pack/`

### Install and Run

```bash
cd tools/browns-inquiry-quote-pipeline-pack
npm install
npm run build

# Use existing inquiry JSON (recommended)
npm run pack -- --outdir out/pack-20260902/ --inquiry ../browns-inquiry-intake/out/intake-20260902/booking.json

# Run intake from text
npm run pack -- --outdir out/pack-20260902/ --run-intake --text inquiry.txt

# Skip quote draft (PR #114 boolean flag pattern)
npm run pack -- --outdir out/pack-20260902/ --inquiry data.json --run-quote=false

# Test with fixtures
npm run test:fixtures
```

### What It Does

- ✅ Wires inquiry → quote draft into one pipeline pack
- ✅ Accepts inquiry text OR existing inquiry JSON
- ✅ Optionally runs browns-inquiry-intake (--run-intake, requires --text)
- ✅ Runs browns-quote-invoice-draft (default ON, PR #114 skip flags)
- ✅ One outdir with PACK.md + manifest.json accurate to present files (PR #116)
- ✅ APPROVAL.md with H7 / Grant-CoS approval reminder
- ✅ Flags `[RATE CARD REQUIRED]` when amounts missing
- ❌ Never invents rates or amounts
- ❌ Never auto-sends mail/WhatsApp
- ❌ Offline only

### Safety

- ✅ **Offline only** - No API calls
- ✅ **Never auto-sends** - No mail/WhatsApp
- ✅ **Dullstroom only** - The Browns Luxury Guest Suites Dullstroom
- ⚠️ **H7 gate required** - Grant approval before quote send
- ⚠️ **[RATE CARD REQUIRED]** - Flags when amounts missing

[→ Full README](./browns-inquiry-quote-pipeline-pack/README.md)

---

## browns-nightsbridge-bookings-adapter

**One-line:** Transform Nightsbridge-ish day sheets (CSV/TSV/paste) into bookings.json for browns-daily-ops-brief.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-nightsbridge-bookings-adapter/`

### Install and Run

```bash
cd tools/browns-nightsbridge-bookings-adapter
npm install
npm run build

# From CSV file
npm run adapt -- --day 2026-09-20 --input nightsbridge.csv

# From TSV file
npm run adapt -- --day 2026-09-20 --input export.tsv --outdir reports/

# From pasted text (stdin)
cat table.txt | npm run adapt -- --day 2026-09-20 --paste
```

### Critical Safety Note

- ✅ **Offline only** - No Nightsbridge API or browser automation
- ✅ **Never invents data** - Missing fields are flagged, never fabricated
- ✅ **No rates or amounts** - Not in scope
- ✅ **Flexible input** - Accepts CSV, TSV, or pasted tables with varied headers
- ✅ **Status derivation** - Infers arriving/inhouse/departing from dates
- ⚠️ **Manual export required** - Copy/paste or export from Nightsbridge screen
- ⚠️ **Review missing-fields.md** - Resolve issues before feeding into daily-ops-brief

[→ Full README](./browns-nightsbridge-bookings-adapter/README.md)

---

## browns-daily-ops-brief

**One-line:** Generate daily team operations brief from bookings (arrivals, in-house, departures).

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-daily-ops-brief/`

### Install and Run

```bash
cd tools/browns-daily-ops-brief
npm install
npm run build

# Basic usage
npm run brief -- --day 2026-09-20 --bookings bookings.json --outdir out/

# With daily facts
npm run brief -- \
  --day 2026-09-20 \
  --bookings bookings.json \
  --facts facts.json \
  --outdir reports/
```

### Critical Safety Note

- ✅ **DRAFT ONLY** - Never sends WhatsApp messages automatically
- ✅ **Offline only** - No WhatsApp API or NightsBridge integration
- ✅ **Never invents rates or guest data** - Only formats what you provide
- ✅ **Flags late check-ins** - Highlights timing coordination needs
- ⚠️ **Manual send required** - Copy/paste to team WhatsApp after approval
- ⚠️ **CoS only for WhatsApp** - Team sends must use Coexistence of Service

[→ Full README](./browns-daily-ops-brief/README.md)

---

## browns-late-checkin-queue

**One-line:** Generate late/after-hours check-in queue for CoS 09:00 CT after-hours coordination pack.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-late-checkin-queue/`

### Install and Run

```bash
cd tools/browns-late-checkin-queue
npm install
npm run build

# Basic usage
npm run queue -- --bookings bookings.json --day 2026-09-20

# With custom after-hours threshold
npm run queue -- --bookings bookings.json --day 2026-09-20 --after-hour 17

# With custom output directory
npm run queue -- --bookings bookings.json --day 2026-09-20 --outdir reports/
```

### Critical Safety Note

- ✅ **DRAFT ONLY** - Never sends WhatsApp messages automatically
- ✅ **Offline only** - No WhatsApp API or NightsBridge integration
- ✅ **Never invents times** - Missing ETA stays missing and flagged
- ✅ **Never invents phones** - Missing phone stays missing
- ✅ **No rates or amounts** - Not in scope
- ✅ **Time-based filtering** - Flags check-ins at/after threshold (default 15:00 SAST)
- ✅ **Keyword detection** - Identifies late/after-hours/ETA keywords in notes
- ⚠️ **Manual send required** - Copy/paste to CoS WhatsApp after approval
- ⚠️ **CoS only for WhatsApp** - Sends must use Coexistence of Service

### Queue Inclusion Rules

A booking is included if **arriving on target day** AND meets **any** of:

1. Check-in time at/after threshold (default 15:00)
2. Notes contain late/after-hours/ETA keywords
3. Missing check-in time (→ `unknown-time.md`)

### Output Files

- `queue.json` - Structured queue data with guest details
- `queue.md` - Human-readable numbered list for CoS pack
- `unknown-time.md` - Bookings without check-in times needing ETA confirmation
- `missing-fields.md` - Data quality report
- `APPROVAL.md` - Review checklist and approval workflow
- `manifest.json` - Run metadata

### Integration with browns-ct-pack-assemble

This tool is called by `browns-ct-pack-assemble` for the 09:00 CT after-hours check-in coordination pack:

```bash
# Standalone usage
cd tools/browns-late-checkin-queue
npm run queue -- --bookings bookings.json --day 2026-09-20

# Or via browns-ct-pack-assemble
cd tools/browns-ct-pack-assemble
npm run assemble -- --day 2026-09-20 --bookings bookings.json --run-late-checkin
```

[→ Full README](./browns-late-checkin-queue/README.md)

---

## browns-booking-change-check

**One-line:** Diff two booking snapshots and report changes for CoS SA Ops last-minute verification before WhatsApp Admin posts.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-booking-change-check/`

### Install and Run

```bash
cd tools/browns-booking-change-check
npm install
npm run build

# Basic diff
npm run check -- --before bookings-1900.json --after bookings-2045.json

# With target day context
npm run check -- \
  --before before.json \
  --after after.json \
  --day 2026-09-20 \
  --outdir reports/
```

### Critical Safety Note

- ✅ **Offline only** - No Nightsbridge API or browser automation
- ✅ **Never invents data** - Missing fields flagged, never fabricated
- ✅ **No rates or amounts** - Not in scope
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email
- ✅ **Pre-post checklist** - Review changes.md before every WhatsApp Admin post
- ⚠️ **CoS workflow** - Run before 20:00 / 09:00 / 21:00 CT-pack posts

### Use Case

**Last-minute booking change check** before posting guest-comms or daily-ops drafts to WhatsApp Admin:

1. Export bookings before CT-pack prep (19:00 SAST) → `bookings-before.json`
2. Export bookings after CT-pack prep (20:45 SAST) → `bookings-after.json`
3. Run this tool to diff snapshots
4. Review `changes.md` for additions, removals, updates
5. Update drafts if changes affect guest-comms or ops brief
6. Post to WhatsApp Admin after approval

[→ Full README](./browns-booking-change-check/README.md)

---

## browns-ota-rate-worksheet

**One-line:** Generate OTA promotional rate worksheets for Nightsbridge manual entry.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-ota-rate-worksheet/`

### Install and Run

```bash
cd tools/browns-ota-rate-worksheet
npm install
npm run build

# Base rates only
npm run worksheet -- --rates rates.csv --outdir reports/

# Rates with promotions
npm run worksheet -- --rates rates.csv --promo promos.json --outdir reports/
```

### Critical Safety Note

- ✅ **Offline only** - No Booking.com or NightsBridge APIs
- ✅ **Never invents rates** - Blanks stay blank, drafts stay draft
- ✅ **No auto-apply** - Manual Nightsbridge entry only
- ✅ **Clear flagging** - Missing data explicitly marked
- ⚠️ **Grant approval required** - APPROVAL.md must be signed before OTA changes
- ⚠️ **Dullstroom property only** - The Browns Luxury Guest Suites Dullstroom

[→ Full README](./browns-ota-rate-worksheet/README.md)

---

## browns-ct-pack-assemble

**One-line:** Assemble CoS Browns CT timed packs from sibling tool outputs (CT = America/Chicago timezone).

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-ct-pack-assemble/`

### Install and Run

```bash
cd tools/browns-ct-pack-assemble
npm install
npm run build

# Prebuilt inputs only (recommended)
npm run assemble -- \
  --day 2026-09-20 \
  --outdir out/ct-2026-09-20/ \
  --bookings bookings.json \
  --before before.json \
  --after after.json

# Run sibling tools during assembly
npm run assemble -- \
  --day 2026-09-20 \
  --outdir out/ct-2026-09-20/ \
  --bookings bookings.json \
  --run-daily-ops \
  --run-guest-comms \
  --guest-booking guest.json \
  --run-late-checkin

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline orchestrator** - Calls sibling tools via npm run child processes
- ✅ **Prebuilt inputs preferred** - Accept JSON outputs from tools already run
- ✅ **DRAFT ONLY** - Never sends WhatsApp or email automatically
- ✅ **Timed checklist** - PACK.md includes 20:00 / 09:00 / 21:00 CT workflow
- ✅ **CoS owns WhatsApp** - Coexistence of Service required for all sends
- ⚠️ **Never auto-send** - Manual copy/paste to WhatsApp Admin - The Browns only
- ⚠️ **Never invents data** - Passes through from sibling tools only
- ⚠️ **Dullstroom / The Browns only** - Not for other properties

### Output Files

- `PACK.md` - Pack index with timed checklist (20:00 / 09:00 / 21:00 CT)
- `APPROVAL.md` - Safety gates and never auto-send reminder
- `changes.md` - Booking change check output (if run or provided)
- `daily-ops.md` - Daily ops brief (copied from browns-daily-ops-brief)
- `guest-*.md` - Guest welcome drafts (copied from browns-guest-comms-draft)
- `queue.md` - Late check-in queue (copied from browns-late-checkin-queue, if run)
- `unknown-time.md` - Late check-in unknown times (copied from browns-late-checkin-queue, if run)
- `manifest.json` - Machine-readable pack inventory

### Sibling Tools Integration

Calls or accepts outputs from:
- `browns-nightsbridge-bookings-adapter` - Transform Nightsbridge day sheets
- `browns-booking-change-check` - Detect booking changes (not yet implemented)
- `browns-daily-ops-brief` - Generate team ops brief
- `browns-guest-comms-draft` - Generate guest welcome messages
- `browns-late-checkin-queue` - Generate late check-in coordination queue

### CoS CT Pack Workflow

CoS runs timed Browns CT packs:
- **20:00 CT**: Same-day morning guest drafts (welcome messages for arrivals)
- **09:00 CT (next morning)**: After-hours check-ins review
- **21:00 CT**: Staff ops brief for team WhatsApp

This orchestrator assembles all outputs into one dated pack folder ready for Liana vet / Grant approval.

[→ Full README](./browns-ct-pack-assemble/README.md)

---

## browns-ct-pack-post-checklist

**One-line:** Offline CLI tool to generate pre-WhatsApp post checklist from browns-ct-pack-assemble output folder before 20:00 / 09:00 / 21:00 CT Admin posts.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-ct-pack-post-checklist/`

### Install and Run

```bash
cd tools/browns-ct-pack-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./ct-2026-09-20 --outdir out/

# With slot emphasis
npm run checklist -- --pack ./ct-2026-09-20 --outdir out/ --slot 20:00

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **OFFLINE ONLY** — No WhatsApp APIs or network calls
- ✅ **READ-ONLY** — Validates pack structure only; never modifies files
- ✅ **NEVER INVENTS** — No guest phones, rates, or ETAs fabricated
- ✅ **DULLSTROOM / THE BROWNS ONLY** — Scope boundary
- ✅ **CoS OWNS WHATSAPP** — Never auto-sends; manual approval workflow only
- ⚠️ **MANUAL REVIEW REQUIRED** — Every checklist before WhatsApp posting

### Checks Performed

1. **Required files present:** PACK.md, APPROVAL.md
2. **Timed checklist references:** Warns if PACK.md references missing sibling files
3. **Slot expectations (if --slot specified):** 
   - 20:00 CT: Warns if no welcome or guest draft files present
   - 09:00 CT: Warns if no late check-in queue files present
   - 21:00 CT: Warns if no daily-ops.md file present
4. **Booking changes:** Reminds to perform last-minute booking-change-check if changes.md absent

### Output Files

- `POST-CHECKLIST.md` — Numbered go/no-go checklist for CoS WhatsApp Admin - The Browns
- `ISSUES.md` — Failures and warnings only
- `APPROVAL.md` — CoS owns WhatsApp; Grant approval; never auto-send
- `manifest.json` — Machine-readable checklist metadata

### Typical Workflow

1. Generate CT pack with `browns-ct-pack-assemble`
2. Generate post checklist from pack folder
3. Review `POST-CHECKLIST.md` for numbered go/no-go items
4. Review `ISSUES.md` for any failures or warnings
5. CoS manual WhatsApp Admin - The Browns workflow (never automated)

### Integration

- **Input from:** `browns-ct-pack-assemble` (pack folder)
- **Workflow:** CT pack → post checklist → manual CoS WhatsApp posting

### Slot Emphasis

The `--slot` option tailors checklist warnings to specific CT time slots:
- **20:00 CT**: Same-day morning guest drafts (emphasizes guest/welcome files)
- **09:00 CT**: After-hours check-ins (emphasizes late check-in queue)
- **21:00 CT**: Staff ops brief (emphasizes daily-ops.md)
- **all**: Comprehensive warnings for all time slots (default if omitted)

### Scope

- ✅ Dullstroom / The Browns Luxury Guest Suites ONLY
- ❌ Rivendell / other properties: NOT in scope
- ❌ Perfect Water / Heavy Metal: NOT in scope

America/Chicago (CT = Chicago Time for timed operations)

[→ Full README](./browns-ct-pack-post-checklist/README.md)

---

## browns-ct-pack-pipeline-pack

**One-line:** Offline CLI orchestrator for Browns CT pack pipeline: booking-change-check → ct-pack-assemble → optional ct-pack-post-checklist.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-ct-pack-pipeline-pack/`

### Install and Run

```bash
cd tools/browns-ct-pack-pipeline-pack
npm install
npm run build

# Use existing pack, skip post-checklist:
npm run pipeline -- \
  --date 2026-09-20 \
  --pack ../browns-ct-pack-assemble/out/ct-2026-09-20 \
  --outdir pipeline-out/ \
  --no-run-post-checklist

# Full pipeline with change-check:
npm run pipeline -- \
  --date 2026-09-20 \
  --bookings bookings.json \
  --before before.json \
  --after after.json \
  --run-change-check \
  --outdir pipeline-out/

# Default (post-checklist runs):
npm run pipeline -- \
  --date 2026-09-20 \
  --bookings bookings.json \
  --outdir pipeline-out/
```

Orchestrates Browns CT (America/Chicago timezone) pack pipeline for CoS WhatsApp Admin drafts. Never auto-sends. Supports flexible boolean parsing (`--run-post-checklist=false`, `--no-run-post-checklist`). When post-checklist skipped, `POST-CHECKLIST.md` and `ISSUES.md` not listed in manifest.files (accuracy fix). Offline only.

[→ Full README](./browns-ct-pack-pipeline-pack/README.md)

---

## browns-welcome-draft-pack

**One-line:** Generate same-day/upcoming welcome message stubs for CoS WhatsApp Admin from bookings.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/browns-welcome-draft-pack/`

### Install and Run

```bash
cd tools/browns-welcome-draft-pack
npm install
npm run build

# Basic usage (same-day check-ins)
npm run draft-pack -- --bookings bookings.json --outdir out/

# With guest facts
npm run draft-pack -- \
  --bookings bookings.json \
  --facts guest-facts.json \
  --outdir out/

# Custom window (check-ins within 2 days)
npm run draft-pack -- \
  --bookings bookings.json \
  --as-of 2026-09-03 \
  --window-days 2 \
  --outdir out/
```

### Critical Safety Note

- ✅ **Offline only** - No WhatsApp API or NightsBridge integration
- ✅ **DRAFT ONLY** - Never sends messages automatically
- ✅ **Never invents guest phone** - Placeholder `[GUEST_PHONE]` when unknown
- ✅ **Never invents rates** - Placeholder `[RATE CARD REQUIRED]` when unknown
- ✅ **Skips missing names** - Bookings without `guestName` are filtered out
- ✅ **CoS owns WhatsApp** - Coexistence of Service required for all Admin posts
- ⚠️ **Manual approval required** - Review APPROVAL.md before every WhatsApp post
- ⚠️ **Grant approval required** - Before posting to WhatsApp Admin - The Browns

### Use Case

From `bookings.json` (output of `browns-nightsbridge-bookings-adapter`), draft same-day/upcoming welcome message stubs for CoS WhatsApp Admin. Filters bookings by check-in date window (default: same-day). Generates warm, practical Dullstroom-toned welcome stubs with placeholders for missing phone/rates. Never invents data.

### Output Files

- `queue.md` - Numbered list of welcome stubs for CoS WhatsApp posting
- `drafts/<safe-name>.md` - Individual welcome stub per guest
- `missing-fields.md` - Guests missing phone or rate card
- `APPROVAL.md` - Review checklist (CoS posts Admin; Grant approval; no auto-send)
- `manifest.json` - Pack metadata

### Integration

This tool consumes outputs from:
- `browns-nightsbridge-bookings-adapter` - bookings.json
- `browns-guest-facts-pack` - guest-facts.json (optional)

It can feed into:
- `browns-guest-comms-draft` - Full welcome messages
- `browns-ct-pack-assemble` - Timed CT packs

**Note:** Wire integration with sibling tools is not implemented unless trivial. This tool outputs standalone stubs for manual CoS workflow.

[→ Full README](./browns-welcome-draft-pack/README.md)

---

## sa-texas-morning-exception-pack

**One-line:** Assemble SA Ops / CoS weekday Texas-morning exception digest for Heavy Metal + hospitality / The Browns.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-morning-exception-pack/`

### Install and Run

```bash
cd tools/sa-texas-morning-exception-pack
npm install
npm run build

# Minimal usage (with warnings for missing inputs)
npm run pack -- --date 2026-09-02 --outdir out/

# With Browns bookings
npm run pack -- --date 2026-09-02 --outdir out/ --browns-bookings bookings.json

# Full usage with all inputs
npm run pack -- --date 2026-09-02 --outdir out/ \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **DRAFT ONLY** - Never auto-sends WhatsApp or email
- ✅ **CoS owns WhatsApp** - All sends via Coexistence of Service only
- ✅ **Never invents rates** - Heavy Metal pricing stays manual
- ✅ **Never invents volumes** - Heavy Metal quantities from source only
- ✅ **Never invents guest facts** - Browns data from bookings only
- ✅ **Flags missing inputs** - Warnings reported in PACK.md and manifest.json
- ✅ **Offline only** - No APIs or network calls
- ✅ **Perfect Water excluded** - Not in scope for this pack
- ⚠️ **Manual review required** - Every pack before WhatsApp posting

### Scope

**In scope:**
- Heavy Metal Sand & Stone: open quotes (filenames only)
- The Browns: exceptional bookings with special requests or timing flags

**Out of scope:**
- Perfect Water operations (entirely excluded)
- Standard Browns arrivals/departures (use `browns-daily-ops-brief`)
- Heavy Metal quote details/rates/volumes (manual review required)

### Output Files

- `PACK.md` - Pack index with contents, data sources, warnings, and next steps
- `hospitality.md` - The Browns exceptional bookings
- `heavy-metal.md` - Heavy Metal open quotes (filenames only)
- `APPROVAL.md` - Safety gates, CoS workflow, scope boundaries
- `manifest.json` - Machine-readable pack metadata

### Timezone Context

America/Chicago (Texas morning workflow for SA Ops / CoS)

[→ Full README](./sa-texas-morning-exception-pack/README.md)

---

## sa-texas-exception-post-checklist

**One-line:** Offline CLI to generate pre-WhatsApp post checklist from sa-texas-morning-exception-pack output folder.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-exception-post-checklist/`

### Install and Run

```bash
cd tools/sa-texas-exception-post-checklist
npm install
npm run build

# Basic usage
npm run checklist -- --pack ./pack-2026-09-02 --outdir out/

# With date label
npm run checklist -- --pack ./pack-2026-09-02 --outdir out/ --date 2026-09-02

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **OFFLINE ONLY** — No WhatsApp APIs or network calls
- ✅ **READ-ONLY** — Validates pack structure only; never modifies files
- ✅ **NEVER INVENTS** — No Heavy Metal rates/volumes or Browns guest facts fabricated
- ✅ **PERFECT WATER EXCLUDED** — Not in scope for this checklist
- ✅ **CoS OWNS WHATSAPP** — Never auto-sends; manual approval workflow only
- ⚠️ **MANUAL REVIEW REQUIRED** — Every checklist before WhatsApp posting

### Checks Performed

1. **Required files present:** PACK.md, hospitality.md, heavy-metal.md, APPROVAL.md
2. **Hospitality section:** File exists and readable (may be empty)
3. **Heavy Metal section:** File exists and readable (may be empty)
4. **APPROVAL.md present:** Approval content keywords detected
5. **PACK.md warnings:** Warns if warnings or missing inputs detected

### Output Files

- `POST-CHECKLIST.md` — Numbered go/no-go checklist for SA Ops / CoS
- `ISSUES.md` — Failures and warnings only
- `APPROVAL.md` — CoS workflow and safety gates
- `manifest.json` — Machine-readable checklist metadata

### Typical Workflow

1. Generate exception pack with `sa-texas-morning-exception-pack`
2. Generate post checklist from pack folder
3. Review `POST-CHECKLIST.md` for numbered go/no-go items
4. Review `ISSUES.md` for any failures or warnings
5. CoS manual WhatsApp Admin workflow (never automated)

### Integration

- **Input from:** `sa-texas-morning-exception-pack` (pack folder)
- **Workflow:** Exception pack → post checklist → manual CoS WhatsApp posting

### Scope

- ✅ Heavy Metal Sand & Stone: open quotes validation
- ✅ The Browns: exceptional bookings validation
- ❌ Perfect Water: excluded from scope
- ❌ Automated WhatsApp sending: CoS manual workflow only

America/Chicago (Texas morning workflow for SA Ops / CoS)

[→ Full README](./sa-texas-exception-post-checklist/README.md)

---

## sa-texas-exception-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining sa-texas-morning-exception-pack and sa-texas-exception-post-checklist for SA Ops / CoS weekday Texas-morning workflow.

**Owning desk(s):** SA Ops / CoS

**Location:** `tools/sa-texas-exception-pipeline-pack/`

### Install and Run

```bash
cd tools/sa-texas-exception-pipeline-pack
npm install
npm run build

# Use existing morning exception pack (preferred)
npm run pipeline -- --pack ../sa-texas-morning-exception-pack/out/pack-2026-09-02

# Generate morning exception pack first
npm run pipeline -- --run-morning-pack --date 2026-09-02 \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# Skip post-checklist (multiple syntax options)
npm run pipeline -- --pack path/to/pack --run-post-checklist=false
npm run pipeline -- --pack path/to/pack --no-run-post-checklist

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No API calls of any kind
- ✅ **Never sends** - No WhatsApp API, no Gmail API
- ✅ **Read-only assembly** - Never modifies source pack files
- ✅ **No invented data** - Never fabricates rates, volumes, or guest facts
- ✅ **Heavy Metal + hospitality only** - Perfect Water excluded
- ✅ **Accurate manifest** - Only lists files actually present (PR #116 pattern)
- ⚠️ **CoS / SA Ops owns send** - WhatsApp Admin posting via CoS workflow
- ⚠️ **Manual review required** - Review PACK.md, POST-CHECKLIST.md, and ISSUES.md before every post

### Workflow Integration

This tool is the final assembler in the SA Texas-morning exception workflow:

```bash
# Step 1: Generate morning exception pack (or use existing)
cd tools/sa-texas-morning-exception-pack
npm run pack -- --date 2026-09-02 \
  --browns-bookings bookings.json \
  --hm-quotes-dir ./hm-open/ \
  --notes notes.md

# Step 2: Assemble pipeline pack with validation
cd ../sa-texas-exception-pipeline-pack
npm run pipeline -- --pack ../sa-texas-morning-exception-pack/out/pack-2026-09-02

# Step 3: Review outputs
cat out/pipeline-pack-2026-09-02/PACK.md
cat out/pipeline-pack-2026-09-02/POST-CHECKLIST.md
cat out/pipeline-pack-2026-09-02/ISSUES.md

# Step 4: If all checks pass, CoS / SA Ops posts to WhatsApp Admin
```

### Boolean Flag Patterns (PR #114)

The tool supports flexible boolean parsing for `--run-post-checklist`:

```bash
# Enable (explicit)
--run-post-checklist
--run-post-checklist=true
--run-post-checklist true

# Disable (explicit)
--run-post-checklist=false
--run-post-checklist false
--no-run-post-checklist
```

### Manifest Accuracy (PR #116)

When post-checklist is skipped (`--no-run-post-checklist`), the manifest accurately reflects files present:

```json
{
  "postChecklistRan": false,
  "files": [
    "PACK.md",
    "manifest.json",
    "hospitality.md",
    "heavy-metal.md",
    "APPROVAL.md"
  ]
}
```

**No POST-CHECKLIST.md or ISSUES.md** listed when post-checklist was not run.

[→ Full README](./sa-texas-exception-pipeline-pack/README.md)

---

## career-jd-hard-gates-score

**One-line:** Score job descriptions against career hard gates for Career bot apply decisions.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-jd-hard-gates-score/`

### Install and Run

```bash
cd tools/career-jd-hard-gates-score
npm install
npm run build

# Basic scoring
npm run score -- --jd path/to/jd.txt --outdir out/

# With custom gates
npm run score -- --jd jd.txt --gates gates.json

# With overrides
npm run score -- --jd jd.txt --company "Tesla" --title "Operations Manager"

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

### Critical Safety Note

- ✅ **Offline only** - Keyword/regex heuristics, no LLM, no network
- ✅ **Never invents compensation** - Dollar amounts only from JD text
- ✅ **Facts-only reminder** - All outputs remind Career to use existing career-os claims
- ✅ **Fail-closed** - Unknown/ambiguous cases default to safer handling
- ⚠️ **Career bot owns apply** - This is a scoring aid, not an auto-apply system
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

[→ Full README](./career-jd-hard-gates-score/README.md)

---

## career-cover-letter-facts-lint

**One-line:** Lint cover letter drafts against allowed facts from career-os to prevent invented claims.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-cover-letter-facts-lint/`

### Install and Run

```bash
cd tools/career-cover-letter-facts-lint
npm install
npm run build

# Basic linting
npm run lint -- --draft cover.md --facts facts.json --outdir out/

# Strict mode (exit 1 on unmatched)
npm run lint -- --draft cover.md --facts facts.json --strict

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

### Critical Safety Note

- ✅ **Offline only** - Keyword/regex heuristics, no LLM, no network
- ✅ **Never invents compensation, titles, or employers** - Only flags claims not in facts
- ✅ **Facts-only reminder** - All outputs remind Career to use existing career-os claims
- ✅ **Fail-closed** - Unknown/ambiguous cases default to unmatched
- ⚠️ **Career bot owns apply** - This is a facts-check aid, not an auto-apply system
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

### Linting Heuristics

- Extract sentence-level claims from draft
- Fuzzy/token overlap matching against facts
- Flag numbers/$ amounts in draft not present in facts
- Flag employer/title tokens not in facts
- Fail closed on unknowns

### Facts File Format (Flexible)

```json
{ "claims": ["fact 1", "fact 2", ...] }
{ "bullets": ["point 1", "point 2", ...] }
["fact 1", "fact 2", ...]  (flat array)
```

### Output Files

- `report.json` - Matched/unmatched/suspicious phrases
- `report.md` - Numbered findings (NO invented rewrites)
- `APPROVAL.md` - Career owns apply; never invents claims
- `manifest.json` - Run metadata

### Exit Codes

- **0** - Ran successfully (even if unmatched found)
- **1** - Bad input or strict mode violations

[→ Full README](./career-cover-letter-facts-lint/README.md)

---

## career-application-packet-assemble

**One-line:** Assemble dated application packet with score report, cover lint report, facts snapshot, and APPROVAL checklist.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-application-packet-assemble/`

### Install and Run

```bash
cd tools/career-application-packet-assemble
npm install
npm run build

# Use prebuilt reports
npm run assemble -- --outdir out/packet-20260902/ \\
  --score path/to/score-outdir/scorecard.md \\
  --cover-lint path/to/lint-outdir/report.md \\
  --facts facts.json \\
  --jd jd.txt

# Run scoring tool during assembly
npm run assemble -- --outdir out/packet-20260902/ \\
  --run-score --jd jd.txt \\
  --cover-lint lint-outdir/report.md \\
  --facts facts.json

# Run both tools during assembly
npm run assemble -- --outdir out/packet-20260902/ \\
  --run-score --jd jd.txt \\
  --run-cover-lint --draft cover.md --facts facts.json
```

### Critical Safety Note

- ✅ **Offline orchestrator** - Calls sibling tools via npm run or accepts prebuilt reports
- ✅ **Never invents data** - Only packages existing reports
- ✅ **Facts-only reminder** - APPROVAL.md checks Career uses career-os claims only
- ✅ **Score floor enforced** - APPROVAL.md verifies score ≥8
- ✅ **Career bot owns apply** - This is packaging aid, not auto-apply
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

### Output Files

- `PACK.md` - Packet index with score/lint summaries, contents, warnings, next steps
- `APPROVAL.md` - Checklist with hard gates (score ≥8, gates pass, verdict apply, lint safe)
- `score-report.md` - Copy of scorecard from score tool (if provided)
- `cover-lint-report.md` - Copy of report from lint tool (if provided)
- `facts.json` - Copy of career-os facts (if provided)
- `jd.txt` - Copy of job description (if provided)
- `manifest.json` - Machine-readable packet metadata

### Integration with Sibling Tools

Can copy prebuilt reports OR shell out to:
- `career-jd-hard-gates-score` via `--run-score --jd <path>`
- `career-cover-letter-facts-lint` via `--run-cover-lint --draft <path> --facts <path>`

[→ Full README](./career-application-packet-assemble/README.md)

---

## career-hunt-run-log

**One-line:** Append career hunt runs into durable offline log for live-improve tracking with scored roles, applications, and skips/rejects.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-hunt-run-log/`

### Install and Run

```bash
cd tools/career-hunt-run-log
npm install
npm run build

# Mode 1: Structured run.json
npm run log -- --run path/to/run.json --outdir out/

# Mode 2: Individual flag files
npm run log -- \
  --date 2026-09-02 \
  --scored path/to/scores.json \
  --applied path/to/applied.json \
  --skipped path/to/skipped.json \
  --outdir out/

# With notes
npm run log -- --run run.json --outdir out/ --notes notes.md

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

### Critical Safety Note

- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Append-only** - Never rewrites prior lines in runs.jsonl
- ✅ **Never invents scores** - Only logs provided scores from career-jd-hard-gates-score
- ✅ **Never invents employers** - Only logs provided company names
- ✅ **Exit 1 on bad input** - Malformed JSON or missing company/title rejected
- ✅ **Career bot owns apply** - This tool does not apply to jobs
- ⚠️ **Facts-only tracking** - All data from provided inputs

### Behavior

1. **Normalize** each entry: company, title, score?, gatePass?, action, reason?, source?
2. **Validate** all entries: exit 1 on missing required fields (company, title, action, date)
3. **Append** to runs.jsonl (creates if missing). Never rewrites prior lines.
4. **Regenerate** runs.md summary from full jsonl (counts by action; latest run detail)
5. **Generate** APPROVAL.md and manifest.json

### Output Files

- `runs.jsonl` - Append-only log (one JSON object per line)
- `runs.md` - Regenerated summary with counts and latest run detail
- `APPROVAL.md` - Safety gates and Career ownership notice
- `manifest.json` - This invocation metadata

### Required Fields

- company [REQUIRED]
- title [REQUIRED]
- action: scored|applied|skipped|rejected [REQUIRED]
- date: YYYY-MM-DD [REQUIRED]

Optional: score (0-10), gatePass (true/false), reason, source

### Integration with Career Tools

```bash
# Step 1: Score a JD
cd tools/career-jd-hard-gates-score
npm run score -- --jd tesla-ops.txt --outdir score-out/

# Step 2: Log the run
cd ../career-hunt-run-log
npm run log -- \
  --date 2026-09-02 \
  --scored ../career-jd-hard-gates-score/score-out/scorecard.json \
  --outdir hunt-log/

# Step 3: Review summary
cat hunt-log/runs.md
```

[→ Full README](./career-hunt-run-log/README.md)

---

## career-live-improve-digest

**One-line:** Generate live-improve digest from career-hunt-run-log output for Career learning.md with skip/reject patterns and score bands.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-live-improve-digest/`

### Install and Run

```bash
cd tools/career-live-improve-digest
npm install
npm run build

# From runs.jsonl (preferred)
npm run digest -- --log path/to/runs.jsonl --outdir out/

# From runs.md summary
npm run digest -- --summary path/to/runs.md --outdir out/

# With time filter
npm run digest -- --log runs.jsonl --since 2026-08-01 --outdir out/

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Never invents data** - Only quotes from runs.jsonl
- ✅ **Never invents scores** - Only processes provided scores
- ✅ **Never invents employers** - Only lists companies from log
- ✅ **Career bot owns apply** - This digest is for learning only
- ✅ **Exit 1 on bad input** - Malformed jsonl or missing files
- ⚠️ **Never auto-updates learning.md** - Career reviews and folds in manually

### Input Formats

**runs.jsonl (Preferred):**
```jsonl
{"company":"Tesla","title":"Operations Manager","score":9,"gatePass":true,"action":"scored","source":"LinkedIn","date":"2026-09-02"}
{"company":"SpaceX","title":"Director","action":"applied","source":"Indeed","date":"2026-09-02"}
{"company":"BadCo","title":"IC","action":"skipped","reason":"Too junior","source":"LinkedIn","date":"2026-09-02"}
```

**runs.md (Optional):** Human-readable summary with counts

### Behavior

1. **Parse** runs.jsonl line by line
2. **Filter** with optional `--since YYYY-MM-DD`
3. **Analyze** patterns:
   - Skip reasons with counts
   - Score bands: 0-4 (low), 5-6 (medium), 7-8 (good), 9-10 (excellent)
   - Gate fails: scored but gatePass=false
   - Source distribution
4. **Generate** LEARNING-DRAFT.md, stats.json, APPROVAL.md, manifest.json

### Output Files

**LEARNING-DRAFT.md:** Numbered patterns for Career to fold into learning.md

**stats.json:** Machine-readable statistics
```json
{
  "period": { "since": "2026-08-01", "until": "2026-09-02", "totalDays": 32 },
  "totals": { "entries": 23, "scored": 12, "applied": 5, "skipped": 4, "rejected": 2 },
  "scoreBands": { "excellent_9_10": 4, "good_7_8": 5, "medium_5_6": 2, "low_0_4": 1 },
  "gateFails": { "total": 3, "patterns": {...} },
  "skipReasons": { "Too junior": 3, "DNC list": 2 },
  "sources": { "LinkedIn": 15, "Indeed": 5 }
}
```

**APPROVAL.md:** Safety gates and Career ownership notice

**manifest.json:** Tool metadata

### Integration with career-hunt-run-log

```bash
# Step 1: Build runs log
cd tools/career-hunt-run-log
npm run log -- --run run-2026-09-02.json --outdir hunt-log/

# Step 2: Generate learning digest
cd ../career-live-improve-digest
npm run digest -- --log ../career-hunt-run-log/hunt-log/runs.jsonl --outdir digest/

# Step 3: Review LEARNING-DRAFT.md
cat digest/LEARNING-DRAFT.md

# Step 4: Career manually folds insights into career-os learning.md
```

### Use Cases

- **Pattern discovery** - Identify common skip/reject reasons
- **Score calibration** - Track score band distribution over time
- **Gate tuning** - Find roles that score high but fail gates
- **Source optimization** - Track which sources yield best roles

[→ Full README](./career-live-improve-digest/README.md)

---

## career-weekday-improve-pack

**One-line:** Orchestrate career-hunt-run-log outputs into career-live-improve-digest results for folding into learning.md.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-weekday-improve-pack/`

### Install and Run

```bash
cd tools/career-weekday-improve-pack
npm install
npm run build

# Use prebuilt digest
npm run pack -- --outdir pack-out/ --digest-outdir ../career-live-improve-digest/out/

# Run digest tool during pack
npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl

# With time filter
npm run pack -- --outdir pack-out/ --run-digest --log runs.jsonl --since 2026-08-01

# Test with fixtures
npm run test:fixtures
```

### Critical Safety Note

- ✅ **Offline only** - No job board APIs
- ✅ **Never invents scores or employers** - Only packages existing digest outputs
- ✅ **Career owns apply** - This tool does not apply to jobs
- ✅ **Never auto-updates learning.md** - Manual fold-in required
- ✅ **Exit 1 on missing inputs** - Validation failures are fatal
- ⚠️ **Orchestrator** - Can run career-live-improve-digest via --run-digest

### Pack Contents

- `PACK.md` - Index with counts and summary (no invented employers)
- `LEARNING-DRAFT.md` - Copy from digest (numbered patterns)
- `stats.json` - Copy from digest (machine-readable)
- `runs.md` - Hunt runs summary (if available)
- `APPROVAL.md` - Safety gates and Career ownership
- `manifest.json` - Tool metadata

[→ Full README](./career-weekday-improve-pack/README.md)

---

## career-weekday-improve-pipeline-pack

**One-line:** Offline CLI pipeline pack assembler combining career-weekday-improve-pack with optional career-live-improve-digest and career-hunt-run-log for Career weekday workflow.

**Owning desk(s):** Career / CoS

**Location:** `tools/career-weekday-improve-pipeline-pack/`

### Install and Run

```bash
cd tools/career-weekday-improve-pipeline-pack
npm install
npm run build

# Use existing improve pack (digest default ON)
npm run pipeline -- --pack ../career-weekday-improve-pack/out/pack-2026-09-02

# Skip digest (default ON, turn OFF)
npm run pipeline -- --pack path/to/pack --no-run-digest

# Run hunt-log append (default OFF, turn ON)
npm run pipeline -- --pack path/to/pack --run-hunt-log --log runs.jsonl

# Test with fixtures
npm run test:fixtures
```

### Purpose

Assemble a complete Career weekday pipeline pack that combines `career-weekday-improve-pack` output with optional `career-live-improve-digest` results and `career-hunt-run-log` append for Career learning.md fold-in. Never invents Grant facts. Never loosens DNC / $180k+ / WFH hard gates. Never auto-applies.

### Optional Stages (Flexible Boolean Flags)

- **Digest (default ON):** `--run-digest` / `--no-run-digest` - Run career-live-improve-digest
- **Hunt Log (default OFF):** `--run-hunt-log` / `--no-run-hunt-log` - Append to career-hunt-run-log

### Output Files

- `PACK.md` - Index of improve pack + optional digest + hunt-log status
- `LEARNING-DRAFT.md` - From improve pack (numbered patterns)
- `stats.json` - From improve pack (if present)
- `APPROVAL.md` - Career owns apply; hard gates unchanged; no invented facts
- `DIGEST-LEARNING-DRAFT.md` - From digest (if --run-digest)
- `DIGEST-stats.json` - From digest (if --run-digest)
- `HUNT-LOG-runs.jsonl` - From hunt-log (if --run-hunt-log)
- `HUNT-LOG-runs.md` - From hunt-log (if --run-hunt-log)
- `manifest.json` - Metadata (accurate to present files, PR #116 pattern)

### Critical Safety Notes

- ✅ **Offline only** - No job board APIs or live data
- ✅ **Never auto-applies** - Career bot owns apply workflow
- ✅ **Never auto-updates learning.md** - Manual fold-in required
- ✅ **Hard gates unchanged** - $180k+, DNC list, WFH requirements remain
- ✅ **No invented data** - Never fabricates scores, employers, or compensation
- ✅ **Flexible boolean flags** - PR #114 style for optional stages
- ✅ **Accurate manifest** - PR #116 pattern excludes optional files when skipped
- ⚠️ **Career owns apply** - Apply decisions separate from learning workflow
- ⚠️ **Manual review required** - Review PACK.md and APPROVAL.md before fold-in

[→ Full README](./career-weekday-improve-pipeline-pack/README.md)

---

## tools-catalog-doctor

**One-line:** Validate tools/README.md catalog integrity: discover tool directories, check index completeness, detect duplicate sections.

**Owning desk(s):** CoS / Repository Maintenance

**Location:** `tools/tools-catalog-doctor/`

### Install and Run

```bash
cd tools/tools-catalog-doctor
npm install
npm run build

# Default: assume cwd is tools/tools-catalog-doctor, repo root is ../..
npm run doctor

# Explicit root path
npm run doctor -- --root ../..

# Custom paths
npm run doctor -- --catalog tools/README.md --toolsDir tools
```

### Critical Safety Note

- ✅ **Read-only** - Never modifies catalog or tool directories
- ✅ **Offline only** - No APIs or network calls
- ✅ **Structural checks only** - Does not validate tool descriptions
- ✅ **CI-friendly** - Exit codes suitable for CI pipelines (0 = healthy, 1 = issues)
- ⚠️ **Catches catalog corruption** - Detects missing tools, duplicates, and structural errors

[→ Full README](./tools-catalog-doctor/README.md)

---

## drive-pdf-upload-prep

**One-line:** Offline CLI to prepare PDF files for Google Drive MCP `create_file` by converting to base64 JSON payloads with auto-compression.

**Owning desk(s):** Perfect Water / CoS / Hospitality Ops

**Location:** `tools/drive-pdf-upload-prep/`

### Install and Run

#### System Dependencies

```bash
# Ubuntu/Debian
sudo apt-get install -y ghostscript poppler-utils

# macOS
brew install ghostscript poppler

# Alpine (Cloud Agent VMs)
apk add ghostscript poppler-utils
```

#### Python Setup

```bash
cd tools/drive-pdf-upload-prep
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Process all PDFs in a directory
python upload_prep.py \
  --input-dir invoices/ \
  --parent-id 1A2B3C4D5E6F \
  --output-dir out/

# Process specific files
python upload_prep.py \
  --input-files invoice1.pdf invoice2.pdf \
  --parent-id 1A2B3C4D5E6F \
  --output-dir prepared/

# Test with fixtures
python test_fixtures.py
```

### Critical Safety Note

- ✅ **Offline only** - No Drive API calls from this tool
- ✅ **Never invents data** - Purely encodes existing PDFs
- ✅ **Read-only** - Never modifies original PDF files
- ✅ **Preserves originals** - Compressed PDFs are intermediate (not saved)
- ✅ **Compression is lossy** - Rasterizes to greyscale JPEG when needed
- ⚠️ **Base64 size limits** - Drive MCP may fail if JSON still exceeds ~15KB
- ⚠️ **One file at a time** - Upload JSONs sequentially with Drive MCP (not batch)
- ⚠️ **Review manifest** - Check `compressed: true` entries for quality before upload

### Why This Tool Exists

Hospitality Google Drive MCP `create_file` reliably accepts ~≤15KB base64 payloads but fails/stalls on full ~18–25KB invoice PDFs when embedded in `CallMcpTool` from subagents. This tool provides repeatable offline prep for bots (Perfect Water, Coding, CoS).

### Output Structure

Generates one JSON per PDF ready for Drive MCP `create_file`:

```json
{
  "title": "invoice-001.pdf",
  "parentId": "1A2B3C4D5E6F",
  "contentMimeType": "application/pdf",
  "disableConversionToGoogleType": true,
  "base64Content": "JVBERi0xLjQKJeLjz9MK..."
}
```

Plus `manifest.json` tracking compression outcomes and file sizes.

### Bot Integration

```python
# Step 1: Prep PDFs offline
subprocess.run(['python', 'tools/drive-pdf-upload-prep/upload_prep.py',
                '--input-dir', 'invoices/', '--parent-id', '1A2B3C',
                '--output-dir', 'drive-payloads/'])

# Step 2: Upload with Drive MCP (one at a time)
with open('drive-payloads/manifest.json') as f:
    manifest = json.load(f)

for file_info in manifest['files']:
    json_path = Path('drive-payloads') / file_info['json_output']
    with open(json_path) as f:
        payload = json.load(f)
    
    # Use hospitality Google-drive MCP
    result = await mcp.call_tool(server='Google-drive',
                                   tool='create_file',
                                   arguments=payload)
```

[→ Full README](./drive-pdf-upload-prep/README.md)

---

## drive-create-file-validate

**One-line:** Offline CLI validator for Drive `create_file` JSON payloads to catch bad base64, oversized files, and missing fields before MCP upload.

**Owning desk(s):** Perfect Water / CoS / Hospitality Ops / Coding

**Location:** `tools/drive-create-file-validate/`

### Install and Run

```bash
cd tools/drive-create-file-validate

# No pip install needed - stdlib only
python3 --version  # Requires Python 3.8+

# Validate all JSONs in a directory
python validate.py --input-dir out/prepared/

# Validate specific files with custom size limit
python validate.py --input-files a.create_file.json b.create_file.json --max-b64 12000

# Enable PDF magic byte check
python validate.py --input-dir out/prepared/ --require-pdf-magic

# Test with fixtures
python test_fixtures.py
```

### Critical Safety Note

- ✅ **Offline only** - No Drive API calls
- ✅ **Never invents data** - Purely validates existing payloads
- ✅ **Read-only** - Never modifies JSON files
- ✅ **CI-friendly** - Exit codes 0 (all valid) or 1 (some invalid)
- ✅ **Preflight check** - Catches errors before they hit MCP connector
- ⚠️ **Use before every upload batch** - Validation is cheap; fixing corrupted uploads is expensive

### Why This Tool Exists

At-PET Drive uploads hit "not a valid base64 string" / tool-bridge corruption on ~10–13KB payloads. This **preflight validator** checks `*.create_file.json` files (generated by `drive-pdf-upload-prep`) before calling hospitality Drive MCP `create_file`, catching:

- Malformed base64 (non-standard characters)
- Oversized payloads (exceeding MCP limits)
- Missing required fields
- Type mismatches
- Optional: Invalid PDF magic bytes

Prevents wasted API calls and partial upload failures.

### Integration with drive-pdf-upload-prep

```bash
# Step 1: Prep PDFs
cd tools/drive-pdf-upload-prep
python upload_prep.py --input-dir invoices/ --parent-id ABC123 --output-dir prepared/

# Step 2: Validate payloads
cd ../drive-create-file-validate
python validate.py --input-dir ../drive-pdf-upload-prep/prepared/ --require-pdf-magic

# Step 3: If validation passes, proceed with MCP upload
# If validation fails, review reports/report.md and fix prep settings
```

### Output Structure

Generates:
- `valid.json` - List of valid files (safe for upload)
- `invalid.json` - List of invalid files with error details
- `report.md` - Human-readable numbered digest (filename + reason, NO file bodies)

[→ Full README](./drive-create-file-validate/README.md)

---

## pw-invoice-docno-index

**One-line:** Offline CLI to index Perfect Water / CoS invoice Doc Nos from filenames to prevent duplicate uploads during At-PET Drive operations.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-invoice-docno-index/`

### Install and Run

```bash
cd tools/pw-invoice-docno-index
npm install
npm run build

# Scan directory
npm run index -- --dir ./pdfs/ --outdir out/

# From filename list
npm run index -- --files names.txt --outdir out/

# Compare against known index
npm run index -- --dir ./pdfs/ --known known-index.md --outdir out/

# Test with fixtures
npm run test:fixtures:dir
npm run test:fixtures:list
npm run test:fixtures:known
```

### Critical Safety Note

- ✅ **Offline only** - No Drive API or network calls
- ✅ **Basename-only** - Never opens or reads PDF file bodies
- ✅ **Read-only** - Does not move, rename, or modify files
- ✅ **Never invents Doc Nos** - Only extracts from filenames using `/IN\d+/i` regex
- ✅ **Duplicate detection** - Flags Doc Nos appearing multiple times in batch
- ✅ **Known index comparison** - Identifies already-uploaded vs new invoices

### Why This Tool Exists

Tonight's At-PET Drive uploads risked duplicate PDFs. This tool builds a basename-only index of invoice Doc Nos (e.g., `IN236058`) from a folder or filename list, with optional comparison against an existing index to flag already-uploaded vs new invoices.

### Output Files

- `index.json` - Doc No → filenames mapping
- `index.md` - Human-readable index
- `dupes-in-batch.md` - Duplicate Doc Nos in this batch (if any)
- `already-known.md` - Doc Nos already in known index (if `--known` provided)
- `new.md` - New Doc Nos not in known index (if `--known` provided)
- `manifest.json` - Run metadata

### Pattern

- **Regex:** `/IN\d+/i`
- **Examples:** `IN236058`, `in123456`, `IN999999`
- All extracted Doc Nos normalized to uppercase

### Integration with At-PET Drive Workflow

1. **Before upload:** Run indexer on tonight's batch
2. **Review:** Check `dupes-in-batch.md` and remove duplicates
3. **Compare:** Use `--known` to identify already-uploaded files
4. **Upload:** Only upload files listed in `new.md`
5. **After upload:** Append new Doc Nos to known index for next batch

[→ Full README](./pw-invoice-docno-index/README.md)

---

## Browns Pipeline Flow

The Browns guest-flow tools work together in this pipeline:

```
stay-knowledge/the-browns.md
    ↓
browns-guest-facts-pack (extract brand facts → facts.json)
    ↓
    │
Inquiry (email/WhatsApp) 
    ↓
browns-inquiry-intake (extract structured JSON)
    ↓
    ├──→ browns-inquiry-quote-pipeline-pack (orchestrate inquiry → quote)
    │        ↓
    │   browns-quote-invoice-draft (quotes/invoices)
    ├──→ browns-guest-comms-draft (welcome messages, consumes facts.json)
    └──→ browns-daily-ops-brief (team coordination)

Nightsbridge screen (day sheet)
    ↓
browns-nightsbridge-bookings-adapter (CSV/TSV → bookings.json)
    ↓
browns-daily-ops-brief (team coordination)

browns-ota-rate-worksheet (separate: rate card → OTA entry)
```

**Note:** `browns-guest-facts-pack` feeds facts to `browns-guest-comms-draft` via `--facts` argument.

### Pipeline Rules

1. **WhatsApp sends via CoS only** - Coexistence of Service is the approved WhatsApp platform
2. **Never invent rates or amounts** - Tools pass through provided data or leave blank
3. **DRAFT-only outputs** - All guest-facing comms require H1/H2 approval gates
4. **Offline operation** - No live API connections to WhatsApp, Gmail, or NightsBridge
5. **Human review required** - Every tool generates APPROVAL.md for sign-off

---

## General Constraints (All Tools)

1. **Offline only** - No live API connections
2. **CSV/file exports required** - Manual export step from each source system
3. **No secrets** - No API keys, tokens, or credentials stored in any tool
4. **File-based** - All data stays in CSV/markdown/JSON files
5. **Read-only** - No write-back to source systems
6. **No invented data** - Tools never fabricate rates, amounts, stock levels, or legal positions

---

## Quality Gates

Before using any tool in production:

1. **Test with fixtures** - Each tool includes `npm run test:fixtures`
2. **Review sample output** - Check generated reports for correctness
3. **Dry-run first** - Use small date ranges or sample data before full exports
4. **No auto-send** - All outputs are drafts/reports for human review

---

## Common Commands

### Build All Tools

```bash
for dir in tools/*/; do
  (cd "$dir" && [ -f package.json ] && npm install && npm run build)
done
```

### Run All Tests

```bash
for dir in tools/*/; do
  (cd "$dir" && [ -f package.json ] && npm test)
done
```

### Clean All Artifacts

```bash
for dir in tools/*/; do
  (cd "$dir" && [ -f package.json ] && npm run clean 2>/dev/null || true)
done
```

---

## Contributing

When adding a new tool:

1. Create `tools/<tool-name>/` directory
2. Include `README.md` with:
   - One-line purpose
   - Owning desk(s)
   - Install/run instructions
   - Critical safety notes
   - Test fixtures and `npm run test:fixtures` command
3. Update this catalog table and index
4. Ensure tool follows general constraints above
5. Add conventional commit: `feat(tools): add <tool-name>`

**Quality gate:** CI runs `tools-catalog-doctor` on every PR to verify catalog integrity.

---

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
