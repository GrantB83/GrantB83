import type { DbClient } from '@/lib/db'
import { ensureSprint2WhatsappSchema } from '@/lib/sprint2-schema'
import {
  CATALOG_NAME_TO_TWILIO_FRIENDLY,
  EXTRA_SYNC_CATALOG_SEEDS,
  type GrantApprovedTemplateSeed,
} from '@/lib/wa-templates-seed'
import type { WaTemplateRow } from '@/lib/wa-templates'

export interface TwilioContentItem {
  sid: string
  friendly_name?: string
  language?: string
  types?: { 'twilio/text'?: { body?: string } }
}

export interface TwilioContentListResponse {
  contents?: TwilioContentItem[]
  meta?: { next_page_url?: string | null }
}

export interface TwilioApprovalResponse {
  whatsapp?: { status?: string; rejection_reason?: string }
  status?: string
}

export type TwilioSyncClient = {
  listAllContent: () => Promise<TwilioContentItem[]>
  fetchApproval: (contentSid: string) => Promise<{ status: string; rejectionReason?: string } | null>
}

export type SyncWaTemplatesResult = {
  updated: number
  inserted: number
  fetched: number
  skipped: boolean
  error?: string
}

function twilioAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
}

export function buildTwilioSyncClient(accountSid: string, authToken: string): TwilioSyncClient {
  const auth = twilioAuthHeader(accountSid, authToken)

  async function listAllContent(): Promise<TwilioContentItem[]> {
    const items: TwilioContentItem[] = []
    let url: string | null = 'https://content.twilio.com/v1/Content?PageSize=100'
    while (url) {
      const response = await fetch(url, { method: 'GET', headers: { Authorization: auth } })
      if (!response.ok) {
        throw new Error(`content_list_${response.status}`)
      }
      const data = (await response.json()) as TwilioContentListResponse
      items.push(...(data.contents || []))
      url = data.meta?.next_page_url || null
    }
    return items
  }

  async function fetchApproval(
    contentSid: string
  ): Promise<{ status: string; rejectionReason?: string } | null> {
    const response = await fetch(
      `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
      { method: 'GET', headers: { Authorization: auth } }
    )
    if (!response.ok) return null
    const data = (await response.json()) as TwilioApprovalResponse
    const status = String(data.whatsapp?.status || data.status || '').toLowerCase()
    if (!status) return null
    return {
      status,
      rejectionReason: data.whatsapp?.rejection_reason,
    }
  }

  return { listAllContent, fetchApproval }
}

/** Prefer latest Content row when Twilio has duplicate friendly names. */
export function indexContentByFriendlyName(
  contents: TwilioContentItem[]
): Map<string, TwilioContentItem> {
  const map = new Map<string, TwilioContentItem>()
  for (const item of contents) {
    const name = String(item.friendly_name || '').trim()
    if (!name || !item.sid) continue
    const existing = map.get(name)
    if (!existing) {
      map.set(name, item)
      continue
    }
    // Keep both v1 and v2 entries keyed by full friendly_name; map handles aliases separately.
    map.set(name, item)
  }
  return map
}

async function listAllCatalogRows(db: DbClient, tenantId: number): Promise<WaTemplateRow[]> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  return ((await db
    .prepare(
      `SELECT id, tenant_id, name, category, language, body, variable_mapping,
              content_sid, approval_status, whatsapp_approval_status, last_synced_at
       FROM wa_templates WHERE tenant_id = ? ORDER BY id ASC`
    )
    .all(tenantId)) || []) as WaTemplateRow[]
}

export function resolveContentForCatalogName(
  catalogName: string,
  byFriendly: Map<string, TwilioContentItem>
): TwilioContentItem | undefined {
  const twilioName = CATALOG_NAME_TO_TWILIO_FRIENDLY[catalogName] || catalogName
  return byFriendly.get(twilioName)
}

async function ensureExtraCatalogRows(db: DbClient, tenantId: number): Promise<void> {
  for (const seed of EXTRA_SYNC_CATALOG_SEEDS) {
    const existing = (await db
      .prepare('SELECT id FROM wa_templates WHERE tenant_id = ? AND name = ?')
      .get(tenantId, seed.name)) as { id?: number } | undefined
    if (existing?.id) continue
    await insertCatalogRow(db, tenantId, seed, null, 'unsubmitted')
  }
}

async function insertCatalogRow(
  db: DbClient,
  tenantId: number,
  seed: GrantApprovedTemplateSeed,
  contentSid: string | null,
  whatsappStatus: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO wa_templates (
        tenant_id, name, category, language, body, variable_mapping,
        content_sid, approval_status, whatsapp_approval_status, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    )
    .run(
      tenantId,
      seed.name,
      seed.category,
      seed.language,
      seed.body,
      JSON.stringify(seed.variableMapping),
      contentSid,
      'approved_by_grant_unsubmitted',
      whatsappStatus
    )
}

async function updateCatalogRow(
  db: DbClient,
  rowId: number,
  contentSid: string,
  whatsappStatus: string,
  syncedAt: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE wa_templates
       SET content_sid = ?, whatsapp_approval_status = ?, last_synced_at = ?
       WHERE id = ?`
    )
    .run(contentSid, whatsappStatus, syncedAt, rowId)
}

export async function syncWaTemplatesFromTwilio(
  db: DbClient,
  tenantId: number,
  client?: TwilioSyncClient
): Promise<SyncWaTemplatesResult> {
  await ensureSprint2WhatsappSchema(db, tenantId)
  await ensureExtraCatalogRows(db, tenantId)

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return { updated: 0, inserted: 0, fetched: 0, skipped: true, error: 'missing_twilio_creds' }
  }

  const twilio = client || buildTwilioSyncClient(accountSid, authToken)
  let contents: TwilioContentItem[]
  try {
    contents = await twilio.listAllContent()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      updated: 0,
      inserted: 0,
      fetched: 0,
      skipped: true,
      error: message.includes('content_list') ? 'twilio_unreachable' : message,
    }
  }

  const byFriendly = indexContentByFriendlyName(contents)
  const rows = await listAllCatalogRows(db, tenantId)
  const now = new Date().toISOString()
  let updated = 0
  let inserted = 0

  for (const row of rows) {
    const content = resolveContentForCatalogName(row.name, byFriendly)
    if (!content?.sid) continue

    const approval = await twilio.fetchApproval(content.sid)
    const status = approval?.status || row.whatsapp_approval_status || 'unsubmitted'

    if (!row.id) continue
    const sidChanged = row.content_sid !== content.sid
    const statusChanged = row.whatsapp_approval_status !== status
    if (sidChanged || statusChanged || !row.last_synced_at) {
      await updateCatalogRow(db, row.id, content.sid, status, now)
      updated += 1
    }
  }

  // Insert any extra seed that still missing after first pass (should not happen)
  for (const seed of EXTRA_SYNC_CATALOG_SEEDS) {
    const exists = rows.some((r) => r.name === seed.name)
    if (exists) continue
    const content = resolveContentForCatalogName(seed.name, byFriendly)
    if (!content?.sid) continue
    const approval = await twilio.fetchApproval(content.sid)
    const status = approval?.status || 'unsubmitted'
    await insertCatalogRow(db, tenantId, seed, content.sid, status)
    inserted += 1
  }

  return {
    updated,
    inserted,
    fetched: contents.length,
    skipped: false,
  }
}

/** @deprecated name kept for imports — delegates to full Twilio sync. */
export async function syncTemplateApprovalsReadonly(
  db: DbClient,
  tenantId: number
): Promise<{ updated: number; fetched: number; skipped: boolean; error?: string; inserted?: number }> {
  const result = await syncWaTemplatesFromTwilio(db, tenantId)
  return {
    updated: result.updated,
    fetched: result.fetched,
    skipped: result.skipped,
    error: result.error,
    inserted: result.inserted,
  }
}

export function catalogRowsForDebug(rows: WaTemplateRow[]): Array<{
  name: string
  content_sid: string | null
  whatsapp_approval_status: string
  last_synced_at: string | null
}> {
  return rows.map((r) => ({
    name: r.name,
    content_sid: r.content_sid,
    whatsapp_approval_status: r.whatsapp_approval_status,
    last_synced_at: r.last_synced_at,
  }))
}
