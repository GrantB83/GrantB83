# Fixtures for hm-quote-to-pod

Test fixtures for mapping quote.json to pod.json.

## Files

### sample-quote.json
Full quote with all fields present including pricing. Standard mapping scenario.

### minimal-quote.json
Minimal quote with only customer, material, and location. Tests handling of missing volume and other fields.

### multi-material-quote.json
Quote with multiple materials. Tests that mapper takes first material and notes the others.

## Testing

```bash
cd tools/hm-quote-to-pod

# Run all fixtures
npm run test:fixtures

# Test specific fixture
npm run map -- --quote fixtures/minimal-quote.json --outdir test-out/minimal/
```

## Expected Behavior

- **sample-quote.json**: Maps most fields, leaves vehicle/driver/signedBy missing
- **minimal-quote.json**: Maps only present fields, flags missing volume/phone/etc
- **multi-material-quote.json**: Takes first material (Sand), notes others in mapping report
