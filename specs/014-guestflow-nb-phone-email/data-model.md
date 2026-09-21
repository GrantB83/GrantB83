# Data Model: Nightsbridge Phone & Email Mapping

## Existing Entities

### Booking (table: `bookings`)

No schema changes needed. Fields already exist:

- `guest_phone` (string, nullable) - Primary guest phone number
- `guest_email` (string, nullable) - Primary guest email address
- `guest_phone2` (string, nullable) - Secondary guest phone number
- `guest_email2` (string, nullable) - Secondary guest email address
- Other existing fields: `guest_name`, `suite_or_unit`, `check_in_date`, `check_out_date`, etc.

### GuestContact (table: `guest_contacts`)

No schema changes needed. Managed by `upsertGuestContact` function:

- `id` (integer, primary key)
- `tenant_id` (integer, foreign key)
- `normalized_phone` (string, nullable) - Phone in E.164 format
- `email` (string, nullable)
- `display_name` (string, nullable)
- `last_stay_at` (string/date, nullable)
- `last_suite` (string, nullable)
- `source` (enum: 'nb' | 'inbound' | 'manual')
- `nbid` (string, nullable) - Nightsbridge booking ID
- Other existing fields: retention metadata, timestamps

## Data Flow

```
Nightsbridge Excel File
  ↓
Parse sectioned headers (currentHeaders.forEach)
  ↓
Map "Phone Number" → booking.guestPhone
Map "Email" → booking.guestEmail
Map "*2" variants → guestPhone2/guestEmail2
  ↓
upsertBooking(db, booking, ...)
  ↓
IF booking.guestPhone present:
  upsertGuestContact(db, {
    phone: booking.guestPhone,  ← normalizeZaE164 called internally
    email: booking.guestEmail,
    displayName: booking.guestName,
    source: 'nb',
    nbid: booking.bookingId
  })
```

## Validation Rules

- **Phone normalization**: Applied by `normalizeZaE164()` in `upsertGuestContact`
  - "082 123 4567" → "+27821234567"
  - "+27 82 123 4567" → "+27821234567"
  - Empty/invalid → null (never invent)

- **Email normalization**: Applied by `normalizeEmail()` in `upsertGuestContact`
  - Lowercase, trim whitespace
  - Must contain "@"
  - Empty/invalid → null

- **Header normalization**: Applied in parser
  - `.toLowerCase()` + `.replace(/[^a-z0-9]/g, '')`
  - "Phone Number" → "phonenumber"
  - "Phone Number *2" → "phonenumber*2" or "phonenumber2"
