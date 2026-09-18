# Research: Daily Brief Staff Enqueue

**Date**: 2026-09-18

## Queue inventory (`GET /api/approvals`)

| Source table | Approval `type` | Draft field | Destination pattern | Suitable for daily brief? |
|--------------|-----------------|-------------|---------------------|---------------------------|
| `inbound_messages` | `inbound` | `draft_reply` | Guest WhatsApp reply to `from_number` | No — guest inbound, not staff group |
| `guest_tickets` | `ticket_guest` | `guest_draft_reply` | Guest exception reply | No |
| `guest_tickets` | `ticket_staff` | `staff_brief` | Outlier ticket staff notification | No — tied to inbound thread/ticket, not daily run sheet |
| `welcome_drafts` | `welcome` | `draft_message` | Guest welcome via `guest_phone` | No — per-booking guest message |
| `late_checkin_drafts` | `late_checkin` | `draft_message` | Guest late check-in via `guest_phone` | No — per-booking guest message |

## `/needs-approval` send path

- **Approve & Send** calls `POST /api/whatsapp/send` with `guestPhone` from item metadata
- Requires `guest_phone` / `from_number` on each item
- Daily ops brief targets **internal staff WhatsApp group** (H11 manual post), not a guest MSISDN
- No `staff_destination` or `staff_group` field exists on any approval row

## Prior art (002-staff-ops-daily-brief)

`specs/002-staff-ops-daily-brief/research.md` Decision 5 already concluded: no `staff_ops` row in approvals; `guest_tickets.staff_brief` is for outlier tickets only.

## Decision: Enqueue blocked (fail-closed)

**Decision**: Do **not** implement enqueue in this PR. Keep view + copy/export from PR #187. Report blocker in Spec Kit artifacts and UI.

**Rationale**:

1. No existing approval queue type labeled or structured for staff-ops daily brief
2. Reusing guest-oriented tables (`welcome_drafts`, `late_checkin_drafts`) would mis-route Send to guest phone
3. Reusing `guest_tickets.staff_brief` invents a new workflow on an outlier ticket queue
4. Adding a new table or queue type would invent a process (explicit fail-closed gate violation)

**Alternatives considered**:

- New `staff_ops_drafts` table + approvals union — rejected (invent queue)
- Insert into `welcome_drafts` with `source='staff-ops-daily-brief'` — rejected (guest schema, wrong Send path)
- Insert `guest_tickets` row without thread — rejected (orphan ticket, wrong semantics)

**Unblock path (future, out of scope)**:

- Grant approves new `staff_ops_drafts` table OR extends approvals with `type='staff_ops'` and copy-only approve flow (no `guestPhone` Send)
