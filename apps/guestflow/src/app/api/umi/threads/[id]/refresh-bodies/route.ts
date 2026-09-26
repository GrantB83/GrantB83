import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { ingestInboundMessage } from '@/lib/inbound-ingest'
import {
  applyRecoveredStayHygiene,
  listWaWebSentinelTargets,
} from '@/lib/umi-threads'
import { isWaWebSentinelBody } from '@/lib/wa-web-body'

export const dynamic = 'force-dynamic'

const BATCH_CAP = 10

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const threadId = Number(context.params.id)
  if (!Number.isFinite(threadId)) {
    return jsonSafeResponse({ success: false, error: 'Invalid thread id' }, { status: 400 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      messages?: Array<{
        from?: string
        text?: string
        timestamp?: string
        externalMessageId?: string
        displayName?: string
        contactName?: string
        pushName?: string
        notifyName?: string
        chatTitle?: string
        name?: string
        metadata?: Record<string, unknown>
      }>
      threadIds?: number[]
    }

    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const messages = Array.isArray(body.messages) ? body.messages.slice(0, BATCH_CAP) : []

    let replaced = 0
    for (const item of messages) {
      if (!item?.from || !item.timestamp || !item.externalMessageId) continue
      const text = String(item.text || '').trim()
      if (isWaWebSentinelBody(text)) continue
      const result = await ingestInboundMessage(db, tenantId, {
        from: item.from,
        text,
        timestamp: item.timestamp,
        source: 'whatsapp_web',
        externalMessageId: item.externalMessageId,
        preferredThreadId: threadId,
        displayName: item.displayName,
        contactName: item.contactName,
        pushName: item.pushName,
        notifyName: item.notifyName,
        chatTitle: item.chatTitle,
        name: item.name,
        metadata: item.metadata,
      })
      if (result.replaced) replaced += 1
    }

    const extraIds = Array.isArray(body.threadIds)
      ? body.threadIds.filter((id) => Number.isFinite(id)).slice(0, BATCH_CAP)
      : [threadId]
    if (!extraIds.includes(threadId)) extraIds.unshift(threadId)

    let filteredCleared = 0
    for (const id of extraIds.slice(0, BATCH_CAP)) {
      filteredCleared += await applyRecoveredStayHygiene(db, id)
    }

    const remaining = await listWaWebSentinelTargets(db, tenantId, { threadId, days: 30 })
    const remainingSentinels = remaining.length
    if (remainingSentinels > 0 && replaced === 0 && messages.length === 0) {
      return jsonSafeResponse({
        success: false,
        threadId,
        replaced,
        remainingSentinels,
        filteredCleared,
        error: 'Bodies still unavailable',
        nextAction: 'Ask CoS for a one-shot observe on this chat. Do not invent text.',
      })
    }
    if (remainingSentinels > 0 && messages.length > 0 && replaced === 0) {
      return jsonSafeResponse({
        success: false,
        threadId,
        replaced,
        remainingSentinels,
        filteredCleared,
        error: 'Bodies still unavailable',
        nextAction: 'Source text did not replace sentinels. Check ids/timestamps. Do not invent text.',
      })
    }

    return jsonSafeResponse({
      success: true,
      threadId,
      replaced,
      remainingSentinels,
      filteredCleared,
      nextAction:
        remainingSentinels === 0
          ? 'Bodies updated. Read the thread.'
          : `${remainingSentinels} sentinel(s) remain. Residual history may have scrolled off WhatsApp Web.`,
    })
  } catch (error) {
    console.error('[umi/refresh-bodies]', error)
    return jsonSafeResponse(
      {
        success: false,
        threadId,
        error: 'Body refresh failed',
        nextAction: 'Retry Refresh bodies. If it fails again, ask CoS for a one-shot observe. Do not invent text.',
      },
      { status: 500 }
    )
  }
}
