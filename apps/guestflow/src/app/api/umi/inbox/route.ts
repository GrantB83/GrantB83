import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { listInboxThreads } from '@/lib/umi-threads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') === 'needs-attention'
      ? 'needs-attention'
      : 'all'
    const q = url.searchParams.get('q') || undefined
    const debug = url.searchParams.get('debug') === '1'
    
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    
    // Build response with optional debug diagnostics
    const response: Record<string, unknown> = {
      success: true,
      filter,
      timestamp,
    }
    
    // If debug is requested, gather raw database stats with same eligibility as list (excludes linked)
    if (debug) {
      // raw* = list universe: inbound_threads WHERE tenant_id AND status NOT linked
      const rawMaxIdRow = (await db
        .prepare(`SELECT MAX(id) AS max_id FROM inbound_threads WHERE tenant_id = ? AND COALESCE(status, '') <> 'linked'`)
        .get(tenantId)) as { max_id?: number | null } | undefined
      const rawCountRow = (await db
        .prepare(`SELECT COUNT(*) AS count FROM inbound_threads WHERE tenant_id = ? AND COALESCE(status, '') <> 'linked'`)
        .get(tenantId)) as { count?: number | null } | undefined
      
      const rawMaxId = rawMaxIdRow?.max_id == null ? null : Number(rawMaxIdRow.max_id)
      const rawCount = rawCountRow?.count == null ? 0 : Number(rawCountRow.count)
      
      // query* = DISTINCT thread IDs from same WHERE (no JOIN inflation)
      const queryStatsRow = (await db
        .prepare(
          `SELECT COUNT(DISTINCT t.id) AS distinct_count, MAX(t.id) AS max_id
           FROM inbound_threads t
           WHERE t.tenant_id = ?
             AND COALESCE(t.status, '') <> 'linked'`
        )
        .get(tenantId)) as { distinct_count?: number | null; max_id?: number | null } | undefined
      
      const queryMaxId = queryStatsRow?.max_id == null ? null : Number(queryStatsRow.max_id)
      const queryCount = queryStatsRow?.distinct_count == null ? 0 : Number(queryStatsRow.distinct_count)
      
      // Check specific threads 48-50
      const thread48 = (await db
        .prepare(`SELECT id, thread_kind, status, booking_id FROM inbound_threads WHERE id = 48 AND tenant_id = ?`)
        .get(tenantId)) as any
      const thread49 = (await db
        .prepare(`SELECT id, thread_kind, status, booking_id FROM inbound_threads WHERE id = 49 AND tenant_id = ?`)
        .get(tenantId)) as any
      const thread50 = (await db
        .prepare(`SELECT id, thread_kind, status, booking_id FROM inbound_threads WHERE id = 50 AND tenant_id = ?`)
        .get(tenantId)) as any
      
      response.debug = {
        tenantId,
        rawMaxId,
        rawCount,
        queryMaxId,
        queryCount,
        query48_49_50: {
          '48': thread48 || null,
          '49': thread49 || null,
          '50': thread50 || null,
        },
      }
    }
    
    // Fetch threads using existing listInboxThreads logic
    const threads = await listInboxThreads(db, tenantId, { filter, q })
    response.threads = threads
    
    // If debug, add list-level stats and validate thread IDs
    if (debug && response.debug && typeof response.debug === 'object') {
      const debugObj = response.debug as Record<string, unknown>
      const threadIds = threads.map((t) => t.id)
      const listMaxId = threadIds.length > 0 ? Math.max(...threadIds) : null
      const listCount = threads.length
      
      // Validate: all list IDs must exist in inbound_threads for this tenant
      const validThreadIds = ((await db
        .prepare(
          `SELECT id FROM inbound_threads 
           WHERE tenant_id = ? AND id IN (${threadIds.map(() => '?').join(',')})`)
        .all(tenantId, ...threadIds)) || []) as Array<{ id: number }>
      const validIds = validThreadIds.map((r) => Number(r.id))
      const phantomIds = threadIds.filter((id) => !validIds.includes(id))
      
      debugObj.listMaxId = listMaxId
      debugObj.listCount = listCount
      debugObj.idsPresentFor48_49_50 = {
        '48': threadIds.includes(48),
        '49': threadIds.includes(49),
        '50': threadIds.includes(50),
      }
      debugObj.phantomIds = phantomIds.length > 0 ? phantomIds : null
      debugObj.validation = {
        allIdsValid: phantomIds.length === 0,
        phantomCount: phantomIds.length,
      }
    }
    
    return jsonSafeResponse(response)
  } catch (error) {
    console.error('[umi/inbox]', error)
    return jsonSafeResponse(
      { success: false, error: 'Failed to load inbox', timestamp },
      { status: 500 }
    )
  }
}
