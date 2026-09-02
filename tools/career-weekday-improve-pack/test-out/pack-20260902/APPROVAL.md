# Career Weekday Improve Pack Approval

## Critical Rules

1. **Career owns apply decisions** - This pack is learning input only
2. **Never invents employers** - Only quotes from runs.jsonl
3. **Never invents scores** - Only processes provided scores
4. **Offline only** - No job board APIs or live data
5. **Never auto-updates learning.md** - Career reviews and folds in manually

## Review Checklist

- [ ] LEARNING-DRAFT.md patterns match source data
- [ ] No invented companies, scores, or gate outcomes
- [ ] Stats totals are accurate
- [ ] Period filter applied correctly (if --since used)
- [ ] Patterns are actionable for future hunts

## Next Steps

1. Review LEARNING-DRAFT.md
2. Validate patterns against runs.jsonl
3. **Career manually folds selected insights into learning.md**
4. Career bot uses updated learning.md for future decisions

## Never

- ❌ Auto-apply insights without Career review
- ❌ Invent companies or roles not in log
- ❌ Fabricate skip reasons or patterns
- ❌ Write directly to learning.md
- ❌ Apply to jobs from this tool

## Ownership

- **Career bot** owns apply decisions
- **Career / CoS** owns fold-in to learning.md
- **This tool** only packages digest outputs
- **Offline only** - No external APIs
