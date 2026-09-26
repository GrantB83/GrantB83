# Contract: WhatsApp templates

## `GET /api/ops/wa-templates?picker=1`

- Default: all catalogue rows (staff/ops, includes unsubmitted).
- `picker=1`: only `whatsapp_approval_status === approved`.
- Never returns secrets.

## `GET /api/ops/wa-templates/fill?threadId=&name=`

Returns `{ template, variables, codesIncluded, propertyResolved }` where variables are pre-filled and editable by the client. `codesIncluded` is false when lockbox `property` is missing or ambiguous.

## `POST /api/ops/wa-templates/sync`

Read-only. Lists Twilio Content (GET), matches catalogue rows by friendly name (check-in catalogue `browns_checkin_instructions` ← Twilio `browns_checkin_instructions_v2`), GETs ApprovalRequests per SID, upserts `content_sid`, `whatsapp_approval_status`, `last_synced_at`. Inserts `official_channel_notice`, `browns_ops_smoke`, and history row `browns_checkin_instructions_v1_rejected` when missing. Returns 200 with `{ updated, inserted, fetched, skipped, error? }`. If Twilio creds missing, 200 `{ skipped: true, error: 'missing_twilio_creds' }`. If Content list unreachable, 200 `{ skipped: true, error: 'twilio_unreachable' }` with **no row updates**. **Must not POST** to Content create or approval endpoints.

CLI equivalent: `npx tsx scripts/sync-wa-templates.ts` (see `specs/verify/waba-templates-sync/VERIFY-PACK.md`).

## Submit script (not an HTTP API)

```text
npx tsx scripts/submit-wa-templates.ts --i-have-grant-go-ahead
```

Without the flag: exit 1, no network. This package does not run the flagged command.
