import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import {
  composeInboundEmailText,
  fetchReceivedEmail,
  normalizeInboundEmailPayload,
} from '@/lib/email'
import { ingestInboundMessage, verifySharedSecret } from '@/lib/inbound-ingest'

export const dynamic = 'force-dynamic'

function verifyEmailWebhook(request: NextRequest): boolean {
  return verifySharedSecret(
    request,
    [process.env.RESEND_WEBHOOK_SECRET, process.env.INBOUND_WEBHOOK_SECRET],
    ['x-webhook-secret']
  )
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyEmailWebhook(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid webhook secret' },
        { status: 401 }
      )
    }

    const raw = await request.json()
    const normalized = normalizeInboundEmailPayload(raw)
    if (!normalized) {
      return NextResponse.json(
        { success: false, error: 'Unrecognized inbound email payload' },
        { status: 400 }
      )
    }

    let text = normalized.text
    if (normalized.needsBodyFetch && normalized.emailId) {
      const received = await fetchReceivedEmail(normalized.emailId)
      if (received?.text) text = received.text
      if (!normalized.subject && received?.subject) normalized.subject = received.subject
    }

    const composed = composeInboundEmailText(normalized.subject, text)
    if (!normalized.from || !composed) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: from, text, timestamp' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const result = await ingestInboundMessage(db, tenantId, {
      from: normalized.from,
      text: composed,
      timestamp: normalized.timestamp,
      source: normalized.source,
      subject: normalized.subject,
      externalMessageId: normalized.externalMessageId,
      senderAddress: normalized.from,
      sourceTag: 'email',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Inbound email webhook error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'GuestFlow Inbound Email',
    version: '1.0',
    status: 'ready',
    accepts: 'POST Resend email.received or normalized { from, text, timestamp }',
    secured: Boolean(process.env.RESEND_WEBHOOK_SECRET || process.env.INBOUND_WEBHOOK_SECRET),
  })
}
