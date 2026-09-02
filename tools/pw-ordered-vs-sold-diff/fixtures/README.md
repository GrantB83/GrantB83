# Perfect Water Ordered vs Sold Diff Fixtures

Synthetic test data for `pw-ordered-vs-sold-diff` CLI tool.

## Files

### Basic Fixtures (No Store)

**`ordered.csv`** - 5 items, 98 total quantity
- Water Bottle 10L: 20
- Water Bottle 5L: 50
- Filter Cartridge: 15
- Water Dispenser: 5
- Cooler Box: 8

**`sold.csv`** - 5 items, 94 total quantity
- Water Bottle 10L: 18
- Water Bottle 5L: 45
- Filter Cartridge: 15
- Water Dispenser: 6
- Ice Tray: 10

**Expected Diff:**
- Water Bottle 10L: +2 (ordered 20, sold 18)
- Water Bottle 5L: +5 (ordered 50, sold 45)
- Filter Cartridge: 0 (ordered 15, sold 15)
- Water Dispenser: -1 (ordered 5, sold 6)
- Cooler Box: +8 (ordered 8, sold 0 - missing in sold)
- Ice Tray: -10 (ordered 0, sold 10 - missing in ordered)
- Total delta: +4 (98 - 94)

### Store-Based Fixtures

**`ordered-with-store.csv`** - 6 items, 85 total quantity
- Water Bottle 10L / Louis Trichardt: 10
- Water Bottle 10L / Thohoyandou: 10
- Water Bottle 5L / Louis Trichardt: 30
- Water Bottle 5L / Thohoyandou: 20
- Filter Cartridge / Louis Trichardt: 10
- Filter Cartridge / Thohoyandou: 5

**`sold-with-store.csv`** - 7 items, 80 total quantity
- Water Bottle 10L / Louis Trichardt: 9
- Water Bottle 10L / Thohoyandou: 8
- Water Bottle 5L / Louis Trichardt: 25
- Water Bottle 5L / Thohoyandou: 18
- Filter Cartridge / Louis Trichardt: 10
- Filter Cartridge / Thohoyandou: 5
- Ice Tray / Louis Trichardt: 5

**Expected Store-Level Diff:**
- Water Bottle 10L / Louis Trichardt: +1 (ordered 10, sold 9)
- Water Bottle 10L / Thohoyandou: +2 (ordered 10, sold 8)
- Water Bottle 5L / Louis Trichardt: +5 (ordered 30, sold 25)
- Water Bottle 5L / Thohoyandou: +2 (ordered 20, sold 18)
- Filter Cartridge / Louis Trichardt: 0 (ordered 10, sold 10)
- Filter Cartridge / Thohoyandou: 0 (ordered 5, sold 5)
- Ice Tray / Louis Trichardt: -5 (ordered 0, sold 5 - missing in ordered)
- Total delta: +5 (85 - 80)

## Usage

### Basic Test (No Store)

```bash
cd tools/pw-ordered-vs-sold-diff
npm run diff -- --ordered fixtures/ordered.csv --sold fixtures/sold.csv --outdir test-out/
```

### Store-Based Test

```bash
cd tools/pw-ordered-vs-sold-diff
npm run diff -- \
  --ordered fixtures/ordered-with-store.csv \
  --sold fixtures/sold-with-store.csv \
  --outdir test-out/ \
  --store-col Store
```

### Automated Fixture Test

```bash
npm run test:fixtures
```

## Data Safety

✅ All data is synthetic  
✅ No real Perfect Water quantities  
✅ No real stock levels or sales figures
