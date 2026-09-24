# Data Model: UMI v2.1

Prefer extending live tables. No parallel comms schema.

## inbound_threads (extend)

Existing: `id`, `tenant_id`, `external_id`, `source`, `from_number`, `guest_name`, `intent`, `confidence`, `status`, `assigned_to`, `first_message_at`, `last_message_at`, `metadata`, timestamps.

Additive columns:

| Column | Type | Rule |
| --- | --- | --- |
| `booking_id` | INTEGER NULL | Set when `thread_kind='booking'`; FK bookings.id |
| `thread_kind` | TEXT NOT NULL DEFAULT `'temp'` | `booking` \| `temp` |
| `guest_contact_id` | INTEGER NULL | FK guest_contacts.id when known |
| `last_channel` | TEXT NULL | `whatsapp_cloud` \| `whatsapp_web` \| `email` \| `sms` |
| `last_inbound_channel` | TEXT NULL | Default outbound channel |
| `last_outbound_at` | DATETIME NULL | Pending-reply calc |
| `last_inbound_at` | DATETIME NULL | Pending-reply calc |
| `pending_reply` | INTEGER NOT NULL DEFAULT 0 | 1 if inbound newer than outbound or open draft |
| `expires_at` | DATETIME NULL | Temp: created+14d |
| `nudged_at` | DATETIME NULL | Set on 48h hygiene |
| `hygiene_status` | TEXT NULL | `active` \| `nudged` \| `expired` |
| `linked_at` | DATETIME NULL | When temp merged |
| `linked_from_thread_id` | INTEGER NULL | Surviving booking thread after merge |

Indexes:

- Unique `idx_umi_threads_booking` on `booking_id` WHERE `thread_kind='booking' AND booking_id IS NOT NULL`
- `idx_umi_threads_kind_status` (`tenant_id`, `thread_kind`, `status`)
- `idx_umi_threads_from` (`tenant_id`, `from_number`)
- `idx_umi_threads_pending` (`tenant_id`, `pending_reply`, `last_message_at`)

State: `new` → `classified`/`drafted` → `approved` → `sent`/`failed`; temps also `expired`. Merge closes temp (`status='linked'`).

## inbound_messages (extend)

Existing: thread/tenant, direction, from_number, message_text, media_refs, timestamps, external_message_id, classification, draft_reply, draft_source, status.

Additive:

| Column | Type | Rule |
| --- | --- | --- |
| `channel` | TEXT NULL | `whatsapp_cloud` \| `whatsapp_web` \| `email` \| `sms` |
| `sender_address` | TEXT NULL | Email From; optional display |
| `source_tag` | TEXT NULL | e.g. `email` for bubble header |
| `dedup_key` | TEXT NULL | Cloud↔Web fingerprint |
| `is_spam` | INTEGER NOT NULL DEFAULT 0 | Skip auto-draft when 1 |
| `body_unavailable` | INTEGER NOT NULL DEFAULT 0 | 1 only if inbound had no body |

Indexes: unique `idx_umi_msg_external` on `external_message_id` WHERE NOT NULL; `idx_umi_msg_dedup` on `dedup_key` WHERE NOT NULL.

Validation: `message_text` remains NOT NULL. WA Web stores full body; empty → `[body unavailable]` + `body_unavailable=1`. Email first lines of UI = `source_tag` + `sender_address`, then body.

## guest_contacts (keep)

No new columns. Retention: `retention_years=5`, `retention_delete_after` = last stay + 5 years, then DELETE (Phase 0 / PROPOSAL-v3). UMI upserts `last_activity_at` on inbound match only; never invents phone/email.

## bookings (read-only for UMI)

SoR for stay facts. UMI reads `id`, `guest_name`, `guest_phone`, `guest_email` (if present), `check_in`, `check_out`, `suite_or_unit`, `nightsbridge_booking_id`, `status`. Does not write stay fields.

## draft_jobs / send_confirm_tokens / send_jobs (keep)

Unchanged contracts. Auto-draft enqueues `draft_jobs` unless spam. Send still consumes confirmToken. Redirect metadata stays on send_jobs.

## welcome_drafts / late_checkin_drafts (project, do not drop)

Rows with `pending_approval` are projected onto the booking thread as in-thread draft candidates and into needs-attention. Tables remain; UI no longer requires `/needs-approval` for guest work.

## staff_ops_drafts (keep, copy-only)

Not a guest thread. Remains on `/needs-approval` and Daily brief. No Send.

## Derived: inbox list row

Computed, not stored as a table:

- `sort_bucket`: 0 arriving (check_in today|tomorrow SAST), 1 pending_reply, 2 other
- `needs_attention`: open draft OR temp OR pending_reply OR hygiene nudged/expired OR welcome/late draft
- `default_outbound_channel`: `last_inbound_channel` or staff override

## Channel mapping from live `source`

| Live source | UMI channel |
| --- | --- |
| `twilio_whatsapp`, Meta Cloud webhook | `whatsapp_cloud` |
| `whatsapp_web`, `legacy_wa` | `whatsapp_web` |
| `email`, `email_forward` | `email` |
| `twilio_sms` | `sms` |

## Merge rules (temp → booking)

1. Staff posts `{ bookingId }` on the temp. If the booking already has a booking thread, move messages (`UPDATE inbound_messages SET thread_id=?`), copy drafts, set temp `status='linked'`, `linked_from_thread_id`.
2. If no booking thread, convert temp in place: set `thread_kind='booking'`, `booking_id`.
3. Do not overwrite booker phone/email on `guest_contacts` with empty values.
4. Never merge two booking threads automatically.

## Retention

Guest contacts and comms follow **5 years after last stay then delete**. Hygiene expiry is not deletion. Hard delete is the existing retention sweeper, not UMI v2.1 launch.
