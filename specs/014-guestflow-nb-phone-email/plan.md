# Implementation Plan: Nightsbridge Phone & Email Mapping Fix

**Branch**: `cursor/guestflow-nb-phone-email-0114` | **Date**: 2026-09-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-guestflow-nb-phone-email/spec.md`

## Summary

Map Nightsbridge "Phone Number" and "Email" column headers in the sectioned Excel parser to `booking.guestPhone` and `booking.guestEmail` fields, then normalize phone numbers to E.164 format before calling `upsertGuestContact`. This fixes the root cause of empty `guest_phone` fields blocking WA Web allowlist functionality.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js App Router)

**Primary Dependencies**: 
- `xlsx` (Excel parsing)
- `date-fns` (date manipulation)
- Existing `upsertGuestContact` function from `@/lib/guest-contacts`
- Existing E.164 normalization helper (to be identified)

**Storage**: SQLite/Turso database via `@/lib/db` client

**Testing**: Manual testing with live Excel fixture + unit tests for header mapping logic

**Target Platform**: Next.js API Route (server-side)

**Project Type**: Web service (Next.js API endpoint)

**Performance Goals**: Process 100+ booking rows in <5 seconds

**Constraints**: 
- Must not break existing sectioned parser logic
- Must not invent PII (empty phone stays empty)
- Must normalize headers same way as existing code

**Scale/Scope**: Single API route, ~50 lines of code changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **No constitution violations identified**
- Extends existing file (`apps/guestflow/src/app/api/cron/nightsbridge-ingest/route.ts`)
- Uses existing patterns (header mapping, upsertGuestContact)
- No new dependencies beyond existing E.164 helper

## Project Structure

### Documentation (this feature)

```text
specs/014-guestflow-nb-phone-email/
├── plan.md              # This file
├── data-model.md        # Phase 1 output (existing fields)
├── quickstart.md        # Phase 1 output (test procedure)
└── tasks.md             # Phase 2 output (implementation checklist)
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/
│   ├── app/api/cron/nightsbridge-ingest/
│   │   └── route.ts     # MODIFY: Add phone/email header mapping (lines ~209-229)
│   └── lib/
│       ├── guest-contacts.ts    # EXISTING: upsertGuestContact function
│       └── normalize.ts         # CHECK: E.164 normalization helper
└── tests/
    └── nightsbridge-ingest.test.ts  # CREATE: Test multi-section with phone/email
```

**Structure Decision**: Modify existing route.ts file only. No new files needed except tests.

## Complexity Tracking

No constitution violations to justify.

## Phase 0: Research

### Research Tasks

1. **Identify E.164 normalization function**
   - Search for `normalizeZaE164` or similar in codebase
   - If not found, check if normalization happens in `upsertGuestContact`
   - Document the normalization approach

2. **Verify header normalization pattern**
   - Current code uses `.toLowerCase().replace(/[^a-z0-9]/g, '')` (line ~199)
   - Confirm "Phone Number" → "phonenumber" and "Email" → "email"
   - Confirm "*2" handling: "Phone Number *2" → "phonenumber2"

3. **Identify test fixture location**
   - Use provided `uploads/arr_and_dep-2026-09-21-0500_f8e7.xlsx` as reference
   - Create redacted test fixture with synthetic phone numbers

## Phase 1: Design

### Data Model

No new entities. Existing fields in `bookings` table:
- `guest_phone` (string, nullable)
- `guest_email` (string, nullable)  
- `guest_phone2` (string, nullable)
- `guest_email2` (string, nullable)

Existing fields in `guest_contacts` table (managed by `upsertGuestContact`):
- `phone` (string, primary key component)
- `email` (string, nullable)
- `display_name` (string, nullable)
- Other fields as defined in `upsertGuestContact`

### Contracts

**API Contract**: No changes to API interface. Existing POST endpoint continues to accept Excel file.

**Internal Contract**: Header mapping rules (to be added to code comments)

```typescript
// Header mapping (case-insensitive, space-normalized):
// "phonenumber" | "phone number" → booking.guestPhone
// "email" → booking.guestEmail
// "phonenumber2" | "phone number *2" | "phonenumber*2" → booking.guestPhone2
// "email2" | "email *2" | "email*2" → booking.guestEmail2
```

### Quickstart

**Validation Procedure**:

1. Start local dev server: `npm run dev`
2. Set `CRON_SECRET` in `.env.local`
3. Upload test fixture via curl:
   ```bash
   curl -X POST http://localhost:3000/api/cron/nightsbridge-ingest \
     -H "x-cron-secret: $CRON_SECRET" \
     -F "file=@tests/fixtures/nb-phone-email-fixture.xlsx"
   ```
4. Verify response shows `inserted` or `updated` count > 0
5. Query database to confirm:
   - `SELECT guest_name, guest_phone, guest_email FROM bookings WHERE guest_phone IS NOT NULL`
   - `SELECT phone, email FROM guest_contacts WHERE source = 'nb'`
6. Check that phone numbers are in E.164 format (start with "+27")

**Expected Outcome**: Bookings with phone/email populated, guest_contacts records created.
