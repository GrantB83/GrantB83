import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage, isWhatsAppConfigured } from '@/lib/whatsapp'
import { getDb } from '@/lib/db'

interface SendRequest {
  draftId: number
  guestPhone: string
  message: string
  portalUrl?: string
}

interface SendLogEntry {
  draft_id: number
  guest_phone: string
  send_status: 'success' | 'failed'
  message_id: string | null
  error_message: string | null
  sent_at: string
  has_portal_link: boolean
}

/**
 * POST /api/whatsapp/send
 * 
 * Send a WhatsApp message after human approval
 * 
 * Hard Gates:
 * - Only called after explicit UI button click + confirmation
 * - Disabled entirely if env vars missing
 * - Logs send attempt without storing message body
 * - Returns clear error if not configured
 */
export async function POST(request: NextRequest) {
  try {
    // Check configuration
    if (!isWhatsAppConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp not configured',
          details: 'Missing required environment variables (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID)'
        },
        { status: 503 }
      )
    }

    const body: SendRequest = await request.json()
    const { draftId, guestPhone, message, portalUrl } = body

    // Validate required fields
    if (!draftId || !guestPhone || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send WhatsApp message
    const result = await sendWhatsAppMessage({
      to: guestPhone,
      message,
      portalUrl
    })

    // Log the send attempt to database (without storing message body)
    try {
      const db = getDb()
      
      // Check if whatsapp_send_log table exists, create if not
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='whatsapp_send_log'
      `).get()

      if (!tableExists) {
        db.prepare(`
          CREATE TABLE whatsapp_send_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            draft_id INTEGER NOT NULL,
            guest_phone TEXT NOT NULL,
            send_status TEXT NOT NULL,
            message_id TEXT,
            error_message TEXT,
            sent_at TEXT NOT NULL,
            has_portal_link INTEGER NOT NULL DEFAULT 0
          )
        `).run()
      }

      // Insert log entry
      db.prepare(`
        INSERT INTO whatsapp_send_log 
        (draft_id, guest_phone, send_status, message_id, error_message, sent_at, has_portal_link)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        draftId,
        guestPhone,
        result.success ? 'success' : 'failed',
        result.messageId || null,
        result.error || null,
        result.timestamp,
        portalUrl ? 1 : 0
      )

      // Update booking/draft record with send status if schema allows
      // Check if bookings table has whatsapp_sent column
      const columnExists = db.prepare(`
        SELECT COUNT(*) as count
        FROM pragma_table_info('bookings')
        WHERE name='whatsapp_sent'
      `).get() as { count: number }

      if (columnExists.count > 0) {
        db.prepare(`
          UPDATE bookings 
          SET whatsapp_sent = ?, whatsapp_sent_at = ?
          WHERE id = ?
        `).run(result.success ? 1 : 0, result.timestamp, draftId)
      }

    } catch (dbError) {
      console.error('Failed to log WhatsApp send to database:', dbError)
      // Continue even if logging fails
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
        message: 'WhatsApp message sent successfully'
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: result.timestamp
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('WhatsApp send route error:', error)
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
 * GET /api/whatsapp/send
 * 
 * Check WhatsApp configuration status
 */
export async function GET() {
  const configured = isWhatsAppConfigured()
  
  return NextResponse.json({
    configured,
    message: configured 
      ? 'WhatsApp is configured and ready to send'
      : 'WhatsApp not configured (missing env vars)',
    requiredEnvVars: [
      'WHATSAPP_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID', 
      'WHATSAPP_BUSINESS_ACCOUNT_ID'
    ]
  })
}
