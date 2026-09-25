# Data Model: Sprint 2 Scheduled Arrival Drafts

## ArrivalDraft

Persisted in `arrival_drafts`. One row per `(tenant_id, booking_id, stage)`.

| Field | Type | Constraints |
| --- | --- | --- |
| id | integer pk | autoincrement |
| tenant_id | integer | required |
| booking_id | integer | required |
| stage | text | `t-3` \| `t-1` \| `day-of` |
| stage_label | text | `T-3` \| `T-1` \| `Day-of` |
| status | text | `drafted` \| `needs_attention` \| `template_pending_approval` \| `sent` \| `discarded` |
| channel | text | `whatsapp` \| `email` \| null when no-contact |
| thread_id | integer | nullable |
| message_id | integer | nullable; inbound_messages row holding `draft_reply` |
| draft_body | text | nullable; null on no-contact |
| template_name | text | nullable; e.g. `browns_pre_arrival_welcome` |
| window_state | text | `open` \| `closed` \| `n/a` |
| attention_reason | text | nullable; `no contact` \| `codes: property unresolved` \| `code missing, ask staff` \| `template pending approval` |
| fingerprint | text | `check_in\|check_out\|suite` |
| codes_snapshot | text | JSON; redacted in logs |
| due_date | text | `YYYY-MM-DD` Johannesburg due date |
| created_at | datetime | ISO |
| updated_at | datetime | ISO |

**Validation**: unique `(tenant_id, booking_id, stage)`. Guest-facing body required unless `attention_reason = 'no contact'`.

## State transitions

```text
(none) → drafted
(none) → needs_attention          # unresolved codes, or other fail-closed
(none) → template_pending_approval
(none) → needs_attention          # no contact (no draft_body)
drafted / needs_attention / template_pending_approval
        → discarded               # cancel, or fingerprint change then rewrite
        → drafted / needs_attention / template_pending_approval  # regenerate
        → sent                    # Approve&Send success
sent → (terminal for that stage)
discarded → drafted / needs_attention / template_pending_approval  # regenerate after date/suite change
```

## Booking (read-only SoR)

Uses existing `bookings` columns: `id`, `tenant_id`, `guest_name`, `guest_phone`, `guest_email`, `check_in`, `check_out`, `suite_or_unit` / `room_number`, `status`.

Predicates (from #221, do not reimplement):

- `isCancelledStatus`
- `isOwnerBlock`
- `isActiveGuestBooking`

## Lockbox resolution (from #221)

`resolveAccessCodesForSuite(db, tenantId, suite)` →

- `{ ok: true, property, codes }`
- `{ ok: false, reason: 'codes: property unresolved' }`

Missing individual code values use `code missing, ask staff` inside an otherwise resolved property.

## Contact presence (#219 shim)

Usable phone = `normalizeZaE164(phone)` is non-null.  
Usable email = `normalizeEmail(email)` is non-null.  
`hasGuestContact` is true when either is present. Prefer #219 if imported.

## WhatsApp window + template (#218 shim)

- Window open: last inbound from the thread/contact within 24 hours of `now`
- `findApprovedTemplateFor(name)` returns a row only when status is WhatsApp-approved
- Local Grant-approved copy is not the same as WhatsApp-approved

## Inbox projection

`listInboxThreads` sets:

- `hasOpenDraft` true when an `arrival_drafts` row is `drafted` | `needs_attention` | `template_pending_approval` and `draft_body` is present
- `needsAttention` true for unanswered inbound **or** an open arrival draft / no-contact item
- `arrivalStage` / `attentionReason` for the staff badge
