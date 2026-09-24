import type { DbClient } from '@/lib/db'
import { staffOpsDraftsTableExists } from '@/lib/staff-ops-drafts'

export async function sqliteTableExists(db: DbClient, tableName: string): Promise<boolean> {
  const row = (await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(tableName)) as { name: string } | undefined
  return Boolean(row?.name)
}

async function safeApprovalQuery(
  source: string,
  query: () => Promise<Record<string, unknown>[]>
): Promise<Record<string, unknown>[]> {
  try {
    return await query()
  } catch (error) {
    console.error(`[approvals] ${source} fetch failed:`, error)
    return []
  }
}

/** Matches migrate-add-inbound-whatsapp.js + thread guest_name (no inbound_messages.from_name). */
export const INBOUND_APPROVALS_SQL = `
  SELECT
    m.id,
    'inbound' as type,
    COALESCE(t.guest_name, m.from_number, 'Unknown') as guest,
    m.draft_reply as draft_content,
    'WhatsApp inbound' as source,
    m.message_timestamp as created_at,
    'medium' as priority,
    m.from_number as guest_phone,
    json_object('thread_id', m.thread_id, 'from_number', m.from_number) as metadata
  FROM inbound_messages m
  LEFT JOIN inbound_threads t ON t.id = m.thread_id
  WHERE m.tenant_id = ? AND m.draft_reply IS NOT NULL
    AND (
      m.status = 'drafted'
      OR m.thread_id IN (
        SELECT id FROM inbound_threads
        WHERE tenant_id = ? AND status IN ('drafted', 'approved', 'queued')
      )
    )
  ORDER BY m.message_timestamp DESC
`

const TICKET_APPROVALS_SQL = `
  SELECT
    id,
    CASE WHEN guest_draft_reply IS NOT NULL THEN 'ticket_guest' ELSE 'ticket_staff' END as type,
    guest_name as guest,
    COALESCE(guest_draft_reply, staff_brief) as draft_content,
    category as source,
    created_at,
    CASE WHEN priority = 'high' THEN 'high' ELSE 'medium' END as priority,
    guest_phone,
    '{}' as metadata
  FROM guest_tickets
  WHERE tenant_id = ? AND status IN ('new', 'triaged')
    AND (guest_draft_reply IS NOT NULL OR staff_brief IS NOT NULL)
  ORDER BY created_at DESC
`

const WELCOME_APPROVALS_SQL = `
  SELECT
    id,
    'welcome' as type,
    guest_name as guest,
    draft_message as draft_content,
    source,
    created_at,
    'medium' as priority,
    guest_phone,
    '{}' as metadata
  FROM welcome_drafts
  WHERE tenant_id = ? AND status = 'pending_approval'
  ORDER BY created_at DESC
`

const LATE_CHECKIN_APPROVALS_SQL = `
  SELECT
    id,
    'late_checkin' as type,
    guest_name as guest,
    draft_message as draft_content,
    source,
    created_at,
    'high' as priority,
    guest_phone,
    '{}' as metadata
  FROM late_checkin_drafts
  WHERE tenant_id = ? AND status = 'pending_approval'
  ORDER BY created_at DESC
`

const STAFF_OPS_APPROVALS_SQL = `
  SELECT
    id,
    'staff_ops' as type,
    'Daily brief ' || brief_date as guest,
    draft_content,
    'daily-brief' as source,
    created_at,
    'medium' as priority,
    NULL as guest_phone,
    json_object('copy_only', 1, 'brief_date', brief_date) as metadata
  FROM staff_ops_drafts
  WHERE tenant_id = ? AND status = 'pending_approval'
  ORDER BY created_at DESC
`

export async function fetchInboundApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  return safeApprovalQuery('inbound', async () =>
    (await db.prepare(INBOUND_APPROVALS_SQL).all(tenantId, tenantId)) as Record<string, unknown>[]
  )
}

export async function fetchTicketApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  return safeApprovalQuery('tickets', async () =>
    (await db.prepare(TICKET_APPROVALS_SQL).all(tenantId)) as Record<string, unknown>[]
  )
}

export async function fetchWelcomeApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  if (!(await sqliteTableExists(db, 'welcome_drafts'))) {
    return []
  }
  return safeApprovalQuery('welcome', async () =>
    (await db.prepare(WELCOME_APPROVALS_SQL).all(tenantId)) as Record<string, unknown>[]
  )
}

export async function fetchLateCheckinApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  if (!(await sqliteTableExists(db, 'late_checkin_drafts'))) {
    return []
  }
  return safeApprovalQuery('late_checkin', async () =>
    (await db.prepare(LATE_CHECKIN_APPROVALS_SQL).all(tenantId)) as Record<string, unknown>[]
  )
}

export async function fetchStaffOpsApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  if (!(await staffOpsDraftsTableExists(db))) {
    return []
  }
  return safeApprovalQuery('staff_ops', async () =>
    (await db.prepare(STAFF_OPS_APPROVALS_SQL).all(tenantId)) as Record<string, unknown>[]
  )
}

export async function fetchAllApprovalItems(
  db: DbClient,
  tenantId: number
): Promise<Record<string, unknown>[]> {
  const [inboundItems, ticketItems, welcomeItems, lateItems, staffOpsItems] = await Promise.all([
    fetchInboundApprovalItems(db, tenantId),
    fetchTicketApprovalItems(db, tenantId),
    fetchWelcomeApprovalItems(db, tenantId),
    fetchLateCheckinApprovalItems(db, tenantId),
    fetchStaffOpsApprovalItems(db, tenantId),
  ])

  return [...inboundItems, ...ticketItems, ...welcomeItems, ...lateItems, ...staffOpsItems]
}
