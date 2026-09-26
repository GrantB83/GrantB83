# VERIFY-PACK: WABA templates sync

**Feature**: Sync Twilio Content + Meta approval status → Turso `wa_templates`  
**Repo path**: `apps/guestflow`  
**Spec**: `specs/032-waba-templates-sync/spec.md`  
**Grant CLEAR**: 26 Sep 2026 (GFM)

## Operator job

Staff open GuestFlow UMI, choose a **WhatsApp-approved** template when the care window is closed (or first-touch template send). **Approve&Send** must send using the **live Content SID** from Turso (`content_sid`) with `whatsapp_approval_status=approved` — not stale `pending` from 2026-09-25 sync.

## Saleable DoD S1–S10

| ID | Check |
|----|--------|
| S1 | Y — sync + catalogue in GuestFlow |
| S2 | After sync: approved templates → `approved` + correct SID + fresh `last_synced_at`; picker shows them; `official_channel_notice` + `browns_ops_smoke` present |
| S3 | Twilio unreachable → `{ skipped: true, error: 'twilio_unreachable' }`; v1 rejected row non-sendable; check-in row = v2 `HX69e7…` |
| S4–S5 | N/A |
| S6 | Redirect ON; human Approve&Send; no auto-send; From +27600200825; no invented PII |
| S7–S8 | N/A |
| S9 | Design N; QA N — GFM Prod Turso spot-check + one closed-window template send (post-merge, Grant) |
| S10 | This pack + SQL dump format below |

## Standing locks

- Outbound **Redirect ON** (do not flip in this package).
- **No auto-send** — Approve&Send + confirmToken unchanged.
- **No new Meta template submissions** from GuestFlow.
- Twilio creds on Vercel Prod only; agents do not log secrets.

## Re-run sync (after merge)

### HTTP (Prod / Preview with auth as today)

```http
POST /api/ops/wa-templates/sync
```

Response shape:

```json
{
  "success": true,
  "readonly": true,
  "updated": 9,
  "inserted": 3,
  "fetched": 10,
  "skipped": false
}
```

### CLI (GFM / local with env)

```bash
cd apps/guestflow
# Inspect current rows only
npx tsx scripts/sync-wa-templates.ts --dry-run
# Pull Twilio → Turso
npx tsx scripts/sync-wa-templates.ts
```

Requires: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) or local SQLite per `DEPLOY.md`.

### Coding / GFM Prod refresh after merge

1. Merge PR to `main`; wait for Vercel Prod deploy.
2. On a machine with Prod secrets (or Vercel `vercel env pull` for production):
   - Run CLI against Prod Turso **or** call `POST https://guestflow.thebrowns.co.za/api/ops/wa-templates/sync` (staff session / ops auth as configured).
3. Dump `wa_templates` (below) and confirm SIDs match Kick list.

## SQL dump format (before / after)

Run against Prod Turso (or local):

```sql
SELECT name, content_sid, whatsapp_approval_status, last_synced_at
FROM wa_templates
WHERE tenant_id = 1
ORDER BY name;
```

**Expected after sync (2026-09-26 live Twilio)**

| name | content_sid | whatsapp_approval_status |
|------|-------------|--------------------------|
| browns_access_codes | HXd73e035263eabb0a115a11d73da9d17c | approved |
| browns_checkin_instructions | HX69e7c1a0231e3abd37752b8483668ee9 | approved |
| browns_checkin_instructions_v1_rejected | HXecc82bbed0dd8c68d464127b05bd3c2d | rejected |
| browns_checkout_reminder | HX704ca17e61281738eb564f62b81fdee4 | approved |
| browns_mid_stay_checkin | HXcb483f245c6b42429830b99725e56c15 | approved |
| browns_ops_smoke | HX8d62bbd3f290f08440370e9a3ff599da | approved |
| browns_post_stay_thank_you | HX61f40d32df6413c05d214a2347024082 | approved |
| browns_pre_arrival_welcome | HXda3bdaf1370bbd827c74f41d3e241551 | approved |
| browns_review_request | HX73b6220fbdb470b178b17c0027033810 | approved |
| official_channel_notice | HXc1d4f92bb4edcb51c136b7da2fea3c47 | approved |

Cross-check: Twilio `GET /v1/Content` + per-SID `ApprovalRequests` (Kick attachments `04-content-list.json`, `_sids.txt`, `STATUS.md`).

## Dry-run / test evidence (CI)

- `apps/guestflow/src/lib/__tests__/wa-templates-sync.test.ts` — mock Twilio fixture; asserts v2 check-in mapping, ops seeds, unreachable no-op.
- Attach vitest log in PR / GFM job notes.

## GFM Prod spot-check (post-merge)

1. SQL dump matches table above; `last_synced_at` newer than 2026-09-25T01:43Z.
2. `GET /api/ops/wa-templates?picker=1` includes journey templates + ops/notice as approved.
3. One closed-window thread: pick template → fill returns `content_sid` → Approve&Send uses ContentSid (Redirect still on).

## Code paths

- Sync core: `src/lib/wa-templates-twilio-sync.ts`
- API: `src/app/api/ops/wa-templates/sync/route.ts`
- CLI: `scripts/sync-wa-templates.ts`
- Picker filter: `filterPickerTemplates` + `isWhatsAppApproved('approved')`
- Check-in alias: catalogue `browns_checkin_instructions` ← Twilio `browns_checkin_instructions_v2`
