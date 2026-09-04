# Fixtures for Browns Welcome Late Pipeline Pack

## sample-bookings.json

Sample bookings file with 3 arriving guests for 2026-09-20:

1. **Sarah & Tom Henderson** - Regular check-in (14:00), has phone
2. **Patricia van der Merwe** - Late check-in (16:30), flagged as lateCheckIn
3. **The Mbeki Family** - Unknown check-in time (null), after-hours note

This fixture tests:
- Welcome draft generation for same-day arrivals
- Late check-in detection (both by time and flag)
- Unknown-time handling for missing check-in times
- Missing data handling (phone missing for Mbeki Family)

## Testing

Run the fixture test:

```bash
npm run test:fixtures
```

This will:
1. Build the pipeline tool
2. Auto-build sibling tools if needed (browns-welcome-draft-pack, browns-late-checkin-queue)
3. Run the pipeline on sample-bookings.json
4. Generate output in test-out/pack-2026-09-20/
5. Verify PACK.md, APPROVAL.md, and manifest.json are created
6. Exit 0 on success

## Expected Output

```
test-out/
└── pack-2026-09-20/
    ├── PACK.md                  # Pipeline index
    ├── APPROVAL.md              # Approval checklist
    ├── welcome-queue.md         # Welcome message queue
    ├── welcome-*.md             # Individual welcome drafts
    ├── welcome-missing-fields.md
    ├── late-queue.md            # Late check-in queue
    ├── late-unknown-time.md     # Unknown-time queue
    ├── late-missing-fields.md
    └── manifest.json            # Pack metadata
```

## Notes

- Fictional names used for testing
- Never commit real guest data
- Fixtures demonstrate both happy path and edge cases (missing data, late arrivals, unknown times)
