# Month-Close Checklist

**Month:** 2024-01

## Export CSV Files Present
- [x] ✅ Found 3 CSV file(s)

## Headers OK
- [x] ✅ All required headers present

## Unmatched Merchants Researched
- [ ] Review unmatched-queue.md and research unknown merchants
- [ ] Verify alias suggestions from merchant-alias-suggest
- [ ] Complete APPLY-CHECKLIST.md tick-off

## Sheet Write Approval
- [ ] Ledger sheet updates need H2 approval
- [ ] No amounts invented or modified from source CSVs
- [ ] Request: "APPROVE ALIAS UPDATES" before any writes

## Final Verification
- [ ] All CSV files scanned and inventoried
- [ ] Merchant research complete
- [ ] Alias mappings verified
- [ ] Ready for Grant's H2 approval

---

## Safety Gates

Per `docs/automation/approval-gates.md`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes
- **Offline only:** No Google Sheets API or network calls
- **Amounts stay in files:** Never paste transaction amounts into prose
