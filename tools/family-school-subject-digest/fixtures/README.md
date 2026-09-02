# Test Fixtures

This directory contains test fixtures for `family-school-subject-digest`.

## Files

### `subjects-mixed.txt`
Mixed school and admin items with various formats:
- School items (AISD, report cards, field trips)
- Payment items
- Sports items
- Calendar items
- Contains due dates and dollar amounts in subject lines

### `subjects-school-only.txt`
School-only items in markdown bullet format:
- All items should be classified as `school`
- Tests school keyword detection

### `subjects-sparse.txt`
Minimal items with no clear action verbs or metadata:
- Tests handling of vague subjects
- Should generate warnings in `missing-fields.md`

## Usage

Run all fixtures:
```bash
npm run test:fixtures
```

This will create output directories:
- `test-out-mixed/`
- `test-out-school/`
- `test-out-sparse/`

Each output directory contains the full set of generated files.
