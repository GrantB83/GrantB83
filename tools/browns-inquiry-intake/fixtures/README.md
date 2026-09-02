# Fixtures for Browns Inquiry Intake

Sample inquiry texts for testing the extraction tool.

## Files

### sample-inquiry.txt
Standard email inquiry with all required fields:
- Guest name
- Check-in and check-out dates
- Adults count
- Suite preference
- Late check-in note
- NO amounts (tests that tool doesn't invent rates)

### whatsapp-inquiry.txt
Typical WhatsApp inquiry with:
- Informal format
- Missing guest name
- Multiple rooms needed
- Phone number in header
- Missing amounts (asking for price, not stating it)

### inquiry-with-amounts.txt
Email inquiry that includes pricing:
- Explicit quote amount
- Total and deposit amounts
- All required fields present
- Tests that amounts are correctly extracted when present

## Usage

```bash
# Test with sample inquiry (no amounts)
npm run intake -- --text fixtures/sample-inquiry.txt --outdir test-out

# Test WhatsApp format
npm run intake -- --text fixtures/whatsapp-inquiry.txt --outdir test-out

# Test with amounts present
npm run intake -- --text fixtures/inquiry-with-amounts.txt --outdir test-out
```

## Expected Behavior

All fixtures should:
1. Extract whatever fields are present
2. Track missing fields in missing-fields.md
3. NEVER invent amounts that aren't in the text
4. Generate APPROVAL.md requiring human review
5. Work offline (no API calls)
