# Data Model: Sprint 2 Staff Alerts and Nightsbridge Layered Sync

## staff_alerts

One row per issue × recipient.

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER PK | |
| tenant_id | INTEGER NOT NULL | default 1 |
| dedupe_key | TEXT NOT NULL | e.g. `unanswered:123`, `unanswered-digest:2026-09-25`, `nb-missed-import`, `nb-batch:error:{batchId}`, `nb-batch:zero:{batchId}`, `nb-batch:rowdrop:{batchId}`, `failed-send:{threadId}:{attempt}`, `site-down`, `site-recovery` |
| recipient_email | TEXT NOT NULL | normalised login or fallback |
| kind | TEXT NOT NULL | `unanswered` \| `unanswered_digest` \| `nb_missed` \| `nb_batch` \| `failed_send` \| `site_down` \| `site_recovery` \| `nb_parse_failed` |
| status | TEXT NOT NULL | `open` \| `resolved` |
| last_sent_at | DATETIME | null until first send |
| resolved_at | DATETIME | |
| resolved_notified_at | DATETIME | |
| payload_json | TEXT | first name, booking ref, staff path — never codes/payment |
| created_at | DATETIME | |

**Constraints**: UNIQUE `(dedupe_key, recipient_email)`. Cooldown = settings.alertCooldownHours since `last_sent_at` while `status=open`.

## inbound_threads.last_handler_email

Additive TEXT. Set on approve / successful send / link. Null means "all active users" for unanswered routing.

## bookings (additive provenance)

| Column | Type | Notes |
| --- | --- | --- |
| guest_email | TEXT | if missing |
| nightsbridge_booking_id | TEXT | digits only, already exists |
| nb_report_id | TEXT | A&D Booking ID when it differs |
| nb_last_event_at | DATETIME | last *applied* email Date |
| last_report_at | DATETIME | last applied batch time |
| cancelled_source | TEXT | `nb_email` \| `nb_report` |
| notes_email | TEXT | |
| notes_report | TEXT | |
| field_sources_json | TEXT | `{ phone: {source, sourceRef, verified, at}, ... }` |
| guest_phone_verified | TEXT | `staff_verified` \| `guest_verified` \| null |
| guest_email_verified | TEXT | same |

Never DELETE a booking. Soft-cancel only.

## booking_payments

Informational payment events from PAYMENT emails.

| Column | Type | Notes |
| --- | --- | --- |
| id | INTEGER PK | |
| tenant_id | INTEGER | |
| booking_id | INTEGER | nullable if ref not yet linked |
| nb_ref | TEXT | |
| amount | REAL | |
| currency | TEXT | ZAR |
| status | TEXT | success/error/3DS |
| source | TEXT | `nb_email` |
| raw_masked | TEXT | PAN stripped |
| created_at | DATETIME | |

## nb_email_raw

Forward-verification and debug. Bodies may include PII — never log in CI.

| Column | Notes |
| --- | --- |
| id, received_at, sender, subject, message_id, body_text, headers_json |

## nb_email_events

| Column | Notes |
| --- | --- |
| id | |
| message_id | UNIQUE |
| received_at, email_date, sender, type, nb_ref | type enum below |
| content_hash | sha256 of normalised parsed fields |
| parsed_json | |
| status | `applied` \| `stale` \| `duplicate` \| `ignored` \| `parse_failed` |
| applied_at | |

**Types**: `NEW_BOOKING` \| `OTA_CANCELLATION` \| `TRAVELIT_CONFIRMATION` \| `PAYMENT` \| `VCC_PROCESSING` \| `OTHER`

**Ordering**: apply only if `email_date > bookings.nb_last_event_at`, except cancellation always wins over an older NEW. NEW after a newer cancellation → stale.

## nb_gaps

| Column | Notes |
| --- | --- |
| id, tenant_id, booking_id, nb_ref, field | field: phone/email/room/check_in/check_out/status |
| gap_kind | `missing` \| `relay_only` \| `placeholder` \| `intermediary` |
| detected_at, detected_by | `email` \| `report` |
| status | `open` \| `filling` \| `filled` \| `no_source` \| `staff_needed` \| `dismissed` |
| filled_value_source, filled_at, attempts, last_attempt_at, note | |

UNIQUE open gap on `(booking_id, field)` WHERE `status IN ('open','filling','staff_needed')`.

## nb_sync_runs

| Column | Notes |
| --- | --- |
| id, layer | `email` \| `batch` \| `targeted` |
| started_at, finished_at, ok, code, rows, message | |

**Codes**: `OK`, `AUTH_CHALLENGE`, `LOGIN_FAILED`, `DOWNLOAD_TIMEOUT`, `EMPTY_FILE`, `PARSE_FAILED`, `ROWDROP_GUARD`, `FORWARD_SILENT`, `ZERO_ROWS`, `ERROR`

14h alert: last `ok=1 AND layer='batch'` older than `settings.nbMissedImportHours`.

## health_probes (optional app-side)

Used by tests and by a probe POST if the workflow can reach the app. Site-down email from GHA does not require this table to exist in Production yet.

| Column | Notes |
| --- | --- |
| id, checked_at, ok, source | `gha` \| `cron` |
| streak | consecutive failures after this row |

## Missing definitions (L2)

Evaluated after trim/normalise:

**Phone missing** if empty; &lt; 9 digits; fails ZA E.164 (`normalizeZaE164`); all-same or sequential placeholder; known intermediary list; property own number.

**Email missing** if empty/invalid; placeholder (`noemail@`, `none@`, `test@`, `example.`); intermediary mailbox list; property domains `@thebrowns.co.za`, `@hospitality.partners`.

**Email relay-only** (not missing for outreach): `@guest.booking.com`, `expediapartnercentral`, `@guest.airbnb.com`, `@agoda-messaging.com`.

**Status/dates/room missing** if null or room not in known units.

## Conflict matrix (L4)

| Field | Winner |
| --- | --- |
| status cancelled/active | newest by time; cancellation email vs report |
| check_in / check_out / room / guest_name / adults | report, unless email event_time &gt; last_report_at; staff_verified name never overwritten |
| phone / email | never overwrite staff_verified / guest_verified; else first valid non-relay wins; later diffs → alt_contact |
| source/channel, amounts | email wins |
| notes | store both `notes_email` and `notes_report` |

## State transitions

### Alert

`absent` → insert open + send → `open`. Re-evaluate inside cooldown → no-op. Issue gone → `resolved` + resolved note once.

### Gap

`open` → `filling` → `filled` | `staff_needed` | `no_source`. `dismissed` is staff-only (no UI in this package; column reserved).

### Email event

new → `applied` | `stale` | `duplicate` | `ignored` | `parse_failed`. Terminal.
