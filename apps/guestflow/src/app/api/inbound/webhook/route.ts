import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { classifyMessage, generateDraftReply } from '@/lib/inbound-classifier'
import { generateTicketDrafts } from '@/lib/ticket-playbooks'
import { processCheckinEvent } from '@/lib/checkin-inference'

export const dynamic = 'force-dynamic'

/**
 * Inbound WhatsApp/SMS/Email Webhook
 * 
 * Accepts normalized message payload from old WhatsApp number (+27836458313)
 * or future bridge (Twilio SMS, email forward, manual paste bulk)
 * 
 * Security: INBOUND_WEBHOOK_SECRET required
 * 
 * Payload schema:
 * {
 *   from: string (phone number with +, or email)
 *   text: string (message body)
 *   timestamp: string (ISO8601)
 *   source: 'legacy_wa' | 'twilio_sms' | 'email_forward' | 'manual_paste'
 *   mediaRefs?: string[] (optional media URLs)
 *   externalMessageId?: string (for deduplication)
 * }
 */

interface InboundMessagePayload {
  from: string
  text: string
  timestamp: string
  source?: string
  mediaRefs?: string[]
  externalMessageId?: string
}

/**
 * Verify webhook secret
 */
function verifyWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  
  if (!secret) {
    console.warn('INBOUND_WEBHOOK_SECRET not configured - webhook is UNSECURED')
    return true // Allow in development mode
  }

  const authHeader = request.headers.get('authorization')
  const providedSecret = authHeader?.replace('Bearer ', '')
  
  return providedSecret === secret
}

/**
 * POST /api/inbound/webhook
 * 
 * Accept inbound message, classify, persist, generate draft reply
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - invalid webhook secret' },
        { status: 401 }
      )
    }

    const payload: InboundMessagePayload = await request.json()

    // Validate required fields
    if (!payload.from || !payload.text || !payload.timestamp) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: from, text, timestamp' 
        },
        { status: 400 }
      )
    }

    const source = payload.source || 'legacy_wa'
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()

    // Check for duplicate message
    if (payload.externalMessageId) {
      const existing = await db.prepare(`
        SELECT id FROM inbound_messages 
        WHERE external_message_id = ? 
        LIMIT 1
      `).get(payload.externalMessageId)

      if (existing) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          messageId: (existing as any).id
        })
      }
    }

    // Find or create thread
    let thread = await db.prepare(`
      SELECT * FROM inbound_threads 
      WHERE from_number = ? AND source = ?
      ORDER BY last_message_at DESC
      LIMIT 1
    `).get(payload.from, source) as any

    if (!thread) {
      // Create new thread
      const threadInsert = await db.prepare(`
        INSERT INTO inbound_threads (
          tenant_id, source, from_number, status, 
          first_message_at, last_message_at
        ) VALUES (?, ?, ?, 'new', ?, ?)
      `).run(
        tenantId,
        source,
        payload.from,
        payload.timestamp,
        payload.timestamp
      )

      thread = await db.prepare('SELECT * FROM inbound_threads WHERE id = ?')
        .get(threadInsert.lastInsertRowid) as any
    } else {
      // Update existing thread
      await db.prepare(`
        UPDATE inbound_threads 
        SET last_message_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(payload.timestamp, thread.id)
    }

    // Insert message
    const messageInsert = await db.prepare(`
      INSERT INTO inbound_messages (
        thread_id, tenant_id, direction, from_number, 
        message_text, media_refs, message_timestamp, external_message_id
      ) VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?)
    `).run(
      thread.id,
      tenantId,
      payload.from,
      payload.text,
      payload.mediaRefs ? JSON.stringify(payload.mediaRefs) : null,
      payload.timestamp,
      payload.externalMessageId || null
    )

    const messageId = messageInsert.lastInsertRowid

    // Classify message
    const classification = classifyMessage({
      messageText: payload.text,
      fromNumber: payload.from,
      threadHistory: [] // TODO: Load previous messages if needed
    })

    // Store classification
    await db.prepare(`
      INSERT INTO message_classifications (
        message_id, thread_id, intent, confidence, 
        extracted_data, missing_fields
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      thread.id,
      classification.intent,
      classification.confidence,
      JSON.stringify(classification.extractedData),
      JSON.stringify(classification.missingFields)
    )

    // Update message with classification flag
    await db.prepare(`
      UPDATE inbound_messages 
      SET is_classified = 1, classification_result = ?
      WHERE id = ?
    `).run(JSON.stringify(classification), messageId)

    // Update thread with classification if high confidence
    if (classification.confidence >= 0.6) {
      let newStatus = 'classified'
      if (classification.intent === 'spam') {
        newStatus = 'closed'
      }

      await db.prepare(`
        UPDATE inbound_threads 
        SET intent = ?, confidence = ?, status = ?, 
            guest_name = ?, metadata = ?
        WHERE id = ?
      `).run(
        classification.intent,
        classification.confidence,
        newStatus,
        classification.extractedData.guestName || null,
        JSON.stringify(classification.extractedData),
        thread.id
      )
    }

    // Handle check-in events (guests group)
    let checkinEvent = null
    if (classification.intent === 'checkin_event' && classification.extractedData.eventType) {
      // Get today's bookings for matching
      const today = new Date().toISOString().split('T')[0]
      const arrivingTodayBookings = await db.prepare(`
        SELECT * FROM bookings
        WHERE tenant_id = ? 
        AND check_in >= ?
        AND check_in < datetime(?, '+1 day')
      `).all(tenantId, today, today) as any[]

      const { event, matchedBooking, confidence } = processCheckinEvent(
        payload.text,
        classification.extractedData.guestName || 'Unknown Guest',
        payload.from,
        classification.extractedData.eventType,
        payload.timestamp,
        arrivingTodayBookings
      )

      // Store check-in event
      const eventInsert = await db.prepare(`
        INSERT INTO guest_checkin_events (
          tenant_id, booking_id, guest_name, guest_phone,
          event_type, event_timestamp, source, message_text,
          inferred_status, confidence
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        event.booking_id || null,
        event.guest_name,
        event.guest_phone || null,
        event.event_type,
        event.event_timestamp,
        payload.source || 'guests_group',
        payload.text,
        'pending_verification',
        event.confidence
      )

      checkinEvent = {
        id: eventInsert.lastInsertRowid,
        ...event,
        matchedBooking: matchedBooking ? {
          id: matchedBooking.id,
          guestName: matchedBooking.guest_name
        } : null
      }
    }

    // Handle outlier/exception tickets
    let ticket = null
    if (classification.intent === 'outlier_exception' && classification.extractedData.outlierCategory) {
      const category = classification.extractedData.outlierCategory

      // Generate ticket drafts
      const { guestReply, staffBrief, staffBriefReady, priority, askStaffFlags } = generateTicketDrafts(
        category,
        {
          guestName: classification.extractedData.guestName,
          guestPhone: payload.from,
          property: 'The Browns Luxury Guest Suites (Dullstroom)',
          issueDescription: payload.text
        }
      )

      // Create ticket
      const ticketInsert = await db.prepare(`
        INSERT INTO guest_tickets (
          tenant_id, thread_id, guest_name, guest_phone,
          category, priority, status, subject, description,
          guest_draft_reply, staff_brief, staff_brief_ready
        ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        thread.id,
        classification.extractedData.guestName || 'Unknown Guest',
        payload.from,
        category,
        priority,
        `${category.replace('_', ' ').toUpperCase()} - ${classification.extractedData.guestName || 'Guest'}`,
        payload.text,
        guestReply,
        staffBrief,
        staffBriefReady ? 1 : 0
      )

      ticket = {
        id: ticketInsert.lastInsertRowid,
        category,
        priority,
        guestDraftReply: guestReply,
        staffBrief,
        staffBriefReady,
        askStaffFlags
      }

      // Store guest draft on message
      await db.prepare(`
        UPDATE inbound_messages 
        SET draft_reply = ?
        WHERE id = ?
      `).run(guestReply, messageId)

      // Update thread status to drafted
      await db.prepare(`
        UPDATE inbound_threads 
        SET status = 'drafted'
        WHERE id = ?
      `).run(thread.id)
    }

    // Generate draft reply (unless spam, checkin event, or outlier already handled)
    let draftReply = null
    if (classification.intent !== 'spam' && 
        classification.intent !== 'checkin_event' && 
        classification.intent !== 'outlier_exception') {
      const { draft, requiresApproval, missingInfo } = generateDraftReply(
        classification,
        'The Browns Luxury Guest Suites (Dullstroom)'
      )

      // Store draft on message
      await db.prepare(`
        UPDATE inbound_messages 
        SET draft_reply = ?
        WHERE id = ?
      `).run(draft, messageId)

      draftReply = {
        text: draft,
        requiresApproval,
        missingInfo
      }

      // Update thread status to drafted
      if (classification.confidence >= 0.6) {
        await db.prepare(`
          UPDATE inbound_threads 
          SET status = 'drafted'
          WHERE id = ?
        `).run(thread.id)
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      threadId: thread.id,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        extractedData: classification.extractedData,
        missingFields: classification.missingFields
      },
      draftReply,
      checkinEvent,
      ticket,
      status: thread.status
    })

  } catch (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inbound/webhook
 * 
 * Health check / webhook verification
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const challenge = searchParams.get('challenge')

  // Support webhook verification pattern (e.g., for future integrations)
  if (challenge) {
    return new NextResponse(challenge, {
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return NextResponse.json({
    service: 'GuestFlow Inbound Webhook',
    version: '1.0',
    status: 'ready',
    accepts: 'POST with Bearer token',
    secured: !!process.env.INBOUND_WEBHOOK_SECRET
  })
}
