import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { getThreadDetail } from '@/lib/umi-threads'
import { ensureUmiSchema } from '@/lib/umi-schema'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const threadId = Number(context.params.id)
    if (!Number.isFinite(threadId)) {
      return jsonSafeResponse({ success: false, error: 'Invalid thread id' }, { status: 400 })
    }
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const thread = await getThreadDetail(db, tenantId, threadId)
    if (!thread) {
      return jsonSafeResponse({ success: false, error: 'Thread not found' }, { status: 404 })
    }
    return jsonSafeResponse({ success: true, thread })
  } catch (error) {
    console.error('[umi/thread]', error)
    return jsonSafeResponse({ success: false, error: 'Failed to load thread' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const threadId = Number(context.params.id)
    const body = (await request.json()) as { text?: string }
    const text = String(body.text || '').trim()
    if (!Number.isFinite(threadId) || !text) {
      return jsonSafeResponse({ success: false, error: 'thread id and text are required' }, { status: 400 })
    }
    const db = await getDbAsync()
    await ensureUmiSchema(db)
    const latest = (await db
      .prepare(
        `SELECT id FROM inbound_messages WHERE thread_id = ? ORDER BY message_timestamp DESC LIMIT 1`
      )
      .get(threadId)) as { id: number } | undefined
    if (!latest) {
      return jsonSafeResponse({ success: false, error: 'No message to attach draft' }, { status: 400 })
    }
    await db
      .prepare(
        `UPDATE inbound_messages SET draft_reply = ?, draft_source = 'human', status = 'drafted' WHERE id = ?`
      )
      .run(text, latest.id)
    await db
      .prepare(
        `UPDATE inbound_threads SET status = 'drafted', pending_reply = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
      .run(threadId)
    return jsonSafeResponse({ success: true, threadId, draftSource: 'human' })
  } catch (error) {
    console.error('[umi/thread draft]', error)
    return jsonSafeResponse({ success: false, error: 'Failed to save draft' }, { status: 500 })
  }
}
