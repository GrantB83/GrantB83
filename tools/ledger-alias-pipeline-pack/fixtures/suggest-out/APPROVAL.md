# APPROVAL.md - Merchant Alias Suggest

## What This Tool Did

- Loaded unmatched merchants from input file
- Scored each merchant against known alias patterns using Jaccard similarity
- Ranked suggestions by score and assigned confidence levels
- Generated suggestions.json, suggestions.md, and no-match.md

## What Ledger Owns

- **Alias approval** - Review and approve suggested mappings
- **Sheet writes** - Manually update Budget sheet after H2 approval
- **Manual research** - Investigate no-match merchants
- **Alias maintenance** - Update aliases.json with new patterns

## Out of Scope

- ❌ No auto-apply to Budget sheet
- ❌ No invented amounts or merchant identities
- ❌ No auto-categorization
- ❌ No Google Sheets API calls

## Required Approval Gates

Per `docs/automation/approval-gates.md`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes

## Hard Constraints

1. **Offline only** - No Google Sheets API, no network calls
2. **Read-only** - Never modifies input files
3. **H2 before sheet writes** - Human approval gate enforced
4. **Amounts stay in files** - Never paste transaction amounts into prose
5. **Ledger owns sheet** - Coding/CoS never write Budget directly

## Next Steps

1. Review suggestions.md for suggested merchant→alias mappings
2. Check confidence levels (high/medium/low)
3. Research no-match.md merchants manually
4. Update aliases.json with new patterns if needed
5. Get H2 approval before applying to Budget sheet
6. Ledger manually updates Google Sheet

---

*This is a research aid tool. All sheet writes require H2 approval and manual application by Ledger.*
