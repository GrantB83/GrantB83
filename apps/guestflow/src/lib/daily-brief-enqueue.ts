/**
 * Staff-ops daily brief enqueue gate.
 * Fail-closed: enqueue only when an existing approval queue supports staff-group drafts.
 */

export const APPROVAL_QUEUE_PATH = '/needs-approval'

export const ENQUEUE_BLOCKER_REASON =
  'No staff-ops draft type in /api/approvals. Existing queues (inbound, welcome, late_checkin, ticket_guest, ticket_staff) target guest phone Send paths, not internal staff WhatsApp group briefs (H11).'

export interface StaffOpsEnqueueGate {
  enqueueSupported: boolean
  enqueueBlocker: string | null
  approvalQueuePath: typeof APPROVAL_QUEUE_PATH
  fallbackActions: readonly ['copy', 'export_text', 'export_markdown']
}

/**
 * Returns whether daily-brief enqueue into the staff approval queue is supported.
 * Currently always false — see specs/003-daily-brief-staff-enqueue/research.md.
 */
export function getStaffOpsEnqueueGate(): StaffOpsEnqueueGate {
  const enqueueSupported = false

  return {
    enqueueSupported,
    enqueueBlocker: enqueueSupported ? null : ENQUEUE_BLOCKER_REASON,
    approvalQueuePath: APPROVAL_QUEUE_PATH,
    fallbackActions: ['copy', 'export_text', 'export_markdown'],
  }
}
