import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { SendMessageRequest, SendMessageResponse } from '@/types/inbound'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inbound/send
 * 
 * Send an approved WhatsApp reply to a guest
 * 
 * @param request - Request with { threadId: number } body
 * @returns Send outcome with message ID or error details
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  
  try {
    // T013: Validate request body
    const body = await request.json() as SendMessageRequest
    const { threadId } = body

    if (!threadId || typeof threadId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'threadId is required and must be a number' } as SendMessageResponse,
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    // T014: Fetch thread and latest message with draft reply
    const thread = await db.prepare(`
      SELECT id, from_number, status, guest_name
      FROM inbound_threads
      WHERE id = ?
    `).get(threadId) as any

    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' } as SendMessageResponse,
        { status: 400 }
      )
    }

    const latestMessage = await db.prepare(`
      SELECT id, draft_reply
      FROM inbound_messages
      WHERE thread_id = ?
      ORDER BY message_timestamp DESC
      LIMIT 1
    `).get(threadId) as any

    if (!latestMessage || !latestMessage.draft_reply) {
      return NextResponse.json(
        { success: false, error: 'Thread has no draft reply to send' } as SendMessageResponse,
        { status: 400 }
      )
    }

    const draftReply = latestMessage.draft_reply

    // T039: Redact phone number for security (show last 4 digits only)
    const redactedPhone = thread.from_number.length > 4 
      ? thread.from_number.slice(0, -4).replace(/./g, '*') + thread.from_number.slice(-4)
      : thread.from_number

    // T018: Log send attempt (audit trail per FR-012)
    console.log(`[Send] threadId=${threadId}, to=${redactedPhone}, timestamp=${timestamp}`)

    // T015: Call sendWhatsAppMessage from existing library
    const sendResult = await sendWhatsAppMessage({
      to: thread.from_number,
      message: draftReply
    })

    if (sendResult.success) {
      // T016: Success path - persist outbound message and update thread status
      console.log(`[Send Success] threadId=${threadId}, messageId=${sendResult.messageId}, provider=${sendResult.provider}, sandbox=${sendResult.sandboxMode}`)

      // Use transaction to insert outbound message + update thread status atomically
      await db.batch([
        // Insert outbound message
        {
          sql: `
            INSERT INTO inbound_messages (
              thread_id, message_text, message_timestamp, tenant_id,
              direction, whatsapp_provider, whatsapp_message_id
            ) VALUES (?, ?, ?, 1, 'outbound', ?, ?)
          `,
          args: [
            threadId,
            draftReply,
            sendResult.timestamp,
            sendResult.provider,
            sendResult.messageId
          ]
        },
        // Update thread status to 'sent' and last_message_at
        {
          sql: `
            UPDATE inbound_threads 
            SET status = 'sent', last_message_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [sendResult.timestamp, threadId]
        }
      ])

      return NextResponse.json({
        success: true,
        data: {
          messageId: sendResult.messageId,
          timestamp: sendResult.timestamp,
          provider: sendResult.provider!,
          sandboxMode: sendResult.sandboxMode!,
          threadStatus: 'sent'
        }
      } as SendMessageResponse)

    } else {
      // T017: Error path - persist outbound message with error and update thread status to 'failed'
      const errorMessage = sendResult.error || 'Unknown error'
      console.error(`[Send Error] threadId=${threadId}, error=${errorMessage}, provider=${sendResult.provider}`)

      // Use transaction to insert outbound message with error + update thread status
      await db.batch([
        // Insert outbound message with send_error populated
        {
          sql: `
            INSERT INTO inbound_messages (
              thread_id, message_text, message_timestamp, tenant_id,
              direction, whatsapp_provider, send_error
            ) VALUES (?, ?, ?, 1, 'outbound', ?, ?)
          `,
          args: [
            threadId,
            draftReply,
            sendResult.timestamp,
            sendResult.provider,
            errorMessage
          ]
        },
        // Update thread status to 'failed'
        {
          sql: `
            UPDATE inbound_threads 
            SET status = 'failed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [threadId]
        }
      ])

      return NextResponse.json({
        success: false,
        error: 'Failed to send WhatsApp message',
        details: errorMessage
      } as SendMessageResponse, { status: 500 })
    }

  } catch (error) {
    console.error('[Send Fatal Error]', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as SendMessageResponse, { status: 500 })
  }
}
