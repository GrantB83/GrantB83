# Month-Close Pipeline Pack Fixtures

This directory contains synthetic stage outputs for testing the pipeline pack assembler.

## Structure

```
fixtures/
├── stage-outputs/
│   ├── unmatched/
│   │   └── queue.md
│   ├── suggest/
│   │   └── suggestions.md
│   ├── alias-checklist/
│   │   └── APPLY-CHECKLIST.md
│   └── close/
│       ├── CLOSE.md
│       └── APPROVAL.md
└── README.md (this file)
```

## Stage Outputs

### unmatched/queue.md
Output from `ledger-unmatched-merchant-queue` - synthetic unmatched merchant research queue.

### suggest/suggestions.md
Output from `ledger-merchant-alias-suggest` - synthetic alias suggestions.

### alias-checklist/APPLY-CHECKLIST.md
Output from `ledger-alias-apply-checklist` - synthetic apply checklist.

### close/CLOSE.md + APPROVAL.md
Output from `ledger-month-close-pack` - synthetic month-close checklist and approval gates.

## Testing

Run the pipeline pack assembler against these fixtures:

```bash
npm run test:fixtures
```

Expected result:
- All 4 stages detected as present
- PACK.md index generated with stage summaries
- APPROVAL.md generated with H2 gate reminder
- manifest.json shows 4 stages included
- Exit code 0 (success)

## Safety Notes

- Fixtures intentionally omit transaction amounts (amounts stay in files)
- No currency symbols ($, R, etc.) in prose
- All stage outputs are marked DRAFT or research-only
- H2 approval gates clearly documented
