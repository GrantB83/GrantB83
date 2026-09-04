# Fixtures for family-school-pipeline-pack

This directory contains sample input files for testing the pipeline pack assembler.

## Files

### sample-subjects.txt

Sample email subjects for testing the full pipeline (digest + due-queue).

Contains a mix of:
- School announcements
- Due date signals
- Forms and permission slips
- Calendar events
- Administrative items

## Usage

Run the fixture test to verify the tool works correctly:

```bash
npm run test:fixtures
```

This will generate output in `test-out-full/` directory.

## Expected Behavior

The fixture test should:
1. Build all sibling tools if needed
2. Run family-school-subject-digest on sample-subjects.txt
3. Run family-school-due-queue on sample-subjects.txt
4. Skip family-calendar-ics-digest (no --ics provided)
5. Assemble pack with PACK.md, APPROVAL.md, manifest.json
6. Exit 0 (success)

## Output Structure

```
test-out-full/pack-2026-09-04/
├── PACK.md                    # Pack index
├── APPROVAL.md                # Safety checklist
├── manifest.json              # Metadata
├── digest-digest.md           # From family-school-subject-digest
├── digest-items.json          # From family-school-subject-digest
├── digest-missing-fields.md   # From family-school-subject-digest
├── queue-queue.md             # From family-school-due-queue
├── queue-queue.json           # From family-school-due-queue
└── queue-missing-signals.md   # From family-school-due-queue
```
