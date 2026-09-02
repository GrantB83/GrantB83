# Test Fixtures for pw-grv-vs-stocktake-diff

This directory contains synthetic test fixtures for the Perfect Water GRV vs Stocktake Diff CLI. These files contain **no real business data** and are safe to commit to version control.

## Fixtures

### grv-normalized.csv

Synthetic goods-received (GRV) data with 5 items across 2 stores (LT and Tho).

**Format:** Standard normalized GRV schema from `pw-grv-csv-normalize`

**Headers:** `Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes`

**Contents:**
- LT: Water 5L (100 bottles), Water 10L (50 bottles), Salt 25kg (10 bags)
- Tho: Water 5L (80 bottles), Filter Cartridge (20 units)

**Totals:** 260 items received

### stocktake-normalized.csv

Synthetic stocktake counts with 5 items across 2 stores (LT and Tho).

**Format:** Standard normalized stocktake schema from `pw-stocktake-csv-normalize`

**Headers:** `Store,SKU/Item,CountedQty,Unit,CountedAt,Notes`

**Contents:**
- LT: Water 5L (95 bottles), Water 10L (50 bottles), Ice Tray (30 units)
- Tho: Water 5L (82 bottles), Filter Cartridge (18 units)

**Totals:** 275 items counted

## Expected Diff Results

### Matched Items with Deltas

| Store | Item | Received | Counted | Delta |
|-------|------|----------|---------|-------|
| LT | Water 5L | 100 | 95 | -5 |
| LT | Water 10L | 50 | 50 | 0 |
| Tho | Water 5L | 80 | 82 | +2 |
| Tho | Filter Cartridge | 20 | 18 | -2 |

### Missing in Stocktake

- LT | Salt 25kg (received but not counted)

### Missing in GRV

- LT | Ice Tray (counted but no GRV record)

### Summary

- **Total Received:** 260
- **Total Counted:** 275
- **Total Delta:** +15
- **Items Compared:** 6

## Usage

Run the diff on these fixtures:

```bash
cd tools/pw-grv-vs-stocktake-diff
npm run test:fixtures
```

Or manually:

```bash
npm run build
npm run diff -- \\
  --grv fixtures/grv-normalized.csv \\
  --stocktake fixtures/stocktake-normalized.csv \\
  --outdir test-out/
```

## Verification

After running the diff, check:
- `test-out/diff.json` for structured data
- `test-out/diff.md` for human-readable report
- `test-out/missing-keys.md` for Salt 25kg and Ice Tray
- `test-out/APPROVAL.md` for safety gates
- `test-out/manifest.json` for run metadata
