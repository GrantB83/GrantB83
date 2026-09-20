# Implementation Plan: Access Codes Source of Record

**Branch**: `cursor/access-codes-sor-8dcd` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-access-codes-sor/spec.md`

## Summary

Move property access codes (gate pinpads + lockbox) from env vars to database SoR. Add staff UI at `/staff/access-codes` to view/edit codes grouped by property. Audit trail logs who changed what/when (metadata only, no actual codes). Guest portal, templates, and playbooks read DB-first with env fallback, fail-closed to `[ASK STAFF]` if both empty. Never invent codes. Redact live codes in console/logs/tests. Scope: 2 gate pinpads (Cottage = 278 Blue Crane, Main = 279 Blue Crane) + lockbox codes (one per suite per property).

**Technical approach**:
- New tables: `property_access_codes` (suite='' empty string for gates), `access_code_audit_log`
- Idempotent migration script: `scripts/migrate-access-codes-sor.js`
- Staff UI: Next.js App Router page at `src/app/ops/access-codes/page.tsx`
- API routes: `POST /api/ops/access-codes/upsert`, `GET /api/ops/access-codes/audit`
- Lib: `src/lib/access-codes.ts` for DB-first resolution logic (per property+type+suite, env fallback ONLY when NO DB row)
- Update guest portal route to use new resolution
- Update template engines (welcome drafts, late-check-in, playbooks) to use new resolution
- Tests first on resolution logic (DB row exists / NO row exists + env / fail-closed / redaction)

## Technical Context

**Language/Version**: TypeScript 5.5, Next.js 14.2 App Router

**Primary Dependencies**: React 18.3, Next.js route handlers, `@libsql/client` 0.18, better-sqlite3 (local), Vitest 1.0, existing staff auth middleware

**Storage**: Turso (production) / local SQLite. New tables `property_access_codes` (suite NOT NULL, empty string '' for gates to avoid UNIQUE+NULL issue), `access_code_audit_log`. Code values stored with app-level encryption (simple XOR or AES if required) or rely on Turso at-rest encryption.

**Testing**: Vitest (`apps/guestflow` `npm test`) with mocked DB. Redaction tests in `__tests__/access-codes.test.ts`.

**Target Platform**: Vercel production `https://guestflow.thebrowns.co.za`

**Project Type**: Web application (Next.js full-stack under `apps/guestflow`)

**Performance Goals**: Staff code edit + save < 2s. Guest portal code resolution < 500ms (cached after first load).

**Constraints**:
- NEVER invent codes
- NEVER log/print live codes in server logs, tests, CI, PR body, console.log (authorized API responses over HTTPS may contain plaintext for edit/display)
- DB-first: if DB row exists for property+type+suite, use it (even if empty); env fallback ONLY when NO DB row exists
- Staff auth required for `/ops/access-codes`
- Time-gate still applies (24h before check-in through checkout)
- Named env secrets only
- Turso migrations one statement at a time
- No production deploy / no apply migration without Grant `APPROVE APPLY MIGRATION`
- Suite field free-text staff-entered (not hardcoded Suite 1/2/3 only)
- Do NOT seed same env var into both cottage and main-house gates

**Scale/Scope**: Single Browns Dullstroom tenant; 2 gate pinpads + ~5-10 lockbox codes (one per suite); staff edits are infrequent (weekly at most, typically monthly or on-demand)

## Constitution Check

*GATE: Must pass before implementation.*

**Constitution Status**: `.specify/memory/constitution.md` is an unfilled template. Skip constitution MUST checks; apply AGENTS.md + Grant scope hard gates.

**Hard gates**:
- Never invent codes
- Never paste live codes in chat/logs/tests (use REDACTED/****)
- DB SoR with env fallback, fail-closed
- Staff UI edits only (no auto-rotation, no API-driven changes in this phase)
- Audit who changed what/when
- Edit only files listed in work package

**Evaluation**: PASS (design-first PR, tight scope)

## Project Structure

### Documentation (this feature)

```text
specs/010-access-codes-sor/
├── spec.md
├── plan.md
├── data-model.md
├── tasks.md
├── quickstart.md
├── contracts/
│   ├── api-staff-access-codes-upsert.md
│   ├── api-staff-access-codes-audit.md
│   └── resolution-logic.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
apps/guestflow/
├── scripts/migrate-access-codes-sor.js
├── src/lib/access-codes.ts
├── src/lib/__tests__/access-codes.test.ts
├── src/app/ops/access-codes/
│   ├── page.tsx
│   └── AccessCodesManager.tsx (client component)
├── src/app/api/ops/access-codes/
│   ├── upsert/route.ts
│   └── audit/route.ts
├── src/app/api/guest-portal/[code]/route.ts  (UPDATE)
├── src/lib/ticket-playbooks.ts  (UPDATE)
├── src/app/api/welcome-drafts/route.ts  (UPDATE)
├── __tests__/access-codes-resolution.test.ts
├── __tests__/access-codes-audit.test.ts
├── __tests__/guest-portal-codes.test.ts
└── docs/ACCESS-CODES-SOR.md
```

**Structure Decision**: Extend existing `apps/guestflow` Next.js app. No new package.

## Complexity Tracking

> No constitution violations. Complexity: LOW (CRUD + resolution logic + audit log). Risk areas: redaction enforcement, env fallback correctness, time-gate interaction.

## Design Decisions

### 1. DB-first resolution with env fallback

**Options considered**:
1. DB only, remove env vars entirely → **Rejected**: breaks existing deployments during migration
2. Env only, no DB → **Rejected**: defeats SoR goal, still requires deploy for code changes
3. **DB-first with env fallback** → **SELECTED**: smooth migration, backward compatible, fail-safe

**Rationale**: Allows gradual migration. Staff can populate DB codes over time. Env vars remain as safety net.

### 2. Code storage: encrypted at rest

**Options considered**:
1. Plain text in DB → **Rejected**: unnecessary exposure risk
2. App-level encryption (AES-256 or simple XOR with env key) → **Acceptable**
3. Rely on Turso at-rest encryption only → **SELECTED for MVP**: simpler, sufficient for this threat model

**Rationale**: Turso provides at-rest encryption. App-level encryption adds complexity for marginal gain (codes are already time-gated and staff-only). If Grant requires app-level, use `crypto` module with `ENCRYPTION_KEY` env var.

### 3. Audit log: metadata only, no code values

**Options considered**:
1. Store old/new code values in audit log → **Rejected**: doubles exposure surface
2. Store hashed codes → **Rejected**: unnecessary complexity, hashes are still sensitive
3. **Metadata only (property, type, timestamp, staff)** → **SELECTED**: sufficient for "who changed when" without storing secrets

**Rationale**: Audit purpose is accountability, not recovery. Staff can't revert to old codes from UI, so storing values adds risk without benefit.

### 4. Staff UI: single-page manager vs separate edit modals

**Options considered**:
1. List view with separate edit page per code → **Rejected**: too many clicks for small dataset
2. **Inline edit table** → **SELECTED**: faster workflow, all codes visible at once
3. Tabbed interface (one tab per property) → **Acceptable alternative**

**Rationale**: Inline edit in a single table is fastest for ~10 codes. Group by property for clarity.

### 5. Lockbox code scope: per-suite vs per-property

**Options considered**:
1. One lockbox code per property (all suites share) → **Rejected**: Grant scope specifies "one per suite"
2. **One lockbox code per suite** → **SELECTED**: matches Grant scope
3. Multiple lockboxes per suite → **Rejected**: out of scope

**Rationale**: Grant scope explicitly states "one active code per room/suite at each property."

### 6. Template variable resolution: inject helper vs modify each template callsite

**Options considered**:
1. Update every template string manually → **Rejected**: error-prone, hard to audit
2. **Centralized resolution helper** (`resolveAccessCodeVars(template, property, suite)`) → **SELECTED**: DRY, single point of truth
3. Pre-populate context object → **Acceptable**: similar outcome

**Rationale**: Helper function ensures consistent DB-first logic across all templates.

## Implementation Phases

### Phase 1: DB Schema + Migration (Prerequisite)

**Goal**: Turso tables exist, migration is idempotent, seed script ready

**Tasks**:
1. Write `scripts/migrate-access-codes-sor.js`
   - Create `property_access_codes` table
   - Create `access_code_audit_log` table
   - Idempotent (check table exists before create)
2. Update `src/lib/phase0-schema.ts` or create `src/lib/access-codes-schema.ts` with type definitions
3. Write seed script (optional) to populate from env vars with `APPROVE SEED FROM ENV`

**Acceptance**: `npm run migrate:local` succeeds, tables exist in `.guestflow.db`

### Phase 2: Core Resolution Logic + Tests

**Goal**: `resolveAccessCodes()` function works, tests cover all paths, redaction enforced

**Tasks**:
1. Create `src/lib/access-codes.ts` with:
   - `getAccessCode(property: string, type: 'gate_pinpad' | 'lockbox', suite?: string)`
   - `resolveAccessCodes(property: string, suite?: string)` → returns `{ gateCode, doorCode }` or `[ASK STAFF]`
   - DB query → env fallback → fail-closed logic
2. Write `src/lib/__tests__/access-codes.test.ts`:
   - DB has code → returns DB value
   - DB empty, env set → returns env value
   - Both empty → returns `[ASK STAFF]`
   - Multiple properties → correct scope
   - Suite-specific lockbox → returns only that suite's code
   - Redaction: ensure test fixtures never print live codes
3. Write `__tests__/access-codes-resolution.test.ts` for integration

**Acceptance**: All resolution tests pass, no live codes in test output

### Phase 3: Staff UI + API Routes

**Goal**: Staff can view and edit codes at `/ops/access-codes`, audit log populates

**Tasks**:
1. Create `src/app/ops/access-codes/page.tsx` (server component, staff auth check)
2. Create `src/app/ops/access-codes/AccessCodesManager.tsx` (client component):
   - Fetch codes on mount
   - Group by property
   - Inline edit (text inputs, masked by default with toggle to reveal)
   - Save button per row
   - Audit log section (last 90 days, metadata only)
   - Suite field free-text input for lockboxes (not hardcoded dropdown)
3. Create `src/app/api/ops/access-codes/upsert/route.ts`:
   - POST with `{ property, type, suite, code }`
   - Validate non-empty, trimmed
   - Upsert code (suite='' for gates, actual name for lockboxes)
   - Insert audit log entry (property, type, suite, changed_at, staff_id)
4. Create `src/app/api/ops/access-codes/audit/route.ts`:
   - GET audit log, last 90 days
   - Metadata only (no code values in response)
5. Write `__tests__/access-codes-audit.test.ts`

**Acceptance**: Staff can edit codes at `/ops/access-codes`, audit log records changes, metadata only

### Phase 4: Guest Portal Integration

**Goal**: Portal uses DB-first resolution, time-gate still enforced

**Tasks**:
1. Update `src/app/api/guest-portal/[code]/route.ts`:
   - Replace `process.env.PROPERTY_GATE_CODE` direct read with `resolveAccessCodes(property, suite)`
   - Time-gate logic unchanged (still `shouldShowAccessCodes()`)
2. Write `__tests__/guest-portal-codes.test.ts`:
   - Within time-gate, DB code → shown
   - Within time-gate, env fallback → shown
   - Within time-gate, both empty → `[ASK STAFF]`
   - Outside time-gate → hidden (standard message)

**Acceptance**: Guest portal tests pass, redaction enforced

### Phase 5: Template Engine Integration

**Goal**: Welcome drafts, late-check-in, playbooks use DB-first resolution

**Tasks**:
1. Update `src/app/api/welcome-drafts/route.ts`:
   - Replace hardcoded env reads with `resolveAccessCodes(property, suite)`
   - Template string replace `{{gateCode}}` and `{{doorCode}}`
2. Update `src/lib/ticket-playbooks.ts`:
   - Replace `gateCode: '[GATE CODE - ASK STAFF]'` with dynamic resolution
3. Update late-check-in template (if separate file)
4. Write tests for each template consumer

**Acceptance**: Templates generate with DB codes when present, `[ASK STAFF]` when empty, never invent

### Phase 6: Documentation + PR Readiness

**Goal**: All docs updated, PR body safe, tests green, migrations ready

**Tasks**:
1. Write `docs/ACCESS-CODES-SOR.md`:
   - How to edit codes as staff
   - Migration instructions
   - Fallback behavior
   - Redaction rules
2. Update `.env.example` with note about DB-first + env fallback
3. Write PR description:
   - Use `REDACTED` or `****` in all examples
   - Never paste live codes
   - Link to spec + plan
   - Acceptance checklist
4. Run full test suite, lint, build

**Acceptance**: All tests pass, PR body is code-safe, migrations documented

## Testing Strategy

### Unit Tests

- `src/lib/__tests__/access-codes.test.ts`: Core resolution logic (DB/env/fail-closed)
- `__tests__/access-codes-audit.test.ts`: Audit log insert/query, redaction
- `__tests__/guest-portal-codes.test.ts`: Portal integration
- Template tests: Each template consumer (welcome, late-check-in, playbooks)

### Integration Tests

- Staff UI E2E (optional, manual): Edit code, save, see change in portal
- Redaction audit: Grep test output for patterns that look like real codes

### Manual Testing Checklist

See `quickstart.md` for step-by-step manual test scenarios

## Rollout Plan

1. **Merge design PR** (this spec + plan + data-model + tasks) → wait for GFM acceptance
2. **Implement in same PR OR separate PR** (based on tight scope + tests green signal from Grant)
3. **Local testing**: All unit + integration tests pass, no live codes in output
4. **Staging deploy**: Staff test code edits, verify portal updates
5. **Seed DB from env vars**: Staff run seed script with `APPROVE SEED FROM ENV` (one-time)
6. **Production deploy**: After Grant `APPROVE APPLY MIGRATION`
7. **Monitor**: Check audit log for unexpected entries, verify fallback works
8. **Deprecate env vars** (future): After DB is stable, can optionally remove env vars in a later phase

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Live codes leak in logs/tests | HIGH | Strict redaction, grep CI, code review |
| DB query fails, portal breaks | MEDIUM | Env fallback + graceful degradation |
| Staff edit wrong code (fat finger) | MEDIUM | Audit log for rollback intel; future: confirmation dialog |
| Time-gate logic breaks | HIGH | Reuse existing `shouldShowAccessCodes()`, test coverage |
| Migration fails on Turso | HIGH | Idempotent script, test on local SQLite first |
| Env fallback never triggers in prod | LOW | Test explicitly, document fallback path |
| Multiple staff edit same code | LOW | Last write wins, both changes logged |

## Dependencies

- Existing staff authentication middleware
- Existing guest portal magic token system
- Existing `shouldShowAccessCodes()` time-gate logic
- Turso DB migration pattern from Phase 0
- Existing `.env.example` and Vercel env var setup

## Done When

- [ ] DB schema + migration script merged
- [ ] `src/lib/access-codes.ts` resolution logic implemented + tested
- [ ] Staff UI at `/staff/access-codes` works (view + edit + audit)
- [ ] Guest portal uses DB-first resolution with env fallback
- [ ] Templates (welcome, late-check-in, playbooks) use DB-first resolution
- [ ] All tests pass, no live codes in output
- [ ] Documentation complete (`ACCESS-CODES-SOR.md`, `.env.example` note)
- [ ] PR body uses `REDACTED` / `****`, no live codes
- [ ] Grant approval for GFM design acceptance (or design+impl if green)
