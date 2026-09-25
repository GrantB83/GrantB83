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
    
    // If debug is requested, gather raw database stats before filtering
    if (debug) {
      const rawMaxIdRow = (await db
        .prepare(`SELECT MAX(id) AS max_id FROM inbound_threads WHERE tenant_id = ?`)
        .get(tenantId)) as { max_id?: number | null } | undefined
      const rawCountRow = (await db
        .prepare(`SELECT COUNT(*) AS count FROM inbound_threads WHERE tenant_id = ?`)
        .get(tenantId)) as { count?: number | null } | undefined
      
      const rawMaxId = rawMaxIdRow?.max_id == null ? null : Number(rawMaxIdRow.max_id)
      const rawCount = rawCountRow?.count == null ? 0 : Number(rawCountRow.count)
      
      response.debug = {
        tenantId,
        rawMaxId,
        rawCount,
      }
    }
    
    // Fetch threads using existing listInboxThreads logic
    const threads = await listInboxThreads(db, tenantId, { filter, q })
    response.threads = threads
    
    // If debug, add list-level stats and specific ID presence checks
    if (debug && response.debug && typeof response.debug === 'object') {
      const debugObj = response.debug as Record<string, unknown>
      const threadIds = threads.map((t) => t.id)
      const listMaxId = threadIds.length > 0 ? Math.max(...threadIds) : null
      const listCount = threads.length
      
      debugObj.listMaxId = listMaxId
      debugObj.listCount = listCount
      debugObj.idsPresentFor48_49_50 = {
        '48': threadIds.includes(48),
        '49': threadIds.includes(49),
        '50': threadIds.includes(50),
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
