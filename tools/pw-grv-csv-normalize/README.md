# pw-grv-csv-normalize

**One-line:** Normalize messy GRV (goods-received voucher) CSVs into standard schema for Perfect Water / CoS inventory operations.

**Owning desk(s):** Perfect Water / CoS

**Location:** `tools/pw-grv-csv-normalize/`

## Purpose

Transform messy goods-received CSVs from various sources (manual entry, Loyverse, supplier exports) into a standard schema for Perfect Water inventory reconciliation. Never invents quantities. Offline only.

## Standard Output Columns

- **Store** - Store/location name (required)
- **SKU/Item** - SKU or item name (required)
- **ReceivedQty** - Received quantity (required, must be parseable number)
- **Unit** - Unit of measure (required)
- **ReceivedAt** - Date received (optional, YYYY-MM-DD)
- **Supplier** - Supplier name (optional)
- **DocNo** - Document/GRV/invoice number (optional)
- **Notes** - Additional notes from unmapped columns (optional)

## Install and Run

```bash
cd tools/pw-grv-csv-normalize
npm install
npm run build

# Auto-detect format
npm run normalize -- --in grv.csv --outdir out/

# Specific profile
npm run normalize -- --in loyverse-export.csv --outdir out/ --profile loyverse

# Custom column names
npm run normalize -- --in grv.csv --outdir out/ \
  --store-col "Location" \
  --item-col "Product" \
  --qty-col "Qty Received"

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

## Command-Line Arguments

### Required

- `--in` - Input GRV CSV file

### Output

- `--outdir` - Output directory (default: `out/`)

### Profile

- `--profile` - Profile: `auto` (default), `generic`, `loyverse`

### Column Overrides (optional)

When the auto-detection or profile doesn't match your CSV headers:

- `--store-col` - Store/location column name
- `--item-col` - SKU/Item column name
- `--qty-col` - ReceivedQty column name
- `--unit-col` - Unit column name
- `--date-col` - ReceivedAt date column name
- `--supplier-col` - Supplier column name
- `--docno-col` - Document number column name

## Behavior

1. **Auto-detect delimiter** - Comma, semicolon, or tab
2. **Map headers heuristically** - Looks for keywords: GRV, goods received, qty, quantity, supplier, invoice, doc no, receipt, etc.
3. **Validate required fields** - Store, SKU/Item, ReceivedQty, Unit
4. **Parse quantity** - Strip currency symbols, parse as number
5. **Reject invalid rows** - Blank/unparseable qty → `rejected.csv` with reason
6. **Never invents data** - Missing fields flagged, never fabricated

## Profiles

### auto (default)

Auto-detect format from CSV headers. Falls back to `generic` if detection fails.

### generic

Generic GRV CSV with common column names. Uses heuristic matching:
- **Store:** store, location, outlet, shop
- **Item:** item, sku, product, name
- **Qty:** qty, quantity, received, amount
- **Unit:** unit, uom, measure
- **Date:** date, received at, receivedat, grv date
- **Supplier:** supplier, vendor, from
- **DocNo:** doc no, docno, document, receipt, grv, invoice

### loyverse

Loyverse goods-received export format:
- **Outlet** → Store
- **Item** → SKU/Item
- **Quantity** → ReceivedQty
- **Unit** → Unit
- **Date** → ReceivedAt
- **Supplier** → Supplier
- **Receipt Number** → DocNo
- **Note** → Notes

## Output Files

### grv-normalized.csv

Standard schema CSV with headers:
```
Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes
```

All rows that passed validation.

### rejected.csv

Rows that failed validation with rejection reasons:
- Missing or blank Store
- Missing or blank SKU/Item
- Missing or blank ReceivedQty
- Unparseable ReceivedQty (e.g., "abc", "---")
- Missing or blank Unit

### missing-fields.md

Analysis of missing required fields with counts.

### report.md

Human-readable summary with row counts only (no amounts in prose).

### APPROVAL.md

Safety checklist for manual review:
- Verify schema headers
- Review rejected rows
- Confirm no quantities were invented
- Check Store, Supplier, DocNo values

### manifest.json

Machine-readable metadata:
- Tool name and version
- Timestamp
- Input/output paths
- Profile and delimiter
- Row counts (total, normalized, rejected)
- Missing fields breakdown
- Output file paths

## Exit Codes

- **0** - Success (at least one normalized or rejected row)
- **1** - Error:
  - Missing or unreadable input file
  - Empty input file (no data rows)
  - Zero valid rows AND zero rejected rows

## Critical Safety Notes

- ✅ **Offline only** - No APIs or network calls
- ✅ **Never invents quantities** - Blank/unparseable → rejected.csv
- ✅ **Read-only** - No write-back to Loyverse or source systems
- ✅ **File-based** - All quantities stay in files
- ✅ **Exit 1 on bad input** - Malformed or empty CSVs rejected
- ⚠️ **Amounts stay in files** - Bots must not paste quantities into chat
- ⚠️ **Perfect Water owns ops decisions** - This tool does not auto-upload or modify inventory systems

## Integration with Perfect Water Workflow

### Step 1: Export goods-received data

From Loyverse, supplier emails, or manual entry → CSV

### Step 2: Normalize

```bash
cd tools/pw-grv-csv-normalize
npm run normalize -- --in grv-export.csv --outdir normalized/
```

### Step 3: Review

- Check `rejected.csv` for data quality issues
- Review `APPROVAL.md` checklist
- Verify Store, Supplier, DocNo values in `grv-normalized.csv`

### Step 4: Reconcile

Use `grv-normalized.csv` for:
- Perfect Water inventory reconciliation
- Cost-of-sales analysis
- Stock discrepancy investigation
- Supplier verification

### Step 5: Archive

Keep normalized CSVs and manifests in Perfect Water Drive:
```
30_PerfectWater/GRV/YYYY-MM/YYYY-MM-DD__grv-normalized.csv
30_PerfectWater/GRV/YYYY-MM/YYYY-MM-DD__manifest.json
```

## Use Cases

1. **Supplier invoice reconciliation** - Match received quantities to invoiced quantities
2. **Stock-on-hand verification** - Compare GRV data to stocktake results
3. **Cost-of-sales tracking** - Track goods received by store and supplier
4. **Data quality auditing** - Identify missing or unparseable GRV data

## Examples

### Example 1: Generic CSV

**Input:** `grv.csv`
```csv
Store,Item,Qty,Unit,Date,Supplier,Doc No
LT,Water 5L,10,bottle,2026-09-01,Acme Water,GRV001
LT,Filter,5,unit,2026-09-01,Acme Water,GRV001
```

**Command:**
```bash
npm run normalize -- --in grv.csv --outdir out/
```

**Output:** `out/grv-normalized.csv`
```csv
Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes
LT,Water 5L,10,bottle,2026-09-01,Acme Water,GRV001,
LT,Filter,5,unit,2026-09-01,Acme Water,GRV001,
```

### Example 2: Loyverse Export

**Input:** `loyverse-grv.csv`
```csv
Outlet,Item,Quantity,Unit,Date,Supplier,Receipt Number,Note
Louis Trichardt,Bottled Water 5L,12,bottle,2026-09-01,Acme Water,REC-001,Morning delivery
```

**Command:**
```bash
npm run normalize -- --in loyverse-grv.csv --outdir out/ --profile loyverse
```

**Output:** `out/grv-normalized.csv`
```csv
Store,SKU/Item,ReceivedQty,Unit,ReceivedAt,Supplier,DocNo,Notes
Louis Trichardt,Bottled Water 5L,12,bottle,2026-09-01,Acme Water,REC-001,Morning delivery
```

### Example 3: Custom Columns

**Input:** `supplier-export.csv`
```csv
Location,Product,Qty Received,UOM,Delivery Date,Vendor,Invoice
LT,Water 5L,10,bottle,2026-09-01,Acme,INV001
```

**Command:**
```bash
npm run normalize -- --in supplier-export.csv --outdir out/ \
  --store-col "Location" \
  --item-col "Product" \
  --qty-col "Qty Received" \
  --unit-col "UOM" \
  --date-col "Delivery Date" \
  --supplier-col "Vendor" \
  --docno-col "Invoice"
```

### Example 4: Rejected Rows

**Input:** `bad-grv.csv`
```csv
Store,Item,Qty,Unit
,Water 5L,10,bottle
LT,,5,unit
LT,Filter,abc,unit
LT,Salt,15,
```

**Output:** `out/rejected.csv`
```csv
Store,Item,Qty,Unit,RejectionReason
,Water 5L,10,bottle,Missing or blank Store
LT,,5,unit,Missing or blank SKU/Item
LT,Filter,abc,unit,Unparseable ReceivedQty: "abc"
LT,Salt,15,,Missing or blank Unit
```

## Related Tools

- **pw-stocktake-csv-normalize** - Normalize stocktake CSVs (counted inventory)
- **pw-ordered-vs-sold-diff** - Compare ordered vs sold by SKU
- **pw-loyverse-daily-sales-digest** - Daily sales digest from Loyverse
- **loyverse-xero-recon** - Reconcile Loyverse with Xero accounting

## Entity Context

- **Lane:** perfect-water
- **Trading Names:** Perfect Water, BVR Enterprises, BVR Group
- **Locations:** Louis Trichardt (LT), Thohoyandou (Tho)
- **Emails:** accounts@bvrgroup.co.za
- **Automation Targets:** inventory-alerts, supplier-po, bank-recon-exceptions

## Quality Gates

- **H2** - Before any Google Sheet writes
- **H3** - Before any Drive file moves outside `_Inbox`
- **Offline only** - This tool generates drafts; no auto-uploads

## Contributing

When updating this tool:
1. Maintain backward compatibility with existing profiles
2. Add new profiles to `src/profiles.ts` with detection heuristics
3. Update fixtures and tests
4. Run `npm run test:fixtures` and `npm test`
5. Update this README and tools catalog
6. Conventional commit: `feat(tools): update pw-grv-csv-normalize`

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
