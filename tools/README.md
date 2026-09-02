# Tools Catalog

Command-line utilities for CoS, bot desks, and owned-business operations. Each tool is **offline**, **read-only**, and works with CSV/file exports only.

## Index

| Tool | Purpose | Desk(s) | Safety Note |
|------|---------|---------|-------------|
| [csv-fixture-harness](#csv-fixture-harness) | Validate CSV fixtures: headers, row counts, blanks, currency violations | Perfect Water / Ledger / Browns / Vault | **Read-only**. Never modifies files. No invented amounts. |
| [loyverse-xero-recon](#loyverse-xero-recon) | Reconcile Loyverse POS sales with Xero accounting | Perfect Water / CoS | **No API keys**. Offline CSV only. No invented amounts. |
| [attachment-filename-index](#attachment-filename-index) | Index Drive/mail attachment filenames without opening file bodies | Vault / CoS / Perfect Water | **No file body reads**. Never extracts amounts. Filename classification only. |
| [budget-merchant-matcher](#budget-merchant-matcher) | Match budget transactions against merchant rules | Ledger / CoS | **Amounts pass-through only**. Never invented. Keep amounts in files, not chat. |
| [suno-package-prep](#suno-package-prep) | Package kid lyrics for manual Suno paste workflow | Studio | **No browser automation**. No Suno API. No auto-send. Manual paste only. |
| [browns-inquiry-intake](#browns-inquiry-intake) | Extract structured booking/quote JSON from inquiry text | SA Ops / CoS | **No LLM**. No auto-send. Never invents rates. WhatsApp stays on CoS. |
| [browns-guest-comms-draft](#browns-guest-comms-draft) | Generate DRAFT guest communications from booking JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents times or rates. Manual approval required. |
| [browns-quote-invoice-draft](#browns-quote-invoice-draft) | Generate DRAFT quote/invoice communications from booking/quote JSON | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Missing amounts = availability-only. |
| [browns-nightsbridge-bookings-adapter](#browns-nightsbridge-bookings-adapter) | Transform Nightsbridge day sheets into bookings.json for daily-ops-brief | SA Ops / CoS | **Offline only**. Never invents data. Flags missing fields. Feed into daily-ops-brief. |
| [browns-daily-ops-brief](#browns-daily-ops-brief) | Generate daily ops team brief from bookings | SA Ops / CoS | **DRAFT ONLY**. Never sends. Never invents rates. Manual team WhatsApp send. |
| [browns-ota-rate-worksheet](#browns-ota-rate-worksheet) | Generate OTA rate worksheets for Nightsbridge entry | SA Ops / CoS | **No API**. Never invents rates. Blanks stay blank. Grant approval required. |

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

## Browns Pipeline Flow

The Browns guest-flow tools work together in this pipeline:

```
Inquiry (email/WhatsApp) 
    ↓
browns-inquiry-intake (extract structured JSON)
    ↓
    ├──→ browns-guest-comms-draft (welcome messages)
    ├──→ browns-quote-invoice-draft (quotes/invoices)
    └──→ browns-daily-ops-brief (team coordination)

Nightsbridge screen (day sheet)
    ↓
browns-nightsbridge-bookings-adapter (CSV/TSV → bookings.json)
    ↓
browns-daily-ops-brief (team coordination)

browns-ota-rate-worksheet (separate: rate card → OTA entry)
```

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

---

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
