# Budget Merchant Matcher CLI

An offline command-line tool that matches budget transaction exports against known merchant rules, identifying which merchants need research and classification. Designed to eliminate recurring "unidentified merchant" browser toil for ledger maintenance.

## Features

- 📊 **CSV-based matching** - No APIs, browser automation, or secrets required
- 🔍 **Flexible input detection** - Auto-detects merchant columns (Merchant, Description, Name, Payee, Memo)
- 🎯 **Dual matching modes** - Substring matching with optional regex support
- 📝 **Actionable reports** - Generates both CSV and Markdown outputs
- 💰 **Amount handling** - Pass-through only, never invented
- ✅ **Fully tested** - Automated tests with synthetic fixtures
- 🚀 **Zero dependencies** - Pure TypeScript, no external libraries

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/budget-merchant-matcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the CLI:
   ```bash
   npm run build
   ```

## Usage

### Basic Command

```bash
npm run match -- --transactions <txns-file> --rules <rules-file> --output <output-dir>
```

### Example

```bash
npm run match -- --transactions exports/jan-2024.csv --rules merchant-rules.csv --output reports/
```

### CLI Options

| Option | Shorthand | Description | Required | Default |
|--------|-----------|-------------|----------|---------|
| `--transactions` | `-t` | Path to transaction CSV file | ✅ Yes | - |
| `--rules` | `-r` | Path to rules CSV or JSON file | ✅ Yes | - |
| `--output` | `-o` | Output directory for reports | No | `./out` |
| `--help` | `-h` | Show help message | No | - |

## Input Files

### Transaction CSV

Your transaction export must include at least one merchant/description column. The tool auto-detects common header names:

**Supported merchant columns** (case-insensitive):
- `Merchant`
- `Description`
- `Name`
- `Payee`
- `Memo`

**Optional columns** (pass-through if present):
- `Date` - Transaction date
- `Amount` - Transaction amount

**Example:**
```csv
Date,Merchant,Amount
2024-01-15,Whole Foods Market,85.23
2024-01-16,Shell Gas Station,45.00
2024-01-17,Netflix Subscription,15.99
```

**Note:** The tool works with USA Budget, Monarch, or standard bank CSV exports. Any extra columns are preserved in internal processing but not used for matching.

### Rules File

Classification rules can be in CSV or JSON format.

#### CSV Format

```csv
pattern,category,notes,isRegex
whole foods,Grocery,Organic foods,false
shell,Fuel,Gas stations,false
^netflix,Streaming,Regex: starts with netflix,true
```

**Columns:**
- `pattern` (required) - Text or regex pattern to match
- `category` (required) - Classification category
- `notes` (optional) - Additional notes
- `isRegex` (optional) - Set to `true` for regex patterns (default: `false`)

#### JSON Format

```json
[
  {
    "pattern": "whole foods",
    "category": "Grocery",
    "notes": "Organic foods"
  },
  {
    "pattern": "^netflix",
    "category": "Streaming",
    "notes": "Regex: starts with netflix",
    "isRegex": true
  }
]
```

## Matching Logic

### 1. Merchant Normalization

All merchant text is normalized before matching:
- Trimmed of leading/trailing whitespace
- Multiple spaces collapsed to single space
- Converted to lowercase

Example: `"  Whole  Foods   Market  "` → `"whole foods market"`

### 2. Matching Priority

- **Substring matching** (default) - Pattern appears anywhere in merchant name
- **Regex matching** (when `isRegex: true`) - Full regex capabilities
- **First match wins** - Rules are evaluated in order; first matching rule is used

### 3. Amount Handling

- Amounts are **pass-through only** from input CSV
- If `Amount` column exists, amounts are summed per merchant
- Amounts are **never invented** or modified
- Report files may contain amount totals when available in source data

**Safety:** This tool does not generate, estimate, or fabricate amounts. Bots must not paste amounts into chat (see README Safety Note below).

## Output Files

The CLI generates five files in the specified output directory:

### 1. `matched.csv` - Matched Merchants (CSV)

Machine-readable format with all matched merchants and their categories.

```csv
Merchant,Category,Transaction Count,Total Amount,Notes
whole foods market,Grocery,3,212.73,Organic foods
shell gas station,Fuel,2,85.00,Gas stations
```

### 2. `matched.md` - Matched Merchants (Markdown)

Human-readable table of matched merchants.

### 3. `unmatched.csv` - Unmatched Merchants (CSV)

Machine-readable list of merchants needing classification.

```csv
Merchant,Transaction Count,Total Amount
unknown coffee shop,2,17.00
mystery vendor llc,1,75.00
```

### 4. `unmatched.md` - Unmatched Merchants (Markdown)

**This is your action list** for ledger maintenance. Review this file to identify which merchants need research and new rules.

### 5. `summary.md` - Summary Report

Overview of matching results with statistics and next steps.

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite includes:
- CSV parsing with various column formats
- Merchant normalization
- Substring and regex matching
- Amount calculations
- Count aggregation
- Edge cases (invalid regex, missing columns, etc.)

### Test with Fixtures

The tool includes synthetic test data with 15 transactions and 7 rules:

```bash
npm run test:fixtures
```

This will:
1. Build the CLI
2. Run matching on test fixtures
3. Generate reports in `test-out/`
4. Exit with code 0 (success)

**Expected results:**
- 15 total transactions
- 12 matched (80% match rate)
- 3 unmatched (Unknown Coffee Shop, Mystery Vendor LLC, RandomPlace Store)

See `fixtures/README.md` for details.

### Clean Up Test Artifacts

```bash
npm run clean
```

## Example Workflow

1. **Export transactions** from your budget tool (Budget, Monarch, bank CSV)
2. **Create rules file** with known merchant patterns:
   ```csv
   pattern,category,notes
   whole foods,Grocery,
   target,Shopping,
   shell,Fuel,
   ```
3. **Run the matcher:**
   ```bash
   npm run match -- --transactions jan.csv --rules rules.csv --output jan-reports/
   ```
4. **Review unmatched merchants** in `jan-reports/unmatched.md`
5. **Add new rules** for unmatched merchants
6. **Re-run** to verify improved coverage

## Project Structure

```
tools/budget-merchant-matcher/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── csv-parser.ts            # Transaction & rules parsing
│   ├── matcher.ts               # Matching logic
│   ├── report-generator.ts      # Report generation
│   ├── csv-parser.test.ts       # Parser tests
│   └── matcher.test.ts          # Matcher tests
├── fixtures/
│   ├── transactions.csv         # Sample transactions
│   ├── rules.csv                # Sample rules (CSV)
│   ├── rules.json               # Sample rules (JSON)
│   └── README.md                # Fixture documentation
├── dist/                        # Compiled JavaScript (generated)
├── out/                         # Default report output (generated)
├── package.json
├── tsconfig.json
└── README.md                    # This file
```

## Starter Rules

The `fixtures/` directory includes a starter rules file with synthetic examples:

- **Grocery:** Acme, MegaMart
- **Fuel:** QuickFuel
- **Streaming:** StreamFlix
- **Utilities:** CloudHost, ElectroPay

These are provided as templates only. Replace with your actual merchant patterns.

## Limitations & Safety

- ✅ **Offline only** - No APIs, browser, or network calls
- ✅ **No secrets** - No credentials or tokens required
- ✅ **No payments** - Read-only analysis tool
- ✅ **File-based** - All amounts stay in report files
- ✅ **Pass-through amounts** - Never invented or modified

**Safety Note:** Keep amounts in report files. Bots must not paste amounts into chat. This tool is for ledger maintenance workflow automation, not financial advice or decision-making.

## Troubleshooting

### "No merchant/description column found" error

Ensure your CSV has one of these columns (case-insensitive):
- Merchant
- Description
- Name
- Payee
- Memo

### "Empty CSV file" error

Check that your CSV has:
- A header row
- At least one data row

### Low match rate

- Review `unmatched.md` for patterns
- Add new rules with common substrings
- Use regex for complex patterns (e.g., `^amazon.*` to match all Amazon variants)
- Rules are case-insensitive and match substrings by default

### Regex not matching

- Set `isRegex: true` in your rule
- Test regex patterns at https://regex101.com (JavaScript flavor)
- Remember: patterns are case-insensitive (`i` flag)

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
