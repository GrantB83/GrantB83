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
  const startTime = Date.now()
  const TIMEOUT_MS = 30000 // 30 seconds

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

    // P1: Check for timeout before classification
    const elapsedMs = Date.now() - startTime
    if (elapsedMs > TIMEOUT_MS) {
      // P1: Timeout → Exception (never silent drop)
      const timeoutException = await db.prepare(`
        INSERT INTO guest_tickets (
          tenant_id, thread_id, guest_name, guest_phone,
          category, priority, status, subject, description,
          problem_description, context_found, reason_stopped, suggested_next_step
        ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)
      `).run(
        tenantId,
        thread.id,
        'Unknown Guest',
        payload.from,
        'timeout',
        'medium',
        `Classification Timeout - ${payload.from}`,
        payload.text,
        `Original message: ${payload.text.substring(0, 100)}...`,
        `Processing started at ${new Date(startTime).toISOString()}`,
        `Classification timeout after ${TIMEOUT_MS}ms`,
        `Manual review and classify required`
      )

      return NextResponse.json({
        success: true,
        messageId,
        threadId: thread.id,
        timeout: true,
        exception: {
          id: timeoutException.lastInsertRowid,
          category: 'timeout',
          reason: `Processing exceeded ${TIMEOUT_MS}ms`
        }
      })
    }

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

    // P1: Auto-enqueue booking_inquiry with rate card check
    let exception = null
    if (classification.intent === 'booking_inquiry' && 
        classification.extractedData.checkIn &&
        classification.confidence >= 0.6) {
      
      // Check if rate card exists for requested dates
      const property = classification.extractedData.property || 'default'
      const checkIn = classification.extractedData.checkIn
      const checkOut = classification.extractedData.checkOut
      
      const rateCard = await db.prepare(`
        SELECT * FROM rate_cards
        WHERE tenant_id = ?
        AND (
          (valid_from IS NULL AND valid_to IS NULL) OR
          (valid_from <= ? AND (valid_to IS NULL OR valid_to >= ?))
        )
        LIMIT 1
      `).get(tenantId, checkIn, checkIn) as any

      if (!rateCard) {
        // P1: Missing rate card → Create Exception (never invent rates)
        const exceptionInsert = await db.prepare(`
          INSERT INTO guest_tickets (
            tenant_id, thread_id, guest_name, guest_phone,
            category, priority, status, subject, description,
            problem_description, context_found, reason_stopped, suggested_next_step
          ) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)
        `).run(
          tenantId,
          thread.id,
          classification.extractedData.guestName || 'Unknown Guest',
          payload.from,
          'missing_rate_card',
          'high',
          `Missing Rate Card - ${classification.extractedData.guestName || 'Guest'}`,
          payload.text,
          `Guest inquiry for ${checkIn}${checkOut ? ` to ${checkOut}` : ''}, ${classification.extractedData.adults || '?'} adults`,
          `Property: ${property}, Check-in: ${checkIn}, Adults: ${classification.extractedData.adults || 'unknown'}`,
          `No rate card found for requested dates`,
          `Upload rate card at /ops/rate-cards or manually quote`
        )

        exception = {
          id: exceptionInsert.lastInsertRowid,
          category: 'missing_rate_card',
          reason: 'No rate card available for requested dates'
        }

        // Do NOT create draft reply - exception instead
      } else {
        // Rate card exists - generate quote draft
        const rate = rateCard.rate_per_night
        const nights = checkOut ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) : 1
        const adults = classification.extractedData.adults || 2

        const quoteDraft = `Hi${classification.extractedData.guestName ? ` ${classification.extractedData.guestName}` : ' there'},

Thank you for your interest in The Browns Luxury Guest Suites!

📅 Dates: ${checkIn}${checkOut ? ` to ${checkOut}` : ' (check-out date needed)'}
👥 Guests: ${adults} adult${adults > 1 ? 's' : ''}
🏡 Property: ${property}

Rate: R${rate} per night
${checkOut ? `Total for ${nights} night${nights > 1 ? 's' : ''}: R${(rate * nights).toFixed(2)}` : ''}

[Rate card applied - requires approval before send]

Looking forward to welcoming you!

Warm regards,
The Browns Team`

        // Store draft on message
        await db.prepare(`
          UPDATE inbound_messages 
          SET draft_reply = ?
          WHERE id = ?
        `).run(quoteDraft, messageId)

        // Update thread status to drafted (queued for approval)
        await db.prepare(`
          UPDATE inbound_threads 
          SET status = 'drafted'
          WHERE id = ?
        `).run(thread.id)
      }
    }

    // Generate draft reply (for other intents: date_query, suite_preference, etc.)
    let draftReply = null
    if (classification.intent !== 'spam' && 
        classification.intent !== 'checkin_event' && 
        classification.intent !== 'outlier_exception' &&
        classification.intent !== 'booking_inquiry') { // booking_inquiry handled above
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
      exception,
      queuedForApproval: thread.status === 'drafted',
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
