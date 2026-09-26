# Plan: WABA templates sync

## Approach

Extend `syncTemplateApprovalsReadonly` into a full **read-only Twilio pull** in `wa-templates-twilio-sync.ts`:

1. Paginate `GET /v1/Content`.
2. Build friendly_name → newest Content item.
3. Apply catalog alias (`browns_checkin_instructions` ← `browns_checkin_instructions_v2`).
4. `GET ApprovalRequests` per matched SID; normalize status to lowercase.
5. `INSERT` missing ops/history rows; `UPDATE` existing rows.
6. On list fetch failure: return `{ skipped: true }` without updates.

## Files

| File | Change |
|------|--------|
| `src/lib/wa-templates-twilio-sync.ts` | New sync core + Twilio types |
| `src/lib/wa-templates.ts` | Delegate sync to core |
| `src/lib/wa-templates-seed.ts` | Extra catalogue seeds + alias constants |
| `scripts/sync-wa-templates.ts` | CLI for GFM Prod refresh |
| `src/lib/__tests__/wa-templates-sync.test.ts` | Mock Twilio fixtures |
| `specs/verify/waba-templates-sync/VERIFY-PACK.md` | Operator + S1–S10 evidence |
| `specs/019-sprint2-whatsapp/contracts/api-wa-templates.md` | Contract update |

## Testing

Vitest with fixture from `04-content-list.json` (attached kick evidence). Assert v2 check-in mapping, ops seeds, unreachable no-op.
