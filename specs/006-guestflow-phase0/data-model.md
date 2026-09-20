# Data Model: GuestFlow Phase 0

## send_confirm_tokens

One-time staff confirm proof for inbound send.

| Field | Type | Rules |
| --- | --- | --- |
| id | INTEGER PK | autoincrement |
| tenant_id | INTEGER | required, default 1 |
| thread_id | INTEGER | required, indexed |
| token_hash | TEXT UNIQUE | SHA-256 hex of raw token |
| expires_at | DATETIME | issue time + 15 minutes |
| consumed_at | DATETIME | null until send consumes |
| created_at | DATETIME | default now |

**Transitions**: issued → consumed. Expired or consumed rows cannot authorize send. No reuse.

## inbound_messages.draft_source

| Field | Type | Rules |
| --- | --- | --- |
| draft_source | TEXT | `heuristic` \| `llm` \| `human`; existing rows default `heuristic` |

Set by classify/ingest (`heuristic`), staff edit (`human`), draft upsert stub (`llm`).

## guest_tickets.guest_draft_source (if tickets drafts edited)

Same enum; only if this phase writes ticket drafts. Prefer leave untouched unless UI edits tickets.

## guest_contacts

| Field | Type | Rules |
| --- | --- | --- |
| id | INTEGER PK | autoincrement |
| tenant_id | INTEGER | required |
| normalized_phone | TEXT | E.164 or NULL; UNIQUE(tenant_id, normalized_phone) when non-null |
| email | TEXT | nullable, lowercased/trimmed |
| display_name | TEXT | nullable |
| last_stay_at | DATE/DATETIME | nullable; last check-out or stay date from A&D |
| last_suite | TEXT | nullable |
| source | TEXT | `nb` \| `inbound` \| `manual` |
| nbid | TEXT | nullable Nightsbridge booking/client id |
| retention_years | INTEGER | **5** (Grant CLEAR) |
| retention_delete_after | DATETIME | last_stay_at + 5 years when last_stay_at present |
| last_activity_at | DATETIME | upsert time |
| created_at | DATETIME | default now |
| updated_at | DATETIME | default now |

**Upsert keys** (null-tolerant, never invent phone):
1. `(tenant_id, normalized_phone)` when phone present
2. else `(tenant_id, email)` when email present
3. else `(tenant_id, nbid)` when nbid present
4. else insert name-only row (no phone)

**Retention**: 5 years after last stay then DELETE. No chat PII dumps. Policy comment in migration.

## draft_jobs

| Field | Type | Rules |
| --- | --- | --- |
| id | INTEGER PK | autoincrement |
| tenant_id | INTEGER | required |
| thread_id | INTEGER | required |
| message_id | INTEGER | required |
| intent | TEXT | from classifier |
| status | TEXT | `pending` \| `claimed` \| `done` \| `failed` |
| attempts | INTEGER | default 0 |
| error | TEXT | nullable |
| created_at | DATETIME | default now |
| updated_at | DATETIME | default now |

**Invariant**: at most one `pending` or `claimed` row per `message_id`. Phase 0 never claims.

## inbound_threads / inbound_messages status (existing)

Send-eligible set: `approved`, `ready` on thread **or** latest inbound message.

Existing flow: `new` → `classified` → `drafted` → `approved`/`ready` → `sent`/`queued`/`failed`.
