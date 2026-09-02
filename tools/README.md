# Tools Catalog

Command-line utilities for CoS, bot desks, and owned-business operations. Each tool is **offline**, **read-only**, and works with CSV/file exports only.

## Index

| Tool | Purpose | Desk(s) | Safety Note |
|------|---------|---------|-------------|
| [loyverse-xero-recon](#loyverse-xero-recon) | Reconcile Loyverse POS sales with Xero accounting | Perfect Water / CoS | **No API keys**. Offline CSV only. No invented amounts. |
| [attachment-filename-index](#attachment-filename-index) | Index Drive/mail attachment filenames without opening file bodies | Vault / CoS / Perfect Water | **No file body reads**. Never extracts amounts. Filename classification only. |
| [budget-merchant-matcher](#budget-merchant-matcher) | Match budget transactions against merchant rules | Ledger / CoS | **Amounts pass-through only**. Never invented. Keep amounts in files, not chat. |
| [suno-package-prep](#suno-package-prep) | Package kid lyrics for manual Suno paste workflow | Studio | **No browser automation**. No Suno API. No auto-send. Manual paste only. |

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

## Browns Pipeline Tools (Planned)

The following tools are referenced in `docs/automation/SPEC.md` for SA Ops/CoS workflows but are **not yet implemented**:

- **browns-inquiry-intake** - Structure hospitality inquiries (dates, guests, property) before draft replies
- **browns-guest-comms-draft** - Draft guest communication sequences (ack, quote, pre-arrival, review request)
- **browns-quote-invoice-draft** - Generate quotes and invoices with rate-card enforcement
- **browns-daily-ops-brief** - Compile daily SA operations digest (arrivals, departures, delivery-day)
- **browns-ota-rate-worksheet** - Rate card calculations for OTA channel management

### Pipeline Note

When these tools are added, the Browns inquiry-to-guest workflow will be:

```
browns-inquiry-intake
    ↓
browns-guest-comms-draft  ←→  browns-quote-invoice-draft
    ↓
browns-daily-ops-brief
```

With `browns-ota-rate-worksheet` as a separate rate-card calculation tool.

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
