import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { listWaWebSentinelTargets } from '@/lib/umi-threads'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const days = Number(url.searchParams.get('days') || 14)
    const threadIdRaw = url.searchParams.get('threadId')
    const threadId = threadIdRaw ? Number(threadIdRaw) : undefined
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const sentinels = await listWaWebSentinelTargets(db, tenantId, {
      days,
      threadId: Number.isFinite(threadId) ? threadId : undefined,
    })
    return jsonSafeResponse({
      success: true,
      sentinels,
      count: sentinels.length,
    })
  } catch (error) {
    console.error('[umi/wa-web/sentinels]', error)
    return jsonSafeResponse({ success: false, error: 'Failed to list sentinel bodies' }, { status: 500 })
  }
}
