# Fixtures for family-morning-digest-pipeline-pack

Test fixtures for pipeline pack assembler.

## Fixture Directories

### healthy-morning-pack/
Valid morning digest pack with:
- PACK.md, school.md, family.md, APPROVAL.md
- Should pass all checks

### missing-pack-fail/
Empty directory simulating missing pack.
- Should fail with "Pack path does not exist" or "Missing required file"

## Usage

```bash
# Test with healthy pack
npm run pipeline -- --pack fixtures/healthy-morning-pack --outdir test-out-healthy

# Test with missing pack (should fail)
npm run pipeline -- --pack fixtures/missing-pack-fail --outdir test-out-missing
```

## Expected Outcomes

**healthy-morning-pack:**
- Exit code 0 (if post-checklist passes)
- Creates pipeline-pack-YYYY-MM-DD/ with all files
- POST-CHECKLIST.md shows all checks passed

**missing-pack-fail:**
- Exit code 1
- Error message about missing required files
- No pipeline pack created
