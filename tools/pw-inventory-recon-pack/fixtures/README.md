# Fixtures for pw-inventory-recon-pack

This directory contains synthetic test fixtures for the pw-inventory-recon-pack CLI. **No real stock levels, amounts, or business data.**

## Structure

```
fixtures/
├── prebuilt-diff/
│   ├── diff.md
│   ├── diff.json
│   └── missing-keys.md
└── README.md
```

## Fixture: prebuilt-diff

**Purpose:** Test pack assembly from prebuilt diff outputs (Mode C: --diff-outdir).

**Scenario:** Minimal prebuilt diff outputs simulating a Perfect Water inventory recon.

**Contents:**
- `diff.md` - Human-readable diff with 3 synthetic items
- `diff.json` - Machine-readable diff data
- `missing-keys.md` - Placeholder missing keys report

**Test Command:**
```bash
npm run test:fixtures
```

**Expected Output:**
- `test-out/PACK.md` with index and row/key counts only
- `test-out/APPROVAL.md` with H3-style gate reminder
- `test-out/manifest.json` with run metadata
- Copied: `diff.md`, `diff.json`, `missing-keys.md`
- Exit code: 0 (success)

## Validation Rules

Fixtures must pass these checks:

1. **No real quantities** - Use synthetic round numbers (10, 20, 50)
2. **No real business data** - Use generic item names (Water 5L, Filter, Salt)
3. **No currency/amount leak patterns** - PACK.md must not contain quantity tables in prose
4. **Minimal but complete** - Enough to test pack assembly, not exhaustive

## Adding New Fixtures

When adding fixtures:
1. Create a new subdirectory under `fixtures/`
2. Document scenario and expected outputs in this README
3. Add a test script in `package.json` if needed
4. Ensure no real stock levels or business data
5. Run `npm run test:fixtures` to validate

## License

MIT - Same as parent tool
