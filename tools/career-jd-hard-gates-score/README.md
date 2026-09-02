# Career JD Hard Gates Score

**One-line:** Offline CLI to score job descriptions against career hard gates and proof points for Career bot apply decisions.

**Owning desk(s):** Career / CoS

## Overview

Career bot needs to score every role against hard gates before applying. Previously, this logic lived in a skill and career-os.md, requiring the bot to re-derive rules each time. This CLI takes a pasted JD (and optional gates JSON) and emits a structured scorecard so Career can score consistently without re-deriving rules.

## Install and Run

```bash
cd tools/career-jd-hard-gates-score
npm install
npm run build

# Basic scoring
npm run score -- --jd path/to/jd.txt --outdir out/

# With custom gates
npm run score -- --jd jd.txt --gates gates.json

# With overrides
npm run score -- --jd jd.txt --company "Tesla" --title "Operations Manager"

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

## Hard Gates (any fail = skip)

1. **DNC (Do Not Contact):** Company/name matching J.D. Abrams, Zachry, Capitol Aggregates, or clear parent/subsidiary → fail. Unclear affiliate → fail (skip).

2. **Comp:** Meets stated floor OR unlisted but level/company make floor likely; if likely below floor → fail.
   - Default floor: `null` (unlisted OK unless `--gates` supplies `annualUSDFloor`)
   - **Never invents dollar amounts** into outputs
   - If JD has no comp and gates have no floor, marks gate as unknown/pass-with-caution per config default `unknown=skip` or `unknown=watch` (default: `unknown → watch`, not apply)

3. **Location:** Tesla = any commute OK. Else WFH/remote OR ≤30 minutes from Circle C (Austin). If commute unverifiable and not WFH/Tesla → fail.

4. **Function:** Operations, Product, Strategy, Finance, or Tesla production/ops. Coordinator, recruiter, sales-only, unrelated → fail.

5. **Seniority:** Manager and above (Senior Manager, Director, Head, VP, plant/ops lead). Junior IC → fail.

6. **Facts-only reminder:** Resume claims must already exist in career-os — tool does NOT invent metrics; scorecard notes "facts-only: do not invent".

## Scores (0-2 each, total /10)

- **titleMatch:** How well does the title match target functions and levels?
- **proofPointMatch:** How well do the requirements match resume proof points?
- **seniority:** How senior is the role?
- **payConfidence:** How confident are we about the compensation?
- **commuteOrWfhFit:** How good is the location fit?

### Thresholds

- **≥8:** Apply-eligible (if all hard gates pass)
- **6-7:** Watch
- **≤5:** Discard

## CLI Usage

```bash
npm run score -- --jd path/to/jd.txt --outdir out/
```

### Options

- `--jd` - Path to job description text file [REQUIRED]
- `--gates` - Path to gates JSON file (overrides defaults)
- `--company` - Override company name
- `--title` - Override job title
- `--outdir`, `-o` - Output directory [default: ./out]
- `--help`, `-h` - Show help message

## Output Files

1. **scorecard.json** - Gates pass/fail/unknown + reasons, scores, verdict: apply|watch|discard|skip
2. **scorecard.md** - Grant-facing full sentences, **NO dollar amounts in markdown** — says "meets floor" / "below floor" / "comp unlisted"
3. **APPROVAL.md** - Offline draft aid; Career still owns apply; no LinkedIn send
4. **manifest.json** - Metadata about inputs and outputs

## Fixtures

Test fixtures are provided in `fixtures/`:

- `jd-ops-manager-remote.txt` - Should tend apply/watch
- `jd-dnc-abrams.txt` - Should skip (DNC list)
- `jd-junior-coordinator.txt` - Should skip (seniority + function fail)
- `jd-tesla-ops.txt` - Location gate pass via Tesla exception
- `gates.sample.json` - Sample gates with DNC list + `annualUSDFloor` omitted or set null

## Tests

```bash
npm test              # Run unit tests
npm run test:fixtures # Run fixture tests
```

**Note:** Test script uses explicit file paths, not unexpanded globs under npm.

## Heuristics

- Keyword/regex only (no LLM, no network)
- Never invents compensation numbers
- If parsing unsure, marks unknown and fail-closed on hard gates (except where specified)

## Default Gates

```json
{
  "dncList": [
    "J.D. Abrams",
    "J. D. Abrams",
    "JD Abrams",
    "Zachry",
    "Capitol Aggregates"
  ],
  "annualUSDFloor": null,
  "unknownHandling": "watch"
}
```

## Critical Safety Note

- ✅ **Offline only** - Keyword/regex heuristics, no LLM, no network
- ✅ **Never invents compensation** - Dollar amounts only from JD text
- ✅ **Facts-only reminder** - All outputs remind Career to use existing career-os claims
- ✅ **Fail-closed** - Unknown/ambiguous cases default to safer handling
- ⚠️ **Career bot owns apply** - This is a scoring aid, not an auto-apply system
- ⚠️ **No LinkedIn send** - Career bot handles all application sends

## Integration with Career Bot

Career bot workflow:

1. Receives JD (email/LinkedIn paste)
2. Runs `career-jd-hard-gates-score` CLI
3. Reviews `scorecard.md` and `APPROVAL.md`
4. If verdict = `apply` + all gates pass, proceeds with application prep
5. If verdict = `watch`, considers mitigating factors
6. If verdict = `skip` or `discard`, archives without applying

**Note:** Career bot still owns final apply decision and all LinkedIn/email sends.

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
