# Spec: GuestFlow WA Self-Check-In Template Port (Cottage Falcon v1)

## Meta

- **ID**: 012
- **Title**: Cottage Falcon WhatsApp Template Port
- **Status**: Implementation
- **Created**: 2026-09-21
- **Source**: Cottage Falcon template from WhatsApp Templates group (2026-07-23)

## Problem

GuestFlow welcome drafts and guest portal stayPacket content do not match the actual WhatsApp templates used for self-check-in at Browns' Cottage Suites (278 Blue Crane). The current generic content lacks:
- Property-specific addresses and Google Maps links
- Cottage vs Main House differentiation
- Gate and parking instructions from live template
- Proper housekeeping availability messaging
- Correct contact details and sign-off

## Goal

Port the Cottage Falcon WhatsApp template structure into:
1. Welcome draft generation (`/api/welcome-drafts`)
2. Late check-in drafts (`/api/packs/welcome-late`)
3. Guest portal stayPacket (`/api/guest-portal/[code]`)

**Constraints:**
- Approve & Send only. No invented content.
- Match WhatsApp Templates-group structure exactly
- Parameterize by property (cottage vs main-house)
- Extract URLs/credentials into environment variables
- v1 = Cottage/Falcon only; Main House TBD

## Template Structure (Cottage Falcon)

From `cottage-falcon-templates-group.txt`:

1. **Greeting**: "Hi there! 🌟 Hope you're well. We're excited to welcome you to Dullstroom soon! 🎉"
2. **Thank you**: "Thank you for choosing The Browns' Cottage Suites! ✨"
3. **Check-in time**: "🕒 Check-in Time: From 14:00"
4. **Address**: "📍 Address: 278 Blue Crane Drive, Dullstroom"
5. **Maps link**: "🔗 Navigation Link (Google Maps): https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8"
6. **WiFi**: "📶 WiFi Password: [WIFI]"
7. **Suite name**: "🛏️ Suite you booked : The Falcon Suite."
8. **Gate instruction**: "🛑 Gate: Once the gate has opened please drive through. Do not wait in the gate."
9. **Parking** (cottage-specific): "🚗 Parking: Please ensure you do not obstruct access for other guests. You can park anywhere to the left of the entrance gate or further into the garden on the lawn."
10. **Housekeeping**: "🙋 Our housekeepers are available next door at The Browns' Luxury Suites (279 Blue Crane Drive) until 5 PM. They will be expecting you and will gladly show you to your room. After 5 PM, we will give you our self-check-in details."
11. **Loadshedding**: "⚡ Loadshedding: Currently no planned loadshedding."
12. **Contact**: Primary email stay@thebrowns.co.za; WhatsApp from +27600200825 (ops display). Template had +27836458313 and Zandile +27 71 626 7226 — FLAG as NeedsGrant
13. **Sign-off**: "Kind regards, Grant & Liana Brown"

## Environment Variables to Add

Add to `/apps/guestflow/.env.example`:

```env
# Property Maps URLs (per property)
PROPERTY_MAPS_URL_COTTAGE=https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8
PROPERTY_MAPS_URL_MAIN=

# Property Addresses (per property)
PROPERTY_ADDRESS_COTTAGE=278 Blue Crane Drive, Dullstroom
PROPERTY_ADDRESS_MAIN=279 Blue Crane Drive, Dullstroom

# Property Display Names
PROPERTY_NAME_COTTAGE=The Browns' Cottage Suites
PROPERTY_NAME_MAIN=The Browns' Luxury Suites

# Property-specific parking instructions
PROPERTY_PARKING_COTTAGE=Please ensure you do not obstruct access for other guests. You can park anywhere to the left of the entrance gate or further into the garden on the lawn.
PROPERTY_PARKING_MAIN=

# Contact Details (operational display)
PROPERTY_OPS_WHATSAPP=+27600200825
PROPERTY_CONTACT_EMAIL=stay@thebrowns.co.za
```

## Implementation Files

### Phase 1: Environment & Config
- [x] Update `.env.example` with property-specific variables
- [x] Document Zandile's number (+27 71 626 7226) as NeedsGrant in spec

### Phase 2: Welcome Drafts API
- [ ] Update `/apps/guestflow/src/app/api/welcome-drafts/route.ts`
  - Generate drafts matching Falcon template structure
  - Parameterize by property (cottage vs main-house)
  - Use suite name from booking
  - Include gate, parking, housekeeping instructions
  - Sign-off: "Grant & Liana Brown"

### Phase 3: Late Check-In Packs
- [ ] Update `/apps/guestflow/src/app/api/packs/welcome-late/route.ts`
  - Include self-check-in variant for after 5 PM
  - Access codes SoR-driven (no PINs in template)

### Phase 4: Guest Portal StayPacket
- [ ] Update `/apps/guestflow/src/app/api/guest-portal/[code]/route.ts`
  - Property-specific addresses and maps links
  - Parking instructions per property
  - Check-in from 14:00 (not 14:00-18:00)
  - Update contact display

### Phase 5: Spec Artifacts
- [ ] Create `specs/012-guestflow-cottage-falcon-v1/spec.md` (this file)
- [ ] Create `specs/012-guestflow-cottage-falcon-v1/template-source.txt` (copy of uploaded template)
- [ ] Create `specs/012-guestflow-cottage-falcon-v1/README.md`

## Safety Gates

- ✅ No invented content (phone, WiFi, access codes)
- ✅ Zandile's number flagged as NeedsGrant
- ✅ Sign-off: Grant & Liana Brown (not The GuestFlow Team)
- ✅ v1 = Cottage only; Main House addresses present but TBD implementation
- ⚠️ Do NOT convert +278 to Cloud API format in docs
- ⚠️ Access codes remain SoR-driven (template had no PINs)

## Testing

Manual testing via:
1. Generate welcome draft for cottage booking
2. Verify template structure matches Falcon
3. Check property parameterization (cottage vs main-house detection)
4. Confirm placeholder handling ([WIFI], [ASK STAFF])
5. Validate guest portal stayPacket content

## Out of Scope

- Main House (279) template implementation (TBD)
- Automated WhatsApp sending
- Access code generation/management
- Multi-suite variants beyond Falcon

## Notes

- Template source: WhatsApp group "Templates", Grant/Liana message 2026-07-23
- WiFi password redacted as [WIFI] in source
- No gate/door codes in original template body
- Contact numbers in template: +27836458313, Zandile +27 71 626 7226
- Ops display WhatsApp: +27600200825 (from env)
- Primary email: stay@thebrowns.co.za
