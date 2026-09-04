# Browns OTA Rate Pipeline Pack Fixtures

This directory contains sample test data for the Browns OTA Rate Pipeline Pack tool.

## Files

### `sample-rates.csv`

Complete rate card with all rates specified for Dullstroom The Browns Luxury Guest Suites.

**Suites included:**
- Luxury Suite 1 (Summer Peak: ZAR 3200, Winter Off-Peak: ZAR 2400)
- Garden Suite (Summer Peak: ZAR 2800, Winter Off-Peak: ZAR 2100)
- Family Suite (Summer Peak: ZAR 4500, Winter Off-Peak: ZAR 3500)

**Total records:** 6 rate entries (3 suites × 2 seasons)

### `sample-promo.json`

Complete promotional offers with discount values specified.

**Promos included:**
1. Early Bird Summer 2024 (Nov 2024) - 15% discount
2. Festive Season Special (Dec 2024 - Jan 2025) - ZAR 500 flat discount
3. Long Stay Discount (Jun-Aug 2024) - 10% discount

All promos have complete discount information.

## Expected Test Results

### Test 1: Complete Pipeline Pack

```bash
npm run test:fixtures
```

**Expected output:**
- Pack created in `test-out/pack-2026-09-20/`
- PACK.md with pipeline summary
- APPROVAL.md with approval checklist
- worksheet.csv and worksheet.md from browns-ota-rate-worksheet
- manifest.json with accurate file listing
- No critical errors (exit code 0)

**Expected files in pack:**
- `PACK.md` - Pipeline pack index
- `APPROVAL.md` - Approval checklist
- `worksheet.csv` - Machine-readable worksheet
- `worksheet.md` - Human-friendly checklist
- `manifest.json` - Pack metadata

## Usage

Run fixture test:

```bash
cd tools/browns-ota-rate-pipeline-pack
npm install
npm run build
npm run test:fixtures
```

Expected outcome: Green box (exit 0) with pack assembled successfully.

## Safety Verification

These fixtures prove the tool:
- ✅ Orchestrates browns-ota-rate-worksheet correctly
- ✅ Auto-builds sibling tool if needed
- ✅ Copies outputs accurately
- ✅ Generates PACK.md and APPROVAL.md
- ✅ Creates accurate manifest.json (PR #116 pattern)
- ✅ Never invents rates (preserved from sibling)
- ✅ Never auto-sends
- ✅ Offline only

## Real-World Usage

For actual Browns operations:

1. Prepare rate card CSV with approved rates
2. Create promo JSON with approved discounts (optional)
3. Run the pipeline pack tool
4. Review PACK.md and APPROVAL.md
5. Get Grant's approval
6. Use worksheet.md as manual Nightsbridge entry checklist

**Never run this tool with invented or estimated rates.**
