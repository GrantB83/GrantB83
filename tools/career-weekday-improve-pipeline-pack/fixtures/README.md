# Fixtures for career-weekday-improve-pipeline-pack

## healthy-improve-pack/

Valid improve pack folder for testing successful pipeline assembly.

Contains:
- PACK.md (index with counts)
- LEARNING-DRAFT.md (numbered patterns)
- stats.json (machine-readable statistics)
- APPROVAL.md (safety gates)

Used by `npm run test:fixtures` to verify:
- Pipeline pack assembly from existing improve pack
- Manifest generation with accurate file lists
- PACK.md index generation
- Optional stage exclusion (when --no-run-digest)
