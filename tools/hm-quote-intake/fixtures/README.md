# Heavy Metal Quote Intake - Test Fixtures

This directory contains sample inquiry texts for testing the hm-quote-intake tool.

## Fixtures

### sample-inquiry.txt
Standard WhatsApp/email inquiry with most fields present.
- Customer name and phone
- Material (sand)
- Volume with unit (m³)
- Delivery location
- Date needed
- No pricing (tool should not invent)

### inquiry-with-pricing.txt
Inquiry that includes explicit pricing information.
- Customer details
- Material (crusher dust)
- Volume (ton)
- Delivery location
- Price per unit and total
- Date

### minimal-inquiry.txt
Very sparse inquiry with many missing fields.
- Material (stone)
- Volume (loads)
- Location mention
- Missing: name, phone, exact date, pricing

## Testing

Run all fixtures:
```bash
npm run test:fixtures
```

Run specific fixture:
```bash
npm run intake -- --text fixtures/sample-inquiry.txt
npm run intake -- --text fixtures/inquiry-with-pricing.txt
npm run intake -- --text fixtures/minimal-inquiry.txt
```

## Expected Behavior

1. **Never invent data** - missing fields should appear in missing-fields.md
2. **Extract only what's present** - pricing only if explicitly stated
3. **Flag for review** - APPROVAL.md should list all concerns
4. **Track missing fields** - missing-fields.md should be accurate
