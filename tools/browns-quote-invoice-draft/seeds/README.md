# Browns Quote Invoice Draft — Seeds & Templates

This folder is reserved for optional seed templates derived from real `stay@hospitality.partners` correspondence.

## Purpose

Seeds provide example patterns for:
- Booking confirmation + deposit request
- Booking.com proforma style
- Availability quote follow-up
- Invoice handoff to accounting

## Current State

**Empty by design.** This tool ships with fixtures only.

## Future: Deriving Seeds from Real Correspondence

If Grant approves, seeds can be created by:

1. Reviewing anonymized samples from `stay@` inbox
2. Extracting tone, structure, and common phrases
3. Creating template variants (e.g., weekend vs weekday, summer vs winter)
4. Documenting which seeds map to which guest journey stage

## Seeds vs Fixtures

| Aspect | Fixtures | Seeds |
|--------|----------|-------|
| **Purpose** | Test the CLI works | Provide real-world tone examples |
| **Source** | Synthetic, made-up guests | Patterns from actual Browns correspondence |
| **Names** | Fictional | Anonymized or generic |
| **Amounts** | Test values | Realistic rate ranges |
| **Usage** | `npm run test:fixtures` | Reference when adjusting tone |

## Approval Required

Do not populate this folder with real guest data without:
1. Grant's explicit approval
2. Full anonymization (no real guest names, emails, phone numbers)
3. Removal of any sensitive or identifying information

## Documentation Dependency

If seeds are added later, they may reference:
- `docs/automation/samples/` in the parent repo
- `stay@` folder patterns (if shared by Grant)
- Existing Browns brand guidelines

Until then, rely on:
- `../fixtures/` for testing
- Tone guidelines in main README
- AGENTS.md hospitality tone rules
