# Fixtures for vault-due-digest-pipeline-pack

## healthy-pack/

Minimal valid vault-due-digest-pack output for testing pipeline assembly.

**Structure:**
```
healthy-pack/
├── DIGEST.md          # Vault due digest overview (4 items)
├── APPROVAL.md        # Vault research gates
├── missing-signals.md # Missing signals report (empty)
└── by-entity/         # Entity pack subdirectories
    ├── gab-trust/
    │   ├── pack.md    # 2 items
    │   └── items.json
    └── sars/
        ├── pack.md    # 2 items
        └── items.json
```

**Expected behavior:**
- Pipeline pack assembly should succeed
- All required files present
- Post-checklist should pass (if run)
- No warnings expected

## Usage

```bash
npm run test:fixtures
```

This will:
1. Build the tool
2. Process `healthy-pack/` fixture
3. Generate pipeline pack in `test-out/`
4. Verify all expected files created
