import { NextRequest } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { ensureUmiSchema } from '@/lib/umi-schema'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const threadId = Number(context.params.id)
    if (!Number.isFinite(threadId)) {
      return jsonSafeResponse({ success: false, error: 'Invalid thread id' }, { status: 400 })
    }
    const db = await getDbAsync()
    await ensureUmiSchema(db)
    await db
      .prepare(
        `UPDATE inbound_threads SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
      .run(threadId)
    await db
      .prepare(
        `UPDATE inbound_messages SET status = 'approved' WHERE thread_id = ? AND draft_reply IS NOT NULL`
      )
      .run(threadId)
    return jsonSafeResponse({ success: true, threadId, status: 'approved' })
  } catch (error) {
    console.error('[umi/approve]', error)
    return jsonSafeResponse({ success: false, error: 'Failed to approve thread' }, { status: 500 })
  }
}
