# ledger-alias-apply-checklist

**One-line:** Generate H2-ready apply checklist from ledger-merchant-alias-suggest output before any USA Budget sheet write.

**Owning desk(s):** Ledger / CoS

## Purpose

After `ledger-merchant-alias-suggest` generates alias suggestions, this tool creates an offline human approval checklist. Groups suggestions by confidence (high/medium/low) and produces numbered mappings for tick-off, skipped items for research, and H2 approval workflow guidance.

## Critical Safety Note

- ✅ **Offline only** - No Google Sheets API or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **H2 approval required** - Never writes to Budget sheet; Ledger owns sheet writes
- ✅ **No invented amounts or aliases** - Pass-through from suggestion tool only
- ✅ **Names/patterns only** - No transaction amounts in prose
- ⚠️ **Approval gate enforced** - Coding/CoS never write Budget directly

## Install and Run

```bash
cd tools/ledger-alias-apply-checklist
npm install
npm run build

# From JSON output
npm run apply -- \
  --suggestions path/to/suggestions.json \
  --outdir out/

# From markdown outputs
npm run apply -- \
  --suggestions-md path/to/suggestions.md \
  --no-match path/to/no-match.md \
  --outdir out/

# With month label
npm run apply -- \
  --suggestions suggestions.json \
  --month 2026-09 \
  --outdir out/
```

## CLI Options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--suggestions` | Suggestions JSON from ledger-merchant-alias-suggest | - | One of --suggestions or --suggestions-md |
| `--suggestions-md` | Suggestions markdown from ledger-merchant-alias-suggest | - | One of --suggestions or --suggestions-md |
| `--no-match` | Optional no-match markdown file | - | No |
| `--month` | Optional month label (YYYY-MM format) | - | No |
| `--outdir` | Output directory path | - | Yes |

## Behavior

1. **Load suggestions** - From JSON OR markdown format (ledger-merchant-alias-suggest outputs)
2. **Load no-match items** - Optional no-match markdown if provided
3. **Group by confidence** - Using score thresholds from suggestion tool:
   - **High confidence:** score ≥ 0.7
   - **Medium confidence:** score 0.5–0.7
   - **Low confidence:** score 0.4–0.5 (moved to SKIPPED.md)
4. **Generate apply checklist** - Numbered merchant→alias mappings for human tick-off
5. **Generate skipped items** - Low-confidence and no-match items for manual research
6. **Generate approval workflow** - H2 gate guidance before any sheet writes

## Output Files

### APPLY-CHECKLIST.md

Human tick-off checklist with numbered merchant→alias mappings:

- **High confidence mappings** - Strong pattern matches (score ≥ 0.7)
- **Medium confidence mappings** - Moderate matches (score 0.5–0.7)
- Checkbox format: `[ ] Merchant Name → Alias`
- Includes score and matched pattern for context
- **No transaction amounts in prose** - names/patterns only

**Safety note:** Low-confidence suggestions excluded from apply checklist; moved to SKIPPED.md.

### SKIPPED.md

Items excluded from apply checklist:

- **Low confidence suggestions** - Weak pattern matches (score 0.4–0.5)
- **No match items** - Merchants with no matches above threshold
- Requires manual research before adding to aliases

### APPROVAL.md

H2 approval gate workflow guidance:

- What the tool did (parsed, grouped, generated checklist)
- What Ledger owns (alias approval, sheet writes, research, maintenance)
- Out of scope (no auto-apply, no invented amounts, no auto-categorization)
- Required approval gates (S1 for research, H2 for sheet writes)
- Hard constraints (offline only, read-only, H2 before writes, amounts stay in files)
- Workflow integration diagram
- Next steps checklist

### manifest.json

Run metadata:

- Tool name and version
- Generation timestamp
- Optional month label
- Input file references
- Output file list
- Statistics (confidence breakdown, skipped count, total mappings)

## Workflow Integration

This tool sits between `ledger-merchant-alias-suggest` and manual Budget sheet updates:

```
ledger-merchant-alias-suggest → ledger-alias-apply-checklist → H2 approval → Manual sheet update
```

**Never writes the sheet** - Ledger owns Budget writes; Coding/CoS provides tooling only.

## Example Workflow

```bash
# Step 1: Generate suggestions (from previous tool)
cd tools/ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched queue.json \
  --aliases aliases.json \
  --outdir suggestions/

# Step 2: Generate apply checklist
cd ../ledger-alias-apply-checklist
npm run apply -- \
  --suggestions ../ledger-merchant-alias-suggest/suggestions/suggestions.json \
  --no-match ../ledger-merchant-alias-suggest/suggestions/no-match.md \
  --month 2026-09 \
  --outdir checklist/

# Step 3: Review APPLY-CHECKLIST.md
# - Check each merchant→alias mapping
# - Verify high/medium confidence suggestions
# - Review SKIPPED.md for manual research items

# Step 4: Get H2 approval
# - Present APPLY-CHECKLIST.md to Grant
# - Wait for "APPROVE ALIAS UPDATES" response

# Step 5: Apply to Budget sheet manually
# - Ledger updates Google Sheet
# - Mark merchants as matched
```

## Confidence Grouping

Confidence levels are determined by score thresholds from `ledger-merchant-alias-suggest`:

| Confidence | Score Range | Checklist Placement |
|------------|-------------|---------------------|
| High | ≥ 0.7 | APPLY-CHECKLIST.md (top section) |
| Medium | 0.5–0.7 | APPLY-CHECKLIST.md (bottom section) |
| Low | 0.4–0.5 | SKIPPED.md (manual research) |
| No match | < 0.4 | SKIPPED.md (manual research) |

## Safety Constraints

### Never Invented

- ❌ Transaction amounts
- ❌ Merchant identities
- ❌ Alias patterns
- ❌ Category assignments

### Always Preserved

- ✅ Original suggestion data from input files
- ✅ Score transparency (show matched patterns)
- ✅ Confidence levels
- ✅ Explicit skipped-item reporting

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes

## Hard Constraints

1. **Offline only** - No Google Sheets API, no network calls
2. **Read-only** - Never modifies input files
3. **H2 before sheet writes** - Human approval gate enforced
4. **Amounts stay in files** - Never paste transaction amounts into prose
5. **Ledger owns sheet** - Coding/CoS never write Budget directly

## Troubleshooting

### Error: No suggestions found in input file

```bash
# Check suggestions JSON structure
cat suggestions.json | jq '.suggestions | length'

# Check suggestions markdown has valid sections
grep -E "^###\s+[0-9]+\." suggestions.md
```

### Error: --month must be in YYYY-MM format

```bash
# Correct format
npm run apply -- \
  --suggestions suggestions.json \
  --month 2026-09 \
  --outdir out/

# Incorrect formats (will fail)
--month 09-2026
--month 2026/09
--month September-2026
```

### Warning: Could not load no-match file

This is a non-fatal warning. The tool will continue without no-match items. To include them:

```bash
npm run apply -- \
  --suggestions suggestions.json \
  --no-match path/to/no-match.md \
  --outdir out/
```

### Empty APPLY-CHECKLIST.md

If all suggestions are low confidence:

- All items moved to SKIPPED.md for manual research
- Review suggestion tool output and min-score threshold
- May need to update aliases.json with more patterns
- Re-run ledger-merchant-alias-suggest with adjusted thresholds

## Test Fixtures

```bash
# Run all fixture tests
npm run test:fixtures

# Run unit tests
npm test
```

### Included Fixtures

1. **suggestions.json** - Sample suggestions JSON with high/medium/low confidence items
2. **suggestions.md** - Sample suggestions markdown
3. **no-match.md** - Sample no-match items
4. **with-amounts.json** - Fixture to verify no amounts leak into APPLY-CHECKLIST.md prose

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run fixture tests
npm run test:fixtures

# Clean build artifacts
npm run clean
```

## Integration Notes

### Input Format Compatibility

This tool accepts output from `ledger-merchant-alias-suggest`:

- **Primary:** suggestions.json (structured data)
- **Alternative:** suggestions.md + no-match.md (markdown format)
- Both formats supported for workflow flexibility

### Output Format

All outputs are markdown (human-readable) or JSON (manifest):

- Human reviews APPLY-CHECKLIST.md
- Manual research uses SKIPPED.md
- Approval workflow follows APPROVAL.md
- Metadata tracked in manifest.json

### No Sheet Integration

This tool deliberately has no Google Sheets integration:

- Offline by design
- H2 approval gate enforced
- Ledger manually applies changes after approval
- Coding/CoS provides tooling only

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
