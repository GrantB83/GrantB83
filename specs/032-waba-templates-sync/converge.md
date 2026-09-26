# Converge: 032-waba-templates-sync

**Date**: 2026-09-26

## Built

- Full read-only Twilio Content list + ApprovalRequests sync → Turso `wa_templates`
- Catalogue alias check-in v2; history row for rejected v1
- Seeds `official_channel_notice`, `browns_ops_smoke` on sync
- CLI `scripts/sync-wa-templates.ts` + npm `wa:sync-templates`
- VERIFY-PACK at `specs/verify/waba-templates-sync/VERIFY-PACK.md`

## Remaining (human / post-merge)

- GFM Prod Turso refresh via CLI or POST sync (Grant)
- S9 spot-check: picker + one closed-window Approve&Send
- No Redirect flip; no auto-send

## Tests

`npm test -- src/lib/__tests__/wa-templates-sync.test.ts` — 3 passed (mock Twilio).
