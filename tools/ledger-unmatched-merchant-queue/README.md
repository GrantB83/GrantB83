# ledger-unmatched-merchant-queue

**One-line:** Build an offline research queue for unmatched merchants from budget CSV exports.

**Owning desk(s):** Ledger / CoS

## Purpose

Ledger researches unidentified merchants before asking Grant. This tool takes budget/transaction CSV exports and generates a prioritized research queue for unmatched rows only.

## Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **No invented amounts or merchant identities** - Only processes existing data
- ✅ **Amounts stay in files** - Not printed in digest prose (refer to queue.json for details)
- ⚠️ **Research aid only** - Ledger owns manual Google Sheet updates
- ⚠️ **No auto-categorization** - Human research and approval required

## Install and Run

```bash
cd tools/ledger-unmatched-merchant-queue
npm install
npm run build

# Basic usage
npm run queue -- --input transactions.csv --outdir out/

# Custom merchant column name
npm run queue -- --input transactions.csv --outdir out/ --merchant-col Payee

# With status column
npm run queue -- \
  --input transactions.csv \
  --outdir out/ \
  --status-col MatchStatus \
  --unmatched-values "unmatched,unknown"

# Limit to top 50 merchants
npm run queue -- --input transactions.csv --outdir out/ --limit 50

# No status column (treat all as needing review)
npm run queue -- --input transactions.csv --outdir out/
```

## CLI Options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--input` | Input CSV file path | - | Yes |
| `--outdir` | Output directory path | - | Yes |
| `--merchant-col` | Merchant/Payee column name | `Merchant` | No |
| `--status-col` | Match status column name | (none) | No |
| `--unmatched-values` | Comma-separated unmatched status values | `unmatched,unknown` | No |
| `--limit` | Limit output to top N merchants | (none) | No |

## Behavior

1. **Parse CSV** - Auto-detects delimiter (comma, semicolon, or tab)
2. **Identify unmatched rows**:
   - If `--status-col` is provided, filter by status values in `--unmatched-values`
   - Empty status counts as unmatched
   - If no status column, treat all rows as needing review (marked with `reason=no-status-column`)
3. **Deduplicate** - Group by normalized merchant name (case-insensitive, punctuation-stripped)
4. **Track dates** - Auto-detect date column and track first/last transaction dates
5. **Generate outputs** - Five files for research workflow

## Output Files

### queue.json

Structured merchant data with:
- Normalized and display names
- Transaction count
- First/last transaction dates (if date column detected)
- Sample row references (up to 3 per merchant)
- Reason for inclusion (no-status-column, empty-status, status-match)

### queue.md

Human-readable numbered research list with:
- Merchant display name
- Transaction count
- Date range (if available)
- Empty "Known hints" section (awaiting research)

**IMPORTANT:** Amounts are intentionally omitted. Refer to `queue.json` for sample row details if needed.

### missing-fields.md

Data quality report showing:
- Missing or mismatched columns
- Row-level parsing issues
- Status/date column detection results

### APPROVAL.md

Safety gates and workflow guidance:
- Research scope (public sources only)
- Out of scope (no auto-sheet writes, no payments)
- Required approval gates (S1 for research, H2 for sheet changes)
- Next steps checklist

### manifest.json

Run metadata:
- Tool name and version
- Generation timestamp
- Input file reference
- Output file list
- Statistics (total rows, unmatched count, unique merchants)

## Test Fixtures

```bash
# Run all fixture tests
npm run test:fixtures

# Run unit tests
npm test
```

### Included Fixtures

1. **mixed-matched.csv** - Mix of matched/unmatched/unknown status values
2. **all-unmatched.csv** - All rows marked unmatched, uses "Payee" column
3. **no-status.csv** - No status column, all rows treated as needing review

## CSV Format Support

- **Delimiters:** Auto-detects comma, semicolon, or tab
- **Required columns:** Merchant/Payee column (name configurable via `--merchant-col`)
- **Optional columns:** 
  - Status/MatchStatus (specify with `--status-col`)
  - Date columns (auto-detected: Date, TransactionDate, PostedDate, etc.)
  - Amount columns (auto-detected: Amount, Total, Debit, Credit, etc.)

## Integration with Other Tools

Pairs with `budget-merchant-matcher`:

1. Export budget transactions to CSV
2. Run `budget-merchant-matcher` to apply known rules
3. Run `ledger-unmatched-merchant-queue` on matcher output to research remaining unknowns
4. Update merchant rules based on research
5. Re-run matcher with updated rules

## Workflow Example

```bash
# Step 1: Export from budget tool to CSV
# (manual step)

# Step 2: Build research queue
npm run queue -- \
  --input exports/january-2024.csv \
  --outdir research/jan-2024/ \
  --status-col MatchStatus \
  --limit 50

# Step 3: Review queue.md and research each merchant
# (manual research step)

# Step 4: Update merchant rules in knowledge base
# (manual documentation step)

# Step 5: Get H2 approval before applying sheet changes
# (approval gate)
```

## Safety Constraints

### Never Invented

- ❌ Merchant identities
- ❌ Category assignments
- ❌ Amount values
- ❌ Status values

### Always Preserved

- ✅ Original merchant names (display names)
- ✅ Row references for traceability
- ✅ Amount data stays in files only
- ✅ Explicit missing field reporting

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or merchant rule changes

## Troubleshooting

### Error: Merchant column not found

```bash
# Check available columns
head -1 transactions.csv

# Specify correct column name
npm run queue -- --input transactions.csv --outdir out/ --merchant-col Payee
```

### Error: Status column not found

```bash
# Either fix column name
npm run queue -- --input transactions.csv --outdir out/ --status-col MatchStatus

# Or omit status column (treat all as unmatched)
npm run queue -- --input transactions.csv --outdir out/
```

### Empty output

- Check that `--unmatched-values` matches your CSV status values
- If no status column provided, all rows should appear (unless merchant column is missing)
- Review `missing-fields.md` for parsing issues

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run fixture tests
npm run test:fixtures

# Clean build artifacts
npm run clean
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
