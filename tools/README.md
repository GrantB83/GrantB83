# Tools Catalog

Command-line utilities for CoS, bot desks, and owned-business operations. Each tool is **offline**, **read-only**, and works with CSV/file exports only.

## Index

| Tool | Purpose | Desk(s) | Safety Note |
|------|---------|---------|-------------|
| [csv-fixture-harness](#csv-fixture-harness) | Validate CSV fixtures: headers, row counts, blanks, currency violations | Perfect Water / Ledger / Browns / Vault | **Read-only**. Never modifies files. No invented amounts. |
| [pw-bank-csv-normalize](#pw-bank-csv-normalize) | Normalize SA bank CSVs to Xero format for receipt recon | Perfect Water / CoS | **Offline**. No invented amounts. Blanks → rejected.csv. |
| [loyverse-xero-recon](#loyverse-xero-recon) | Reconcile Loyverse POS sales with Xero accounting | Perfect Water / CoS | **No API keys**. Offline CSV only. No invented amounts. |
| [pw-loyverse-daily-sales-digest](#pw-loyverse-daily-sales-digest) | Generate Perfect Water daily sales digest from Loyverse CSV exports | Perfect Water / CoS | **Offline**. No Loyverse API. No invented amounts. Amounts stay in files. |
| [pw-ordered-vs-sold-diff](#pw-ordered-vs-sold-diff) | Compare ordered exports vs sold/Loyverse exports by SKU/Item for CoS | Perfect Water / CoS | **Offline**. No invented quantities. Blanks → rejected. Amounts stay in files. |
| [attachment-filename-index](#attachment-filename-index) | Index Drive/mail attachment filenames without opening file bodies | Vault / CoS / Perfect Water | **No file body reads**. Never extracts amounts. Filename classification only. |
| [vault-filename-due-queue](#vault-filename-due-queue) | Extract due date hints from CIPC/SARS/trust filenames without opening bodies | Vault / CoS | **No file body reads**. Never invents dates or legal positions. Heuristic extraction only. |
| [budget-merchant-matcher](#budget-merchant-matcher) | Match budget transactions against merchant rules | Ledger / CoS | **Amounts pass-through only**. Never invented. Keep amounts in files, not chat. |
| [ledger-unmatched-merchant-queue](#ledger-unmatched-merchant-queue) | Build research queue for unmatched merchants from budget CSV | Ledger / CoS | **Offline**. No invented amounts. Amounts stay in files, not prose. Research aid only. |
| [ledger-month-close-pack](#ledger-month-close-pack) | Build offline month-end close pack: CSV inventory, header sanity, APPROVAL checklist | Ledger / CoS | **Offline**. Amounts stay in files, never in digest prose. H2 approval required. |
| [suno-package-prep](#suno-package-prep) | Package kid lyrics for manual Suno paste workflow | Studio | **No browser automation**. No Suno API. No auto-send. Manual paste only. |
| [studio-suno-package-validate](#studio-suno-package-validate) | Validate Suno job packages before Studio spends browser time | Studio / BrownieTunez | **Offline only**. Read-only. No Suno/YouTube APIs. Preflight validator. |
| [family-school-subject-digest](#family-school-subject-digest) | Generate family school/admin digest from email subjects | Family Command Center | **No LLM**. Keyword classification only. DRAFT ONLY. Never sends. |
| [family-morning-digest-pack](#family-morning-digest-pack) | Assemble morning digest pack with clear Kids School / Family separation | Family Command Center / CoS | **Offline**. DRAFT ONLY. Never sends. Clear section separation. No duplicate items. |
| [browns-inquiry-intake](#browns-inquiry-intake) | Extract structured booking/quote JSON from inquiry text | SA Ops / CoS | **No LLM**. No auto-send. Never invents rates. WhatsApp stays on CoS. |
| [hm-quote-intake](#hm-quote-intake) | Extract structured quote JSON from Heavy Metal WhatsApp inquiry text | SA Ops / Heavy Metal | **No LLM**. No auto-send. Never invents volume/price/location. WhatsApp stays on CoS. |
| [browns-guest-facts-pack](#browns-guest-facts-pack) | Extract structured guest facts from markdown into JSON and snippets | SA Ops / CoS | **Never invents**. Offline only. No fabricated passwords/rates/times. Missing fields flagged. |
| [browns-guest-comms-draft](#browns-guest-comms-draft) | Generate DRAFT guest communications from booking JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents times or rates. Manual approval required. |
| [browns-quote-invoice-draft](#browns-quote-invoice-draft) | Generate DRAFT quote/invoice communications from booking/quote JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Missing amounts = availability-only. |
| [browns-nightsbridge-bookings-adapter](#browns-nightsbridge-bookings-adapter) | Transform Nightsbridge day sheets into bookings.json for daily-ops-brief | SA Ops / CoS | **Offline only**. Never invents data. Flags missing fields. Feed into daily-ops-brief. |
| [browns-daily-ops-brief](#browns-daily-ops-brief) | Generate daily ops team brief from bookings | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Manual team WhatsApp send. |
| [browns-late-checkin-queue](#browns-late-checkin-queue) | Generate late/after-hours check-in queue for CoS coordination | SA Ops / CoS | **DRAFT ONLY**. Never invents times/phones. Offline only. Manual CoS WhatsApp send. |
| [browns-booking-change-check](#browns-booking-change-check) | Diff two booking snapshots and report changes for last-minute CT-pack verification | SA Ops / CoS | **Offline only**. Never invents data. DRAFT ONLY. No auto-send. Pre-post checklist. |
| [browns-ota-rate-worksheet](#browns-ota-rate-worksheet) | Generate OTA rate worksheets for Nightsbridge entry | SA Ops / CoS | **No API**. Never invents rates. Blanks stay blank. Grant approval required. |
| [browns-ct-pack-assemble](#browns-ct-pack-assemble) | Assemble CoS Browns CT (Centurion Township) timed packs from sibling tool outputs | SA Ops / CoS | **Offline orchestrator**. Calls sibling tools via npm run. Never auto-send. Draft-only. |
| [sa-texas-morning-exception-pack](#sa-texas-morning-exception-pack) | Assemble SA Ops Texas-morning exception digest for Heavy Metal + hospitality / The Browns | SA Ops / CoS | **DRAFT ONLY**. CoS owns WhatsApp. Never invents rates/volumes/guest facts. Perfect Water excluded. |
| [career-jd-hard-gates-score](#career-jd-hard-gates-score) | Score job descriptions against career hard gates for apply decisions | Career / CoS | **Offline only**. Never invents comp. Facts-only reminder. Career bot owns apply. |
| [career-cover-letter-facts-lint](#career-cover-letter-facts-lint) | Lint cover letter drafts against allowed facts to prevent invented claims | Career / CoS | **Offline only**. Never invents comp/titles/employers. Facts-only reminder. Career bot owns apply. |
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
- ⚠️ **Family / CoS owns send** - WhatsApp Admin posting via Family bot or CoS workflow
- ⚠️ **Manual review required** - Review APPROVAL.md before every post

### Output Files

Creates pack folder: `<outdir>/pack-YYYY-MM-DD/`

- **PACK.md** - Index and checklist with item counts and review steps
- **school.md** - Kids School items only (numbered 1-N)
- **family.md** - Family Admin items only (numbered N+1 onward, no school repeats)
- **APPROVAL.md** - Review document with safety gates
- **manifest.json** - Machine-readable pack metadata

### Integration with family-school-subject-digest

This tool preferably consumes outputs from `family-school-subject-digest`:

```bash
# Step 1: Run subject digest
cd tools/family-school-subject-digest
npm run digest -- --input subjects.txt --outdir digest-out/

# Step 2: Assemble morning pack
cd ../family-morning-digest-pack
npm run pack -- \
  --date 2026-09-02 \
  --subjects ../family-school-subject-digest/digest-out/digest-TIMESTAMP/items.json
```

Or use `--run-subject-digest` to do both in one command.

[→ Full README](./family-morning-digest-pack/README.md)

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
    ├──→ browns-guest-comms-draft (welcome messages, consumes facts.json)
    ├──→ browns-quote-invoice-draft (quotes/invoices)
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
