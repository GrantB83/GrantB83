# Feature Specification: Daily Brief → Staff Approval Queue Enqueue

**Feature Branch**: `cursor/daily-brief-enqueue-d5d7`

**Created**: 2026-09-18

**Status**: Unblocked by `specs/004-staff-ops-copy-only-approvals/` (staff_ops_drafts + copy-only approve)

**Prior blocked state (preserved)**: See convergence notes below and `research.md`.

**Input**: Extend PR #187 staff/ops daily brief so staff can enqueue WhatsApp-ready brief text into an existing staff approval queue for human Approve before any send. Default remains view + export if enqueue is not evidenced. Never auto-send.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enqueue Daily Brief Draft (Priority: P1) — BLOCKED

Staff on `/ops/daily-brief` click **Enqueue draft** to save the current WhatsApp-ready `briefText` into the existing staff approval queue (`/needs-approval`). The item appears as a staff-ops draft. No message is sent on enqueue. A human must Approve before copy/send.

**Why this priority**: Removes copy-paste toil from the morning brief ritual when a safe queue exists.

**Independent Test**: With seeded brief text, POST enqueue, verify row in approval queue with `pending_approval` status and no outbound send. **Blocked** — no evidenced staff-ops queue type (see Plan).

**Acceptance Scenarios**:

1. **Given** an existing staff-ops approval queue type with staff-destination pattern, **When** staff enqueue the brief, **Then** draft appears in `/needs-approval` with status pending and no auto-send
2. **Given** no staff-ops queue type (current state), **When** staff view the brief page, **Then** only copy/export actions are shown and UI explains the blocker

---

### User Story 2 - Human Approve Before Send (Priority: P1) — N/A until queue exists

Staff open `/needs-approval`, review the enqueued brief, Approve, then copy/post to internal staff WhatsApp (H11). Send-via-API is not used for staff-group posts.

**Why this priority**: Fail-closed gate — approval before any send path.

**Independent Test**: N/A while enqueue blocked.

---

### User Story 3 - Fallback Copy/Export (Priority: P1)

Staff continue using PR #187 copy/export when enqueue is unavailable.

**Why this priority**: Safe default already shipped in PR #187.

**Independent Test**: Copy for WhatsApp and download export still work; brief includes draft-only footer.

**Acceptance Scenarios**:

1. **Given** enqueue blocked, **When** staff use Copy for WhatsApp, **Then** same `briefText` from GET `/api/daily-brief` is copied with no invented rates

---

### Edge Cases

- Duplicate enqueue same date — dedupe if queue added later
- Empty brief (no bookings) — disable enqueue
- Approval queue Send button targets guest phone — must not be used for staff-group brief (wrong destination pattern)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST evaluate existing `/api/approvals` queue types for staff-ops daily-brief support before exposing enqueue
- **FR-002**: System MUST NOT enqueue if no safe staff-ops draft type and staff-destination pattern exist (fail-closed)
- **FR-003**: System MUST keep PR #187 view, copy, and export when enqueue blocked
- **FR-004**: System MUST NOT auto-send on enqueue or on brief generation
- **FR-005**: Enqueued text MUST be exactly `generateWhatsAppBrief()` output — no invented rates, amounts, or guest PII beyond booking data
- **FR-006**: UI MUST state "draft only / no auto-send" and document how staff approve (H11) or why enqueue is unavailable
- **FR-007**: System MUST expose `enqueueSupported` (boolean) and `enqueueBlocker` (string) on GET `/api/daily-brief` for clients

### Key Entities

- **Daily Brief Snapshot**: From PR #187 (`DailyBriefSnapshot` + `briefText`)
- **Approval Queue Item**: Rows from `/api/approvals` — currently `inbound`, `welcome`, `late_checkin`, `ticket_guest`, `ticket_staff` (none suitable for staff-group daily brief)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spec Kit artifacts document enqueue safety verdict with evidence citations
- **SC-002**: When blocked, 100% of staff see copy/export only plus explicit blocker reason
- **SC-003**: Unit tests pass for enqueue gate helper (supported=false, reason documented)
- **SC-004**: Zero new send paths, tables, or Twilio/WABA changes in this PR

## Assumptions

- PR #187 daily brief is merged to `main`
- Staff auth via existing `STAFF_PASSWORD` middleware
- Internal Browns Dullstroom ops only
- Staff-group WhatsApp post is manual (CoS Admin / H11) — not API send to a guest number
