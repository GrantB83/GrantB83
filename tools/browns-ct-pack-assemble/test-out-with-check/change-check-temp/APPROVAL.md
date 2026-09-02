# Booking Change Check - Approval Required

## Summary

- **Target Day:** 2026-09-20
- **Additions:** 0
- **Removals:** 0
- **Updates:** 1
- **Total Changes:** 1

- **Before Hash:** 77f47d8d0c969f1c
- **After Hash:** ad0b326f6ab16aae

## File Inventory

- `changes.json` - Structured change records
- `changes.md` - Human-readable numbered digest
- `APPROVAL.md` - This file
- `manifest.json` - Metadata

## Pre-Post Checklist

Before posting guest-comms or daily-ops drafts to WhatsApp Admin:

- [ ] Review all additions, removals, and updates in `changes.md`
- [ ] Verify guest names are correct
- [ ] Check suite assignments make sense
- [ ] Confirm dates are valid
- [ ] No invented rates or amounts present
- [ ] Missing fields are acceptable or resolved

## Safety Rules

- ✅ **Offline only** - No API calls, no auto-send
- ✅ **DRAFT ONLY** - Never auto-posts to WhatsApp or email
- ✅ **No invented data** - Missing fields flagged, never fabricated
- ✅ **No rates/amounts** - This tool does not handle pricing
- ⚠️ **CoS owns send path** - WhatsApp Admin posting requires human approval

## Usage Context

This report is for **last-minute booking change checks** before CoS posts:
- Guest-comms drafts (pre-arrival messages)
- Daily-ops briefs (team WhatsApp messages)

**Typical workflow:**
1. Export bookings before CT-pack preparation (e.g., 19:00 SAST)
2. Export bookings after CT-pack preparation (e.g., 20:45 SAST)
3. Run this tool to diff snapshots
4. Review changes.md for last-minute updates
5. Update drafts if changes affect guest-comms or ops brief
6. Post to WhatsApp Admin after approval

## Approval Phrase

When ready to proceed:

```
APPROVE POST CT-PACK 2026-09-20
```

---

**Remember:** CoS SA Ops runs this check, not an automation. Human judgment required.
