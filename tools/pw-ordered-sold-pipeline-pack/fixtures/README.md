# Fixtures for pw-ordered-sold-pipeline-pack

Synthetic test data for Perfect Water cost-of-sales reconciliation.

## Files

### ordered.csv
- **Purpose:** Sample ordered quantities
- **Items:** 5 items (Water Bottle 5L, Water Bottle 10L, Filter Cartridge, Water Dispenser, Cooler Box)
- **Rows:** 5
- **Note:** Cooler Box is in ordered but not in sold (testing missing keys)

### sold.csv
- **Purpose:** Sample sold quantities
- **Items:** 5 items (Water Bottle 5L, Water Bottle 10L, Filter Cartridge, Water Dispenser, Ice Tray)
- **Rows:** 5
- **Note:** Ice Tray is in sold but not in ordered (testing missing keys)

## Expected Diff Results

| Item | Ordered | Sold | Delta |
|------|---------|------|-------|
| Cooler Box | 8 | 0 | 8 |
| Water Bottle 5L | 50 | 45 | 5 |
| Water Bottle 10L | 20 | 18 | 2 |
| Filter Cartridge | 15 | 15 | 0 |
| Water Dispenser | 5 | 6 | -1 |
| Ice Tray | 0 | 10 | -10 |

## Usage

```bash
# Run fixture test
npm run test:fixtures

# This will:
# 1. Build the CLI
# 2. Process ordered.csv and sold.csv
# 3. Generate pipeline pack in test-out/
# 4. Exit with code 0 (success)
```

## Safety

These are **synthetic test fixtures** with no real Perfect Water quantities or prices. Safe for testing and CI.
