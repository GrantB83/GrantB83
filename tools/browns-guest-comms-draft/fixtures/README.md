# Fixtures

Synthetic test data for the Browns guest communications draft tool.

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

Synthetic anonymized seed samples that mimic warm, concise hospitality tone.

**No real guest PII.** These are fictional examples created to demonstrate the tone and structure of guest communications.

### Seed files:

- `welcome-*.txt` - Welcome message samples
- `late-checkin-*.txt` - Late check-in coordination samples
- `quote-followup-*.txt` - Follow-up inquiry samples

### Tone characteristics:

✅ Warm and welcoming ("We're delighted", "Looking forward")
✅ First-person plural ("we", "our team")
✅ Concise (3-4 short paragraphs)
✅ Professional but friendly
✅ No invented rates, times, or availability
✅ Clear next steps

## Usage

Run the test with fixtures:

```bash
npm run test:fixtures
```

This will generate draft communications in the `out/` directory using the sample booking and seed samples.
