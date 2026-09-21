# Implementation Plan: GuestFlow WiFi Source of Record

**Branch**: `cursor/guestflow-wifi-sor-9426` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-guestflow-wifi-sor/spec.md`

## Summary

Extend `property_access_codes` table with `code_type` values `wifi_network` and `wifi_password` so WiFi credentials become staff-editable SoR like gate/lockbox codes. Add WiFi edit rows to existing `/ops/access-codes` UI. All consumers (`resolveAccessCodes`, guest portal `stayPacket.wifi`, welcome-drafts, late-checkin packs) use DB-first resolution with optional env fallback (`WIFI_NETWORK`, `WIFI_PASSWORD`) ONLY when NO DB row exists. Fail-closed to `[ASK STAFF]` or `[WIFI]` placeholders. Audit trail in existing `access_code_audit_log`. Never invent credentials. Redact passwords in logs/tests/PR. Scope: per property (cottage, main-house); cottage v1 focus, main-house fields present but may be empty.

**Technical approach**:
- Extend existing `property_access_codes` table: new `code_type` enum values `wifi_network` and `wifi_password`
- Reuse `access_code_audit_log` table for WiFi credential change tracking
- Update `src/lib/access-codes.ts`: add WiFi resolution to `resolveAccessCodes()` function
- Update `src/app/ops/access-codes/page.tsx`: add WiFi network/password rows per property
- Update guest portal route: replace direct env var reads with `resolveAccessCodes()` call for `stayPacket.wifi`
- Update welcome-drafts and late-checkin template consumers to use WiFi from `resolveAccessCodes()`
- Tests first: SoR resolution paths (DB/env/placeholder), redaction enforcement
- No seed data with live credentials (leave empty or use placeholders until staff populates)

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: React 18.3, Next.js route handlers, `@libsql/client` 0.18, better-sqlite3 (local), Vitest 1.0, existing staff auth middleware

**Storage**: Turso (production) / local SQLite. Extend `property_access_codes` table with new `code_type` values. Reuse `access_code_audit_log` table (metadata only, no plaintext passwords). Turso at-rest encryption sufficient (same as access codes).

**Testing**: Vitest (`apps/guestflow` `npm test`) with mocked DB. Redaction tests in `__tests__/access-codes.test.ts` (extend existing suite).

**Target Platform**: Vercel production `https://guestflow.thebrowns.co.za`

**Project Type**: Web application (Next.js full-stack under `apps/guestflow`)

**Performance Goals**: Staff WiFi edit + save < 2s. Guest portal WiFi resolution < 500ms (same as access codes, cached after first load).

**Constraints**:
- NEVER invent WiFi credentials
- NEVER log/print plaintext WiFi passwords in server logs, tests, CI, PR body, console.log
- DB-first: if DB row exists for property+code_type, use it (even if empty); env fallback ONLY when NO DB row exists
- Staff auth required for `/ops/access-codes`
- Named env secrets only (`WIFI_NETWORK`, `WIFI_PASSWORD` as optional global fallback)
- Turso migrations idempotent (ALTER TABLE IF NOT EXISTS pattern)
- No production deploy / no apply migration without Grant `APPROVE APPLY MIGRATION`
- Reuse existing access-codes schema and UI patterns (consistency)
- Do NOT seed live WiFi from templates or env vars into DB (staff enters manually or CoS provides `/workspace/guestflow-wa-checkin-templates/WIFI-LIVE.txt`)

**Scale/Scope**: Single Browns Dullstroom tenant; 2 properties (cottage, main-house) × 2 code types (wifi_network, wifi_password) = 4 DB rows total. Staff edits are infrequent (quarterly or on ISP change).

## Constitution Check

*GATE: Must pass before implementation.*

**Constitution Status**: `.specify/memory/constitution.md` is an unfilled template. Skip constitution MUST checks; apply AGENTS.md + Grant scope hard gates.

**Hard gates**:
- Never invent WiFi credentials
- Never paste live passwords in chat/logs/tests/PR (use `[REDACTED]` or `****`)
- DB SoR with env fallback, fail-closed
- Staff UI edits only (no auto-rotation, no API-driven changes in this phase)
- Audit who changed what/when (metadata only, no passwords in audit log)
- Edit only files listed in work package (access-codes.ts, guest portal route, templates, staff UI)
- Reuse existing `property_access_codes` and `access_code_audit_log` tables (do NOT create new tables)

**Evaluation**: PASS (extends existing access-codes SoR pattern, tight scope)

## Project Structure

### Documentation (this feature)

```text
specs/012-guestflow-wifi-sor/
├── spec.md
├── plan.md              (this file)
├── data-model.md
├── tasks.md             (created by /speckit-tasks)
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── src/lib/access-codes.ts                  (UPDATE: add WiFi resolution)
├── src/lib/__tests__/access-codes.test.ts   (UPDATE: add WiFi tests)
├── src/lib/access-codes-schema.ts           (UPDATE: add WiFi types)
├── src/app/ops/access-codes/page.tsx        (UPDATE: add WiFi rows)
├── src/app/api/guest-portal/[code]/route.ts (UPDATE: use WiFi SoR)
├── src/app/api/welcome-drafts/route.ts      (UPDATE: use WiFi SoR)
├── src/lib/draft-jobs.ts                    (UPDATE: late-checkin WiFi SoR)
├── __tests__/guest-portal-wifi.test.ts      (NEW: integration tests)
└── docs/WIFI-SOR.md                         (NEW: documentation)
```

**Structure Decision**: Extend existing `apps/guestflow` access-codes module. No new files except tests and docs.

## Complexity Tracking

> No constitution violations. Complexity: LOW (extend existing SoR pattern, minimal new code). Risk areas: redaction enforcement, env fallback correctness, template variable consistency.

## Design Decisions

### 1. Extend property_access_codes vs new table

**Options considered**:
1. New `property_wifi_credentials` table → **Rejected**: duplicates schema, splits SoR pattern
2. **Extend `property_access_codes` with new `code_type` values** → **SELECTED**: DRY, reuses audit log, consistent UI
3. JSON column in properties table → **Rejected**: loses type safety, hard to query

**Rationale**: WiFi credentials are logically access codes. Reusing the same table and audit log maintains consistency and simplifies staff UI (single page for all access codes).

### 2. WiFi password redaction in UI

**Options considered**:
1. Always show plaintext (like network name) → **Rejected**: security risk if screen shared
2. **Masked by default with reveal toggle** → **SELECTED**: balance usability and security
3. Never show plaintext, only allow overwrite → **Rejected**: staff can't verify current value

**Rationale**: Masked by default with toggle matches industry standard (password managers, config UIs). Staff can reveal to verify or copy.

### 3. Env var fallback scope

**Options considered**:
1. Per-property env vars (`COTTAGE_WIFI_NETWORK`, `MAIN_HOUSE_WIFI_NETWORK`) → **Acceptable** if Grant already has them
2. **Global env vars (`WIFI_NETWORK`, `WIFI_PASSWORD`)** → **SELECTED for MVP**: simpler, matches current usage pattern
3. No env fallback, DB-only → **Rejected**: breaks existing deployments during migration

**Rationale**: Global env vars are simplest for MVP. Once DB is populated, env vars become unused (DB-first always wins).

### 4. Suite field for WiFi

**Options considered**:
1. Suite-specific WiFi (e.g., one network per cottage suite) → **Rejected**: out of scope, unlikely in practice
2. **Empty string suite for all WiFi codes** → **SELECTED**: WiFi is per-property, not per-suite
3. NULL suite → **Rejected**: empty string is consistent with gates

**Rationale**: WiFi is property-wide. Use `suite=''` (empty string) for consistency with gate codes.

### 5. Two code_type values vs single wifi with separate field

**Options considered**:
1. Single `code_type='wifi'` with two columns (`network`, `password`) → **Rejected**: breaks table normalization
2. **Two `code_type` values (`wifi_network`, `wifi_password`)** → **SELECTED**: maintains schema consistency
3. JSON field in code_value → **Rejected**: loses type safety, hard to query

**Rationale**: Each code_type represents one atomic value. Two rows per property (network + password) is cleaner and queryable.

## Implementation Phases

### Phase 1: Schema Extension + Migration

**Goal**: `property_access_codes` table accepts `wifi_network` and `wifi_password` code types

**Tasks**:
1. Update `src/lib/access-codes-schema.ts`:
   - Extend `code_type` enum: `'gate_pinpad' | 'lockbox' | 'wifi_network' | 'wifi_password'`
   - Update `ResolvedAccessCodes` interface: add `wifi: { network: string, password: string }`
2. Update database schema comment in `src/lib/db.ts` (or separate migration doc):
   - Document new `code_type` values
   - No ALTER TABLE needed (code_type is TEXT, any value allowed)
3. Write migration verification test: insert/select WiFi code_type rows

**Acceptance**: Can insert and query WiFi rows in `property_access_codes` with `code_type='wifi_network'` or `'wifi_password'`

### Phase 2: Core Resolution Logic + Tests

**Goal**: `resolveAccessCodes()` returns WiFi credentials via SoR resolution

**Tasks**:
1. Update `src/lib/access-codes.ts`:
   - Extend `resolveAccessCodes()` to query `wifi_network` and `wifi_password` for the property
   - Resolution logic: DB first, env fallback (`WIFI_NETWORK`, `WIFI_PASSWORD`) ONLY if NO DB row, placeholder if both empty
   - Return `wifi: { network: string, password: string }` in `ResolvedAccessCodes`
2. Update `src/lib/__tests__/access-codes.test.ts`:
   - Add suite: "WiFi SoR resolution"
   - Test DB row exists → returns DB value (even if empty → `[ASK STAFF]`)
   - Test NO DB row → returns env fallback
   - Test both empty → returns `[ASK STAFF]`
   - Test redaction: password fixtures use `[REDACTED]` or `****`
3. Add integration test: `__tests__/guest-portal-wifi.test.ts`

**Acceptance**: All WiFi resolution tests pass, no plaintext passwords in test output

### Phase 3: Staff UI Extension

**Goal**: Staff can view/edit WiFi network and password at `/ops/access-codes`

**Tasks**:
1. Update `src/app/ops/access-codes/page.tsx`:
   - Add WiFi section per property (after gate/lockbox codes)
   - Network name: text input (plaintext, always visible)
   - Password: password input (masked by default) with reveal toggle
   - Save button per WiFi credential (or single save per property)
   - Audit log already shows WiFi changes (code_type filter)
2. Update `src/app/api/ops/access-codes/upsert/route.ts` (if validation needed):
   - Allow `code_type='wifi_network'` and `'wifi_password'`
   - Validate non-empty after trim (same as other codes)
3. Test staff UI manually: edit WiFi, verify audit log entry

**Acceptance**: Staff can edit WiFi at `/ops/access-codes`, audit log records changes (metadata only, no passwords)

### Phase 4: Guest Portal Integration

**Goal**: Guest portal `stayPacket.wifi` uses DB-first resolution

**Tasks**:
1. Update `src/app/api/guest-portal/[code]/route.ts`:
   - Replace direct env var reads (`process.env.WIFI_NETWORK`, `process.env.WIFI_PASSWORD`) with:
     ```typescript
     const { wifi } = await resolveAccessCodes(db, tenantId, property, suite)
     ```
   - Return `wifi` in `stayPacket` response
   - Handle empty values: if `wifi.network === '[ASK STAFF]'`, UI shows placeholder message
2. Update guest portal frontend (if needed): display WiFi or placeholder message
3. Write `__tests__/guest-portal-wifi.test.ts`:
   - DB has WiFi → returned
   - NO DB row, env set → env returned
   - Both empty → placeholder returned

**Acceptance**: Guest portal uses WiFi SoR, tests pass

### Phase 5: Template Engine Integration

**Goal**: Welcome drafts and late-checkin packs use WiFi SoR

**Tasks**:
1. Update `src/app/api/welcome-drafts/route.ts`:
   - Replace hardcoded `process.env.WIFI_NETWORK` / `WIFI_PASSWORD` with `resolveAccessCodes()`
   - Template string: `WiFi Network: {{wifi.network}}\nPassword: {{wifi.password}}`
   - If values are `[ASK STAFF]`, template shows placeholder
2. Update `src/lib/draft-jobs.ts` (or late-checkin template logic):
   - Same WiFi SoR resolution
   - Ensure WiFi line only appears when credentials are available (not `[ASK STAFF]`)
3. Update `src/lib/ticket-playbooks.ts`:
   - Replace `wifiPassword: '[WIFI PASSWORD - ASK STAFF]'` with dynamic resolution
4. Write template tests for each consumer

**Acceptance**: Templates use WiFi SoR, never invent credentials, show placeholders when empty

### Phase 6: Documentation + PR Readiness

**Goal**: All docs updated, PR body safe, tests green

**Tasks**:
1. Write `docs/WIFI-SOR.md`:
   - How to edit WiFi as staff
   - Resolution flow diagram
   - Fallback behavior
   - Redaction rules
2. Update `.env.example`:
   - Add note: `WIFI_NETWORK` and `WIFI_PASSWORD` are optional fallback (DB-first)
3. Write PR description:
   - Use `[REDACTED]` or `****` for all WiFi password examples
   - Never paste live credentials
   - Link to spec + plan + quickstart
   - Acceptance checklist
4. Run full test suite, lint, build

**Acceptance**: All tests pass, PR body is password-safe, migrations documented

## Testing Strategy

### Unit Tests

- `src/lib/__tests__/access-codes.test.ts`: WiFi resolution logic (DB/env/fail-closed)
- `__tests__/guest-portal-wifi.test.ts`: Portal integration with WiFi SoR
- Template tests: Each WiFi consumer (welcome-drafts, late-checkin, playbooks)

### Integration Tests

- Staff UI E2E (optional, manual): Edit WiFi, save, verify guest portal shows new value
- Redaction audit: Grep test output for plaintext password patterns

### Manual Testing Checklist

See `quickstart.md` for step-by-step manual test scenarios

## Rollout Plan

1. **Merge design PR** (spec + plan + data-model + tasks) → wait for GFM acceptance
2. **Implement in same PR** (based on tight scope + reuses access-codes pattern)
3. **Local testing**: All unit + integration tests pass, no plaintext passwords in output
4. **Vercel Preview deploy**: Staff test WiFi edits, verify portal updates
5. **Staff populate DB**: Use UI to enter WiFi credentials per property (or wait for CoS to provide `WIFI-LIVE.txt`)
6. **Production deploy**: After Grant `APPROVE APPLY MIGRATION` (no actual migration, just verification)
7. **Monitor**: Check audit log for WiFi changes, verify fallback works if DB is empty

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Live passwords leak in logs/tests | HIGH | Strict redaction, grep CI, code review |
| DB query fails, portal breaks | MEDIUM | Env fallback + graceful degradation to `[ASK STAFF]` |
| Staff edit wrong password (typo) | MEDIUM | Audit log for rollback intel; future: confirmation dialog |
| Env fallback never triggers in prod | LOW | Test explicitly, document fallback path |
| Multiple staff edit same password | LOW | Last write wins, both changes logged |
| WiFi password revealed on shared screen | LOW | Masked by default, reveal toggle (staff responsibility) |

## Dependencies

- Existing `property_access_codes` and `access_code_audit_log` tables (from specs/010-access-codes-sor)
- Existing staff authentication middleware
- Existing guest portal magic token system
- Existing `resolveAccessCodes()` function in `src/lib/access-codes.ts`
- Existing staff UI at `/ops/access-codes`

## Done When

- [ ] Schema extended with `wifi_network` and `wifi_password` code_type values
- [ ] `src/lib/access-codes.ts` resolution logic returns WiFi credentials (DB first, env fallback, placeholder)
- [ ] Staff UI at `/ops/access-codes` allows editing WiFi network and password per property
- [ ] Guest portal `stayPacket.wifi` uses WiFi SoR (no direct env reads)
- [ ] Welcome-drafts and late-checkin templates use WiFi SoR
- [ ] All tests pass, no plaintext passwords in test output
- [ ] Documentation complete (`WIFI-SOR.md`, `.env.example` note)
- [ ] PR body uses `[REDACTED]` / `****`, no live passwords
- [ ] Grant approval for GFM design acceptance (or design+impl if green)
