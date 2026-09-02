# Fixtures for hm-delivery-pod-draft

Test data for Heavy Metal delivery proof-of-delivery draft generation.

## Files

### sample-pod.json
Complete POD data with all fields including signature.
- Customer with phone
- Material, volume, unit
- Delivery location and datetime
- Vehicle and driver
- Notes
- Signature (signed delivery)

### minimal-pod.json
Minimal required fields only.
- Customer name
- Material, volume, unit
- Delivery location and date
- No optional fields (phone, vehicle, driver, notes, signature)

### sample-paste.txt
Paste text with full delivery information including signature.
- Structured format with labels
- All fields present
- Signed delivery

### unsigned-paste.txt
Paste text for unsigned delivery.
- Most fields present
- **No signature** - demonstrates that tool never invents signedBy field
- Missing vehicle information

## Usage

```bash
# Test with JSON fixtures
npm run draft -- --pod fixtures/sample-pod.json --outdir test-out/full/
npm run draft -- --pod fixtures/minimal-pod.json --outdir test-out/minimal/

# Test with paste text fixtures
npm run draft -- --text fixtures/sample-paste.txt --outdir test-out/paste/
npm run draft -- --text fixtures/unsigned-paste.txt --outdir test-out/unsigned/

# Run all fixture tests
npm run test:fixtures
```

## Expected Behavior

### sample-pod.json and sample-paste.txt
- All required fields extracted
- Optional fields present
- Signature recorded
- Clean pod.md output

### minimal-pod.json
- Required fields only
- missing-fields.md flags optional fields as not present
- APPROVAL.md shows warnings for missing optional data

### unsigned-paste.txt
- **Critical test:** No signature field in output
- APPROVAL.md emphasizes never inventing signatures
- POD is valid even without signature
- Tool correctly handles legitimate unsigned deliveries

## Safety Tests

1. **Never invent signatures**: unsigned-paste.txt must NOT have signedBy field
2. **Never invent volumes**: Tool only extracts from source
3. **Track missing fields**: All fixtures should generate missing-fields.md
4. **DRAFT status**: All pod.md outputs marked as DRAFT

## Field Extraction Patterns

The tool uses heuristic patterns to extract:

- **Customer**: "Customer:", "Name:", first line if name-like
- **Phone**: SA formats (+27..., 082...)
- **Material**: Keywords (sand, stone, gravel, crusher dust, etc.)
- **Volume**: Number + unit (m³, ton, load)
- **Location**: "Location:", "Delivered to:", place names
- **Date**: ISO (YYYY-MM-DD), DD/MM/YYYY, with optional time
- **Vehicle**: "Vehicle:", "Truck:", registration patterns
- **Driver**: "Driver:", "Delivered by:"
- **Signature**: "Signed by:", "Signature:", "Received by:"
- **Notes**: "Notes:", freeform text

If patterns don't match, fields are left undefined and flagged in missing-fields.md.
