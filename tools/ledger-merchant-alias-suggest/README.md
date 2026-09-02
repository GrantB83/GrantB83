# ledger-merchant-alias-suggest

**One-line:** Suggest merchant→alias mappings using heuristic token overlap (Jaccard similarity).

**Owning desk(s):** Ledger / CoS

## Purpose

After `ledger-unmatched-merchant-queue` identifies merchants needing research, this tool suggests possible alias mappings by scoring each unmatched merchant against known alias patterns. Uses offline heuristic token overlap (Jaccard similarity) — no LLM, no API calls.

## Critical Safety Note

- ✅ **Offline only** - No APIs or network calls
- ✅ **Read-only** - Never modifies input files
- ✅ **Heuristic scoring only** - Token overlap (Jaccard similarity), not AI/LLM
- ✅ **No invented amounts** - Tool never handles transaction amounts
- ✅ **No auto-apply** - Never writes to live Budget sheet
- ⚠️ **Research aid only** - Human review required for every suggestion
- ⚠️ **H2 approval required** - Before any Google Sheet writes or alias rule changes

## Install and Run

```bash
cd tools/ledger-merchant-alias-suggest
npm install
npm run build

# From unmatched queue JSON
npm run suggest -- \
  --unmatched path/to/queue.json \
  --aliases known-aliases.json \
  --outdir out/

# From plain text merchant list
npm run suggest -- \
  --merchants merchants.txt \
  --aliases known-aliases.json \
  --outdir out/

# Custom minimum score
npm run suggest -- \
  --unmatched queue.json \
  --aliases aliases.json \
  --min-score 0.5 \
  --outdir out/
```

## CLI Options

| Option | Description | Default | Required |
|--------|-------------|---------|----------|
| `--unmatched` | Unmatched queue JSON from ledger-unmatched-merchant-queue | - | One of --unmatched or --merchants |
| `--merchants` | Plain text file with one merchant per line | - | One of --unmatched or --merchants |
| `--aliases` | Aliases JSON file | - | Yes |
| `--outdir` | Output directory path | - | Yes |
| `--min-score` | Minimum similarity score (0.0–1.0) | `0.4` | No |

## Behavior

1. **Load merchants** - From unmatched queue JSON OR plain text list
2. **Load aliases** - Parse aliases JSON with patterns
3. **Score each merchant** - Calculate Jaccard similarity against all alias patterns
4. **Rank suggestions** - Sort by score, assign confidence levels:
   - **High confidence:** score ≥ 0.7
   - **Medium confidence:** score 0.5–0.7
   - **Low confidence:** score 0.4–0.5 (below `--min-score` defaults to no match)
5. **Generate outputs** - Five files for review and approval workflow

### Scoring Algorithm

**Jaccard Similarity:**
- Tokenize merchant name and alias pattern (normalize case, remove punctuation)
- Calculate intersection / union of token sets
- Score = |intersection| / |union|

**Example:**
- Merchant: `AMAZON.COM*XX1234567`
- Pattern: `Amazon.com`
- Tokens merchant: `{amazon, com, xx1234567}`
- Tokens pattern: `{amazon, com}`
- Intersection: `{amazon, com}` (2 tokens)
- Union: `{amazon, com, xx1234567}` (3 tokens)
- Score: 2 / 3 = 0.667 (medium confidence)

## Output Files

### suggestions.json

Structured suggestion data:
- Merchant name
- Top match (alias, score, matched pattern)
- All matches above threshold
- Confidence level (high/medium/low)
- No-match merchants list

### suggestions.md

Human-readable markdown digest organized by confidence level:
- High confidence (≥ 0.7)
- Medium confidence (0.5–0.7)
- Low confidence (0.4–0.5)

Each suggestion includes:
- Merchant name
- Suggested alias
- Score (3 decimal places)
- Matched pattern
- Up to 3 alternative matches

### no-match.md

Merchants with no matches above `--min-score`:
- Numbered list
- Next steps: manual research, create new patterns, update aliases, re-run

### APPROVAL.md

Safety gates and workflow guidance:
- What the tool did (scored, ranked, flagged)
- What Ledger owns (alias approval, sheet writes, research, maintenance)
- Out of scope (no auto-apply, no amounts, no auto-categorization)
- Required approval gates (S1 for research, H2 for sheet changes)
- Next steps checklist

### manifest.json

Run metadata:
- Tool name and version
- Generation timestamp
- Input file references
- Output file list
- Statistics (total, suggestions, no-match, confidence breakdown)
- Config (min score threshold)

## Aliases File Format

```json
{
  "aliases": [
    {
      "alias": "Amazon",
      "patterns": [
        "Amazon.com",
        "Amazon Prime",
        "AMZN",
        "Amazon Marketplace"
      ]
    },
    {
      "alias": "Walmart",
      "patterns": [
        "Walmart",
        "Walmart.com",
        "Walmart Supercenter",
        "Wal-Mart"
      ]
    }
  ]
}
```

**Required fields:**
- `aliases` - Array of alias objects
- `alias` - String name for the alias (canonical merchant name)
- `patterns` - Non-empty array of pattern strings to match against

## Test Fixtures

```bash
# Run all fixture tests
npm run test:fixtures

# Run unit tests
npm test
```

### Included Fixtures

1. **unmatched.json** - Sample unmatched merchant queue from ledger-unmatched-merchant-queue
2. **merchants.txt** - Plain text merchant list (one per line)
3. **aliases.json** - Sample alias patterns (Amazon, Walmart, Target, etc.)

## Integration with ledger-unmatched-merchant-queue

This tool is designed to consume output from `ledger-unmatched-merchant-queue`:

```bash
# Step 1: Build unmatched merchant queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- --input transactions.csv --outdir queue-out/

# Step 2: Suggest aliases
cd ../ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched ../ledger-unmatched-merchant-queue/queue-out/queue.json \
  --aliases known-aliases.json \
  --outdir suggestions/

# Step 3: Review suggestions.md and no-match.md
# Step 4: Update aliases.json with new patterns
# Step 5: Get H2 approval before applying to Budget sheet
```

## Workflow Example

```bash
# Scenario: January 2024 budget has 50 unmatched merchants

# Step 1: Generate unmatched queue
cd tools/ledger-unmatched-merchant-queue
npm run queue -- \
  --input exports/january-2024.csv \
  --outdir research/jan-2024/ \
  --status-col MatchStatus

# Step 2: Suggest aliases
cd ../ledger-merchant-alias-suggest
npm run suggest -- \
  --unmatched ../ledger-unmatched-merchant-queue/research/jan-2024/queue.json \
  --aliases ~/ledger-knowledge/aliases.json \
  --outdir suggestions/jan-2024/

# Step 3: Review suggestions
# - High confidence: likely correct, verify and approve
# - Medium confidence: review carefully, may need adjustment
# - Low confidence: probably incorrect, ignore or research manually

# Step 4: Research no-match merchants
# - Check bank statement details
# - Search online for merchant identity
# - Create new alias patterns if appropriate

# Step 5: Update aliases.json
# - Add new patterns for existing aliases
# - Create new aliases for new merchants

# Step 6: Get H2 approval
# - Present suggestions.md to Grant
# - Wait for "APPROVE ALIAS UPDATES" response

# Step 7: Apply to Budget sheet manually
# - Ledger updates Google Sheet
# - Mark merchants as matched
```

## Safety Constraints

### Never Invented

- ❌ Merchant identities
- ❌ Alias patterns
- ❌ Transaction amounts
- ❌ Category assignments

### Always Preserved

- ✅ Original merchant names
- ✅ Scoring transparency (show matched patterns)
- ✅ Confidence levels
- ✅ Explicit no-match reporting

### Approval Gates

Per `docs/automation/approval-gates.md`:

- **S1:** Ledger research using public sources (standing approval)
- **H2:** Required before any Google Sheet writes or alias rule changes

## Troubleshooting

### Error: Aliases JSON must have an "aliases" array

```bash
# Check aliases file structure
cat aliases.json

# Should have top-level "aliases" array
{
  "aliases": [
    { "alias": "Name", "patterns": ["..."] }
  ]
}
```

### Error: No merchants found in input file

```bash
# Check unmatched queue JSON
cat queue.json | jq '.merchants | length'

# Check merchants text file
wc -l merchants.txt

# Ensure file is not empty
```

### Low confidence suggestions only

```bash
# Try lowering minimum score
npm run suggest -- \
  --unmatched queue.json \
  --aliases aliases.json \
  --min-score 0.3 \
  --outdir out/

# Or add more pattern variations to aliases.json
```

### All merchants in no-match.md

- Check that aliases.json has relevant patterns
- Verify merchant names are reasonably formatted
- Try lowering `--min-score` threshold
- May need to manually research and create new aliases

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

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
