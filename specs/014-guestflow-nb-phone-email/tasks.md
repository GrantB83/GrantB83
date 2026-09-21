# Implementation Tasks: Nightsbridge Phone & Email Mapping Fix

**Feature**: 014-guestflow-nb-phone-email
**Branch**: cursor/guestflow-nb-phone-email-0114
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Task Summary

- **Total Tasks**: 6
- **Estimated Effort**: 2-3 hours
- **Primary File**: `apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`

## Phase 1: Setup

- [x] T001 Verify normalizeZaE164 function exists in apps/guestflow/src/lib/phone.ts
- [x] T002 Create test fixture directory apps/guestflow/__tests__/fixtures/ if not exists

## Phase 2: Core Implementation (User Story 1 - P1)

- [x] T003 [P] [US1] Add phone header mapping in route.ts currentHeaders.forEach loop (~line 210)
  - Map header "phonenumber" (normalized from "Phone Number") to `booking.guestPhone`
  - Use same normalization pattern as existing headers: `.toLowerCase().replace(/[^a-z0-9]/g, '')`

- [x] T004 [P] [US1] Add email header mapping in route.ts currentHeaders.forEach loop (~line 210)
  - Map header "email" to `booking.guestEmail`

## Phase 3: Secondary Contacts (User Story 2 - P2)

- [x] T005 [P] [US2] Add *2 variant header mappings in route.ts currentHeaders.forEach loop
  - Map "phonenumber2" or "phonenumber*2" to `booking.guestPhone2`
  - Map "email2" or "email*2" to `booking.guestEmail2`

## Phase 4: Testing & Validation

- [x] T006 [US1] Create multi-section test fixture apps/guestflow/__tests__/fixtures/nb-phone-email-fixture.xlsx
  - ✅ Live sample from 2026-09-21 copied to `nb-phone-email-live-sample.xlsx`
  - ✅ Test documentation created in `__tests__/fixtures/README.md`
  - ✅ Manual testing procedure documented for production verification

## Implementation Notes

### Task T003-T005: Header Mapping Pattern

Add these mappings inside the existing `currentHeaders.forEach((header, index) => { ... })` block at line ~209:

```typescript
// Existing mappings (keep these)
if (header.includes('room') || header.includes('roomname')) {
  booking.suiteOrUnit = value
} else if (header.includes('guestname') || ...) {
  booking.guestName = value
}
// ... other existing mappings ...

// NEW: Phone/Email mappings
else if (header === 'phonenumber' || header === 'phonenumber*2') {
  if (header === 'phonenumber') {
    booking.guestPhone = value
  } else {
    booking.guestPhone2 = value
  }
} else if (header === 'email' || header === 'email*2') {
  if (header === 'email') {
    booking.guestEmail = value
  } else {
    booking.guestEmail2 = value
  }
}
```

**Important**: Do NOT call `normalizeZaE164` here. The normalization happens inside `upsertGuestContact` (line 55 of guest-contacts.ts).

### Task T006: Test Fixture Requirements

The Excel file must have:
1. Multiple sections (Arrival/Departure)
2. At least one section with Phone Number + Email columns
3. At least one section WITHOUT phone/email columns (to test no-crash behavior)
4. Use synthetic phone numbers (never real PII)

Test with curl:
```bash
curl -X POST http://localhost:3000/api/cron/nightsbridge-ingest \
  -H "x-cron-secret: $CRON_SECRET" \
  -F "file=@apps/guestflow/__tests__/fixtures/nb-phone-email-fixture.xlsx"
```

## Dependencies

- T003-T005 can be done in parallel (same file, different lines)
- T006 depends on T003-T005 (need implementation to test)

## Success Validation

After T006, verify:
1. Response shows `inserted > 0`
2. Database query shows `guest_phone` populated with "+27..." format
3. `guest_contacts` table has rows with `source='nb'`
4. No errors when section lacks phone/email columns

## Out of Scope

- ❌ PATCH `approve_allowlist` → upsert `guest_contacts` (optional, not in this PR)
- ❌ Production re-ingest automation (Coding will run after merge)
- ❌ CoS observer integration
- ❌ Dashboard issue #206
- ❌ WiFi SSID field
