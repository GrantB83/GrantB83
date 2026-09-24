import { NextRequest } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { jsonSafeResponse } from '@/lib/json-safe'
import { ingestInboundMessage, verifySharedSecret } from '@/lib/inbound-ingest'
import { addDaysIsoDate, sastDateString } from '@/lib/umi-sort'

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
        metadata?: Record<string, unknown>
      }>
    }
    const messages = Array.isArray(body.messages) ? body.messages : []
    const cutoff = addDaysIsoDate(sastDateString(), -BACKFILL_DAYS)
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()

    let accepted = 0
    let duplicates = 0
    let ignoredTooOld = 0
    const threadsTouched = new Set<number>()

    for (const item of messages) {
      if (!item?.from || !item.timestamp || !item.externalMessageId) {
        ignoredTooOld += 1
        continue
      }
      const day = String(item.timestamp).slice(0, 10)
      if (day && day < cutoff) {
        ignoredTooOld += 1
        continue
      }
      const result = await ingestInboundMessage(db, tenantId, {
        from: item.from,
        text: item.text || '[body unavailable]',
        timestamp: item.timestamp,
        source: 'whatsapp_web',
        externalMessageId: item.externalMessageId,
      })
      if (result.duplicate) {
        duplicates += 1
      } else {
        accepted += 1
      }
      threadsTouched.add(Number(result.threadId))
    }

    return jsonSafeResponse({
      success: true,
      accepted,
      duplicates,
      ignoredTooOld,
      threadsTouched: threadsTouched.size,
      windowDays: BACKFILL_DAYS,
    })
  } catch (error) {
    console.error('[umi/backfill]', error)
    return jsonSafeResponse({ success: false, error: 'Backfill failed' }, { status: 500 })
  }
}
