/**
 * Staff-ops daily brief enqueue gate and helpers.
 * Copy-only: never auto-send.
 */

import type { DbClient } from '@/lib/db'
import {
  ensureStaffOpsDraftsTable,
  staffOpsDraftsTableExists,
} from '@/lib/staff-ops-drafts'

export const APPROVAL_QUEUE_PATH = '/needs-approval'

export const ENQUEUE_BLOCKER_REASON =
  'staff_ops_drafts table is not available. Run migrate-add-staff-ops-drafts or ensure Turso schema includes staff_ops_drafts.'

export interface StaffOpsEnqueueGate {
  enqueueSupported: boolean
  enqueueBlocker: string | null
  approvalQueuePath: typeof APPROVAL_QUEUE_PATH
  fallbackActions: readonly ['copy', 'export_text', 'export_markdown']
}

const FALLBACK_ACTIONS = ['copy', 'export_text', 'export_markdown'] as const

function buildGate(enqueueSupported: boolean): StaffOpsEnqueueGate {
  return {
    enqueueSupported,
    enqueueBlocker: enqueueSupported ? null : ENQUEUE_BLOCKER_REASON,
    approvalQueuePath: APPROVAL_QUEUE_PATH,
    fallbackActions: FALLBACK_ACTIONS,
  }
}

/**
 * Sync gate for unit tests without DB — defaults unsupported until table wired.
 * @deprecated Prefer resolveStaffOpsEnqueueGate(db) in API routes.
 */
export function getStaffOpsEnqueueGate(): StaffOpsEnqueueGate {
  return buildGate(false)
}

/**
 * Resolves enqueue support from live DB state (creates table if missing).
 */
export async function resolveStaffOpsEnqueueGate(db: DbClient): Promise<StaffOpsEnqueueGate> {
  try {
    let exists = await staffOpsDraftsTableExists(db)
    if (!exists) {
      await ensureStaffOpsDraftsTable(db)
      exists = await staffOpsDraftsTableExists(db)
    }
    return buildGate(exists)
  } catch {
    return buildGate(false)
  }
}
