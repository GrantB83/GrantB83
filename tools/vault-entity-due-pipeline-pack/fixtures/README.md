# Vault Entity Due Pipeline Pack - Test Fixtures

This directory contains minimal fixtures for testing the pipeline pack orchestrator.

## Structure

```
fixtures/
└── healthy-pack/
    ├── filenames.txt           # Input filename list
    └── by-entity/              # Expected entity pack structure
        ├── gab-trust/
        │   ├── pack.md
        │   └── items.json
        └── sars/
            ├── pack.md
            └── items.json
```

## Usage

Run fixture test:
```bash
npm run test:fixtures
```

This will:
1. Read `filenames.txt` as input
2. Run vault-entity-due-pack (auto-building if needed)
3. Assemble pipeline pack in `test-out/`
4. Generate PACK.md, APPROVAL.md, manifest.json

## Expected Output

After `npm run test:fixtures`, check `test-out/`:

- `PACK.md` - Pipeline index
- `APPROVAL.md` - Safety gates
- `by-entity/` - Entity pack subdirectories (copied from vault-entity-due-pack)
- `master.md` - Entity overview (copied from vault-entity-due-pack)
- `manifest.json` - Run metadata

## Notes

- Fixtures use synthetic filenames for testing
- Auto-builds sibling tools if `dist/` missing (PR #132 pattern)
- Tests manifest accuracy (PR #116 pattern)
