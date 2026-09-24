import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { listInboxThreads } from '@/lib/umi-threads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const filter = url.searchParams.get('filter') === 'needs-attention'
      ? 'needs-attention'
      : 'all'
    const q = url.searchParams.get('q') || undefined
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const threads = await listInboxThreads(db, tenantId, { filter, q })
    return jsonSafeResponse({ success: true, filter, threads })
  } catch (error) {
    console.error('[umi/inbox]', error)
    return jsonSafeResponse(
      { success: false, error: 'Failed to load inbox' },
      { status: 500 }
    )
  }
}
