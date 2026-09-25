# Contract: Property knowledge

## `GET /api/ops/property-knowledge`

Returns all entries grouped by `property` then `section`.

## `POST /api/ops/property-knowledge/upsert`

Body: `{ property, section, key, value }`. Sets `last_updated_by` to `staff`, `source` to `staff` when a human edits. Rejects unknown property/section.

## Draft injection

`buildDraftPrompt` replaces `{property_knowledge}` with a formatted block plus the instruction:

> Drafts MUST NOT state facts that are not in this knowledge base. For anything missing or marked ask staff, tell the guest to ask staff.

No new guest-send endpoint.
