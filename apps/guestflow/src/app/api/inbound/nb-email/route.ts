import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import {
  composeInboundEmailText,
  fetchReceivedEmail,
  normalizeInboundEmailPayload,
} from '@/lib/email'
import { verifySharedSecret } from '@/lib/inbound-ingest'
import { ingestNbEmail } from '@/lib/nb-email-ingest'

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
      return NextResponse.json({ ok: false, error: 'Unauthorized - invalid webhook secret' }, { status: 401 })
    }
    const raw = await request.json()
    const normalized = normalizeInboundEmailPayload(raw)
    if (!normalized) {
      return NextResponse.json({ ok: false, error: 'Unrecognized inbound email payload' }, { status: 400 })
    }
    let text = normalized.text
    if (normalized.needsBodyFetch && normalized.emailId) {
      const received = await fetchReceivedEmail(normalized.emailId)
      if (received?.text) text = received.text
      if (!normalized.subject && received?.subject) normalized.subject = received.subject
    }
    const composed = composeInboundEmailText(normalized.subject, text)
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    const result = await ingestNbEmail(db, {
      from: normalized.from,
      subject: normalized.subject,
      text: composed,
      timestamp: normalized.timestamp,
      messageId: normalized.externalMessageId,
      tenantId,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'GuestFlow Nightsbridge inbound email',
    version: '1.0',
    status: 'ready',
    createsGuestThread: false,
    mailbox: 'stay@thebrowns.co.za',
    forwardDependency: 'stay@hospitality.partners → stay@thebrowns.co.za (GFM confirming)',
    secured: Boolean(process.env.RESEND_WEBHOOK_SECRET || process.env.INBOUND_WEBHOOK_SECRET),
  })
}
