# Feature Specification: Access Codes Source of Record

**Feature Branch**: `cursor/access-codes-sor-8dcd`

**Created**: 2026-09-20

**Status**: Ready for planning

**Input**: Grant CLEAR (20 Sep 2026) for GuestFlow Access Codes SoR. Move property access codes (gate pinpads + lockbox) from env vars to database. Staff UI edits currently active codes (arbitrary changes allowed). Late-check-in, welcome templates, guest portal, and outlier playbooks read DB SoR with env `PROPERTY_*` fallback only if DB empty → else fail-closed `[ASK STAFF]` / hide. Never invent codes. Never paste live codes in chat/logs/tests (use REDACTED/****). Audit trail for who changed what/when. Scope: 2 gate pinpads (Cottage entrance = 278 Blue Crane; Main house entrance = 279 Blue Crane) + lockbox codes (one active code per room/suite at each property).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff manage active access codes through UI (Priority: P1)

Staff open the Access Codes management page at `/ops/access-codes`, view current codes for gates and lockboxes grouped by property, edit any code, save, and see the change reflected immediately. The system records who made the change and when. Live codes never appear in server logs, CI output, PR descriptions, chat messages, test fixtures, or console.log statements (authorized API responses over HTTPS may contain plaintext codes for edit/display).

**Why this priority**: Today codes live in env vars. Changing a compromised lockbox code requires a Vercel deploy. This is the ritual the package removes: "emergency deploy to rotate a code."

**Independent Test**: Log in as staff, navigate to `/ops/access-codes`, change a gate code, save, and confirm the new code is stored with a change log entry. Verify server logs never print the actual code. Attempt to view codes as a guest outside time-gate and confirm they see `[ASK STAFF]` placeholder.

**Acceptance Scenarios**:

1. **Given** staff are authenticated, **When** they open `/ops/access-codes`, **Then** they see all properties with their gate and lockbox codes grouped clearly, and each code shows last-updated timestamp and staff name
2. **Given** staff edit a gate code for Cottage entrance (278 Blue Crane), **When** they save, **Then** the new code is stored in the database with `suite=''` (empty string sentinel for gates), a change log entry records their staff ID and timestamp, and the portal immediately uses the new code for time-gated display
3. **Given** staff edit a lockbox code for a specific room (e.g., Main House Suite 2), **When** they save, **Then** the system validates the code is not empty, stores it with the exact suite string that matches booking data, and logs the change
4. **Given** a staff member is reviewing change history, **When** they view the audit log, **Then** each entry shows property, code type (gate/lockbox), suite, staff name, and ISO timestamp (actual code values are not stored in audit log)
5. **Given** staff are editing codes at `/ops/access-codes`, **When** the authorized API response returns code values over HTTPS, **Then** this is expected behavior for edit/display, but server logs, CI output, and console.log statements never print actual code values

---

### User Story 2 - Guest portal reads codes from DB with safe fallback (Priority: P1)

When a guest within the time-gate window (24h before check-in through checkout) views their portal, the system attempts to read gate and lockbox codes from the database for that specific property+type+suite. If a DB row exists for that key, it is used (even if code_value is empty → `[ASK STAFF]`). If NO DB row exists for that key, the system falls back to env vars `PROPERTY_GATE_CODE` / `PROPERTY_DOOR_CODE` (global fallback for migration continuity only, not per-property). If both are empty, the portal displays `[ASK STAFF]` placeholder and never invents a code. Env vars do not bleed across properties once DB rows exist.

**Why this priority**: Portal must never show an invented or stale code. DB-first with env fallback preserves continuity during migration while preventing silent failures.

**Independent Test**: Set a gate code in DB, clear env var, refresh portal within time-gate → see DB code. Clear DB code, set env var, refresh → see env code. Clear both, refresh → see `[ASK STAFF]`. Set check-in to tomorrow, refresh → see time-gate message (codes hidden).

**Acceptance Scenarios**:

1. **Given** a booking within the time-gate window and a gate code DB row exists for that property, **When** the guest views their portal, **Then** the DB code_value is displayed and env var is ignored (even if code_value is empty → `[ASK STAFF]`)
2. **Given** a booking within the time-gate window and NO DB row exists for that property+gate, **When** the guest views their portal, **Then** the global `PROPERTY_GATE_CODE` env var is used as fallback (migration continuity)
3. **Given** a booking within the time-gate window and NO DB row exists and env var is empty, **When** the guest views their portal, **Then** the access codes section shows `[ASK STAFF]` placeholder with a message to contact staff
4. **Given** a booking outside the time-gate window (more than 24h before check-in or after checkout), **When** the guest views their portal, **Then** access codes section shows standard time-gate message "Access codes will be available 24 hours before your check-in date"
5. **Given** a room/suite has a lockbox code in DB, **When** the guest portal loads that booking, **Then** the lockbox code for their specific suite is displayed (suite string must exactly match booking.room or booking.suite field)

---

### User Story 3 - Templates and playbooks read DB codes with safe fallback (Priority: P1)

Late-check-in message templates, welcome message generator, and outlier ticket playbooks that reference `{{gateCode}}` or `{{doorCode}}` variables resolve these from the database first, then env vars, then fail to `[ASK STAFF]` placeholder. Never invent codes. Never populate templates with empty strings that look like valid codes.

**Why this priority**: WhatsApp late-check-in and welcome drafts must not send a guest an invented or blank code. Failing closed to `[ASK STAFF]` forces human review when codes are missing.

**Independent Test**: Generate a welcome draft with DB code set → see DB code in `{{gateCode}}` replacement. Clear DB, set env → see env code. Clear both → see `[ASK STAFF]` in draft body. Never see an empty replacement or a fabricated number.

**Acceptance Scenarios**:

1. **Given** a late-check-in draft is being generated and gate code exists in DB, **When** the template is populated, **Then** `{{gateCode}}` resolves to the DB value
2. **Given** a welcome draft is being generated and DB is empty but env var is set, **When** the template is populated, **Then** `{{gateCode}}` resolves to the env var as fallback
3. **Given** an outlier playbook ticket draft includes `{{doorCode}}` and both DB and env are empty, **When** the draft is generated, **Then** `{{doorCode}}` is replaced with `[ASK STAFF]` and the draft is marked for human review (not auto-sent)
4. **Given** multiple properties exist in the system, **When** a template is generated for a specific property, **Then** only that property's codes are resolved (never codes from another property)
5. **Given** a template references a lockbox code variable and the booking's suite has a code in DB, **When** the template is populated, **Then** the suite-specific lockbox code is used

---

### User Story 4 - Audit trail records all code changes (Priority: P2)

Every change to a gate or lockbox code is recorded in an audit log with property identifier, code type, changed-at timestamp, and staff identifier. Staff can view recent changes (last 90 days by default) in the access codes management UI. Actual old/new code values are not displayed in the audit UI for security, only redacted indicators that a change occurred.

**Why this priority**: When a code is compromised, staff need to know when it was last changed and by whom to assess exposure window and coordinate with property management.

**Independent Test**: Change a gate code as Staff A, then change it again as Staff B. View audit log and confirm two entries exist with correct timestamps and staff names. Verify actual code values are redacted in the audit display.

**Acceptance Scenarios**:

1. **Given** staff change a gate code, **When** the change is saved, **Then** an audit log entry is created with property, code type (gate_pinpad), changed_at timestamp, and staff ID
2. **Given** staff change a lockbox code for a specific suite, **When** the change is saved, **Then** the audit entry includes suite identifier
3. **Given** staff view the audit log, **When** the log is displayed, **Then** entries show property name, code type, suite (if applicable), staff name, and timestamp in descending order (most recent first)
4. **Given** a staff member attempts to view the audit log UI, **When** the page loads, **Then** actual code values are never displayed (shown as `[REDACTED]` or `****`), only metadata about the change
5. **Given** the audit log exceeds 90 days of history, **When** staff view recent changes, **Then** the default view shows last 90 days, with option to expand to older entries if needed

---

### Edge Cases

- Staff attempt to save an empty gate code → system refuses and requires non-empty value
- Staff attempt to save a code that is only whitespace → system trims and treats as empty, refuses
- Guest portal load fails to reach DB → falls back to env var gracefully without error log spam
- Template generation occurs during DB query timeout → falls back to env (if no DB row exists), then `[ASK STAFF]`
- Multiple staff edit the same code simultaneously → last write wins, both changes are logged with correct timestamps
- Access codes page is opened by staff without sufficient permissions → redirect to login or show access denied
- Browser autofill attempts to save access code passwords → form inputs are marked to prevent autofill
- Guest attempts to directly access `/ops/access-codes` URL → authentication middleware redirects to guest portal or login
- Lockbox code for a suite is edited but that suite has no current bookings → change is still logged, affects future bookings
- Property has no lockbox codes configured → staff UI shows empty state with "Add lockbox code" prompt
- Staff add a new suite lockbox code → suite string must be manually entered (not hardcoded dropdown of Suite 1/2/3), free-text to match booking data exactly
- Cottage has DB gate row but main-house does not → cottage uses DB, main-house falls back to global env var (no cross-property bleed)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store property access codes in a dedicated `property_access_codes` table with columns for property identifier, code type (gate_pinpad or lockbox), suite identifier (empty string `''` for gates, actual suite name for lockboxes), code value (encrypted at rest), last updated timestamp, and last updated by staff ID, with UNIQUE constraint on (tenant, property, code_type, suite) enforced by empty-string sentinel for gates OR partial unique index
- **FR-002**: System MUST provide a staff-only UI route at `/ops/access-codes` to view and edit all access codes, grouped by property and code type
- **FR-003**: Staff UI MUST validate that code values are non-empty and trimmed before saving, and MUST reject empty or whitespace-only codes
- **FR-004**: System MUST log every code change to an `access_code_audit_log` table with property, code type, suite (nullable), changed_at timestamp, and staff ID, without storing actual old/new code values in the audit table
- **FR-005**: Staff UI MUST display change history for the last 90 days by default, showing property, code type, suite, staff name, and timestamp, with actual code values redacted as `[REDACTED]` or `****`
- **FR-006**: Guest portal API route (`/api/guest-portal/[code]`) MUST read access codes from DB first for the specific property+type+suite key; if a DB row exists, use its code_value (even if empty → `[ASK STAFF]`); if NO DB row exists for that key, fall back to global env vars `PROPERTY_GATE_CODE` / `PROPERTY_DOOR_CODE` (migration continuity only); env vars MUST NOT bleed across properties once DB rows exist for those properties
- **FR-007**: Guest portal MUST NEVER invent, generate, or fabricate access codes when DB and env are both empty
- **FR-008**: Template engines for late-check-in, welcome drafts, and outlier playbooks MUST resolve `{{gateCode}}` and `{{doorCode}}` variables using the same DB-first, env-fallback, fail-to-`[ASK STAFF]` logic
- **FR-009**: System MUST scope codes by property and suite (for lockboxes), ensuring templates and portal only use codes matching the booking's property and suite
- **FR-010**: System MUST enforce time-gating for guest portal access codes display (24h before check-in through checkout); outside this window, codes are hidden with standard time-gate message
- **FR-011**: System MUST redact actual code values in server logs, CI output, PR descriptions, chat messages, test fixtures, and console.log statements; authorized staff edit API responses and time-gated guest portal API responses over HTTPS MAY return plaintext codes as required for edit/display functionality
- **FR-012**: System MUST prevent browser autofill for access code input fields using appropriate HTML attributes
- **FR-013**: `/ops/access-codes` route MUST require authenticated staff session; guest tokens or unauthenticated access MUST be denied
- **FR-014**: System MUST support two gate pinpads (Cottage entrance = 278 Blue Crane; Main house entrance = 279 Blue Crane) and lockbox codes (one active code per room/suite at each property)
- **FR-015**: Lockbox codes MUST be suite-specific, allowing different codes for different rooms/suites at the same property; suite field is free-text staff-entered (not hardcoded dropdown) and must exactly match booking.room or booking.suite strings
- **FR-016**: System MUST handle DB query failures gracefully, falling back to env vars without exposing error details to guests
- **FR-017**: Existing env vars `PROPERTY_GATE_CODE` and `PROPERTY_DOOR_CODE` MUST continue to function as fallback during and after migration
- **FR-018**: Seed data script or initial migration MUST NOT blindly insert the same `PROPERTY_GATE_CODE` env var into both cottage and main-house gate rows; prefer empty tables with staff manual entry, or explicit per-property env vars (e.g., `COTTAGE_GATE_CODE`, `MAIN_HOUSE_GATE_CODE`) if seeding is approved
- **FR-019**: System MUST never log, print, or display live access codes in server logs, test fixtures, automated test output, CI logs, PR descriptions, chat messages, or console.log statements (authorized API responses over HTTPS for edit/display are exempt)
- **FR-020**: Documentation MUST instruct operators to use `REDACTED` or `****` in all examples, PRs, and commit messages

### Key Entities

- **Property access code**: DB record for a gate pinpad or lockbox code, scoped to property and optionally to suite
- **Gate pinpad**: Two physical entry points (Cottage entrance, Main house entrance) each with their own code
- **Lockbox code**: Suite-specific code for key lockboxes, one active code per room/suite
- **Access code audit log**: Immutable log entry recording when a code was changed, by whom, with metadata only (no actual codes stored)
- **Code type**: Enumeration of `gate_pinpad` or `lockbox`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can change a gate or lockbox code from the UI and see the change reflected in guest portal within 5 seconds (no Vercel deploy required)
- **SC-002**: 100% of guest portal access code displays resolve from DB when codes exist in DB (env vars are ignored when DB has data)
- **SC-003**: 100% of template generations (late-check-in, welcome, playbooks) that reference access code variables use DB-first resolution with `[ASK STAFF]` fallback when both DB and env are empty
- **SC-004**: Zero live access codes appear in server logs, test fixtures, CI logs, PR descriptions, chat messages, or console.log statements (all examples use `REDACTED` or `****`; authorized API responses over HTTPS may contain plaintext for edit/display)
- **SC-005**: Every code change has a corresponding audit log entry with correct timestamp and staff identifier
- **SC-006**: Staff can view change history for the last 90 days without seeing actual code values (redacted display)
- **SC-007**: System handles DB unavailability gracefully, falling back to env vars without guest-facing errors
- **SC-008**: This package names and reduces the ritual "emergency Vercel deploy to rotate compromised code" to "staff edit in UI, save, done"

## Assumptions

- Grant CLEAR 20 Sep 2026 applies: Design-first PR for GFM acceptance; implement staff UI + migrations in same PR only if scoped tightly and tests green
- Existing Turso DB migration pattern from Phase 0 is reused
- Staff authentication is already implemented (staff cookie/session from earlier phases)
- Guest portal magic token system from Phase 0 is in place and enforces time-gating
- Property identifiers match existing `tenant` or `property` fields in GuestFlow schema
- Suite identifiers can be derived from booking room/suite metadata
- Env vars `PROPERTY_GATE_CODE` and `PROPERTY_DOOR_CODE` remain set in production for fallback continuity
- Encryption at rest for code values uses Turso's built-in encryption or app-level encryption if required
- Access code values are short alphanumeric strings (typically 4-6 digits) suitable for pinpad/lockbox entry
- Initial seed can be performed manually by staff after migration or via a one-time seed script with explicit approval
- Audit log retention policy is 90 days visible by default, with longer retention in DB for compliance (exact retention Grant will specify if needed)
- No integration with physical pinpad APIs (staff manually enter codes into hardware after changing in UI)

## Out of Scope

- Auto-send of welcome messages with access codes (still requires human approval per Phase 0)
- Gmail Contacts integration
- Syncing codes to third-party property management systems (NightsBridge, etc.)
- Physical pinpad hardware integration or API control
- Real-time notifications to staff when codes are changed by another staff member
- Role-based access control for who can edit codes (all authenticated staff can edit in this phase)
- Lockbox code rotation reminders or scheduled expiration
- Integration with smart lock systems or IoT devices
- Bulk import of codes via CSV
- Version history with ability to revert to previous codes
