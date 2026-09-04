# Browns Inquiry Quote Pipeline Pack - APPROVAL

## Purpose

This tool orchestrates the Browns inquiry → quote draft pipeline for **The Browns Luxury Guest Suites Dullstroom** only. It wires together:

1. `browns-inquiry-intake` (optional) - Extract structured data from inquiry text
2. `browns-quote-invoice-draft` (default ON) - Generate quote drafts

## Hard Gates

### H7 - Quote Send Approval

From `docs/automation/approval-gates.md`:

| Gate | Action | Approval text |
|------|--------|---------------|
| **H7** | Generate and send an invoice or payment link | `APPROVE INVOICE <entity> <ref>` |

**Every Browns quote requires H7 approval from Grant before send.**

This tool generates the APPROVAL.md reminder but **NEVER sends anything**.

### lane:hospitality-partners Rules

From `docs/automation/approval-gates.md`:

| Lane | Examples | Extra rule |
|------|----------|------------|
| `hospitality` | The Browns, Rivendell, stay@ | Liana is a first-class operator. Draft to her queue when guest-facing. |

**Required before quote send:**
1. ☐ Guest name confirmed
2. ☐ Dates confirmed (check-in and check-out)
3. ☐ Suite preference confirmed
4. ☐ Number of guests confirmed

### N7 - Never Invent

From `docs/automation/approval-gates.md`:

| ID | Action |
|----|--------|
| `N7` | Inventing accommodation rates, water prices, or sand quotes |

**This tool NEVER invents:**
- ❌ Accommodation rates
- ❌ Deposit amounts
- ❌ Total amounts
- ❌ Nightly rates

**When amounts are missing:**
- ✅ Flags `[RATE CARD REQUIRED]` in PACK.md
- ✅ Flags in APPROVAL.md
- ✅ Quote drafts will be availability-only

## Safety Checklist

Before using this tool in any workflow:

- ☐ **Offline only** - No API calls, no network
- ☐ **Never auto-sends** - No WhatsApp API, no Gmail send
- ☐ **Dullstroom only** - The Browns Luxury Guest Suites Dullstroom
- ☐ **Rate card required** - Never invent rates when missing
- ☐ **H7 before send** - Grant approval required
- ☐ **Liana review** - Guest-facing drafts need Liana's queue

## CoS (Coexistence of Service) Integration

From the user requirements:

> WhatsApp stays on CoS (Coexistence of Service). This tool only produces files.

**What this means:**
- ✅ Tool generates draft text files
- ✅ Human copies to WhatsApp manually OR via CoS workflow
- ❌ Tool does NOT connect to WhatsApp Cloud API
- ❌ Tool does NOT send messages

## Output Review Requirements

Every pack run must be reviewed:

1. **PACK.md** - Index and summary
   - Verify guest details
   - Check if amounts present or `[RATE CARD REQUIRED]`
   - Review warnings

2. **APPROVAL.md** - This checklist
   - Confirm all hard gates
   - Verify no invented rates
   - Get H7 approval phrase

3. **Draft files** - Quote text
   - `draft-quote-whatsapp.txt` - Review tone and content
   - `draft-quote-email.txt` - Review formatting and professionalism
   - `draft-proforma-email.txt` - Review if deposit required

4. **manifest.json** - Metadata
   - Confirm which stages ran
   - Verify file list accuracy (PR #116)

## When to Use This Tool

**DO use for:**
- Direct inquiries (email, WhatsApp, phone)
- Converting freeform inquiry text to structured quote
- Preparing quote drafts for Grant/Liana review
- Dullstroom / The Browns bookings only

**DO NOT use for:**
- OTA bookings (use their system)
- Other properties (Rivendell, etc.) unless explicitly confirmed in-scope
- Auto-sending (never allowed)
- Inventing rates when missing

## Approval Workflow

```
Inquiry received
    ↓
Run browns-inquiry-quote-pipeline-pack
    ↓
Review PACK.md + APPROVAL.md
    ↓
Fill [RATE CARD REQUIRED] if needed
    ↓
Get H7 approval: APPROVE INVOICE hospitality-partners <ref>
    ↓
Liana reviews guest-facing drafts
    ↓
Grant/Liana sends via CoS or manual copy
```

## Merge Authorization

Per user requirements:

> Merge when green (ordinary Coding Cloud Agent merge authorized). No force-push.

**This means:**
- ✅ Merge PR when CI passes
- ✅ Tests green
- ✅ Lint/build succeeds
- ❌ No force-push
- ❌ No merge conflicts

## Related Documentation

- `docs/automation/BUSINESS-REQUIREMENTS.md` - Phase 5 hospitality pipeline
- `docs/automation/SPEC.md` - Phase 5 booking pipeline details
- `docs/automation/approval-gates.md` - H7, N7, lane rules
- `docs/automation/entity-map.yaml` - hospitality-partners entity
- `tools/browns-inquiry-intake/` - Sibling intake tool
- `tools/browns-quote-invoice-draft/` - Sibling quote draft tool

## Grant Approval Required

Before merging this PR and using this tool:

☐ Tool architecture reviewed
☐ Safety gates confirmed (H7, N7, [RATE CARD REQUIRED])
☐ Offline-only behavior verified
☐ No auto-send capability confirmed
☐ Sibling tool integration tested
☐ Fixtures demonstrate correct behavior
☐ Tests green
☐ Merge authorized

---

**Approval signature:**

Date: _______________

Grant Brown: _______________
