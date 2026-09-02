# Test Fixtures

Synthetic school email subjects and filenames for testing the family-school-due-queue CLI.

## Files

### sample-subjects.txt

15 synthetic school email subject lines with various due date formats:
- ISO dates (YYYY-MM-DD)
- US dates (M/D, MM/DD/YYYY)
- Relative dates (due Friday, by Monday)
- Month references (September, Sept)
- Action keywords (permission slip, RSVP, form, volunteer)

### sample-filenames.txt

10 synthetic attachment filenames with due date patterns:
- ISO dates in filename
- US dates in filename
- Relative day references
- Action keywords in basename

## Usage

```bash
cd tools/family-school-due-queue
npm run test:fixtures
```

This will process both fixture files and generate outputs in `test-out/`.

## Expected Behavior

Most items should extract at least one signal (date or keyword). Items without clear due dates should land in `missing-signals.md`.
