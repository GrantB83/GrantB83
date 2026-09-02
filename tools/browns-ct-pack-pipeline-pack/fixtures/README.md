# Test Fixtures

## sample-pack/

A minimal Browns CT pack output from `browns-ct-pack-assemble` for testing the pipeline orchestrator.

**Contents:**
- PACK.md - Pack index with timed checklist
- APPROVAL.md - Approval gates
- changes.md - Booking changes report (1 update)
- daily-ops.md - Daily ops brief (1 arrival)
- guest-henderson.md - Guest welcome draft
- manifest.json - Pack metadata

**Test Coverage:**
- Validates that pipeline can read existing pack
- Tests file copying and manifest generation
- Verifies PACK.md generation
- Tests optional post-checklist skipping

**Usage:**
```bash
npm run pipeline -- --date 2026-09-20 --pack fixtures/sample-pack --outdir test-out
```

This fixture represents a healthy ct-pack-assemble output ready for pipeline orchestration.
