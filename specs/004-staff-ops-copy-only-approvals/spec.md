# Feature Specification: Staff Ops Copy-Only Daily Brief Approvals

**Feature Branch**: `cursor/staff-ops-copy-only-approvals-ce6c`

**Created**: 2026-09-18

**Status**: Ready for implementation

**Input**: Unblock PR #188 `enqueueSupported: false` by adding `staff_ops_drafts` and copy-only approval flow. Staff enqueue WhatsApp-ready daily brief text, approve at `/needs-approval`, copy to internal staff WhatsApp (H11). **Never guest-send. Never auto-post.**

**Prior research**: Preserved in `specs/003-daily-brief-staff-enqueue/` (blocked verdict and queue inventory).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enqueue Daily Brief Draft (Priority: P1)

Staff on `/ops/daily-brief` click **Enqueue draft** to save the current WhatsApp-ready `briefText` (from `generateWhatsAppBrief()` only) into the staff approval queue. The item appears as type `staff_ops` at `/needs-approval`. No message is sent on enqueue.

**Why this priority**: Removes copy-paste toil from the morning brief ritual.

**Independent Test**: POST enqueue with seeded bookings, verify row in approval queue with `pending_approval` and no outbound send.

**Acceptance Scenarios**:

1. **Given** `staff_ops_drafts` table exists and brief has content, **When** staff enqueue the brief, **Then** draft appears in `/needs-approval` with type `staff_ops`, status pending, and `copy_only: true`
2. **Given** a pending draft for tenant+date already exists, **When** staff enqueue again without force, **Then** existing pending draft is returned (idempotent)
3. **Given** empty brief (no operations), **When** staff attempt enqueue, **Then** request is rejected with clear error

---

### User Story 2 - Copy-Only Approve (Priority: P1)

Staff open `/needs-approval`, review the enqueued brief, Approve, then **Copy WhatsApp text** for manual H11 post. Send-via-API is hidden/disabled for `staff_ops` rows.

**Why this priority**: Fail-closed gate — approval before copy; no API send to guest or staff group.

**Independent Test**: PATCH approve on staff_ops item returns copy content; Send button not shown; no call to `/api/whatsapp/send`.

**Acceptance Scenarios**:

1. **Given** a pending `staff_ops` draft, **When** staff Approve, **Then** status becomes `approved` and copy content is available
2. **Given** an approved `staff_ops` draft, **When** staff use Copy WhatsApp text, **Then** clipboard receives exact `draft_content` from brief lib
3. **Given** any `staff_ops` row, **When** staff view actions, **Then** Send via WhatsApp is hidden/disabled

---

### User Story 3 - Fallback Copy/Export (Priority: P2)

Staff continue using PR #187 copy/export when enqueue is unavailable (table missing) or as alternative after approve.

**Why this priority**: Safe default already shipped in PR #187.

**Independent Test**: Copy for WhatsApp and download export still work on daily-brief page.

**Acceptance Scenarios**:

1. **Given** `enqueueSupported` is false (table missing), **When** staff view daily brief, **Then** copy/export only plus explicit blocker reason
2. **Given** enqueue supported, **When** staff prefer direct copy, **Then** Copy for WhatsApp still works on `/ops/daily-brief`

---

### Edge Cases

- Duplicate enqueue same tenant+date — return existing pending unless `force: true`
- Empty brief — disable/reject enqueue
- Guest Send path — must not be used (`guest_phone` null, `copy_only: true`)
- Rejected draft — may enqueue again with force or new pending after reject

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide Turso-safe `staff_ops_drafts` table with id, tenant_id, brief_date, draft_content, status, timestamps, actor
- **FR-002**: `GET /api/approvals` MUST include type `staff_ops` with empty/null `guest_phone` and `copy_only: true` in metadata
- **FR-003**: `PATCH /api/approvals` for `staff_ops` MUST approve/reject and return copy content; MUST NOT call WhatsApp send
- **FR-004**: UI MUST hide/disable Send for `staff_ops`; show Copy WhatsApp text after approve
- **FR-005**: `POST /api/daily-brief/enqueue` MUST use existing brief lib output only — no invented rates or guest PII beyond booking data
- **FR-006**: `enqueueSupported` MUST be true only when table exists and enqueue path is wired; otherwise false with blocker
- **FR-007**: Idempotent enqueue: one pending draft per tenant_id + brief_date unless explicit force
- **FR-008**: System MUST NOT auto-send on enqueue, approve, or brief generation; no H11 webhook/API post

### Key Entities

- **StaffOpsDraft**: `staff_ops_drafts` row — internal Browns Dullstroom ops brief queue item
- **DailyBriefSnapshot / briefText**: From PR #187 `src/lib/daily-brief.ts`
- **Approval Queue Item**: Union row with `type='staff_ops'`, `copy_only: true`, no guest phone

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Enqueue → approval row → copy-only approve → Copy WhatsApp text path works end-to-end
- **SC-002**: Zero calls to `/api/whatsapp/send` from staff_ops flow
- **SC-003**: Unit tests pass for enqueue gate, idempotency, and copy-only approval
- **SC-004**: `enqueueSupported` reflects table+wiring state accurately
- **SC-005**: Spec Kit artifacts (003 preserved, 004 complete) in PR

## Assumptions

- PR #187 daily brief merged to `main`
- Staff auth via existing `STAFF_PASSWORD` middleware
- Internal Browns Dullstroom ops only
- Staff-group WhatsApp post is manual (H11) — not API send
