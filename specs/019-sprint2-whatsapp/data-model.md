# Data Model: Sprint 2 WhatsApp Window, Templates, and Property Knowledge

## CareWindow (derived, not stored)

Computed per UMI thread at read/send time.

| Field | Type | Rules |
|-------|------|--------|
| lastWabaInboundAt | ISO datetime \| null | Latest inbound Cloud/Twilio WhatsApp timestamp |
| windowExpiresAt | ISO datetime \| null | `lastWabaInboundAt + 24h`; null if no Cloud inbound |
| state | `open` \| `closing_soon` \| `closed` | closed if no inbound or now ≥ expires; closing_soon if remaining ≤ 5 min and > 0 |
| remainingMs | number | `max(0, expiresAt - now)` |
| label | string | `Window open, closes in Xh Ym` or `Window closed` |

Validation: Web / `whatsapp_web` / `legacy_wa` rows never set `lastWabaInboundAt`.

## WaTemplate

Table `wa_templates`. Unique `(tenant_id, name)`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | integer pk | auto |
| tenant_id | integer | default 1 |
| name | text | one of the seven `browns_*` names |
| category | text | `utility` \| `marketing` |
| language | text | `en` |
| body | text | WhatsApp body with `{{n}}` placeholders |
| variable_mapping | text JSON | `{"1":"guest_name",...}` |
| content_sid | text \| null | empty until Grant submits |
| approval_status | text | Grant-side: `approved_by_grant_unsubmitted` |
| whatsapp_approval_status | text | WhatsApp-side: `unsubmitted` \| `received` \| `pending` \| `approved` \| `rejected` |
| last_synced_at | text \| null | ISO; set by read-only sync |

State transitions (WhatsApp side only, via fetch): `unsubmitted` → `received`/`pending`/`approved`/`rejected`. This package never writes `approved` except from a fetch result or a test fixture.

## TemplateVariableFill

Not stored. Built at picker time.

| Key | Source | Fail-closed |
|-----|--------|-------------|
| guest_name | booking / thread booker | empty |
| suite | booking.suite_or_unit | empty |
| check_in | booking check-in date | empty |
| check_out | booking check-out date | empty |
| property_name | lockbox.property → env/display name | empty |
| property_address | lockbox.property → env/default address | empty |
| gate_code | access-codes SoR for resolved property | omit if property unresolved |
| lockbox_code | suite lockbox SoR | omit if property unresolved |
| wifi_network / wifi_password | SoR for resolved property | omit if property unresolved |
| review_url | static tracker URL | always the Grant-verified GBP link |

## PropertyKnowledgeEntry

Table `property_knowledge`. Unique `(tenant_id, property, section, key)`.

| Field | Type | Constraints |
|-------|------|-------------|
| id | integer pk | auto |
| tenant_id | integer | default 1 |
| property | text | `shared` \| `cottage` \| `main-house` |
| section | text | `local_recommendations` \| `amenities` \| `house_rules` \| `checkin_checkout` \| `contact_escalation` |
| key | text | stable slug (e.g. `check_in_from`) |
| value | text | empty or `ask staff` allowed |
| source | text | in-repo path or `staff` |
| last_updated_at | text | ISO |
| last_updated_by | text \| null | `seed` or staff id |

## EvalQuestion

File fixture, not a table: `apps/guestflow/__tests__/fixtures/kb-eval-questions.json` — 10 objects `{ id, question, expectAskStaffIfMissing }`.
