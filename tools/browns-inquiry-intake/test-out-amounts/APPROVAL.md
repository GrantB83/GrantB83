# Browns Inquiry Intake - APPROVAL REQUIRED

⚠️ **REVIEW EXTRACTED FIELDS BEFORE USING DOWNSTREAM TOOLS**

## Extraction Results

### Guest Information
- **Name**: David Thompson
- **Channel**: email

### Dates
- **Check-in**: December 5, 2026
- **Check-out**: December 8, 2026

### Accommodation
- **Suite/Unit**: Luxury Suite
- **Adults**: 2
- **Children**: 2
- **Late Check-in**: YES

### Financial Information
- **Currency**: ZAR
- **Deposit**: ZAR 6750
- **Total**: ZAR 13500
- **Quote Amount**: ❌ NOT FOUND (no invented amounts)

## Safety Notes

- ✅ Offline extraction only - no API calls made
- ✅ No rates were invented or calculated
- ✅ Amounts included ONLY if explicitly stated in inquiry
- ⚠️ This tool does NOT send messages to WhatsApp or Email
- ⚠️ This tool does NOT connect to Nightsbridge or other booking systems
- ⚠️ For Dullstroom Browns only

## Next Steps

1. Review all extracted fields above
2. Fill in missing fields using `missing-fields.md` checklist
3. Verify amounts are correct (if present)
4. Use `booking.json` with browns-guest-comms-draft or daily-ops tools
5. Use `quote.json` with browns-quote-invoice-draft tool

## Output Files

- `booking.json` - Compatible with browns-guest-comms-draft / daily-ops
- `quote.json` - Compatible with browns-quote-invoice-draft
- `missing-fields.md` - Checklist of fields to fill manually
- `manifest.json` - Metadata about this extraction