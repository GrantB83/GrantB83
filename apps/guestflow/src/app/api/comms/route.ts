import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { listInboxThreads } from '@/lib/umi-threads'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync()
    const tenantId = parseInt(request.nextUrl.searchParams.get('tenant_id') || '') || (await getDefaultTenantIdAsync())
    const threads = await listInboxThreads(db, tenantId)
    return jsonSafeResponse({
      success: true,
      messages: threads.map((thread) => ({
        id: thread.id,
        timestamp: thread.lastMessageAt,
        direction: 'inbound',
        channel: thread.lastChannel || 'whatsapp',
        content: thread.preview,
        sender: thread.bookerName,
        status: thread.hasOpenDraft ? 'draft' : 'delivered',
      })),
    })
  } catch (error) {
    console.error('Error fetching comms:', error)
    return jsonSafeResponse(
      { success: false, error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}
