import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { linkTempToBooking } from '@/lib/umi-threads'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const threadId = Number(context.params.id)
    const body = (await request.json()) as { bookingId?: number }
    const bookingId = Number(body.bookingId)
    if (!Number.isFinite(threadId) || !Number.isFinite(bookingId)) {
      return jsonSafeResponse({ success: false, error: 'thread id and bookingId are required' }, { status: 400 })
    }
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const result = await linkTempToBooking(db, tenantId, threadId, bookingId)
    return jsonSafeResponse({ success: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link thread'
    const status = /not a temp|not found/i.test(message) ? 400 : 500
    return jsonSafeResponse({ success: false, error: message }, { status })
  }
}
