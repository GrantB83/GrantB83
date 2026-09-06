import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import * as XLSX from 'xlsx'
import { format, parseISO, differenceInDays } from 'date-fns'

export const dynamic = 'force-dynamic'

interface ParsedBooking {
  guestName: string
  guest2?: string
  suiteOrUnit: string
  status: string
  checkInDate: string
  checkOutDate: string
  lateCheckIn: boolean
  adults?: number
  children?: number
  notes?: string
  bookingId?: string
  guestPhone?: string
  guestEmail?: string
  guestPhone2?: string
  guestEmail2?: string
  nights?: number
}

interface MissingField {
  guest: string
  field: string
}

/**
 * Autonomous Nightsbridge Ingest Endpoint
 * 
 * Accepts arr_and_dep.xlsx file uploads and processes them into the GuestFlow database.
 * 
 * Security: Requires CRON_SECRET header or query param.
 * 
 * Usage:
 * 1. SA Ops drops arr_and_dep.xlsx file via curl/Postman/Drive
 * 2. Cron job can trigger with file path or URL
 * 3. API parses Excel → saves bookings → returns summary
 * 
 * POST /api/cron/nightsbridge-ingest
 * Headers: x-cron-secret: <CRON_SECRET>
 * Body: multipart/form-data with 'file' field OR JSON with 'fileUrl' field
 * Query: ?secret=<CRON_SECRET> (alternative to header)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify CRON_SECRET
    const headerSecret = request.headers.get('x-cron-secret')
    const querySecret = request.nextUrl.searchParams.get('secret')
    const envSecret = process.env.CRON_SECRET

    if (!envSecret) {
      return NextResponse.json(
        { 
          error: 'CRON_SECRET not configured',
          message: 'Set CRON_SECRET environment variable to enable autonomous ingest'
        },
        { status: 500 }
      )
    }

    const providedSecret = headerSecret || querySecret

    if (!providedSecret || providedSecret !== envSecret) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET' },
        { status: 401 }
      )
    }

    // 2. Get target date (default: today)
    const targetDate = request.nextUrl.searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')

    // 3. Parse incoming file
    let fileBuffer: ArrayBuffer | null = null

    const contentType = request.headers.get('content-type')

    if (contentType?.includes('multipart/form-data')) {
      // File upload via multipart
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided', message: 'Upload file as multipart/form-data with field name "file"' },
          { status: 400 }
        )
      }

      fileBuffer = await file.arrayBuffer()
    } else if (contentType?.includes('application/json')) {
      // JSON body with fileUrl or base64 data
      const body = await request.json()

      if (body.fileUrl) {
        // Fetch file from URL (e.g., Drive public link, S3 presigned URL)
        const fileResponse = await fetch(body.fileUrl)
        if (!fileResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch file from URL', url: body.fileUrl },
            { status: 400 }
          )
        }
        fileBuffer = await fileResponse.arrayBuffer()
      } else if (body.fileBase64) {
        // Base64 encoded file
        const base64Data = body.fileBase64.split(',')[1] || body.fileBase64
        const buffer = Buffer.from(base64Data, 'base64')
        fileBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      } else {
        return NextResponse.json(
          { error: 'No file provided', message: 'Provide "fileUrl" or "fileBase64" in JSON body' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid content type', message: 'Use multipart/form-data or application/json' },
        { status: 400 }
      )
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Failed to read file' },
        { status: 400 }
      )
    }

    // 4. Parse Excel file (same logic as nightsbridge-import page)
    const workbook = XLSX.read(fileBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'File must have at least a header row and one data row' },
        { status: 400 }
      )
    }

    // Find header row
    let headerRowIndex = 0
    for (let i = 0; i < jsonData.length; i++) {
      if (jsonData[i] && jsonData[i].some(cell => cell !== null && cell !== undefined && cell !== '')) {
        headerRowIndex = i
        break
      }
    }

    const headers = jsonData[headerRowIndex].map((h: any) =>
      String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    )

    const rows = jsonData.slice(headerRowIndex + 1).filter(row =>
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )

    const parsedBookings: ParsedBooking[] = []
    const missingFields: MissingField[] = []

    rows.forEach((row, rowIndex) => {
      const booking: any = {}

      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : ''

        if (header.includes('room') || header.includes('roomname')) {
          booking.suiteOrUnit = value
        } else if (header.includes('guestname') || (header.includes('guest') && !header.includes('2') && !header.includes('number'))) {
          booking.guestName = value
        } else if (header.includes('guest2')) {
          booking.guest2 = value
        } else if (header.includes('numberofguests')) {
          const num = parseInt(value) || 0
          booking.adults = Math.max(1, num)
          booking.children = 0
        } else if (header.includes('bookingid') || header.includes('booking')) {
          booking.bookingId = value
        } else if (header.includes('note')) {
          booking.notes = value
        } else if (header.includes('night')) {
          booking.nights = parseInt(value) || 0
        } else if (header.includes('phonenumber') && !header.includes('2')) {
          booking.guestPhone = value
        } else if (header.includes('email') && !header.includes('2')) {
          booking.guestEmail = value
        } else if (header.includes('phonenumber2')) {
          booking.guestPhone2 = value
        } else if (header.includes('email2')) {
          booking.guestEmail2 = value
        } else if (header.includes('checkin') || header.includes('arrive') || header.includes('arrival')) {
          if (typeof row[index] === 'number') {
            const date = XLSX.SSF.parse_date_code(row[index])
            booking.checkInDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
          } else {
            booking.checkInDate = value
          }
        } else if (header.includes('checkout') || header.includes('depart') || header.includes('departure')) {
          if (typeof row[index] === 'number') {
            const date = XLSX.SSF.parse_date_code(row[index])
            booking.checkOutDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
          } else {
            booking.checkOutDate = value
          }
        }
      })

      // Track missing required fields
      if (!booking.guestName) {
        missingFields.push({ guest: 'Row ' + (rowIndex + headerRowIndex + 2), field: 'guestName' })
      }
      if (!booking.suiteOrUnit) {
        missingFields.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'suiteOrUnit' })
      }
      if (!booking.checkInDate) {
        missingFields.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkInDate' })
      }
      if (!booking.checkOutDate) {
        missingFields.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkOutDate' })
      }

      // Derive status
      if (booking.checkInDate && booking.checkOutDate) {
        try {
          const checkIn = parseISO(booking.checkInDate)
          const checkOut = parseISO(booking.checkOutDate)
          const target = parseISO(targetDate)

          if (format(checkIn, 'yyyy-MM-dd') === targetDate) {
            booking.status = 'arriving'
          } else if (format(checkOut, 'yyyy-MM-dd') === targetDate) {
            booking.status = 'departing'
          } else if (target > checkIn && target < checkOut) {
            booking.status = 'inhouse'
          } else {
            booking.status = ''
          }
        } catch {
          booking.status = ''
        }
      } else {
        booking.status = ''
      }

      // Detect late check-in
      booking.lateCheckIn = booking.notes && booking.notes.toLowerCase().includes('late')

      // Defaults
      if (!booking.adults) booking.adults = 2
      if (!booking.children) booking.children = 0

      parsedBookings.push(booking as ParsedBooking)
    })

    // 5. Save to database
    const db = getDb()
    
    // Get Browns tenant ID (hardcoded as per existing codebase)
    const tenant = db.prepare('SELECT id FROM tenants WHERE name = ?').get('Browns Dullstroom')
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Browns Dullstroom tenant not found in database' },
        { status: 500 }
      )
    }

    const tenantId = (tenant as any).id

    let inserted = 0
    const errors: string[] = []

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO bookings (
        tenant_id, guest_name, suite_or_unit, check_in, check_out,
        adults, children, notes, late_check_in, guest_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const booking of parsedBookings) {
      try {
        insertStmt.run(
          tenantId,
          booking.guestName,
          booking.suiteOrUnit,
          booking.checkInDate,
          booking.checkOutDate,
          booking.adults,
          booking.children,
          booking.notes || '',
          booking.lateCheckIn ? 1 : 0,
          booking.guestPhone || booking.guestPhone2 || '',
          booking.status
        )
        inserted++
      } catch (err: any) {
        errors.push(`${booking.guestName}: ${err.message}`)
      }
    }

    // 6. P1: Auto-enqueue welcome and late check-in drafts after successful import
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const tomorrow = format(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

    // P1: Auto-enqueue welcome drafts for arrivals in next 24-48h
    const arrivingSoonBookings = parsedBookings.filter(b => 
      b.checkInDate >= today && b.checkInDate <= tomorrow && 
      b.status !== 'Cancelled' && b.status !== 'No Show'
    )

    let welcomeDraftsCreated = 0
    for (const booking of arrivingSoonBookings) {
      try {
        // Check if welcome draft already exists for this guest/date
        const existing = db.prepare(`
          SELECT id FROM welcome_drafts
          WHERE tenant_id = ? AND guest_name = ? AND created_at >= datetime('now', '-24 hours')
        `).get(tenantId, booking.guestName) as any

        if (!existing && booking.guestPhone) {
          // Create welcome draft (queued for approval)
          const welcomeText = `Welcome to Browns ${booking.suiteOrUnit || 'Dullstroom'}!

📅 Check-in: ${booking.checkInDate}
📅 Check-out: ${booking.checkOutDate}
👥 Guests: ${booking.adults || 2} adult${(booking.adults || 2) > 1 ? 's' : ''}${booking.children ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}

Details:
• Wi-Fi: [STAFF PROVIDES]
• Parking: [STAFF PROVIDES]
• Access: [STAFF PROVIDES]

Looking forward to welcoming you!

Warm regards,
The Browns Team`

          db.prepare(`
            INSERT INTO welcome_drafts (
              tenant_id, guest_name, guest_phone,
              draft_message, source, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP)
          `).run(
            tenantId,
            booking.guestName,
            booking.guestPhone,
            welcomeText,
            `NightsBridge sync ${format(now, 'yyyy-MM-dd HH:mm')}`
          )

          welcomeDraftsCreated++
        }
      } catch (err: any) {
        console.warn(`Failed to create welcome draft for ${booking.guestName}:`, err.message)
      }
    }

    // P1: Auto-enqueue late check-in drafts (check-in time + 2h, after 4pm)
    const todayArrivals = parsedBookings.filter(b => 
      b.checkInDate === today && 
      b.status !== 'Cancelled' && 
      b.status !== 'No Show' &&
      b.status !== 'Checked In'
    )

    let lateDraftsCreated = 0
    if (now.getHours() >= 16) { // After 4pm
      for (const booking of todayArrivals) {
        try {
          // Check if late draft already exists
          const existing = db.prepare(`
            SELECT id FROM late_checkin_drafts
            WHERE tenant_id = ? AND guest_name = ? AND created_at >= datetime('now', '-6 hours')
          `).get(tenantId, booking.guestName) as any

          if (!existing && booking.guestPhone) {
            // Create late check-in draft
            const lateDraft = `Hi ${booking.guestName || 'there'},

We noticed you haven't checked in yet. Your booking was for today.

Are you still planning to arrive? If you're running late or need assistance, please let us know.

After-hours access: [STAFF PROVIDES]

Best regards,
The Browns Team`

            db.prepare(`
              INSERT INTO late_checkin_drafts (
                tenant_id, guest_name, guest_phone,
                draft_message, source, status, created_at
              ) VALUES (?, ?, ?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP)
            `).run(
              tenantId,
              booking.guestName,
              booking.guestPhone,
              lateDraft,
              `Late check-in auto-detect ${format(now, 'yyyy-MM-dd HH:mm')}`
            )

            lateDraftsCreated++
          }
        } catch (err: any) {
          console.warn(`Failed to create late draft for ${booking.guestName}:`, err.message)
        }
      }
    }

    // 7. Return summary with P1 draft stats
    return NextResponse.json({
      success: true,
      targetDate,
      parsed: parsedBookings.length,
      inserted,
      errors: errors.length > 0 ? errors : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      message: `Successfully imported ${inserted} of ${parsedBookings.length} bookings`,
      p1AutoEnqueue: {
        welcomeDrafts: welcomeDraftsCreated,
        lateDrafts: lateDraftsCreated,
        note: 'Drafts queued in Needs Approval page (never auto-send)'
      }
    })

  } catch (error: any) {
    console.error('Nightsbridge ingest error:', error)
    return NextResponse.json(
      { 
        error: 'Ingest failed', 
        message: error.message,
        details: error.stack 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const envSecret = process.env.CRON_SECRET

  if (!envSecret) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'CRON_SECRET environment variable not set'
    })
  }

  const providedSecret = headerSecret || querySecret

  if (!providedSecret || providedSecret !== envSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/cron/nightsbridge-ingest',
    methods: ['POST'],
    auth: 'CRON_SECRET',
    accepts: ['multipart/form-data', 'application/json (with fileUrl or fileBase64)'],
    property: 'The Browns Dullstroom (Nightsbridge 24299)'
  })
}
