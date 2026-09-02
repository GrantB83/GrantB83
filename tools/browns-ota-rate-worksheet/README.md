# Browns OTA Rate Worksheet Generator

An offline command-line tool that builds a Booking.com / OTA promotional rate worksheet for Nightsbridge review from rate card CSV files. Designed for **Dullstroom The Browns Luxury Guest Suites** guest-flow phase-4 operations.

## Features

- 📋 **CSV-based rate management** - Import rate cards with seasonal pricing
- 🎁 **Promo calculation** - Apply percentage or flat-amount discounts to base rates
- 🚫 **Never invents data** - Leaves blanks where rates or discounts are missing
- ⚠️ **Safety flags** - Clearly marks incomplete or draft entries
- ✅ **Approval workflow** - Generates APPROVAL.md requiring Grant's sign-off
- 📊 **Dual output formats** - Machine-readable CSV and human-friendly Markdown
- 🔒 **No API calls** - Completely offline, no Booking.com or Nightsbridge automation
- 🧪 **Fully tested** - Automated tests prove blanks stay blank

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)

### Setup

1. Navigate to the tool directory:
   ```bash
   cd tools/browns-ota-rate-worksheet
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
npm run worksheet -- --rates <rates-file> [--promo <promo-file>] [--outdir <output-dir>]
```

### Examples

**Base rates only:**
```bash
npm run worksheet -- --rates my-rates.csv --outdir reports/
```

**Rates with promotions:**
```bash
npm run worksheet -- --rates my-rates.csv --promo my-promos.json --outdir reports/
```

**Using fixtures:**
```bash
npm run test:fixtures
```

### CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--rates` | Path to rates CSV file | ✅ Yes | - |
| `--promo` | Path to promo JSON or CSV file | No | - |
| `--outdir` | Output directory for worksheets | No | `./out` |
| `--help`, `-h` | Show help message | No | - |

## Input Files

### Rates CSV

Your rate card must include these columns:

**Required columns:**
- `suiteOrUnit` - Suite or unit name (e.g., "Luxury Suite 1")
- `seasonOrLabel` - Season or rate period label (e.g., "Summer Peak")
- `currency` - Currency code (e.g., "ZAR")

**Optional columns:**
- `nightlyRate` - Numeric rate per night (leave **blank** if not yet determined)
- `minStay` - Minimum stay requirement (e.g., "2 nights")
- `occupancy` - Maximum occupancy (e.g., "2 adults")
- `notes` - Additional notes

**Example rates CSV:**
```csv
suiteOrUnit,seasonOrLabel,currency,nightlyRate,minStay,occupancy,notes
Luxury Suite 1,Summer Peak,ZAR,3200.00,2 nights,2 adults,Pool view
Luxury Suite 1,Winter Off-Peak,ZAR,2400.00,1 night,2 adults,Cozy fireplace
Garden Suite,Summer Peak,ZAR,2800.00,2 nights,2 adults,Private garden
```

**Missing rates example:**
```csv
suiteOrUnit,seasonOrLabel,currency,nightlyRate,notes
Luxury Suite 1,Summer Peak,ZAR,3200.00,Confirmed rate
New Suite,Summer Peak,ZAR,,Rate pending - needs approval
```

The second row will generate a worksheet entry with a **blank rate** and **MISSING_BASE_RATE** flag.

### Promo File

Promotional offers can be in **JSON** or **CSV** format.

#### JSON Format (Recommended)

```json
[
  {
    "name": "Early Bird Summer 2024",
    "startDate": "2024-11-01",
    "endDate": "2024-11-30",
    "discountPercent": 15
  },
  {
    "name": "Festive Season Special",
    "startDate": "2024-12-15",
    "endDate": "2025-01-05",
    "discountAmount": 500
  }
]
```

**Required fields:**
- `name` - Promotional offer name
- `startDate` - Start date (ISO format recommended)
- `endDate` - End date (ISO format recommended)

**Discount fields (at least one required for complete promo):**
- `discountPercent` - Percentage discount (e.g., `15` for 15% off)
- `discountAmount` - Flat amount discount (e.g., `500` for ZAR 500 off)

**Draft promos (no discount):**
```json
[
  {
    "name": "Future Promo TBD",
    "startDate": "2025-06-01",
    "endDate": "2025-08-31"
  }
]
```

This will generate entries flagged as **DRAFT_NEEDS_RATE** with blank promo rate fields.

#### CSV Format

```csv
name,startDate,endDate,discountPercent,discountAmount
Early Bird Summer,2024-11-01,2024-11-30,15,
Festive Special,2024-12-15,2025-01-05,,500
```

## Output Files

The tool generates **four files** in the specified output directory:

### 1. `worksheet.csv` - Machine-Readable Plan

Structured CSV file ready for import/processing. Contains all rate combinations with calculated promo rates.

**Columns:**
- Suite/Unit, Season/Label, Currency, Base Rate
- Promo Name, Promo Start, Promo End
- Discount Type, Discount Value, Promo Rate
- Min Stay, Occupancy, Notes, Flags

### 2. `worksheet.md` - Human Checklist

**This is your manual entry guide.** Step-by-step checklist for Nightsbridge data entry with clear flagging of missing data.

**Example entry:**
```markdown
### Luxury Suite 1 - Summer Peak

- **Currency:** ZAR
- **Base Rate:** 3200.00
- **Promo Name:** Early Bird Summer 2024
- **Promo Period:** 2024-11-01 to 2024-11-30
- **Discount:** 15 percent
- **Promo Rate:** 2720.00
- **Min Stay:** 2 nights
```

**Missing data is clearly marked:**
```markdown
### New Suite - Summer Peak

- **Currency:** ZAR
- **Base Rate:** ⚠️ MISSING
- **⚠️ Flags:** MISSING_BASE_RATE
```

### 3. `APPROVAL.md` - Required Approval Checklist

**Grant Brown must approve before any OTA changes.**

Contains:
- Summary of total entries
- List of all warnings
- Incomplete pricing flag
- Approval checklist
- Sign-off section

**This file must be reviewed and signed before applying rates to Nightsbridge or Booking.com.**

### 4. `manifest.json` - Metadata Summary

Machine-readable summary of the worksheet generation:
- Timestamp
- Property name
- Total entries
- Incomplete pricing flag
- Warning count and details
- Output file list

## Calculation Logic

### Base Rates Only (No Promos)

Each rate record generates one worksheet entry with the base rate.

**Example:**
- Input: 3 suites × 2 seasons = 6 rate records
- Output: 6 worksheet entries

### With Promotions

Each rate record is combined with each promo, creating entries for every possible combination.

**Example:**
- Input: 3 suites × 2 seasons = 6 rate records, 3 promos
- Output: 6 × 3 = **18 worksheet entries**

### Discount Calculations

**Percentage discount:**
```
Promo Rate = Base Rate × (1 - discountPercent / 100)
```

Example: ZAR 2000 with 15% discount = ZAR 1700

**Amount discount:**
```
Promo Rate = max(0, Base Rate - discountAmount)
```

Example: ZAR 2000 with ZAR 500 discount = ZAR 1500

**Promo rate is never calculated when:**
- Base rate is missing (MISSING_BASE_RATE)
- Discount value is missing (DRAFT_NEEDS_RATE)

### Missing Data Handling

The tool **never invents or estimates** rates or discounts.

**When `nightlyRate` is missing:**
- Base Rate field: **blank**
- Flag: `MISSING_BASE_RATE`
- Warning: "Missing rate for [Suite] / [Season]"

**When promo has no discount value:**
- Discount fields: **blank**
- Promo Rate field: **blank**
- Flag: `DRAFT_NEEDS_RATE`
- Warning: "Promo [Name] missing discount value"

## Testing

### Run Automated Tests

```bash
npm run build
npm test
```

The test suite verifies:
- CSV parsing with required and optional columns
- JSON and CSV promo parsing
- Blank rate handling (blanks stay blank)
- Draft promo flagging
- Discount calculations (percent and amount)
- Warning generation
- Flag assignment

### Test with Complete Fixtures

```bash
npm run test:fixtures
```

**Expected results:**
- 18 worksheet entries (6 rates × 3 promos)
- All rates calculated
- No warnings
- Exit code 0 (success)

### Test with Incomplete Rates

```bash
npm run test:incomplete
```

**Expected results:**
- 18 worksheet entries
- 2 missing base rates
- 6 entries flagged MISSING_BASE_RATE
- Warnings generated
- Incomplete pricing flag set
- Exit code 0 (success, but flagged)

### Clean Up Test Artifacts

```bash
npm run clean
```

## Example Workflow for SA Ops

### 1. Prepare Rate Card

Create or export your rate card as CSV:

```csv
suiteOrUnit,seasonOrLabel,currency,nightlyRate,minStay,occupancy
Luxury Suite 1,Summer Peak,ZAR,3200.00,2 nights,2 adults
Luxury Suite 1,Winter Off-Peak,ZAR,2400.00,1 night,2 adults
Garden Suite,Summer Peak,ZAR,2800.00,2 nights,2 adults
Garden Suite,Winter Off-Peak,ZAR,2100.00,1 night,2 adults
```

**Only include rates that have been approved.** Leave `nightlyRate` blank for pending rates.

### 2. Define Promotions (Optional)

Create promo file with approved discounts:

```json
[
  {
    "name": "Early Bird Summer 2024",
    "startDate": "2024-11-01",
    "endDate": "2024-11-30",
    "discountPercent": 15
  }
]
```

### 3. Generate Worksheet

```bash
npm run worksheet -- --rates browns-rates-2024.csv --promo summer-promos.json --outdir reports/2024-11/
```

### 4. Review Output

Check `reports/2024-11/APPROVAL.md`:
- Verify warning count
- Check incomplete pricing flag
- Review all flagged entries

### 5. Get Approval

**Grant Brown must review and sign APPROVAL.md before proceeding.**

### 6. Enter Data in Nightsbridge

Use `worksheet.md` as your entry checklist:
- Log into Nightsbridge
- For each entry in the worksheet:
  - Navigate to the suite/unit
  - Enter base rate for the season
  - If promo listed, create promotion with specified dates and discount
  - Cross off completed entries

### 7. Verify in Booking.com

After Nightsbridge sync:
- Check Booking.com extranet
- Verify rates and promos display correctly
- Test a sample booking flow

## Project Structure

```
tools/browns-ota-rate-worksheet/
├── src/
│   ├── index.ts                      # CLI entry point
│   ├── types.ts                      # TypeScript type definitions
│   ├── rate-parser.ts                # Rate CSV parser
│   ├── rate-parser.test.ts           # Rate parser tests
│   ├── promo-parser.ts               # Promo JSON/CSV parser
│   ├── promo-parser.test.ts          # Promo parser tests
│   ├── worksheet-generator.ts        # Worksheet generation logic
│   └── worksheet-generator.test.ts   # Worksheet generator tests
├── fixtures/
│   ├── sample-rates.csv              # Complete rate card
│   ├── sample-rates-incomplete.csv   # Incomplete rates (for testing)
│   ├── sample-promo.json             # Complete promos
│   ├── sample-promo-incomplete.json  # Draft promos (for testing)
│   └── README.md                     # Fixture documentation
├── dist/                             # Compiled JavaScript (generated)
├── out/                              # Default output directory (generated)
├── package.json
├── tsconfig.json
└── README.md                         # This file
```

## Safety & Limitations

### Safety Guarantees

- ✅ **Offline only** - No API calls, browser automation, or network activity
- ✅ **No secrets** - No credentials or tokens required
- ✅ **No payments** - Read-only analysis tool
- ✅ **No data invention** - Blanks stay blank, drafts stay draft
- ✅ **Approval required** - APPROVAL.md must be signed before any OTA changes
- ✅ **Clear flagging** - Missing data is explicitly marked

### What This Tool Does NOT Do

- ❌ Does not connect to Nightsbridge API
- ❌ Does not connect to Booking.com API
- ❌ Does not modify any live systems
- ❌ Does not send emails or notifications
- ❌ Does not process payments
- ❌ Does not make booking confirmations
- ❌ Does not invent or estimate rates

### Hard Rules

1. **Never run this tool with invented rates** - Only use approved rate card data
2. **Never bypass APPROVAL.md** - Grant must approve before any OTA changes
3. **Never auto-apply to Nightsbridge** - Manual entry only, following worksheet.md
4. **Never ignore flags** - Resolve MISSING_BASE_RATE and DRAFT_NEEDS_RATE before applying

## Property Scope

This tool is **only for**:
- **Dullstroom The Browns Luxury Guest Suites**

Do not use for:
- Other Brown family properties
- Perfect Water business
- Heavy Metal business
- Personal family bookings

## Troubleshooting

### "Missing required columns" error

Ensure your rates CSV has these columns (case-insensitive):
- `suiteOrUnit`
- `seasonOrLabel`
- `currency`

### "Promo file must be .json or .csv" error

Check file extension. Promo files must end in `.json` or `.csv`.

### Low or missing promo rates

- Check that `nightlyRate` is populated in your rates CSV
- Verify promo has either `discountPercent` or `discountAmount`
- Review `manifest.json` warnings section

### Tool calculates ZAR 0.00 promo rate

This happens when `discountAmount` exceeds `nightlyRate`. The tool prevents negative rates by flooring at 0.00. Review the discount value.

## SA Ops Contact

For questions about this tool or Browns guest-flow operations:

**Grant Brown**  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)

## License

MIT

---

**Remember: This tool is for planning and checklist generation only. Never apply rates to live systems without Grant Brown's explicit approval.**
