# Research: Staff Ops Copy-Only Approvals

**Date**: 2026-09-18

**Builds on**: `specs/003-daily-brief-staff-enqueue/research.md`

## Decision 1: Dedicated table vs reuse guest drafts

**Decision**: Add `staff_ops_drafts` table; do not reuse `welcome_drafts` or `guest_tickets.staff_brief`.

**Rationale**: Guest tables carry `guest_phone` and Send paths. Daily brief targets internal staff WhatsApp group (H11 manual post).

## Decision 2: Copy-only approval

**Decision**: `staff_ops` rows expose `metadata.copy_only: true`; Send UI hidden; PATCH approve returns `copyContent` only.

**Rationale**: Fail-closed gate from CA prompt — zero WhatsApp auto-send.

## Decision 3: Idempotency

**Decision**: Partial unique index on `(tenant_id, brief_date) WHERE status = 'pending_approval'`. POST enqueue returns existing pending unless `force: true`.

**Rationale**: One morning brief draft per tenant per date unless staff explicitly replace.

## Decision 4: enqueueSupported gate

**Decision**: `enqueueSupported: true` only after `staff_ops_drafts` table exists (sqlite_master / successful ensure).

**Rationale**: PR #188 requirement — flip true only when wired and evidenced.

## Decision 5: Brief content source

**Decision**: Enqueue endpoint calls `generateWhatsAppBrief()` server-side; client cannot supply arbitrary text.

**Rationale**: No invented rates/PII; brief lib output only.
