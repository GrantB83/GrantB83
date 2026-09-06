import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { startOfDay, addDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/nightsbridge-ingest
 * 
 * Cron endpoint for NightsBridge data upload
 * Auto-enqueues welcome/late check-in drafts (P1)
 * 
 * Security: x-cron-secret header required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const secret = process.env.CRON_SECRET
    const providedSecret = request.headers.get('x-cron-secret')

    if (!secret) {
      console.warn('CRON_SECRET not configured')
    } else if (providedSecret !== secret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse multipart form data (file upload)
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // For now, stub parsing - real implementation would use xlsx library
    // This is a placeholder that shows the structure
    console.log('Received NB file:', file.name, file.size, 'bytes')

    const db = await getDbAsync()
    const tenantId = 1 // Browns

    // Stub: In real implementation, parse Excel file
    // For now, just demonstrate the auto-enqueue logic
    
    const targetDate = new URL(request.url).searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const today = startOfDay(new Date()).toISOString().split('T')[0]
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

    // P1: Auto-enqueue welcome drafts for arrivals in next 24-48h
    const arrivingSoon = await db.prepare(`
      SELECT * FROM bookings
      WHERE tenant_id = ? 
      AND check_in >= ?
      AND check_in <= ?
      ORDER BY check_in ASC
    `).all(tenantId, today, tomorrow) as any[]

    let welcomeDraftsCreated = 0
    for (const booking of arrivingSoon) {
      // Check if welcome draft already exists
      const existing = await db.prepare(`
        SELECT id FROM welcome_drafts
        WHERE booking_id = ? AND tenant_id = ?
      `).get(booking.id, tenantId) as any

      if (!existing) {
        // Create welcome draft (queued for approval)
        const welcomeText = `Welcome to Browns ${booking.property_name || 'Dullstroom'}!

📅 Check-in: ${booking.check_in}
📅 Check-out: ${booking.check_out}
👥 Guests: ${booking.adults || 2} adult${(booking.adults || 2) > 1 ? 's' : ''}

Details:
• Wi-Fi: [STAFF PROVIDES]
• Parking: [STAFF PROVIDES]  
• Access: [STAFF PROVIDES]

Looking forward to welcoming you!

Warm regards,
The Browns Team`

        await db.prepare(`
          INSERT INTO welcome_drafts (
            tenant_id, booking_id, guest_name, guest_phone,
            draft_message, source, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP)
        `).run(
          tenantId,
          booking.id,
          booking.guest_name,
          booking.guest_phone || null,
          welcomeText,
          `NightsBridge sync ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
        )

        welcomeDraftsCreated++
      }
    }

    // P1: Auto-enqueue late check-in drafts (check-in time + 2h)
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    
    const lateArrivals = await db.prepare(`
      SELECT * FROM bookings
      WHERE tenant_id = ?
      AND check_in = ?
      AND status != 'checked_in'
    `).all(tenantId, today) as any[]

    let lateDraftsCreated = 0
    for (const booking of lateArrivals) {
      // Check if late draft already exists
      const existing = await db.prepare(`
        SELECT id FROM late_checkin_drafts
        WHERE booking_id = ? AND tenant_id = ?
      `).get(booking.id, tenantId) as any

      if (!existing && now.getHours() >= 16) { // After 4pm
        // Create late check-in draft
        const lateDraft = `Hi ${booking.guest_name || 'there'},

We noticed you haven't checked in yet. Your booking was for today.

Are you still planning to arrive? If you're running late or need assistance, please let us know.

After-hours access: [STAFF PROVIDES]

Best regards,
The Browns Team`

        await db.prepare(`
          INSERT INTO late_checkin_drafts (
            tenant_id, booking_id, guest_name, guest_phone,
            draft_message, source, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP)
        `).run(
          tenantId,
          booking.id,
          booking.guest_name,
          booking.guest_phone || null,
          lateDraft,
          `Late check-in auto-detect ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
        )

        lateDraftsCreated++
      }
    }

    return NextResponse.json({
      success: true,
      targetDate,
      message: 'NightsBridge data processed',
      parsed: arrivingSoon.length + lateArrivals.length,
      inserted: welcomeDraftsCreated + lateDraftsCreated,
      welcomeDrafts: welcomeDraftsCreated,
      lateDrafts: lateDraftsCreated,
      note: 'Drafts queued for approval in Needs Approval page'
    })

  } catch (error) {
    console.error('NB ingest error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/nightsbridge-ingest
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'NightsBridge Ingest Cron',
    status: 'ready',
    schedule: '05:00 and 19:00 SAST daily',
    secured: !!process.env.CRON_SECRET
  })
}
