import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import {
  composeInboundEmailText,
  fetchReceivedEmail,
  normalizeInboundEmailPayload,
} from '@/lib/email'
import { applyBookingContact } from '@/lib/contact-apply'
import { ingestInboundMessage, verifySharedSecret } from '@/lib/inbound-ingest'
import { ingestNbEmail, looksLikeNbInbound } from '@/lib/nb-email-ingest'
import { matchStayAtBooking } from '@/lib/stay-at-match'

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
    if (looksLikeNbInbound(normalized.from, normalized.subject)) {
      const nb = await ingestNbEmail(db, {
        from: normalized.from,
        subject: normalized.subject,
        text: composed,
        timestamp: normalized.timestamp,
        messageId: normalized.externalMessageId,
        tenantId,
      })
      return NextResponse.json(nb)
    }
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

    try {
      const bookings = ((await db
        .prepare(
          `SELECT id, guest_name, check_in, check_out, nightsbridge_booking_id
           FROM bookings
           WHERE tenant_id = ? AND COALESCE(status, '') NOT IN ('cancelled', 'canceled')`
        )
        .all(tenantId)) || []) as Array<{
        id: number
        guest_name: string
        check_in: string
        check_out: string
        nightsbridge_booking_id: string | null
      }>
      const matched = matchStayAtBooking(bookings, {
        from: normalized.from,
        subject: normalized.subject,
        text: composed,
      })
      if (matched) {
        await applyBookingContact(db, {
          tenantId,
          bookingId: matched.id,
          email: normalized.from,
          source: 'stay_at',
          sourceRef: normalized.externalMessageId || 'stay-at-inbound',
          displayName: matched.guest_name,
          lastStayAt: matched.check_out,
          nbid: matched.nightsbridge_booking_id,
        })
      }
    } catch (contactError) {
      console.warn('stay@ contact capture skipped:', contactError)
    }

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
