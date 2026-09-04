# Fixtures for Drive Upload Prep Pipeline Pack

## Test Files

- **test-invoice.pdf** — Minimal PDF for testing pipeline pack assembly

## Usage

Run fixture test:

```bash
cd tools/drive-upload-prep-pipeline-pack
npm run test:fixtures
```

Expected behavior:
- Creates pipeline pack in `test-out/`
- Runs drive-pdf-upload-prep (default ON)
- Generates PACK.md, APPROVAL.md, manifest.json
- Exit code 0 on success

## Notes

- Validation stage is OFF by default (enable with `--run-validate`)
- Upload prep stage is ON by default (disable with `--no-run-upload-prep`)
- Fixture uses demo parent ID `TEST-PARENT-ID-FIXTURE`
