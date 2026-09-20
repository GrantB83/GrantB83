# Access Codes Source of Record - Feature Specification

**Status**: Design phase - Ready for GFM acceptance

**Created**: 2026-09-20

**Owner**: Grant Brown (GFM acceptance)

**Branch**: `cursor/access-codes-sor-8dcd`

---

## Executive Summary

Move property access codes (gate pinpads + lockbox) from env vars to database source of record. Staff edit codes via UI at `/staff/access-codes`. Guest portal, templates, and playbooks read DB-first with env fallback, fail-closed to `[ASK STAFF]` if both empty. Audit trail logs who changed what/when. Never invent codes. Redact live codes in console/logs/tests.

**Ritual removed**: "Emergency Vercel deploy to rotate compromised code" → "Staff edit in UI, save, done"

---

## Scope

**In scope**:
- 2 gate pinpads (Cottage entrance = 278 Blue Crane; Main house entrance = 279 Blue Crane)
- Lockbox codes (one active code per room/suite at each property)
- Staff UI to view/edit codes
- Audit trail (who, when, metadata only)
- DB-first resolution with env fallback
- Fail-closed to `[ASK STAFF]` when both empty
- Redaction enforcement (no live codes in logs/tests/PR)

**Out of scope**:
- Auto-send of messages with codes (still requires Phase 0 approval)
- Integration with physical pinpad APIs
- Role-based access control (all staff can edit)
- Code expiration or rotation reminders
- Bulk import via CSV
- Multi-property tenant support (schema ready, but single tenant for now)

---

## Documents

### Core Specification
- **[spec.md](./spec.md)** - Feature specification with user scenarios, requirements, success criteria
- **[plan.md](./plan.md)** - Implementation plan with phases, testing strategy, rollout plan
- **[data-model.md](./data-model.md)** - Database schema, TypeScript interfaces, query examples
- **[tasks.md](./tasks.md)** - Task breakdown with dependencies and time estimates

### Supporting Documentation
- **[quickstart.md](./quickstart.md)** - Quick start guide for local dev, testing, and production rollout
- **[checklists/requirements.md](./checklists/requirements.md)** - Quality checklist for GFM acceptance

### API Contracts (TBD, if implemented)
- `contracts/api-staff-access-codes-upsert.md` - Staff upsert API contract
- `contracts/api-staff-access-codes-audit.md` - Staff audit log API contract
- `contracts/resolution-logic.md` - DB-first resolution flow diagram

---

## Key Design Decisions

1. **DB-first with env fallback**: Smooth migration, backward compatible, fail-safe
2. **Code storage**: Rely on Turso at-rest encryption (app-level AES optional)
3. **Audit log**: Metadata only (property, type, timestamp, staff), no code values
4. **Staff UI**: Inline edit table (all codes visible, grouped by property)
5. **Lockbox scope**: One code per suite (as specified by Grant)
6. **Template resolution**: Centralized helper function (`resolveAccessCodeVars()`) for DRY

---

## Success Criteria

- **SC-001**: Staff can change a gate or lockbox code from UI and see change reflected in guest portal within 5 seconds (no deploy required)
- **SC-002**: 100% of guest portal access code displays resolve from DB when codes exist
- **SC-003**: 100% of template generations use DB-first resolution with `[ASK STAFF]` fallback
- **SC-004**: Zero live access codes appear in browser DevTools, test fixtures, CI logs, or PR descriptions
- **SC-005**: Every code change has a corresponding audit log entry
- **SC-006**: Staff can view change history for last 90 days without seeing actual code values
- **SC-007**: System handles DB unavailability gracefully, falling back to env vars
- **SC-008**: Ritual removed: "emergency deploy for code rotation" → "staff edit in UI"

---

## Database Schema (Summary)

### `property_access_codes`
- `property` (cottage | main-house)
- `code_type` (gate_pinpad | lockbox)
- `suite` (nullable, required for lockbox)
- `code_value` (encrypted at rest)
- `last_updated_at`, `last_updated_by`
- UNIQUE constraint on (tenant, property, code_type, suite)

### `access_code_audit_log`
- `property`, `code_type`, `suite`
- `changed_at`, `changed_by`
- `action` (create | update)
- `notes` (optional)
- **Does NOT store code values** (security)

---

## Resolution Flow

```text
Guest Portal / Template Request
         |
         v
  resolveAccessCodes(property, suite)
         |
         v
   Query DB: property_access_codes
         |
    +----+----+
    |         |
   Found    Empty
    |         |
    v         v
 Return    Env Vars
 DB code  (PROPERTY_GATE_CODE, etc.)
    |         |
    +----+----+
         |
    +----+----+
    |         |
   Found    Empty
    |         |
    v         v
 Return    Return
 Env code '[ASK STAFF]'
    |         |
    +----+----+
         |
         v
  Apply time-gate
  (if guest portal)
         |
         v
  Return to caller
```

---

## Testing Strategy

- **Unit tests**: `src/lib/__tests__/access-codes.test.ts` (resolution logic, redaction)
- **Integration tests**: `__tests__/access-codes-resolution.test.ts` (end-to-end with in-memory SQLite)
- **Staff UI tests**: `__tests__/access-codes-upsert.test.ts`, `__tests__/access-codes-audit.test.ts`
- **Portal tests**: `__tests__/guest-portal-codes.test.ts` (time-gate, DB/env/fail-closed)
- **Template tests**: Welcome drafts, late-check-in, playbooks (DB/env/fail-closed)
- **Manual tests**: See [quickstart.md](./quickstart.md) for step-by-step scenarios

---

## Rollout Plan

1. **Merge design PR** (this spec directory) → wait for GFM acceptance
2. **Implement** (same PR if tight scope + tests green, else separate PR)
3. **Local testing**: All unit + integration tests pass, no live codes in output
4. **Staging deploy**: Staff test code edits, verify portal updates
5. **Seed DB from env vars**: One-time, with `APPROVE SEED FROM ENV`
6. **Production deploy**: After Grant `APPROVE APPLY MIGRATION`
7. **Monitor**: Audit log, verify fallback works
8. **Deprecate env vars** (future, optional, after DB stable 30+ days)

---

## Dependencies

- Existing staff authentication middleware
- Existing guest portal magic token system
- Existing `shouldShowAccessCodes()` time-gate logic
- Turso DB migration pattern from Phase 0
- Existing `.env.example` and Vercel env var setup

---

## Time Estimate

**Design artifacts** (complete): ~2 hours

**Implementation** (if same PR):
- Phase 1 (DB): ~1 hour
- Phase 2 (Logic): ~2.25 hours
- Phase 3 (Staff UI): ~3.5 hours
- Phase 4 (Portal): ~1.25 hours
- Phase 5 (Templates): ~2 hours
- Phase 6 (Docs): ~2.25 hours
- **Total**: ~12.25 hours

**Design-only PR** (current): Ready for GFM acceptance now

---

## Next Steps

1. **Review this spec directory** with Grant for GFM design acceptance
2. **Address feedback** if any
3. **Proceed to implementation**:
   - If tight scope + tests green: implement in this PR
   - Otherwise: separate implementation PR after design acceptance

---

## Security Reminders

- ⚠️ **Never paste live access codes** in PR descriptions, commit messages, or chat
- ✅ **Always use `REDACTED` or `****`** as placeholders in examples
- ✅ **Test output must never contain** patterns like `1234` that look like real codes
- ✅ **Browser DevTools must show** `****` for code values, never actual codes
- ✅ **Audit log must NOT store** old or new code values, only metadata

---

**For questions or clarifications**, see:
- [spec.md](./spec.md) - Full feature specification
- [plan.md](./plan.md) - Implementation approach
- [data-model.md](./data-model.md) - Database schema details
- [tasks.md](./tasks.md) - Task breakdown with estimates
- [quickstart.md](./quickstart.md) - Testing and usage guide
