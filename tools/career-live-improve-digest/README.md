# career-live-improve-digest

Offline CLI to generate live-improve digest from career-hunt-run-log output for Career learning.md.

## Purpose

Read career-hunt-run-log output (`runs.jsonl` and/or `runs.md`) and produce a draft live-improve digest that Career can fold into learning.md — without inventing employers, scores, or gate outcomes.

## Owning Desk(s)

Career / CoS

## Features

- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Never invents data** - Only quotes from log
- ✅ **Append-only source** - Reads runs.jsonl without modification
- ✅ **Pattern extraction** - Skip reasons, score bands, gate fails with counts
- ✅ **No invented employers** - Only lists companies from log
- ✅ **Optional time filtering** - `--since YYYY-MM-DD` filter
- ✅ **Exit 1 on bad input** - Malformed jsonl or missing files
- ✅ **Career owns apply** - Never auto-updates learning.md
- ✅ **Stats output** - Machine-readable counts by action/score/gate

## Install and Run

```bash
cd tools/career-live-improve-digest
npm install
npm run build

# From runs.jsonl (preferred)
npm run digest -- --log path/to/runs.jsonl --outdir out/

# From runs.md summary
npm run digest -- --summary path/to/runs.md --outdir out/

# Both inputs
npm run digest -- --log runs.jsonl --summary runs.md --outdir out/

# With time filter
npm run digest -- --log runs.jsonl --since 2026-08-01 --outdir out/

# Test with fixtures
npm run test:fixtures
```

## Input Formats

### runs.jsonl (Preferred)

Append-only JSONL file from `career-hunt-run-log`:

```jsonl
{"company":"Tesla","title":"Operations Manager","score":9,"gatePass":true,"action":"scored","source":"LinkedIn","date":"2026-09-02"}
{"company":"SpaceX","title":"Director","action":"applied","source":"Indeed","date":"2026-09-02"}
{"company":"BadCo","title":"IC","action":"skipped","reason":"Too junior","source":"LinkedIn","date":"2026-09-02"}
{"company":"LowPay Inc","title":"Manager","action":"rejected","reason":"Comp below floor","date":"2026-09-02"}
```

### runs.md (Optional)

Human-readable summary from `career-hunt-run-log` with counts and latest run detail. Tool can parse counts and basic patterns.

## Behavior

1. **Parse** input:
   - Read runs.jsonl line by line (preferred)
   - OR parse runs.md for aggregate counts
   - Validate date format, required fields

2. **Filter** (optional):
   - Apply `--since YYYY-MM-DD` filter if provided
   - Only process entries on or after the since date

3. **Analyze** patterns:
   - **Skip reasons**: Group by reason text, count occurrences
   - **Score bands**: 0-4 (low), 5-6 (medium), 7-8 (good), 9-10 (excellent)
   - **Gate fails**: Roles with score but gatePass=false
   - **Source distribution**: Count by source (LinkedIn, Indeed, etc.)

4. **Generate** outputs:
   - `LEARNING-DRAFT.md`: Numbered patterns with counts
   - `stats.json`: Machine-readable counts
   - `APPROVAL.md`: Career owns apply, never invents claims
   - `manifest.json`: Tool metadata

## Output Files

### LEARNING-DRAFT.md

Numbered patterns for Career to fold into learning.md:

```markdown
# Career Hunt Learning Digest

**Period:** 2026-08-01 to 2026-09-02  
**Total Entries:** 23  
**Actions:** Scored 12, Applied 5, Skipped 4, Rejected 2

## Skip Patterns

1. **Too junior** (3 occurrences)
   - Roles below Director/VP level
   
2. **DNC list company** (2 occurrences)
   - Companies on do-not-contact list
   
3. **Comp below floor** (2 occurrences)
   - Compensation below minimum threshold

## Score Patterns

1. **Excellent (9-10):** 4 roles
   - Operations Manager, Senior Director roles
   
2. **Good (7-8):** 5 roles
   - Mid-to-senior management roles
   
3. **Medium (5-6):** 2 roles
   - Mixed fit roles
   
4. **Low (0-4):** 1 role
   - Poor fit roles

## Gate Fail Patterns

1. **Remote policy mismatch** (2 occurrences)
   - High score but failed remote gate
   
2. **Team size gate** (1 occurrence)
   - Strong role but team too small

## Source Distribution

- LinkedIn: 15 roles
- Indeed: 5 roles
- Direct/Recruiter: 3 roles

## Notes for learning.md

- Focus on Director+ roles to avoid "too junior" skips
- DNC list working as intended
- Remote policy gate catching issues early
- LinkedIn remains primary source
```

### stats.json

Machine-readable statistics:

```json
{
  "period": {
    "since": "2026-08-01",
    "until": "2026-09-02",
    "totalDays": 32
  },
  "totals": {
    "entries": 23,
    "scored": 12,
    "applied": 5,
    "skipped": 4,
    "rejected": 2
  },
  "scoreBands": {
    "excellent_9_10": 4,
    "good_7_8": 5,
    "medium_5_6": 2,
    "low_0_4": 1
  },
  "gateFails": {
    "total": 3,
    "patterns": {
      "remote_policy": 2,
      "team_size": 1
    }
  },
  "skipReasons": {
    "too_junior": 3,
    "dnc_list": 2,
    "comp_below_floor": 2
  },
  "sources": {
    "LinkedIn": 15,
    "Indeed": 5,
    "Direct": 3
  }
}
```

### APPROVAL.md

Safety gates and Career ownership:

```markdown
# Career Live-Improve Digest Approval

## Critical Rules

1. **Career owns apply decisions** - This digest is for learning only
2. **Never invents employers** - Only quotes from runs.jsonl
3. **Never invents scores** - Only processes provided scores
4. **Never invents gate outcomes** - Only reports logged gatePass values
5. **Offline only** - No job board APIs or live data
6. **Never auto-updates learning.md** - Career reviews and folds in manually

## Review Checklist

- [ ] All companies/titles quoted from runs.jsonl
- [ ] No invented skip reasons or patterns
- [ ] Score bands reflect actual distribution
- [ ] Gate fail patterns match logged data
- [ ] Source counts are accurate
- [ ] Period filter applied correctly (if --since used)

## Next Steps

1. Review LEARNING-DRAFT.md
2. Validate patterns against runs.jsonl
3. Fold selected insights into career-os learning.md
4. Career bot uses updated learning.md for future decisions

## Never

- ❌ Auto-apply insights without Career review
- ❌ Invent companies or roles not in log
- ❌ Fabricate skip reasons or gate failures
- ❌ Write directly to learning.md
