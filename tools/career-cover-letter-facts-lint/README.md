# Career Cover Letter Facts Lint

**One-line:** Offline CLI to lint cover letter drafts against allowed facts from career-os for Career bot apply decisions.

**Owning desk(s):** Career / CoS

## Overview

Career hunt must not invent facts. This CLI takes a cover letter draft and an allowed-facts file (from career-os / one-pager), lints the draft for claims not grounded in facts, and fails closed on unknowns.

Career bot needs to verify every cover letter claim against known facts before applying. This tool provides offline, heuristic fact-checking so Career can detect invented compensation, titles, or employer claims consistently.

## Install and Run

```bash
cd tools/career-cover-letter-facts-lint
npm install
npm run build

# Basic linting
npm run lint -- --draft cover.md --facts facts.json --outdir out/

# Strict mode (exit 1 on unmatched)
npm run lint -- --draft cover.md --facts facts.json --strict

# Custom output directory
npm run lint -- --draft cover.md --facts facts.json --outdir reports/

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

## CLI Usage

```bash
npm run lint -- --draft <path> --facts <path> [options]
```

### Options

- `--draft` - Path to cover letter draft (markdown/plain text) [REQUIRED]
- `--facts` - Path to allowed facts JSON file [REQUIRED]
- `--outdir` - Output directory [default: ./out]
- `--strict` - Exit 1 if any unmatched claims found
- `--help`, `-h` - Show help message

## Facts File Format (Flexible)

The facts file can use any of these structures:

```json
{
  "claims": ["fact 1", "fact 2", "..."]
}
```

```json
{
  "bullets": ["point 1", "point 2", "..."]
}
```

```json
["fact 1", "fact 2", "..."]
```

Or any nested structure with string arrays. The tool will flatten all strings it finds.

## Output Files

1. **report.json** - Structured report with matched/unmatched/suspicious phrases
2. **report.md** - Human-readable numbered findings (NO invented rewrites; only flags)
3. **APPROVAL.md** - Reminder that Career owns apply; never invents comp/title/employer claims
4. **manifest.json** - Run metadata and statistics

## Linting Heuristics

The tool uses offline keyword/token heuristics (no LLM, no network):

1. **Extract claims:** Sentence-level claims from the draft
2. **Fuzzy matching:** Token overlap (Jaccard similarity) against facts
3. **Flag numbers:** Dollar amounts, percentages, or contextual numbers (days, people, teams) in draft not present in facts
4. **Flag employers:** Company names mentioned in draft not present in facts
5. **Flag titles:** Role keywords in draft not present in facts
6. **Fail closed:** Unknown or ambiguous claims marked as unmatched

### Match Confidence Levels

- **High (≥60% token overlap):** Claim strongly matches a fact
- **Medium (40-60% overlap):** Claim partially matches
- **Low/None (<40% overlap):** Unmatched claim

### Match Statuses

- **Matched:** Claim has sufficient overlap with facts, no flagged tokens
- **Suspicious:** Partial match but contains unverified numbers, employers, or titles
- **Unmatched:** No sufficient match found

## Exit Codes

- **0** - Ran successfully (even if unmatched claims found)
- **1** - Bad input (missing files, invalid JSON) OR strict mode violations

## Fixtures

Test fixtures are provided in `fixtures/`:

- `facts-ops-manager.json` - Sample allowed facts (Tesla ops manager background)
- `draft-clean.md` - Clean cover letter (all claims grounded in facts)
- `draft-invented-numbers.md` - Draft with invented metrics (35% vs 25%, $5M not in facts, 60% vs 40%, etc.)
- `draft-invented-employer.md` - Draft claiming SpaceX, Google, Apple experience (not in facts)

## Tests

```bash
npm test              # Run unit tests
npm run test:fixtures # Run fixture tests
```

The fixture tests validate that:
- Clean drafts pass with 0 unmatched/suspicious
- Invented numbers are flagged as unmatched or suspicious
- Invented employers are flagged as unmatched

## Critical Safety Note

- ✅ **Offline only** - Keyword/regex heuristics, no LLM, no network
- ✅ **Never invents compensation** - Dollar amounts only from facts
- ✅ **Facts-only reminder** - All outputs remind Career to use existing career-os claims
- ✅ **Fail-closed** - Unknown/ambiguous cases default to unmatched
- ⚠️ **Career bot owns apply** - This is a facts-check aid, not an auto-apply system
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

## Integration with Career Bot

Career bot workflow:

1. Draft cover letter for a role
2. Run `career-cover-letter-facts-lint` CLI with draft + career-os facts
3. Review `report.md` and `APPROVAL.md`
4. If unmatched/suspicious claims found:
   - Rewrite claims to match facts
   - Remove invented claims
   - Re-run lint
5. If all claims matched:
   - Proceed with application prep
   - Career bot still makes final apply decision
6. Career bot handles all LinkedIn/email sends (separate approval)

**Note:** Career bot still owns final apply decision. This tool is a safety check, not auto-approval.

## Example Usage

```bash
# Scenario 1: Clean draft
npm run lint -- --draft cover-clean.md --facts career-facts.json
# Output: All matched ✅, safe to proceed

# Scenario 2: Invented metrics
npm run lint -- --draft cover-inflated.md --facts career-facts.json
# Output: Suspicious claims flagged (e.g., "$5M" not in facts)

# Scenario 3: Wrong employer
npm run lint -- --draft cover-wrong-company.md --facts career-facts.json
# Output: Unmatched claims (e.g., "SpaceX" not in facts)

# Scenario 4: Strict mode
npm run lint -- --draft cover-bad.md --facts facts.json --strict
# Exit 1 if any unmatched found (for CI/CD gates)
```

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
