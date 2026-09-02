# Browns OTA Rate Worksheet Fixtures

This directory contains sample test data for the Browns OTA Rate Worksheet tool.

## Files

### `sample-rates.csv`

Complete rate card with all rates specified for Dullstroom The Browns Luxury Guest Suites.

**Suites included:**
- Luxury Suite 1 (Summer Peak: ZAR 3200, Winter Off-Peak: ZAR 2400)
- Garden Suite (Summer Peak: ZAR 2800, Winter Off-Peak: ZAR 2100)
- Family Suite (Summer Peak: ZAR 4500, Winter Off-Peak: ZAR 3500)

**Total records:** 6 rate entries (3 suites × 2 seasons)

### `sample-rates-incomplete.csv`

Intentionally incomplete rate card with missing nightlyRate values to test blank handling.

**Missing rates:**
- Luxury Suite 1 / Winter Off-Peak
- Garden Suite / Winter Off-Peak

These entries should generate worksheets with blank rate cells and MISSING_BASE_RATE flags.

**Total records:** 6 rate entries, 2 with missing rates

### `sample-promo.json`

Complete promotional offers with discount values specified.

**Promos included:**
1. Early Bird Summer 2024 (Nov 2024) - 15% discount
2. Festive Season Special (Dec 2024 - Jan 2025) - ZAR 500 flat discount
3. Long Stay Discount (Jun-Aug 2024) - 10% discount

All promos have complete discount information and should calculate promo rates correctly.

### `sample-promo-incomplete.json`

Draft promotional offer without discount values to test DRAFT_NEEDS_RATE flag handling.

**Promo included:**
- TBD Winter Promo (Jun-Aug 2025) - **no discount specified**

This promo should generate worksheet entries flagged as DRAFT_NEEDS_RATE with blank promo rate fields.

## Expected Test Results

### Test 1: Complete Rates + Complete Promos

```bash
npm run test:fixtures
```

**Expected output:**
- 18 worksheet entries (6 rates × 3 promos)
- All base rates filled
- All promo rates calculated
- No warnings
- No incomplete pricing flag

### Test 2: Incomplete Rates + Complete Promos

```bash
npm run test:incomplete
```

**Expected output:**
- 18 worksheet entries (6 rates × 3 promos)
- 2 base rates blank (Luxury Suite 1 / Winter, Garden Suite / Winter)
- 6 entries flagged MISSING_BASE_RATE (2 missing rates × 3 promos)
- Warnings about missing rates
- Incomplete pricing flag set to true

### Test 3: Complete Rates + No Promos

```bash
npm run worksheet -- --rates fixtures/sample-rates.csv --outdir out-no-promo/
```

**Expected output:**
- 6 worksheet entries (base rates only)
- All base rates filled
- No promo columns populated
- No warnings
- No incomplete pricing flag

### Test 4: Complete Rates + Incomplete Promos

```bash
npm run worksheet -- --rates fixtures/sample-rates.csv --promo fixtures/sample-promo-incomplete.json --outdir out-draft/
```

**Expected output:**
- 6 worksheet entries (6 rates × 1 draft promo)
- All base rates filled
- All entries flagged DRAFT_NEEDS_RATE
- Warning about promo missing discount
- Incomplete pricing flag set to true

## Safety Verification

These fixtures prove the tool:
- ✅ Never invents rates (blanks stay blank)
- ✅ Never invents discount values (drafts stay draft)
- ✅ Flags incomplete data clearly
- ✅ Calculates promo rates only when all inputs present
- ✅ Handles both percent and amount discounts correctly
- ✅ Generates approval checklist for Grant

## Usage

Run all fixture tests:

```bash
cd tools/browns-ota-rate-worksheet
npm install
npm run build
npm run test:fixtures
npm run test:incomplete
```

## File Format Notes

### Rates CSV Format

Required columns:
- `suiteOrUnit` - Suite or unit name
- `seasonOrLabel` - Season or rate label
- `currency` - Currency code (e.g., ZAR)

Optional columns:
- `nightlyRate` - Numeric rate per night (leave blank if unknown)
- `minStay` - Minimum stay requirement
- `occupancy` - Maximum occupancy
- `notes` - Additional notes

### Promo JSON Format

Required fields:
- `name` - Promotional offer name
- `startDate` - Start date (ISO format recommended)
- `endDate` - End date (ISO format recommended)

Optional fields (one required for complete promo):
- `discountPercent` - Percentage discount (e.g., 15 for 15%)
- `discountAmount` - Flat amount discount (e.g., 500 for ZAR 500)

If both discount fields are missing, the promo is treated as DRAFT.

## Real-World Usage

For actual Browns operations:

1. Export current rate card to CSV format
2. Ensure all nightlyRate values are populated
3. Create promo JSON with approved discount values only
4. Run the tool to generate worksheets
5. Review APPROVAL.md before any Nightsbridge changes
6. Get Grant's explicit approval
7. Use worksheet.md as entry checklist for Nightsbridge

**Never run this tool with invented or estimated rates.**
