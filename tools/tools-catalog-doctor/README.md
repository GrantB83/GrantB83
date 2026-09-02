# tools-catalog-doctor

**One-line:** Offline CLI to validate `tools/README.md` catalog integrity: discover tool directories, check index completeness, detect duplicate sections.

**Owning desk(s):** CoS / Repository Maintenance

**Location:** `tools/tools-catalog-doctor/`

## Purpose

Cloud Agent PRs repeatedly gut `tools/README.md` (drop live tools) or duplicate `##` sections. This doctor runs offline CI-style checks before merge to catch structural catalog errors:

1. **Discover tool directories:** Immediate subdirs of `tools/` that contain `package.json`
2. **Parse README index:** Extract tool slugs from index table and `##` section headings
3. **Report issues:**
   - `onDiskNotInIndex` - Tool directories missing from index
   - `inIndexNotOnDisk` - Index entries without corresponding directories
   - `duplicateSections` - `##` headings appearing more than once
   - `indexDuplicates` - Same tool slug appearing multiple times in index

## Install and Run

```bash
cd tools/tools-catalog-doctor
npm install
npm run build

# Default: assume cwd is tools/tools-catalog-doctor, repo root is ../..
npm run doctor

# Explicit root path
npm run doctor -- --root ../..

# Custom paths
npm run doctor -- --catalog tools/README.md --toolsDir tools

# Custom output directory
npm run doctor -- --outdir reports/
```

## Exit Codes

- `0` - Catalog is healthy (all checks passed)
- `1` - Issues found (see report for details)

## Checks Performed

1. ✓ All tool directories on disk have index entries
2. ✓ All index entries have corresponding directories on disk
3. ✓ No duplicate section headings (`##` tool-name)
4. ✓ No duplicate index entries

## Output

Reports are written to `--outdir` (default: `./out`):

- `report.json` - Machine-readable results
- `report.md` - Human-readable summary

Example output:

```
🩺 Tools Catalog Doctor

Root: /workspace
Catalog: /workspace/tools/README.md
Tools directory: /workspace/tools

📂 Discovering tool directories...
   Found 14 tool directories

📖 Parsing catalog...
   Found 14 index entries
   Found 14 section headings

🔍 Running integrity checks...

✅ Catalog is healthy!

📝 Reports generated:
   - ./out/report.md
   - ./out/report.json
```

## Test Fixtures

The tool includes test fixtures for validation:

- `fixtures/healthy/` - Minimal healthy catalog (should pass)
- `fixtures/gutted/` - README missing a disk tool (should fail)
- `fixtures/dup-sections/` - README with duplicate `##` headings (should fail)

Run fixture tests:

```bash
npm run test:fixtures
```

Each fixture test runs the doctor and verifies the expected exit code.

## Critical Safety Note

- ✅ **Read-only** - Never modifies catalog or tool directories
- ✅ **Offline only** - No APIs or network calls
- ✅ **Structural checks only** - Does not validate tool descriptions or content
- ✅ **CI-friendly** - Exit codes suitable for CI pipelines
- ⚠️ **Never invents tool descriptions** - Only checks structural integrity

## Integration with CI

Add to CI pipeline to catch catalog issues before merge:

```bash
cd tools/tools-catalog-doctor
npm install
npm run build
npm run doctor -- --root ../..
```

If exit code is 1, the catalog has integrity issues that must be fixed before merge.

## Usage Notes

1. The tool excludes `tools-catalog-doctor` itself from "must be in index" checks during discovery
2. Section headings must match pattern `## tool-name` (lowercase with hyphens)
3. Index entries are extracted from markdown link syntax: `[tool-name](#anchor)`
4. The catalog is considered healthy only when ALL checks pass

## Example Issues Detected

### Missing from Index
```
❌ Tools on disk but NOT in index:
   - new-tool-xyz
```

### Duplicate Sections
```
❌ Duplicate section headings:
   - ## browns-guest-comms-draft (2 times, lines: 357, 450)
```

### Ghost Entries
```
❌ Tools in index but NOT on disk:
   - deleted-tool-abc
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
