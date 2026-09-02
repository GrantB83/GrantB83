# Test Fixtures

## sample-queue.json

Sample queue.json output from vault-filename-due-queue with 6 synthetic entries:

- 1 GAB Trust CIPC annual return
- 1 GAB Trust SARS provisional tax
- 1 B Group Holdings CIPC certificate
- 1 SARS VAT return (general)
- 1 Plimmer property rates
- 1 unknown document (no signals)

Used by `npm run test:fixtures` to verify the tool works end-to-end.

## Entity Distribution

- **gab-trust:** 2 items
- **b-group:** 1 item
- **sars:** 1 item (VAT return without entity keyword)
- **plimmer:** 1 item
- **unknown:** 1 item
