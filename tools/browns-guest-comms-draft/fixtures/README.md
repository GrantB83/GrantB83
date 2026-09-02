# Fixtures

Test data for the Browns guest communications draft tool.

## sample-booking.json

Example booking data with all fields populated, including optional late check-in flag.

**Fields:**
- `guestName` (required): Guest's name
- `checkInDate` (required): Check-in date in YYYY-MM-DD format
- `checkOutDate` (required): Check-out date in YYYY-MM-DD format
- `suiteOrUnit` (required): Suite or unit name
- `lateCheckIn` (optional): Boolean flag for after-hours arrival
- `adults` (required): Number of adult guests
- `children` (optional): Number of children
- `notes` (optional): Special requests or notes
- `channel` (required): Communication channel - "whatsapp" or "email"

## seeds/

**Real redacted stay@ tone samples** from Grant's actual guest communications.

No real guest PII. Names and identifying details anonymized. Tone and structure preserved.

### Seed themes (19 samples):

| Theme | Files | Purpose |
|-------|-------|---------|
| Booking confirm + deposit | 2 | Standard booking confirmation with payment link |
| Booking.com proforma | 1 | OTA booking acknowledgment |
| Afrikaans handoff | 2 | Quick Afrikaans responses before full details |
| Failed deposit / WhatsApp check | 2 | Payment follow-up |
| Soft calendar confirm | 1 | Penciled dates / soft hold |
| Invoice handoffs | 2 | Invoice delivery |
| Availability quote | 1 | Initial availability response |
| Availability follow-up | 1 | Quote follow-up |
| Hold dates | 2 | Temporary date hold |
| Guest count check | 2 | Guest number confirmation |
| Payment watch | 1 | Deposit reminder |
| Travel desk invoice | 2 | Corporate/travel agent invoices |

### Mandatory tone rules from corpus:

✅ **Short warm sentences** - Concise, friendly, professional
✅ **Sign-off:** "Kind regards," / "Kindest regards," + Grant Brown or Grant
✅ **Smileys sparingly** - Only occasional :) in appropriate contexts
✅ **Never invent rates/amounts** - Use [PAYMENT_LINK] placeholders when booking says payment needed
✅ **Live property:** The Browns Luxury Guest Suites Dullstroom ONLY
✅ **Address:** 279 Blue Crane Drive, Dullstroom
✅ **Contact:** stay@hospitality.partners | WhatsApp +27 83 645 8313
✅ **Gaps:** Few real direction/late-check-in/WiFi bodies in corpus - use warm tone + facts without inventing clock details or road specifics beyond "team will confirm"

### Excluded from corpus (tone-only):

Manor House, Paardeplaats, Rivendell samples used for tone learning only. Current live property is The Browns Dullstroom exclusively.

### APPROVAL.md mandate:

Grant must approve before ANY send. No auto-send. See approval gates H1/H2 in `docs/automation/approval-gates.md`.

## Usage

Run the test with fixtures:

```bash
npm run test:fixtures
```

This generates draft communications in `out/` using the sample booking and real tone seeds.
