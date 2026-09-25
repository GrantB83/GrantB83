# Contract: WhatsApp templates

## `GET /api/ops/wa-templates?picker=1`

- Default: all catalogue rows (staff/ops, includes unsubmitted).
- `picker=1`: only `whatsapp_approval_status === approved`.
- Never returns secrets.

## `GET /api/ops/wa-templates/fill?threadId=&name=`

Returns `{ template, variables, codesIncluded, propertyResolved }` where variables are pre-filled and editable by the client. `codesIncluded` is false when lockbox `property` is missing or ambiguous.

## `POST /api/ops/wa-templates/sync`

Read-only. For each row with a `content_sid`, GET Twilio Content / approval request. Updates `whatsapp_approval_status` and `last_synced_at`. Returns 200 with counts. If Twilio creds missing, 200 `{ skipped: true }`. **Must not POST to Content create or approval endpoints.**

## Submit script (not an HTTP API)

```text
npx tsx scripts/submit-wa-templates.ts --i-have-grant-go-ahead
```

Without the flag: exit 1, no network. This package does not run the flagged command.
