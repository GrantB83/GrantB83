import type { DbClient } from '@/lib/db'

export const STAFF_OPS_DRAFTS_DDL = `
  CREATE TABLE IF NOT EXISTS staff_ops_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    brief_date TEXT NOT NULL,
    draft_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval'
      CHECK(status IN ('pending_approval', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    rejected_at DATETIME,
    rejected_by TEXT,
    actor TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_staff_ops_drafts_tenant_status
    ON staff_ops_drafts(tenant_id, status);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_ops_drafts_pending_unique
    ON staff_ops_drafts(tenant_id, brief_date)
    WHERE status = 'pending_approval';
`

export type StaffOpsDraftStatus = 'pending_approval' | 'approved' | 'rejected'

export interface StaffOpsDraftRow {
  id: number
  tenant_id: number
  brief_date: string
  draft_content: string
  status: StaffOpsDraftStatus
  created_at: string
  updated_at: string
  approved_at: string | null
  approved_by: string | null
  rejected_at: string | null
  rejected_by: string | null
  actor: string | null
}

export interface EnqueueStaffOpsDraftInput {
  tenantId: number
  briefDate: string
  draftContent: string
  actor?: string
  force?: boolean
}

export interface EnqueueStaffOpsDraftResult {
  draftId: number
  status: StaffOpsDraftStatus
  briefDate: string
  existing: boolean
}

export async function ensureStaffOpsDraftsTable(db: DbClient): Promise<void> {
  await db.exec(STAFF_OPS_DRAFTS_DDL)
}

export async function staffOpsDraftsTableExists(db: DbClient): Promise<boolean> {
  const row = (await db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'staff_ops_drafts'`
    )
    .get()) as { name: string } | undefined
  return Boolean(row?.name)
}

export async function findPendingStaffOpsDraft(
  db: DbClient,
  tenantId: number,
  briefDate: string
): Promise<StaffOpsDraftRow | undefined> {
  return (await db
    .prepare(
      `
      SELECT *
      FROM staff_ops_drafts
      WHERE tenant_id = ? AND brief_date = ? AND status = 'pending_approval'
      LIMIT 1
    `
    )
    .get(tenantId, briefDate)) as StaffOpsDraftRow | undefined
}

export async function enqueueStaffOpsDraft(
  db: DbClient,
  input: EnqueueStaffOpsDraftInput
): Promise<EnqueueStaffOpsDraftResult> {
  await ensureStaffOpsDraftsTable(db)

  const existing = await findPendingStaffOpsDraft(db, input.tenantId, input.briefDate)
  if (existing && !input.force) {
    return {
      draftId: existing.id,
      status: existing.status,
      briefDate: existing.brief_date,
      existing: true,
    }
  }

  if (existing && input.force) {
    await db
      .prepare(
        `
        UPDATE staff_ops_drafts
        SET draft_content = ?,
            actor = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      )
      .run(input.draftContent, input.actor || null, existing.id)

    return {
      draftId: existing.id,
      status: 'pending_approval',
      briefDate: input.briefDate,
      existing: false,
    }
  }

  const result = await db
    .prepare(
      `
      INSERT INTO staff_ops_drafts (
        tenant_id, brief_date, draft_content, status, actor
      ) VALUES (?, ?, ?, 'pending_approval', ?)
    `
    )
    .run(input.tenantId, input.briefDate, input.draftContent, input.actor || null)

  return {
    draftId: Number(result.lastInsertRowid),
    status: 'pending_approval',
    briefDate: input.briefDate,
    existing: false,
  }
}

export async function approveStaffOpsDraft(
  db: DbClient,
  draftId: number,
  actor?: string
): Promise<{ copyContent: string; status: StaffOpsDraftStatus } | null> {
  const row = (await db
    .prepare(`SELECT id, draft_content, status FROM staff_ops_drafts WHERE id = ?`)
    .get(draftId)) as Pick<StaffOpsDraftRow, 'id' | 'draft_content' | 'status'> | undefined

  if (!row) return null

  await db
    .prepare(
      `
      UPDATE staff_ops_drafts
      SET status = 'approved',
          approved_at = CURRENT_TIMESTAMP,
          approved_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    )
    .run(actor || null, draftId)

  return { copyContent: row.draft_content, status: 'approved' }
}

export async function rejectStaffOpsDraft(
  db: DbClient,
  draftId: number,
  actor?: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `
      UPDATE staff_ops_drafts
      SET status = 'rejected',
          rejected_at = CURRENT_TIMESTAMP,
          rejected_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending_approval'
    `
    )
    .run(actor || null, draftId)

  return Number(result.changes) > 0
}
