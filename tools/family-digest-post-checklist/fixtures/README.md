# Test Fixtures for family-digest-post-checklist

This directory contains test fixtures for validating `family-digest-post-checklist` behavior.

## Fixtures

### healthy-pack

A complete, valid pack that should pass all checks:
- Has PACK.md, school.md, family.md, APPROVAL.md
- All content files are non-empty with headers
- No duplicate items between school.md and family.md

**Expected result:** Exit 0, all checks pass

### missing-school-pack

A pack missing the required school.md file:
- Has PACK.md, family.md, APPROVAL.md
- Missing school.md

**Expected result:** Exit 1, "Missing required files: school.md"

### duplicate-item-pack

A pack with duplicate items between school.md and family.md:
- Has all required files
- "Tesla Payment Due" and "AISD School Closure Notice" appear in both sections

**Expected result:** Exit 1 (or warning), "Found 2 duplicate item(s)"

## Running Tests

```bash
cd tools/family-digest-post-checklist
npm install
npm run build
npm run test:fixtures
```

Each test will generate outputs in `test-out-*` directories for review.
