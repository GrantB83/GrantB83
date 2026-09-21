# Feature Specification: GuestFlow WiFi Source of Record

**Feature Branch**: `cursor/guestflow-wifi-sor-9426`

**Created**: 2026-09-21

**Status**: Draft

**Input**: WiFi must be staff-editable Source of Record like gate/lockbox access codes — not env-only — because it may change per property (cottage vs main-house).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Staff Edit WiFi Credentials (Priority: P1)

Staff members need to edit WiFi network name and password per property (cottage, main-house) through the `/ops/access-codes` UI, just like they manage gate and lockbox codes. Changes should be audited (who changed what, when) and immediately available to guest-facing systems without requiring env var updates or deployments.

**Why this priority**: Core requirement. WiFi credentials change (ISP changes, security rotation), and staff must be able to update them immediately without waiting for developer intervention. This is the baseline SoR capability.

**Independent Test**: Can be fully tested by logging into `/ops/access-codes`, editing a WiFi network name or password for a property, verifying the audit log entry is created, and confirming the new credentials appear in the guest portal `stayPacket.wifi` API response.

**Acceptance Scenarios**:

1. **Given** staff member is logged into `/ops/access-codes`, **When** they update the cottage WiFi password, **Then** the new password is saved to the database, an audit log entry is created with their staff ID and timestamp, and the updated password appears immediately in guest portal API responses for cottage bookings
2. **Given** no WiFi credentials exist in the database for a property, **When** a consumer requests WiFi info, **Then** the system checks for env var fallback (`WIFI_NETWORK`, `WIFI_PASSWORD`) and only if both are empty, returns `[ASK STAFF]` or `[WIFI]` placeholder
3. **Given** WiFi credentials are stored as empty strings in the database for a property, **When** a consumer requests WiFi info, **Then** the system returns `[ASK STAFF]` placeholder (database empty value means staff explicitly cleared it, not "use env fallback")

---

### User Story 2 - Consumers Use WiFi SoR (Priority: P2)

All WiFi consumers (`resolveAccessCodes`, guest portal `stayPacket.wifi`, welcome-drafts, late-checkin packs) must retrieve WiFi credentials from the database SoR first, with optional env var fallback only when NO database row exists. This ensures a single source of truth and fail-closed behavior.

**Why this priority**: Without consumer integration, the staff UI is useless. This ensures the SoR pattern is enforced across all consumers.

**Independent Test**: Can be tested by setting WiFi credentials in the DB for cottage, leaving main-house DB rows empty but setting env vars, then verifying: (1) guest portal for cottage returns DB values, (2) guest portal for main-house returns env fallback, (3) if both are empty, placeholder is returned.

**Acceptance Scenarios**:

1. **Given** WiFi credentials exist in DB for a property, **When** guest portal fetches `stayPacket.wifi`, **Then** DB values are returned (env vars are ignored)
2. **Given** NO DB row exists for a property WiFi, **When** guest portal fetches `stayPacket.wifi`, **Then** system checks env vars (`WIFI_NETWORK`, `WIFI_PASSWORD`) as fallback
3. **Given** welcome-draft is generated for a cottage booking, **When** the draft includes WiFi line, **Then** it uses the resolved WiFi credentials per the SoR resolution flow (DB first, env fallback, placeholder if empty)
4. **Given** late-checkin pack is generated, **When** the pack mentions WiFi, **Then** it uses the same SoR resolution flow

---

### User Story 3 - Secure Audit Trail (Priority: P3)

All WiFi credential changes must be logged in `access_code_audit_log` table (reuse existing audit table) with property, code_type (e.g., `wifi_network` or `wifi_password`), suite (always empty for WiFi), changed_at, and changed_by. Plaintext WiFi passwords must never appear in logs, PR bodies, commit messages, test output, or comments.

**Why this priority**: Security and compliance. Audit trail is required to track who changed what, and redaction prevents accidental exposure of live credentials.

**Independent Test**: Can be tested by updating WiFi credentials, querying the audit log API endpoint, verifying metadata is present (property, timestamp, staff ID) but plaintext passwords are redacted, and confirming test outputs never log actual passwords (only `****` or `[REDACTED]`).

**Acceptance Scenarios**:

1. **Given** staff updates a WiFi password, **When** audit log is queried, **Then** an entry exists with property, code_type, changed_at, changed_by, but the actual password value is NOT logged
2. **Given** tests run that exercise WiFi upsert logic, **When** test output is reviewed, **Then** plaintext passwords are replaced with `****` or `[REDACTED]`
3. **Given** PR is opened with WiFi SoR changes, **When** PR body and commit messages are reviewed, **Then** no live WiFi credentials are present

---

### Edge Cases

- What happens when a property has no WiFi credentials in DB and no env vars set? → Return `[ASK STAFF]` or `[WIFI]` placeholder (fail-closed)
- What happens when DB row exists but `code_value` is empty string? → Return `[ASK STAFF]` (empty DB row means staff cleared it, not "use env fallback")
- What happens when DB query fails? → Log error, fall back to env vars if available, otherwise placeholder
- What happens when staff tries to save an empty WiFi credential? → Validation error: "Code value cannot be empty" (same as access codes)
- What happens when multiple properties have different WiFi networks? → Each property (cottage, main-house) has separate DB rows per code_type (wifi_network, wifi_password)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST extend `property_access_codes` table with `code_type` values `wifi_network` and `wifi_password` (or create sibling table if cleaner), per property (`cottage` | `main-house`), using `suite TEXT NOT NULL DEFAULT ''` (empty string, same pattern as gate_pinpad). UNIQUE constraint: (tenant_id, property, code_type, suite).
- **FR-002**: Staff UI at `/ops/access-codes` MUST allow editing and viewing WiFi network name and password per property, alongside existing gate/lockbox codes. UI must show current values (redacted for passwords, e.g., `****`) and allow updates.
- **FR-003**: System MUST audit all WiFi credential changes in `access_code_audit_log` table (reuse existing table) with property, code_type, suite (always empty for WiFi), action ('update'), changed_at, and changed_by. Plaintext passwords MUST NOT be logged.
- **FR-004**: `resolveAccessCodes` function MUST be extended to return WiFi credentials via SoR resolution: (1) query DB for property+code_type, (2) if DB row exists, use `code_value` (even if empty → `[ASK STAFF]`), (3) if NO DB row exists, check env vars (`WIFI_NETWORK`, `WIFI_PASSWORD`) as fallback, (4) if both empty, return placeholder `[ASK STAFF]` or `[WIFI]`.
- **FR-005**: Guest portal API (`/api/guest-portal/[code]/route.ts`) MUST use `resolveAccessCodes` for `stayPacket.wifi` instead of reading env vars directly. Env vars should only serve as optional fallback when NO DB row exists.
- **FR-006**: Welcome-drafts WiFi line MUST use the same SoR resolution flow. If WiFi credentials are empty after resolution, output must show `[ASK STAFF]` or `[WIFI]` placeholder.
- **FR-007**: Late-checkin packs that mention WiFi MUST use the same SoR resolution flow. If WiFi credentials are empty after resolution, output must show `[ASK STAFF]` or `[WIFI]` placeholder.
- **FR-008**: System MUST redact plaintext WiFi passwords in all logs, PR bodies, commit messages, test outputs, and code comments. Use `****` or `[REDACTED]` for display/testing.
- **FR-009**: Database migrations MUST be Turso-safe (idempotent `CREATE TABLE IF NOT EXISTS`, no `TRUNCATE`). Runtime schema enforcement should be added to `db.ts` or access-codes initialization path.
- **FR-010**: Seed data MUST NOT invent live WiFi credentials. Leave WiFi fields empty or skip seed entirely until CoS provides `/workspace/guestflow-wa-checkin-templates/WIFI-LIVE.txt` or Grant enters credentials via UI. If seed is created, use `[REDACTED]` or `[DEMO WIFI]` placeholders only.

### Key Entities

- **PropertyAccessCode** (extended): Existing table with new `code_type` values `wifi_network` and `wifi_password`. Each property (cottage, main-house) has two rows: one for network name, one for password. `suite` is always empty string for WiFi (no suite-specific WiFi at this time).
- **AccessCodeAuditLog** (reused): Existing audit table logs all WiFi credential changes. Metadata only (property, code_type, suite, changed_at, changed_by), no plaintext passwords.
- **ResolvedAccessCodes** (extended): Return type from `resolveAccessCodes` function. Existing fields: `gateCode`, `doorCode`, `lockboxCode?`. New fields: `wifi: { network: string, password: string }` with SoR resolution values (DB first, env fallback, placeholder if empty).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can edit WiFi credentials via `/ops/access-codes` UI without requiring developer intervention or deployment. Changes are immediately reflected in guest portal API responses (< 1 second).
- **SC-002**: All WiFi consumers (guest portal, welcome-drafts, late-checkin packs) use database SoR as primary source, with env var fallback only when NO DB row exists. No hardcoded WiFi credentials remain in codebase.
- **SC-003**: Audit log captures 100% of WiFi credential changes with staff ID, timestamp, and property/code_type metadata. Plaintext passwords are never logged or exposed in test output.
- **SC-004**: System fails closed when WiFi credentials are unavailable (empty DB, no env fallback). Returns `[ASK STAFF]` or `[WIFI]` placeholder instead of inventing values or breaking.
- **SC-005**: Unit tests for `resolveAccessCodes` cover all SoR resolution paths: (1) DB value exists → use it, (2) DB row empty → placeholder, (3) NO DB row → env fallback, (4) both empty → placeholder. Tests redact passwords (use `[REDACTED]` or `****`).

## Assumptions

- WiFi credentials are per property (cottage, main-house), not per suite. Cottage v1 focus, but main-house fields/UI rows are created (even if empty) for future use.
- Env vars (`WIFI_NETWORK`, `WIFI_PASSWORD`) are global fallback only, not property-specific. If property-specific env vars are needed later, they can be added (e.g., `COTTAGE_WIFI_NETWORK`), but SoR should be preferred.
- Staff UI at `/ops/access-codes` already exists and supports gate/lockbox code editing. WiFi credentials will be added to the same UI (same table, similar UX).
- `access_code_audit_log` table is reused for WiFi audit trail. No new audit table is created.
- No auto-send WhatsApp/email on WiFi credential changes. Staff must manually trigger sends or rely on scheduled flows (out of scope).
- Zandile and +2783 numbers (staff contacts) are not changed by this feature (out of scope).
- Dashboard UI simplifications (#206) are separate and out of scope for this PR.
- Main House full WhatsApp template port is out of scope (Cottage v1 focus).
