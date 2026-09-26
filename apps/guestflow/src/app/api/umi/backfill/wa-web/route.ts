import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { ingestInboundMessage, verifySharedSecret } from '@/lib/inbound-ingest'
import { findWaWebSentinelForReplace } from '@/lib/umi-threads'
import { addDaysIsoDate, sastDateString } from '@/lib/umi-sort'
import { isWaWebSentinelBody } from '@/lib/wa-web-body'

export const dynamic = 'force-dynamic'

const BACKFILL_DAYS = 14

export async function POST(request: NextRequest) {
  try {
    if (
      !verifySharedSecret(
        request,
        [process.env.INBOUND_WEBHOOK_SECRET, process.env.WA_WEB_BACKFILL_SECRET],
        ['x-webhook-secret', 'x-bridge-secret']
      )
    ) {
      return jsonSafeResponse({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
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
    }
    const messages = Array.isArray(body.messages) ? body.messages : []
    const cutoff = addDaysIsoDate(sastDateString(), -BACKFILL_DAYS)
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()

    let accepted = 0
    let replaced = 0
    let duplicates = 0
    let skippedEmpty = 0
    let ignoredTooOld = 0
    const threadsTouched = new Set<number>()

    for (const item of messages) {
      if (!item?.from || !item.timestamp || !item.externalMessageId) {
        ignoredTooOld += 1
        continue
      }
      const text = String(item.text || '').trim()
      const day = String(item.timestamp).slice(0, 10)
      const tooOld = Boolean(day && day < cutoff)
      if (tooOld) {
        const openSentinel = await findWaWebSentinelForReplace(db, {
          externalMessageId: item.externalMessageId,
          from: item.from,
          timestamp: item.timestamp,
        })
        if (!openSentinel) {
          ignoredTooOld += 1
          continue
        }
      }

      const result = await ingestInboundMessage(db, tenantId, {
        from: item.from,
        text,
        timestamp: item.timestamp,
        source: 'whatsapp_web',
        externalMessageId: item.externalMessageId,
        displayName: item.displayName,
        contactName: item.contactName,
        pushName: item.pushName,
        notifyName: item.notifyName,
        chatTitle: item.chatTitle,
        name: item.name,
        metadata: item.metadata,
      })
      if (result.threadId) threadsTouched.add(Number(result.threadId))
      if (result.skipped || isWaWebSentinelBody(text)) {
        skippedEmpty += 1
        continue
      }
      if (result.replaced) {
        replaced += 1
      } else if (result.duplicate) {
        duplicates += 1
      } else {
        accepted += 1
      }
    }

    return jsonSafeResponse({
      success: true,
      accepted,
      replaced,
      duplicates,
      skippedEmpty,
      ignoredTooOld,
      threadsTouched: threadsTouched.size,
      windowDays: BACKFILL_DAYS,
    })
  } catch (error) {
    console.error('[umi/backfill]', error)
    return jsonSafeResponse({ success: false, error: 'Backfill failed' }, { status: 500 })
  }
}
