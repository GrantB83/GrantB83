# Fixtures for career-live-improve-digest

## Files

- `runs.jsonl` - Sample JSONL log with 15 entries spanning 2026-08-15 to 2026-09-01
- `runs.md` - Sample markdown summary (optional input)

## Test Scenarios

### runs.jsonl Contents

**Period:** 2026-08-15 to 2026-09-01 (17 days)

**Actions:**
- Scored: 7 entries (action="scored")
- Applied: 2 entries
- Skipped: 4 entries (some have scores but action="skipped")
- Rejected: 2 entries (some have scores but action="rejected")

**Score Bands (from scored entries only):**
- Excellent (9-10): 4 roles
- Good (7-8): 2 roles
- Medium (5-6): 1 role
- Low (0-4): 0 roles

**Note:** Entries with action="skipped" or "rejected" are NOT counted in "scored" totals, even if they have score values. Score bands only count entries with action="scored".

**Skip Reasons:**
- Too junior: 2 occurrences
- DNC list company: 1 occurrence
- Remote policy mismatch: 1 occurrence

**Reject Reasons:**
- Comp below floor: 1 occurrence
- Team size gate: 1 occurrence

**Gate Fails:**
- Total: 5 (scored but gatePass=false)

**Sources:**
- LinkedIn: 9 roles
- Indeed: 3 roles
- Direct: 2 roles
- Recruiter: 1 role

## Expected Outputs

When running `npm run digest -- --log fixtures/runs.jsonl --outdir test-output/`:

1. **LEARNING-DRAFT.md**
   - 4 skip patterns
   - 2 reject patterns
   - Score bands breakdown
   - 5 gate fails with patterns
   - Source distribution

2. **stats.json**
   - period: { since: "2026-08-15", until: "2026-09-01", totalDays: 18 }
   - totals: { entries: 15, scored: 7, applied: 2, skipped: 4, rejected: 2 }
   - scoreBands: { excellent_9_10: 4, good_7_8: 2, medium_5_6: 1, low_0_4: 0 }
   - gateFails: { total: 6, patterns: {...} }
   - skipReasons: { "Too junior": 2, "DNC list company": 1, "Remote policy mismatch": 1 }
   - rejectReasons: { "Comp below floor": 1, "Team size gate": 1 }
   - sources: { "LinkedIn": 9, "Indeed": 3, "Direct": 2, "Recruiter": 1 }

3. **APPROVAL.md**
   - Safety gates checklist
   - Career ownership notice

4. **manifest.json**
   - Tool metadata
   - Input/output paths
   - Summary stats

## Test Commands

```bash
# Full run
npm run digest -- --log fixtures/runs.jsonl --outdir test-output/

# With since filter
npm run digest -- --log fixtures/runs.jsonl --since 2026-08-20 --outdir test-output-filtered/

# Summary mode (limited data)
npm run digest -- --summary fixtures/runs.md --outdir test-output-summary/

# Both inputs
npm run digest -- --log fixtures/runs.jsonl --summary fixtures/runs.md --outdir test-output-both/
```

## Validation

After running tests, verify:

1. All 4 output files created
2. LEARNING-DRAFT.md has numbered patterns with correct counts
3. stats.json matches expected values
4. No invented companies or scores
5. Period calculation correct (17 days)
6. Since filter works correctly (should reduce entry count)
