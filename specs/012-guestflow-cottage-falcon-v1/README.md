# GuestFlow Cottage Falcon Template Port (v1)

## Overview

Ports the Cottage Falcon WhatsApp self-check-in template into GuestFlow welcome drafts and guest portal stayPacket.

**Source**: WhatsApp Templates group, Grant/Liana message 2026-07-23

**Scope**: Cottage (278 Blue Crane) only. Main House (279) TBD.

## Files

- `spec.md` - Full feature specification
- `template-source.txt` - Original Falcon template (WiFi redacted)
- `SUMMARY.md` - Template analysis (from uploads)

## Key Changes

1. **Environment Variables**: Added property-specific maps URLs, addresses, parking, contact details
2. **Welcome Drafts**: Match Falcon template structure with property parameterization
3. **Guest Portal**: Property-specific addresses, maps links, parking instructions
4. **Sign-off**: "Grant & Liana Brown" (not "The GuestFlow Team")

## Safety

- ✅ No invented content (Approve & Send only)
- ✅ Zandile's number (+27 71 626 7226) flagged as NeedsGrant
- ✅ Access codes remain SoR-driven
- ✅ v1 = Cottage only

## Implementation

See `spec.md` for detailed implementation checklist.

## Testing

Manual testing:
1. Generate welcome draft for cottage booking
2. Verify template structure matches Falcon
3. Check property detection (cottage vs main-house)
4. Validate guest portal stayPacket content
