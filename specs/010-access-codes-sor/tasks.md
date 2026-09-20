# Tasks: Access Codes Source of Record

**Feature**: Access Codes SoR | **Branch**: `cursor/access-codes-sor-8dcd` | **Date**: 2026-09-20

## Task Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked

## Phase 1: DB Schema + Migration

### Task 1.1: Create migration script
**Priority**: P1 | **Estimate**: 30min | **Depends on**: None

**Acceptance criteria**:
- [ ] File `scripts/migrate-access-codes-sor.js` exists
- [ ] Creates `property_access_codes` table (idempotent)
- [ ] Creates `access_code_audit_log` table (idempotent)
- [ ] Creates indexes for both tables
- [ ] Runs successfully on local SQLite (`.guestflow.db`)
- [ ] Migration is idempotent (safe to re-run)

**Implementation notes**:
- Follow pattern from `scripts/migrate-phase0-safety.js`
- Use `CREATE TABLE IF NOT EXISTS`
- Use `CREATE INDEX IF NOT EXISTS`
- Test with `node scripts/migrate-access-codes-sor.js`

---

### Task 1.2: Define TypeScript schema types
**Priority**: P1 | **Estimate**: 15min | **Depends on**: 1.1

**Acceptance criteria**:
- [ ] File `src/lib/access-codes-schema.ts` exists
- [ ] `PropertyAccessCode` interface defined
- [ ] `AccessCodeAuditLog` interface defined
- [ ] `ResolvedAccessCodes` interface defined
- [ ] Types match DB schema exactly

**Implementation notes**:
- Export all interfaces
- Use `'gate_pinpad' | 'lockbox'` for `code_type`
- Use `string | null` for optional `suite`

---

### Task 1.3: Create seed script (optional)
**Priority**: P2 | **Estimate**: 20min | **Depends on**: 1.1, 1.2

**Acceptance criteria**:
- [ ] File `scripts/seed-access-codes.js` exists or seed logic in migration script with flag
- [ ] Reads `PROPERTY_GATE_CODE` and `PROPERTY_DOOR_CODE` env vars
- [ ] Only runs when `SEED_ACCESS_CODES=APPROVE` env var is set
- [ ] Inserts gate codes for cottage and main-house
- [ ] Inserts audit log entries for seed action
- [ ] Uses `INSERT OR IGNORE` (idempotent)

**Implementation notes**:
- Check for `process.env.SEED_ACCESS_CODES === 'APPROVE'` gate
- Log "Skipping seed, no approval" if gate not set
- Never log actual code values, use `****` in output

---

## Phase 2: Core Resolution Logic + Tests

### Task 2.1: Implement resolution helper
**Priority**: P1 | **Estimate**: 45min | **Depends on**: 1.2

**Acceptance criteria**:
- [ ] File `src/lib/access-codes.ts` exists
- [ ] `getAccessCode(property, type, suite?)` function queries DB
- [ ] `resolveAccessCodes(property, suite?)` function returns `{ gateCode, doorCode, lockboxCode? }`
- [ ] DB-first logic: query DB → if found, return
- [ ] Env fallback logic: if DB empty, check `PROPERTY_GATE_CODE` / `PROPERTY_DOOR_CODE`
- [ ] Fail-closed logic: if both empty, return `'[ASK STAFF]'`
- [ ] Suite-specific lockbox codes resolve correctly
- [ ] No code values logged in function (use DEBUG mode with redaction)

**Implementation notes**:
- Use existing `getDb()` helper from phase0-schema
- Handle DB query errors gracefully (fall back to env)
- Trim and normalize code values
- Type signature: `resolveAccessCodes(property: string, suite?: string): Promise<ResolvedAccessCodes>`

---

### Task 2.2: Write unit tests for resolution logic
**Priority**: P1 | **Estimate**: 60min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/lib/__tests__/access-codes.test.ts` exists
- [ ] Test: DB has gate code → returns DB value
- [ ] Test: DB empty, env set → returns env value
- [ ] Test: Both empty → returns `'[ASK STAFF]'`
- [ ] Test: Multiple properties → correct scoping (cottage vs main-house)
- [ ] Test: Suite-specific lockbox → returns only that suite's code
- [ ] Test: Suite-specific lockbox, suite not found → returns `'[ASK STAFF]'`
- [ ] Test: Redaction enforcement (test output never contains patterns like `1234` that look like real codes)
- [ ] All tests pass with `npm test`

**Implementation notes**:
- Use Vitest mocks for DB
- Use fixture codes: `'TEST_GATE_1234'`, `'TEST_LOCKBOX_5678'` (obviously fake)
- Never use real-looking codes in tests
- Mock `process.env` for env fallback tests

---

### Task 2.3: Write integration tests for resolution
**Priority**: P2 | **Estimate**: 30min | **Depends on**: 2.2

**Acceptance criteria**:
- [ ] File `__tests__/access-codes-resolution.test.ts` exists
- [ ] Test: End-to-end resolution with in-memory SQLite
- [ ] Test: Upsert code, then resolve → returns updated value
- [ ] Test: Clear DB, resolve → falls back to env
- [ ] All integration tests pass

**Implementation notes**:
- Use in-memory SQLite for faster tests
- Seed test data in `beforeEach`
- Clean up in `afterEach`

---

## Phase 3: Staff UI + API Routes

### Task 3.1: Create API route for upsert
**Priority**: P1 | **Estimate**: 45min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/app/api/staff/access-codes/upsert/route.ts` exists
- [ ] POST endpoint accepts `{ property, code_type, suite?, code }`
- [ ] Validates staff auth (middleware or manual check)
- [ ] Validates `code` is non-empty and trimmed
- [ ] Upserts code to `property_access_codes` table
- [ ] Inserts audit log entry to `access_code_audit_log`
- [ ] Returns success response with updated code metadata (code value redacted in response)
- [ ] Returns 400 for invalid input, 401 for unauth, 500 for DB error

**Implementation notes**:
- Use `INSERT OR REPLACE` or `INSERT ... ON CONFLICT DO UPDATE`
- Extract staff ID from session/cookie
- Log audit entry in same transaction if possible
- Response: `{ success: true, updated_at: '...', redacted_code: '****' }`

---

### Task 3.2: Create API route for audit log
**Priority**: P2 | **Estimate**: 30min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/app/api/staff/access-codes/audit/route.ts` exists
- [ ] GET endpoint returns recent audit log (last 90 days)
- [ ] Validates staff auth
- [ ] Redacts code values in response (or doesn't include them, since they're not stored)
- [ ] Returns array of `{ property, code_type, suite, changed_at, changed_by, action, notes }`
- [ ] Sorted DESC by `changed_at`

**Implementation notes**:
- Query: `WHERE changed_at >= datetime('now', '-90 days')`
- Limit to 100 entries by default
- Optional: support pagination with `?offset=` query param

---

### Task 3.3: Create staff UI page component
**Priority**: P1 | **Estimate**: 90min | **Depends on**: 3.1, 3.2

**Acceptance criteria**:
- [ ] File `src/app/staff/access-codes/page.tsx` exists (server component)
- [ ] Checks staff auth, redirects if not authenticated
- [ ] File `src/app/staff/access-codes/AccessCodesManager.tsx` exists (client component)
- [ ] Fetches current codes on mount
- [ ] Groups codes by property
- [ ] Displays gate codes and lockbox codes separately
- [ ] Inline edit UI with text inputs (masked by default, toggle to reveal)
- [ ] Save button per row or per section
- [ ] Shows last updated timestamp and staff name for each code
- [ ] Displays audit log below (last 90 days, redacted)
- [ ] No live codes visible in browser DevTools console or network tab

**Implementation notes**:
- Use `useState` for edit mode
- Use `type="password"` for code inputs by default, toggle to `type="text"` on reveal
- Fetch codes: `GET /api/staff/access-codes` (new route or combine with upsert)
- Fetch audit: `GET /api/staff/access-codes/audit`
- On save: `POST /api/staff/access-codes/upsert`
- Show success/error toast after save
- Refresh codes and audit log after successful save

---

### Task 3.4: Write tests for staff API routes
**Priority**: P1 | **Estimate**: 45min | **Depends on**: 3.1, 3.2

**Acceptance criteria**:
- [ ] File `__tests__/access-codes-upsert.test.ts` exists
- [ ] Test: Valid upsert → code saved, audit log entry created
- [ ] Test: Empty code → 400 error
- [ ] Test: Unauthenticated request → 401 error
- [ ] Test: Audit log returns redacted entries
- [ ] All tests pass

**Implementation notes**:
- Mock staff auth middleware
- Use in-memory SQLite
- Verify audit log entries after upsert

---

## Phase 4: Guest Portal Integration

### Task 4.1: Update guest portal route
**Priority**: P1 | **Estimate**: 30min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/app/api/guest-portal/[code]/route.ts` updated
- [ ] Replace `process.env.PROPERTY_GATE_CODE` direct read with `resolveAccessCodes(property, suite)`
- [ ] Time-gate logic unchanged (`shouldShowAccessCodes()` still used)
- [ ] Response includes `{ gateCode, doorCode, lockboxCode? }` or `[ASK STAFF]`
- [ ] No code values logged in server console

**Implementation notes**:
- Extract `property` and `suite` from booking data
- Call `resolveAccessCodes(property, suite)`
- Apply time-gate before returning to guest
- Handle errors gracefully (fall back to env, then `[ASK STAFF]`)

---

### Task 4.2: Write tests for guest portal codes
**Priority**: P1 | **Estimate**: 45min | **Depends on**: 4.1

**Acceptance criteria**:
- [ ] File `__tests__/guest-portal-codes.test.ts` exists
- [ ] Test: Within time-gate, DB code exists → shown
- [ ] Test: Within time-gate, DB empty, env set → env shown
- [ ] Test: Within time-gate, both empty → `[ASK STAFF]`
- [ ] Test: Outside time-gate → codes hidden (standard message)
- [ ] Test: Suite-specific lockbox code displayed correctly
- [ ] All tests pass

**Implementation notes**:
- Mock `shouldShowAccessCodes()` to control time-gate
- Seed DB with test codes
- Test with different check-in dates (past, today, tomorrow, far future)

---

## Phase 5: Template Engine Integration

### Task 5.1: Update welcome drafts template
**Priority**: P1 | **Estimate**: 30min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/app/api/welcome-drafts/route.ts` updated
- [ ] Replace hardcoded env reads with `resolveAccessCodes(property, suite)`
- [ ] Template variables `{{gateCode}}` and `{{doorCode}}` resolve from DB-first logic
- [ ] If codes are `[ASK STAFF]`, template includes that placeholder (not empty string)
- [ ] No code values logged

**Implementation notes**:
- Call `resolveAccessCodes()` before populating template
- String replace: `template.replace(/\{\{gateCode\}\}/g, codes.gateCode)`
- Test with DB code, env code, and `[ASK STAFF]` cases

---

### Task 5.2: Update ticket playbooks
**Priority**: P1 | **Estimate**: 30min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] File `src/lib/ticket-playbooks.ts` updated
- [ ] Replace `gateCode: '[GATE CODE - ASK STAFF]'` with dynamic `resolveAccessCodes()`
- [ ] Playbook templates resolve codes from DB-first logic
- [ ] `{{gateCode}}` and `{{doorCode}}` variables populated correctly

**Implementation notes**:
- Pass `property` and `suite` to playbook generator
- Resolve codes before populating template
- Test with multiple properties and suites

---

### Task 5.3: Update late-check-in template (if separate)
**Priority**: P2 | **Estimate**: 20min | **Depends on**: 2.1

**Acceptance criteria**:
- [ ] Late-check-in template (if it exists as separate file/function) updated
- [ ] Uses `resolveAccessCodes()` for code resolution
- [ ] No hardcoded env reads

**Implementation notes**:
- Check if late-check-in is in `welcome-drafts` route or separate
- Apply same pattern as Task 5.1

---

### Task 5.4: Write tests for template integration
**Priority**: P1 | **Estimate**: 45min | **Depends on**: 5.1, 5.2

**Acceptance criteria**:
- [ ] Tests for welcome drafts with DB codes
- [ ] Tests for welcome drafts with env fallback
- [ ] Tests for welcome drafts with `[ASK STAFF]`
- [ ] Tests for playbooks with DB codes
- [ ] All template tests pass

**Implementation notes**:
- Mock DB and env vars
- Verify template output contains correct codes or `[ASK STAFF]`
- Ensure no empty replacements (e.g., `{{gateCode}}` → `''`)

---

## Phase 6: Documentation + PR Readiness

### Task 6.1: Write feature documentation
**Priority**: P2 | **Estimate**: 45min | **Depends on**: All previous tasks

**Acceptance criteria**:
- [ ] File `docs/ACCESS-CODES-SOR.md` exists
- [ ] Explains how staff edit codes
- [ ] Explains DB-first + env fallback logic
- [ ] Explains redaction rules
- [ ] Includes migration instructions
- [ ] Includes troubleshooting (e.g., "codes not showing → check DB and env")
- [ ] Uses `REDACTED` or `****` in all examples

**Implementation notes**:
- Include screenshots or step-by-step for staff UI
- Link to data-model.md for schema details
- Link to plan.md for rollout plan

---

### Task 6.2: Update .env.example and README
**Priority**: P2 | **Estimate**: 15min | **Depends on**: 6.1

**Acceptance criteria**:
- [ ] `.env.example` includes note about DB-first + env fallback
- [ ] `README.md` or `QUICK-START.md` mentions access codes SoR
- [ ] Never includes live codes (use `****` placeholders)

**Implementation notes**:
- Add comment in `.env.example`:
  ```bash
  # Access codes (DB-first, env fallback)
  PROPERTY_GATE_CODE=****  # Fallback if DB empty
  PROPERTY_DOOR_CODE=****  # Fallback if DB empty
  ```

---

### Task 6.3: Write PR description
**Priority**: P1 | **Estimate**: 30min | **Depends on**: All previous tasks

**Acceptance criteria**:
- [ ] PR description written (in spec or separate file)
- [ ] Uses `REDACTED` or `****` for all code examples
- [ ] Never pastes live codes
- [ ] Links to spec.md, plan.md, data-model.md
- [ ] Includes acceptance checklist (from spec Success Criteria)
- [ ] Includes testing instructions
- [ ] Mentions migration script and seed instructions

**Implementation notes**:
- Follow PR template if one exists
- Include before/after comparison (ritual removed: "emergency deploy for code rotation" → "staff edit in UI")
- Highlight redaction enforcement

---

### Task 6.4: Run full test suite and lint
**Priority**: P1 | **Estimate**: 15min | **Depends on**: All implementation tasks

**Acceptance criteria**:
- [ ] `npm test` passes all tests (unit + integration)
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds
- [ ] No live codes in test output (grep for patterns like `/\d{4}/`)
- [ ] No TypeScript errors

**Implementation notes**:
- Run locally before pushing
- Check CI status after push
- Fix any test failures immediately

---

### Task 6.5: Manual testing checklist
**Priority**: P1 | **Estimate**: 30min | **Depends on**: 6.4

**Acceptance criteria**:
- [ ] Manual test: Staff login, navigate to `/staff/access-codes`
- [ ] Manual test: Edit gate code, save, verify audit log entry
- [ ] Manual test: View guest portal with DB code set → code shown (within time-gate)
- [ ] Manual test: Clear DB code, verify env fallback works
- [ ] Manual test: Clear both, verify `[ASK STAFF]` shown
- [ ] Manual test: Generate welcome draft, verify code resolution
- [ ] Manual test: Browser DevTools open, verify no live codes in console/network
- [ ] Manual test: Outside time-gate, verify codes hidden

**Implementation notes**:
- Use local dev server: `npm run dev`
- Create test booking with check-in = today
- Use `scripts/migrate-access-codes-sor.js` to set up local DB
- Document results in quickstart.md or testing notes

---

## Rollout Checklist

- [ ] Design PR merged (spec + plan + data-model + tasks)
- [ ] GFM acceptance received
- [ ] Implementation PR ready (if same PR) or separate PR opened
- [ ] All tests pass (unit + integration)
- [ ] Lint and build succeed
- [ ] Manual testing complete
- [ ] Migration script tested on local SQLite
- [ ] Seed script ready (optional, with approval gate)
- [ ] Documentation complete
- [ ] PR description uses `REDACTED` / `****`, no live codes
- [ ] Grant approval for `APPROVE APPLY MIGRATION`
- [ ] Production deploy
- [ ] Seed DB from env vars (one-time, with `APPROVE SEED FROM ENV`)
- [ ] Verify staff can edit codes in production
- [ ] Verify guest portal shows DB codes
- [ ] Monitor audit log for unexpected entries

---

## Dependencies Between Tasks

```text
1.1 (migration) ──► 1.2 (types) ──► 2.1 (resolution logic)
                                      │
                                      ├──► 2.2 (unit tests) ──► 2.3 (integration tests)
                                      │
                                      ├──► 3.1 (upsert API) ──► 3.3 (staff UI)
                                      │                           │
                                      ├──► 3.2 (audit API) ──────┤
                                      │
                                      ├──► 4.1 (guest portal) ──► 4.2 (portal tests)
                                      │
                                      └──► 5.1 (welcome) ──► 5.4 (template tests)
                                           5.2 (playbooks) ──┤
                                           5.3 (late-check) ─┘

All tasks ──► 6.1 (docs) ──► 6.2 (.env + README) ──► 6.3 (PR description) ──► 6.4 (test suite) ──► 6.5 (manual testing)
```

---

## Task Time Estimates

**Phase 1 (DB)**: 1.1 (30min) + 1.2 (15min) + 1.3 (20min) = **65 min** (~1 hour)

**Phase 2 (Logic)**: 2.1 (45min) + 2.2 (60min) + 2.3 (30min) = **135 min** (~2.25 hours)

**Phase 3 (Staff UI)**: 3.1 (45min) + 3.2 (30min) + 3.3 (90min) + 3.4 (45min) = **210 min** (~3.5 hours)

**Phase 4 (Portal)**: 4.1 (30min) + 4.2 (45min) = **75 min** (~1.25 hours)

**Phase 5 (Templates)**: 5.1 (30min) + 5.2 (30min) + 5.3 (20min) + 5.4 (45min) = **125 min** (~2 hours)

**Phase 6 (Docs)**: 6.1 (45min) + 6.2 (15min) + 6.3 (30min) + 6.4 (15min) + 6.5 (30min) = **135 min** (~2.25 hours)

**Total estimate**: ~12.25 hours (actual may vary, design-only PR is faster)

---

## Notes

- **Design-first approach**: If Grant approves design PR separately, implementation tasks (Phases 1-5) will be in a follow-up PR
- **Tight scope signal**: If all tests green and scope tight (no surprises), implementation can be in same PR as design
- **Redaction is critical**: Every task that touches code values must enforce redaction in logs/tests/UI
- **Audit trail is P2**: Can be deferred if time-constrained, but recommended for security
