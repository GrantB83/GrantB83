# Heavy Metal Quote Pipeline Pack - Fixtures

Test fixtures for `hm-quote-pipeline-pack` tool.

## Files

### prebuilt-quote.json
Sample quote output from hm-quote-intake. Contains full quote data with customer, material, volume, and location.

### prebuilt-pod.json
Sample POD output from hm-quote-to-pod. Contains mapped fields from quote plus POD-specific fields.

### minimal-quote.json
Minimal quote with only required fields, to test missing field detection.

## Usage

Fixtures are used in `npm run test:fixtures`:

```bash
npm run build
npm run test:fixtures
```

This generates a test pack in `test-out/pack-YYYYMMDD/` with:
- PACK.md (pack index)
- APPROVAL.md (approval checklist)
- quote.json (copy)
- pod.json (copy)
- manifest.json

## Testing Different Scenarios

**Prebuilt pack (fixtures):**
```bash
npm run pack -- \
  --outdir out/test/ \
  --quote fixtures/prebuilt-quote.json \
  --pod-outdir fixtures/
```

**Missing fields:**
```bash
npm run pack -- \
  --outdir out/test/ \
  --quote fixtures/minimal-quote.json
```

**With sibling tool runs (requires sibling tools installed):**
```bash
npm run pack -- \
  --outdir out/test/ \
  --run-intake --text ../hm-quote-intake/fixtures/sample-inquiry.txt \
  --run-map
```
