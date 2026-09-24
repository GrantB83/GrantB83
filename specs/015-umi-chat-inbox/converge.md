# Convergence report — UMI v2.1

**Date**: 2026-09-24  
**Outcome**: Converged after Phase 9 remediations T041–T042.

`.specify/extensions.yml` is absent — pre/post converge hooks skipped.

## Findings (first pass)

| ID | Gap Type | Severity | Source | Evidence | Remaining Work |
|----|----------|----------|--------|----------|----------------|
| F1 | partial | HIGH | FR-003 / US2/AC1 | `bookingsForContact` matched phone and `guest_contacts` only — `bookings.guest_email` was unread | T041 match email-only bookers |
| F2 | partial | HIGH | FR-006 / FR-015 | Email and WhatsApp Cloud send updated status but did not `markThreadOutbound` or persist `channel` | T042 clear pending + badge outbound |

**Summary metrics (first pass):**

- Requirements / acceptance criteria checked: FR-001–024, SC-001–009, US1–US7 ACs, listed edge cases
- Plan decisions checked: extend live inbound tables; no auto-send; redirect sinks; Cloud From freeze; 5y retention language
- Constitution principles checked: I–VI (filled v1.0.0)
- Findings by gap type: 0 missing / 2 partial / 0 contradicts / 0 unrequested
- Findings by severity: 0 CRITICAL / 2 HIGH / 0 MEDIUM / 0 LOW

Named test files T026/T031/T037 live under `umi-threads.test.ts` and sibling UMI tests — not treated as missing product work.

## Second pass

T041–T042 implemented. Email-only booker ingest lands on the booking thread. Approve&Send on email and WhatsApp Cloud writes `channel` and clears `pending_reply`.

**Outcome**: Converged — implementation satisfies spec, plan, and tasks. No further Phase appended.
