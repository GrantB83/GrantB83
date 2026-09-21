# Implementation Notes - Cottage Falcon Template Port

## Summary

Successfully ported the Cottage Falcon WhatsApp self-check-in template into GuestFlow welcome drafts and guest portal. All changes committed and PR #208 created (draft).

**Branch**: `cursor/guestflow-cottage-falcon-v1-062f`  
**PR**: https://github.com/GrantB83/GrantB83/pull/208  
**Commit**: db60212

## What Was Done

### 1. Spec Artifacts Created
- `specs/012-guestflow-cottage-falcon-v1/spec.md` - Full feature specification
- `specs/012-guestflow-cottage-falcon-v1/template-source.txt` - Original Falcon template
- `specs/012-guestflow-cottage-falcon-v1/README.md` - Quick reference
- `specs/012-guestflow-cottage-falcon-v1/IMPLEMENTATION-NOTES.md` - This file

### 2. Environment Variables Added
Added to `apps/guestflow/.env.example`:
```env
# Property Maps URLs (cottage extracted from Falcon template)
PROPERTY_MAPS_URL_COTTAGE=https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8
PROPERTY_MAPS_URL_MAIN=

# Property Addresses
PROPERTY_ADDRESS_COTTAGE=278 Blue Crane Drive, Dullstroom
PROPERTY_ADDRESS_MAIN=279 Blue Crane Drive, Dullstroom

# Property Display Names
PROPERTY_NAME_COTTAGE=The Browns' Cottage Suites
PROPERTY_NAME_MAIN=The Browns' Luxury Suites

# Parking Instructions (cottage from Falcon template)
PROPERTY_PARKING_COTTAGE=Please ensure you do not obstruct access for other guests. You can park anywhere to the left of the entrance gate or further into the garden on the lawn.
PROPERTY_PARKING_MAIN=

# Contact Details
PROPERTY_CONTACT_EMAIL=stay@thebrowns.co.za
PROPERTY_OPS_WHATSAPP=+27600200825
```

### 3. Welcome Draft Generation Updated
File: `apps/guestflow/src/app/api/welcome-drafts/route.ts`

Updated `generateWelcomeMessage()` to:
- Detect property type (cottage vs main-house) from property name and suite
- Use property-specific env vars for addresses, maps, parking
- Match Falcon template structure exactly:
  - Greeting: "Hi there! 🌟 Hope you're well..."
  - Thank you with property name
  - Check-in time: "From 14:00"
  - Address and maps link
  - WiFi password (from env, fail to [WIFI])
  - Suite name from booking
  - Gate and parking instructions
  - Housekeeping availability messaging
  - Loadshedding line
  - Contact email
  - Sign-off: "Grant & Liana Brown"

### 4. Guest Portal StayPacket Updated
File: `apps/guestflow/src/app/api/guest-portal/[code]/route.ts`

- Property-specific addresses and maps URLs in portalData
- Check-in time: "From 14:00" (empty `to` value)
- Parking instructions from env
- Updated house rules to include housekeeping info
- Contact email from `PROPERTY_CONTACT_EMAIL`

### 5. Guest Portal UI Updated
File: `apps/guestflow/src/app/guest/[code]/page.tsx`

- Added property address display section with:
  - Address text
  - "Open in Google Maps" button with external link
  - Directions subsection
- Check-in time formatting: "From 14:00" when no end time
- TypeScript interface updated for `property.address` and `property.mapsUrl`

### 6. Late Check-In Pack Generation Updated
File: `apps/guestflow/src/app/api/packs/welcome-late/route.ts`

- Updated draft message generation to use Falcon template format
- Property parameterization (cottage vs main-house)
- Full template structure with emojis and proper formatting

## Template Source Details

**Original**: WhatsApp Templates group, Grant/Liana message 2026-07-23  
**Redactions**: WiFi password → `[WIFI]`  
**Omissions**: No gate/door codes in template body (access codes remain SoR-driven)

**Contact numbers in template**:
- Message body: +27836458313
- Zandile: +27 71 626 7226
- **NeedsGrant**: Both numbers flagged in spec as requiring explicit Grant approval before guest-facing inclusion

**Operational display** (from env):
- WhatsApp: +27600200825 (PROPERTY_OPS_WHATSAPP)
- Email: stay@thebrowns.co.za (PROPERTY_CONTACT_EMAIL)

## Property Detection Logic

```typescript
const isCottage = propertyNameLower.includes('cottage') || suiteLower.includes('cottage')
const property = isCottage ? 'cottage' : 'main-house'
```

Uses both `propertyName` and `suiteOrUnit` fields since:
- `propertyName` might be generic
- `suite` might contain "Cottage Suites - The Falcon Suite"

## Safety Gates Met

✅ **No invented content** - All content from template or env vars  
✅ **Placeholders for missing data** - [WIFI], [ASK STAFF]  
✅ **Zandile's number** - Documented as NeedsGrant, not included in code  
✅ **Sign-off** - "Grant & Liana Brown" (not "The GuestFlow Team")  
✅ **v1 scope** - Cottage only; Main House addresses present but TBD  
✅ **Access codes** - SoR-driven (no hardcoded PINs)  
✅ **No auto-send** - Draft generation only (Approve & Send workflow)

## Testing Checklist

Manual testing required before merge:

### Welcome Drafts
- [ ] Generate drafts for cottage booking (suite contains "cottage")
- [ ] Verify template structure matches Falcon exactly
- [ ] Check emojis render correctly
- [ ] Confirm property detection (cottage vs main-house)
- [ ] Validate WiFi placeholder ([WIFI] when not set)
- [ ] Check suite name appears correctly
- [ ] Verify sign-off: "Grant & Liana Brown"

### Guest Portal
- [ ] Open portal for cottage booking
- [ ] Verify property address displays: "278 Blue Crane Drive, Dullstroom"
- [ ] Check "Open in Google Maps" button works
- [ ] Confirm maps link: https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8
- [ ] Validate check-in time: "From 14:00" (not "Between 14:00 - ")
- [ ] Check parking instructions (cottage-specific)
- [ ] Verify contact email: stay@thebrowns.co.za

### Late Check-In Pack
- [ ] Generate pack for cottage booking
- [ ] Verify Falcon template format in PACK.md
- [ ] Check property parameterization

## Known Limitations (v1)

1. **Main House (279)** - Environment vars present but template TBD
2. **Staff numbers** - Zandile +27 71 626 7226 flagged as NeedsGrant
3. **WiFi password** - Requires `WIFI_PASSWORD` env var (fail to [WIFI])
4. **Single template** - Only Falcon structure; other suites use same format

## Environment Setup Required

Before production use, Grant needs to set these secrets in Vercel:

```bash
# Required for cottage operation
PROPERTY_MAPS_URL_COTTAGE=https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8
PROPERTY_ADDRESS_COTTAGE=278 Blue Crane Drive, Dullstroom
PROPERTY_NAME_COTTAGE=The Browns' Cottage Suites
PROPERTY_PARKING_COTTAGE=Please ensure you do not obstruct access for other guests. You can park anywhere to the left of the entrance gate or further into the garden on the lawn.
PROPERTY_CONTACT_EMAIL=stay@thebrowns.co.za
PROPERTY_OPS_WHATSAPP=+27600200825

# WiFi credentials (DO NOT COMMIT)
WIFI_NETWORK=[actual network name]
WIFI_PASSWORD=[actual password]

# Optional: Main House (for future)
PROPERTY_MAPS_URL_MAIN=[TBD]
PROPERTY_ADDRESS_MAIN=279 Blue Crane Drive, Dullstroom
PROPERTY_NAME_MAIN=The Browns' Luxury Suites
PROPERTY_PARKING_MAIN=[TBD]
```

## Next Steps for Grant

1. **Review PR #208**: https://github.com/GrantB83/GrantB83/pull/208
2. **Test in dev environment**:
   - Set env vars in `.env.local`
   - Generate welcome drafts for cottage booking
   - Open guest portal link
   - Verify template matches live Falcon usage
3. **Approve content**:
   - Confirm template wording
   - Approve Zandile's number inclusion (if needed)
   - Verify contact details (stay@, +27600200825)
4. **Set production secrets** in Vercel dashboard
5. **Merge PR** when ready (currently draft)
6. **Future**: Main House (279) template (separate PR)

## Files Modified

```
apps/guestflow/.env.example
apps/guestflow/src/app/api/welcome-drafts/route.ts
apps/guestflow/src/app/api/guest-portal/[code]/route.ts
apps/guestflow/src/app/api/packs/welcome-late/route.ts
apps/guestflow/src/app/guest/[code]/page.tsx
```

## Files Created

```
specs/012-guestflow-cottage-falcon-v1/spec.md
specs/012-guestflow-cottage-falcon-v1/README.md
specs/012-guestflow-cottage-falcon-v1/template-source.txt
specs/012-guestflow-cottage-falcon-v1/IMPLEMENTATION-NOTES.md
```

## Git Commands for Reference

```bash
# View branch
git checkout cursor/guestflow-cottage-falcon-v1-062f

# View commit
git show db60212

# View changes
git diff main..cursor/guestflow-cottage-falcon-v1-062f

# Test locally (after setting env vars)
cd apps/guestflow
npm run dev
```

## Questions for Grant

1. **Zandile's number** (+27 71 626 7226) - Include in guest-facing messages? Currently NeedsGrant.
2. **Main House template** - Should this be a follow-up PR or wait for different content?
3. **WiFi password** - Confirm env var name convention (WIFI_PASSWORD vs WIFI_PASSWORD_COTTAGE)?
4. **Template variations** - Are other suites (Eagle, Crane) different, or can they use Falcon structure with suite name substitution?
5. **Contact number in template** (+27836458313) - Should this replace +27600200825 as operational display?

---

**Implementation completed**: 2026-09-21  
**Agent**: Cursor Cloud Agent (cursor/guestflow-cottage-falcon-v1-062f)  
**Status**: ✅ Ready for Grant review and testing
