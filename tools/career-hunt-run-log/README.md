# career-hunt-run-log

Offline CLI tool to append career hunt runs into a durable offline log for live-improve tracking.

## Purpose

Append one career hunt run into a durable offline log (`runs.jsonl`) with scored roles, applications, and skips/rejects with reasons. Never invents scores or employers. Never applies to jobs. Provides structured tracking for career hunt analytics and live-improve decisions.

## Owning Desk(s)

Career / CoS

## Features

- ✅ **Append-only log** - Never rewrites prior lines in `runs.jsonl`
- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Structured tracking** - Scored, applied, skipped, rejected entries
- ✅ **Never invents data** - Only logs provided scores and facts
- ✅ **Exit 1 on bad input** - Malformed JSON or missing required fields rejected
- ✅ **Summary regeneration** - Regenerates `runs.md` with counts and latest run detail
- ✅ **Validation** - Required fields: `company`, `title`, `action`, `date`
- ✅ **Two input modes** - Structured `run.json` OR individual flag files

## Install and Run

```bash
cd tools/career-hunt-run-log
npm install
npm run build

# Mode 1: Structured run.json
npm run log -- --run path/to/run.json --outdir out/

# Mode 2: Individual flag files
npm run log -- \
  --date 2026-09-02 \
  --scored path/to/scores.json \
  --applied path/to/applied.json \
  --skipped path/to/skipped.json \
  --outdir out/

# With notes
npm run log -- --run run.json --outdir out/ --notes notes.md

# Test with fixtures
npm run test:fixtures

# Run unit tests
npm test
```

## Input Formats

### Mode 1: Structured run.json (`--run`)

```json
{
  "date": "2026-09-02",
  "scored": [
    {
      "company": "Tesla",
      "title": "Operations Manager",
      "score": 9,
      "gatePass": true,
      "source": "LinkedIn"
    }
  ],
  "applied": [
    {
      "company": "SpaceX",
      "title": "Director",
      "source": "Indeed"
    }
  ],
  "skipped": [
    {
      "company": "BadCo",
      "title": "Junior IC",
      "reason": "Too junior",
      "source": "LinkedIn"
    }
  ],
  "rejected": [
    {
      "company": "LowPay Inc",
      "title": "Manager",
      "reason": "Comp below floor",
      "source": "LinkedIn"
    }
  ]
}
```

### Mode 2: Individual Flag Files

**scores.json** (from `career-jd-hard-gates-score` report):
```json
[
  {
    "company": "Tesla",
    "title": "Operations Manager",
    "score": 9,
    "gatePass": true,
    "source": "LinkedIn"
  }
]
```

**applied.json**:
```json
[
  {
    "company": "SpaceX",
    "title": "Director",
    "source": "Recruiter"
  }
]
```

**skipped.json** (with reason fields):
```json
[
  {
    "company": "BadCo",
    "title": "IC",
    "reason": "Too junior",
    "source": "LinkedIn"
  }
]
```

## Behavior

1. **Normalize** each entry:
   - Required: `company`, `title`, `action`, `date`
   - Optional: `score` (0-10), `gatePass` (true/false), `reason`, `source`
   
2. **Validate** all entries:
   - Exit 1 on malformed JSON
   - Exit 1 on missing required `company` or `title` fields
   - Exit 1 on invalid `action` (must be: scored|applied|skipped|rejected)
   - Exit 1 on invalid `date` (must be YYYY-MM-DD)

3. **Append** to `runs.jsonl`:
   - Creates file if missing
   - Appends one JSON line per entry
   - **Never rewrites prior lines** (append-only)

4. **Regenerate** `runs.md`:
   - Summary: total runs, total entries, counts by action
   - Latest run: detailed breakdown with scores/gates/reasons
   - Full-sentence format

5. **Generate** `APPROVAL.md`:
   - Safety gates: Career owns apply; hard gates unchanged; no invented facts
   - Review checklist

6. **Generate** `manifest.json`:
   - Tool metadata
   - Inputs used
   - Output paths
   - Summary: entries added, total lines

## Output Files

### runs.jsonl (append-only)

One JSON object per line:
```jsonl
{"company":"Tesla","title":"Operations Manager","score":9,"gatePass":true,"action":"scored","source":"LinkedIn","date":"2026-09-02"}
{"company":"SpaceX","title":"Director","action":"applied","source":"Indeed","date":"2026-09-02"}
{"company":"BadCo","title":"IC","action":"skipped","reason":"Too junior","source":"LinkedIn","date":"2026-09-02"}
```

### runs.md (regenerated summary)

```markdown
# Career Hunt Runs

## Summary

- **Total Runs:** 5
- **Total Entries:** 23

### By Action

- Scored: 12
- Applied: 5
- Skipped: 4
- Rejected: 2

## Latest Run

**Date:** 2026-09-02

**Entries:** 6

### Scored

1. **Tesla** - Operations Manager (score: 9/10, gates: pass, source: LinkedIn)
2. **SpaceX** - Director of Operations (score: 8/10, gates: pass, source: Indeed)

### Applied

1. **Rivian** - Senior Operations Manager (source: Direct)

### Skipped

1. **J.D. Abrams** - Operations Lead (reason: DNC list company, source: LinkedIn)
2. **Generic Corp** - Junior Associate (reason: Too junior, source: Indeed)

### Rejected

1. **LowPay Inc** - Manager (reason: Comp below floor, source: LinkedIn)
```

### APPROVAL.md

Safety gates and ownership notice:
- Career bot owns apply decisions
- Hard gates unchanged
- No invented compensation or scores
- Facts-only tracking
- Offline only
- Append-only

### manifest.json

Machine-readable metadata for this invocation:
```json
{
  "tool": "career-hunt-run-log",
  "version": "1.0.0",
  "timestamp": "2026-09-02T14:30:00.000Z",
  "inputs": {
    "runPath": "path/to/run.json",
    "date": "2026-09-02"
  },
  "outputs": {
    "runsJsonlPath": "out/runs.jsonl",
    "runsMarkdownPath": "out/runs.md",
    "approvalPath": "out/APPROVAL.md",
    "manifestPath": "out/manifest.json"
  },
  "summary": {
    "entriesAdded": 6,
    "totalLines": 29
  }
}
```

## Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| company | string | ✅ Yes | Company name (must not be blank) |
| title | string | ✅ Yes | Job title (must not be blank) |
| action | enum | ✅ Yes | `scored` \| `applied` \| `skipped` \| `rejected` |
| date | string | ✅ Yes | YYYY-MM-DD format |
| score | number | ❌ No | Score 0-10 from career-jd-hard-gates-score |
| gatePass | boolean | ❌ No | Whether hard gates passed |
| reason | string | ❌ No | Reason for skip/reject |
| source | string | ❌ No | LinkedIn, Indeed, Recruiter, etc. |

## Actions

- **scored** - JD scored with career-jd-hard-gates-score
- **applied** - Application submitted by Career bot
- **skipped** - Intentionally skipped (e.g., DNC list, too junior)
- **rejected** - Rejected by bot or automated filter

## Integration with Career Tools

This tool works with other Career / CoS tools:

```bash
# Step 1: Score a JD
cd tools/career-jd-hard-gates-score
npm run score -- --jd tesla-ops.txt --outdir score-out/

# Step 2: Log the run
cd ../career-hunt-run-log
npm run log -- \
  --date 2026-09-02 \
  --scored ../career-jd-hard-gates-score/score-out/scorecard.json \
  --outdir hunt-log/

# Step 3: Review summary
cat hunt-log/runs.md
```

Or build a complete run summary first:
```bash
# Aggregate all actions into run.json
{
  "date": "2026-09-02",
  "scored": [...],
  "applied": [...],
  "skipped": [...]
}

# Log it
npm run log -- --run run-2026-09-02.json --outdir hunt-log/
```

## Critical Safety Notes

- ✅ **Offline only** - No job board APIs or network calls
- ✅ **Never invents scores** - Only logs provided scores from career-jd-hard-gates-score
- ✅ **Never invents employers** - Only logs provided company names
- ✅ **Append-only** - Never rewrites existing runs.jsonl lines
- ✅ **Career bot owns apply** - This tool does not apply to jobs
- ✅ **Facts-only tracking** - All data from provided inputs
- ✅ **Exit 1 on bad input** - Validation failures are fatal
- ⚠️ **Review APPROVAL.md** - Before using tracked data for decisions

## Use Cases

1. **Daily hunt logging** - Log each day's scored roles and applications
2. **Analytics** - Track scoring trends, apply rates, skip reasons over time
3. **Live-improve** - Identify patterns in successful vs unsuccessful hunts
4. **Audit trail** - Durable record of all hunt activity
5. **Career bot coordination** - Structured input for Career bot decisions

## Exit Codes

- **0** - Success
- **1** - Validation failure, malformed JSON, or missing required fields

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Test with fixtures
npm run test:fixtures

# Clean build artifacts
npm run clean
```

## Testing

### Unit Tests

```bash
npm test
```

Runs:
- `normalizer.test.js` - Entry normalization and validation
- `appender.test.js` - JSONL append operations and idempotency

### Fixture Tests

```bash
npm run test:fixtures
```

Tests:
1. Structured run.json mode
2. Individual flag files mode
3. Append idempotency (prior lines never rewritten)
4. Validation error handling

## License

MIT

## Author

Grant Brown  
Email: grant@thebrowns.co.za  
GitHub: [@GrantB83](https://github.com/GrantB83)
