# Portal-First Welcome Packs Migration

**Date:** 2026-09-07  
**Author:** Grant Brown  
**PR:** #[To be assigned]  
**Law:** Portal-First Law (Grant 2026-09-07)

## Goal

Update Browns welcome packs to support portal-first approach where guest-facing WhatsApp messages are **short human-gated stubs** containing:
- Guest name
- Check-in date  
- Magic portal URL

**NO** Wi-Fi, access codes, parking, rates, or detailed property info in WhatsApp body. All stay packet content lives in the magic-link portal.

## Changes Made

### 1. `tools/browns-welcome-draft-pack`

#### Modified Files
- ✅ `src/generator.ts` — Updated to generate link stubs with `[PORTAL_URL]` placeholder only
- ✅ `src/output-writer.ts` — Updated queue, missing-fields, and APPROVAL output files
- ✅ `README.md` — Documented Portal-First Law and GuestFlow integration

#### Key Changes
- Guest-facing message now contains only: name + check-in date + `[PORTAL_URL]` placeholder
- Removed guest preferences, allergies, and booking notes from WhatsApp body
- Added portal URL placeholder that must be replaced before send
- Updated APPROVAL.md workflow to include portal URL generation step
- Documented GuestFlow `POST /api/bookings/[id]/generate-link` integration

### 2. `tools/browns-welcome-late-pipeline-pack`

#### Modified Files
- ✅ `src/assembler.ts` — Updated PACK.md and APPROVAL.md generation
- ✅ `README.md` — Aligned with portal-first model

#### Key Changes
- Updated pipeline orchestration to generate link stubs (not full property details)
- Modified APPROVAL checklist to include Portal-First Law verification
- Added portal URL resolution step in workflow
- Updated safety reminders to emphasize NO property details in WA body

## GuestFlow Integration

If GuestFlow app is deployed:

```bash
# Generate portal link per booking
POST /api/bookings/[bookingId]/generate-link

# Response includes whatsappStub
{
  "portalUrl": "https://portal.thebrowns.co.za/guest/abc123",
  "whatsappStub": "Hi Emma, looking forward to...\n\n🔗 View Your Booking Portal:\nhttps://portal.thebrowns.co.za/guest/abc123"
}
```

**Recommended workflow:**
1. Run `browns-welcome-draft-pack` → generates stubs with `[PORTAL_URL]` placeholder
2. For each booking:
   - Call GuestFlow `POST /api/bookings/[id]/generate-link`
   - Replace `[PORTAL_URL]` with actual `portalUrl` from response
3. Manual CoS Admin post with replaced URLs

**Until GuestFlow is live:** Keep `[PORTAL_URL]` as placeholder; CoS resolves manually or waits for portal deployment.

## Build Instructions

After these code changes, rebuild both tools:

```bash
# Rebuild browns-welcome-draft-pack
cd tools/browns-welcome-draft-pack
npm run build

# Rebuild browns-welcome-late-pipeline-pack
cd ../browns-welcome-late-pipeline-pack
npm run build
```

## Testing

Test the new link stub format:

```bash
# Test browns-welcome-draft-pack with fixtures
cd tools/browns-welcome-draft-pack
npm run test:fixtures

# Test browns-welcome-late-pipeline-pack with fixtures
cd ../browns-welcome-late-pipeline-pack
npm run test:fixtures
```

Expected output:
- Welcome drafts contain only name + check-in date + `[PORTAL_URL]` placeholder
- NO Wi-Fi, access codes, parking, or rates in guest-facing message body
- Queue.md includes note about replacing `[PORTAL_URL]` before send
- APPROVAL.md includes Portal-First Law verification checklist

## Sample Output (New Format)

```markdown
# Welcome Message Stub — Emma Thompson

**Check-in:** Tuesday, 2 Sep 2026
**Check-out:** Friday, 5 Sep 2026
**Suite:** Rivendell Suite
**Guests:** 2 adults

---

Hi there,

Looking forward to welcoming you to The Browns in Dullstroom on Tuesday, 2 Sep 2026!

🔗 Your digital welcome pack:
[PORTAL_URL]

(All check-in details, Wi-Fi, access codes, and property info are in your portal)

Questions? Just reply to this message.

Warm regards,
The Browns Team
Dullstroom
```

## Hard Constraints

- ✅ Guest-facing WA = **name + check-in date + portal URL ONLY**
- ❌ NO Wi-Fi, access codes, parking in WA body
- ❌ NO rates, pricing, or financial details in WA body
- ❌ NO detailed property information in WA body
- ❌ NEVER invent portal URLs (use GuestFlow or manual source)
- ⚠️ Missing phone → BLOCKED (cannot deliver portal link without guest phone)
- ⚠️ `[PORTAL_URL]` must be replaced with actual magic-link before send

## Related Issues

- Fixes requirement from Grant (2026-09-07) for portal-first approach
- Aligns with WhatsApp stub best practices (link to full info, not paste full info)
- Prepares welcome pack pipeline for GuestFlow magic-link portal integration
- Removes risk of Wi-Fi/access/parking details being accidentally pasted in wrong context

## Future Work

- Wire GuestFlow `POST /api/bookings/[id]/generate-link` into CT pack assembler
- Add automated portal URL replacement step (after GuestFlow is live)
- Consider CoS Admin UI integration for one-click portal URL generation + send
