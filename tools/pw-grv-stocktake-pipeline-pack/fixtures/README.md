# Fixtures for pw-grv-stocktake-pipeline-pack

This directory contains synthetic test fixtures for validating the pipeline pack orchestrator.

## Normalized CSV Fixtures

### grv-normalized.csv

Synthetic normalized GRV (goods-received voucher) data with 3 line items:
- LT store: Water 5L (100 bottles), Filter Cartridge (20 units)
- Tho store: Water 5L (80 bottles)

**No real quantities or business data.**

### stocktake-normalized.csv

Synthetic normalized stocktake (counted inventory) data with 3 line items:
- LT store: Water 5L (95 bottles - shrinkage of 5), Filter Cartridge (18 units - shrinkage of 2)
- Tho store: Water 5L (82 bottles - overage of 2)

**No real quantities or business data.**

## Expected Deltas

When diffing grv-normalized.csv vs stocktake-normalized.csv:

| Store | Item | Received | Counted | Delta |
|-------|------|----------|---------|-------|
| LT | Water 5L | 100 | 95 | -5 (shrinkage) |
| LT | Filter Cartridge | 20 | 18 | -2 (shrinkage) |
| Tho | Water 5L | 80 | 82 | +2 (overage) |

**Total Delta:** -5 (more received than counted overall)

## Usage

```bash
cd tools/pw-grv-stocktake-pipeline-pack
npm run test:fixtures
```

This will:
1. Build the CLI
2. Process the normalized CSVs through the pipeline
3. Generate diff outputs
4. Optionally run pw-inventory-recon-pack
5. Create pipeline pack in `test-out/`

## Safety

These fixtures contain no real:
- Stock quantities (synthetic only)
- Store names (LT/Tho are placeholders)
- Supplier names (Acme Water is fictional)
- Monetary amounts (not included in schema)
- Perfect Water business data

**Suitable for public repository and automated testing.**
