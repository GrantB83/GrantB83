# Fixtures for browns-guest-comms-pipeline-pack

## sample-booking.json

Synthetic booking data for testing the pipeline pack.

**Guest:** Sarah Thompson  
**Dates:** 2026-09-20 to 2026-09-22  
**Suite:** The Browns Suite  
**Channel:** WhatsApp  

This fixture is used by `npm run test:fixtures`.

## Usage

```bash
cd tools/browns-guest-comms-pipeline-pack
npm run test:fixtures
```

The fixture test will:
1. Build the CLI
2. Run the pack on sample-booking.json
3. Auto-build sibling tools if needed
4. Generate output in test-out/
5. Exit with success code

## Safety

All fixture data is synthetic. No real guest PII.
