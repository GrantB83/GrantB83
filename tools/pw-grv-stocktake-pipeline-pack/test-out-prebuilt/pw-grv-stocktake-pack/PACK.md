# Perfect Water GRV + Stocktake Pipeline Pack

Assembled pipeline pack orchestrating `pw-grv-csv-normalize` → `pw-stocktake-csv-normalize` → `pw-grv-vs-stocktake-diff` → optional `pw-inventory-recon-pack` for offline Perfect Water inventory reconciliation.

**Never invents stock quantities or rand amounts. Never pays. Offline validation only.**

## Contents

### Core Diff Files

- **diff.md** — Human-readable diff report (Store, Item, Received, Counted, Delta)
- **diff.json** — Machine-readable diff data with totals
- **missing-keys.md** — Items in GRV but not stocktake, or vice versa
- **APPROVAL.md** — Approval gates and PW ownership reminder

### Inventory Recon Pack

⏭ **pw-inventory-recon-pack** was disabled. Use diff files above for reconciliation.

### Pipeline Metadata

- **PACK.md** — This file (pipeline pack index)
- **PACK-manifest.json** — Machine-readable pipeline metadata

## Workflow Integration

This pack orchestrates the Perfect Water inventory reconciliation workflow:

```
Raw/Normalized GRV + Stocktake → pw-grv-vs-stocktake-diff → [optional pw-inventory-recon-pack] → H3 approval → PW inventory decisions
```

## Next Steps

1. Review **diff.md** for Store + SKU/Item deltas (amounts in file, not chat)
2. Check **missing-keys.md** for items in one side but not the other
3. Review **APPROVAL.md** for approval gates and ownership
4. Perfect Water team makes inventory adjustment decisions (H3 gate)
5. Archive this pack in Drive: `30_PerfectWater/InventoryRecon/YYYY-MM/`

## Safety Reminders

- ✅ **Offline only** — No Loyverse API, no network calls
- ✅ **Read-only** — Never modifies source CSVs or inventory systems
- ✅ **No invented quantities** — All amounts from source CSVs only
- ✅ **Perfect Water owns ops** — PW team makes all inventory decisions
- ✅ **H3 approval required** — Per `docs/automation/approval-gates.md`
- ⚠️ **Amounts stay in files** — Never paste quantities into chat

---

*Generated: 2026-09-04T05:18:38.261Z*
