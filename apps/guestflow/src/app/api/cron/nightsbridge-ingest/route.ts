import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, type DbClient } from '@/lib/db'
import * as XLSX from 'xlsx'
import { format, parseISO, addDays } from 'date-fns'
import { upsertGuestContact } from '@/lib/guest-contacts'
import {
  upsertBooking,
  determineImportWindow,
  type ParsedBooking as NbParsedBooking,
} from '@/lib/nightsbridge-upsert'
import { guardedSoftCancel } from '@/lib/nb-reconcile'
import { ensureSprint2Schema, recordNbSyncRun } from '@/lib/sprint2-schema'
import { mapNbSectionRow, type ParsedBooking } from '@/lib/nightsbridge-section-parse'
import { randomUUID } from 'crypto'
import { isCancelledStatus, isOwnerBlock } from '@/lib/booking-filters'

export const dynamic = 'force-dynamic'

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
  const startedAt = new Date().toISOString()
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
      // File upload via multipart. Empty/malformed bodies throw in Next formData().
      let file: File | null = null
      try {
        const formData = await request.formData()
        file = formData.get('file') as File | null
      } catch {
        return NextResponse.json(
          { error: 'No file provided', message: 'Upload file as multipart/form-data with field name "file"' },
          { status: 400 }
        )
      }

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

    // Helper function to parse MM/DD/YYYY to YYYY-MM-DD
    function parseDateMDY(dateStr: string): string {
      const [month, day, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // 4. Parse sectioned Excel file (Arrival/Departure sections)
    const workbook = XLSX.read(fileBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { error: 'File must have at least section headers and data rows' },
        { status: 400 }
      )
    }

    const parsedBookings: ParsedBooking[] = []
    const missingFields: MissingField[] = []
    const bookingsByNbId = new Map<string, ParsedBooking>()

    let currentSection: 'arrival' | 'departure' | null = null
    let currentSectionDate: string | null = null
    let currentHeaders: string[] = []

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || !row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        continue
      }

      const firstCell = String(row[0] || '').trim()

      // Detect section headers: "Arrival: MM/DD/YYYY" or "Departure: MM/DD/YYYY"
      const arrivalMatch = firstCell.match(/^Arrival:\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i)
      const departureMatch = firstCell.match(/^Departure:\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i)

      if (arrivalMatch) {
        currentSection = 'arrival'
        currentSectionDate = parseDateMDY(arrivalMatch[1])
        currentHeaders = []
        continue
      } else if (departureMatch) {
        currentSection = 'departure'
        currentSectionDate = parseDateMDY(departureMatch[1])
        currentHeaders = []
        continue
      }

      // Detect column headers row (Room Name, Guest Name, Guest 2, Number of Guests, Booking ID, Notes, Nights)
      if (currentSection && currentHeaders.length === 0) {
        const potentialHeaders = row.map((h: any) =>
          String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        )
        if (potentialHeaders.some(h => h.includes('room') || h.includes('guest'))) {
          currentHeaders = potentialHeaders
          continue
        }
      }

      // Parse data rows
      if (currentSection && currentSectionDate && currentHeaders.length > 0) {
        const booking: any = mapNbSectionRow(currentHeaders, row)

        // Skip rows without required fields
        if (!booking.guestName || !booking.suiteOrUnit) {
          continue
        }

        // Calculate check-in/check-out from section date + nights
        if (currentSection === 'arrival') {
          booking.checkInDate = currentSectionDate
          booking.checkOutDate = booking.nights
            ? format(addDays(parseISO(currentSectionDate), booking.nights), 'yyyy-MM-dd')
            : currentSectionDate
          booking.status = format(parseISO(targetDate), 'yyyy-MM-dd') === currentSectionDate ? 'arriving' : ''
        } else if (currentSection === 'departure') {
          booking.checkOutDate = currentSectionDate
          booking.checkInDate = booking.nights
            ? format(addDays(parseISO(currentSectionDate), -booking.nights), 'yyyy-MM-dd')
            : currentSectionDate
          booking.status = format(parseISO(targetDate), 'yyyy-MM-dd') === currentSectionDate ? 'departing' : ''
        }

        // Detect late check-in
        booking.lateCheckIn = booking.notes && booking.notes.toLowerCase().includes('late')

        // Defaults
        if (!booking.adults) booking.adults = 2
        if (!booking.children) booking.children = 0

        // Dedupe by Booking ID across sections (keep first occurrence)
        if (booking.bookingId) {
          if (!bookingsByNbId.has(booking.bookingId)) {
            bookingsByNbId.set(booking.bookingId, booking as ParsedBooking)
            parsedBookings.push(booking as ParsedBooking)
          }
        } else {
          parsedBookings.push(booking as ParsedBooking)
        }
      }
    }

    if (parsedBookings.length === 0) {
      try {
        const db = await getDbAsync()
        await ensureSprint2Schema(db)
        await recordNbSyncRun(db, {
          layer: 'batch',
          startedAt,
          ok: false,
          code: 'ZERO_ROWS',
          rows: 0,
          message: 'No valid bookings found in file',
        })
      } catch {
        // schema/record best-effort
      }
      return NextResponse.json(
        { error: 'No valid bookings found in file. Ensure file has Arrival/Departure sections with data rows.' },
        { status: 400 }
      )
    }

    // 5. Save to database (async for Production Turso compatibility)
    const db = await getDbAsync()
    
    // Get Browns tenant ID with robust resolution strategy
    type TenantRow = { id: number; name: string }
    const KNOWN_ALIASES = [
      'Browns Dullstroom',
      'The Browns Luxury Guest Suites (Dullstroom)',
      'The Browns Dullstroom'
    ]
    
    // Try exact match on known aliases
    let tenant: TenantRow | null = null
    for (const alias of KNOWN_ALIASES) {
      const result = await db.prepare('SELECT id, name FROM tenants WHERE name = ?').get(alias)
      if (result) {
        tenant = result as TenantRow
        break
      }
    }
    
    // Fallback: LIKE pattern for Browns + Dullstroom
    if (!tenant) {
      const candidatesResult = await db.prepare(
        "SELECT id, name FROM tenants WHERE name LIKE '%Browns%' AND name LIKE '%Dullstroom%'"
      ).all()
      
      // Turso/DbClient .all() returns array directly, not { results: [...] }
      const candidates = Array.isArray(candidatesResult) 
        ? candidatesResult as TenantRow[]
        : (candidatesResult as any).results as TenantRow[] || []
      
      if (candidates.length === 1) {
        tenant = candidates[0]
      } else if (candidates.length > 1) {
        // Multiple matches - prefer the one with full suite name or use id=1
        tenant = candidates.find((t: TenantRow) => t.id === 1) || candidates[0]
      }
    }
    
    // Final fallback: If no tenant found, try id=1 (confirmed single Browns tenant in production)
    if (!tenant) {
      const result = await db.prepare('SELECT id, name FROM tenants WHERE id = ?').get(1)
      if (result) {
        tenant = result as TenantRow
      }
    }
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Browns Dullstroom tenant not found in database. No tenant with id=1 exists.' },
        { status: 500 }
      )
    }

    const tenantId = tenant.id

    // Phase 17: Replace INSERT OR REPLACE with UPSERT logic
    const importBatchId = randomUUID()
    let inserted = 0
    let updated = 0
    let unchanged = 0
    const errors: string[] = []

    // Determine import window for soft-cancel logic
    const importWindow = determineImportWindow(parsedBookings as NbParsedBooking[])

    for (const booking of parsedBookings) {
      try {
        const result = await upsertBooking(db, booking as NbParsedBooking, tenantId, importBatchId)
        
        if (result.action === 'inserted') {
          inserted++
        } else if (result.action === 'updated') {
          updated++
        } else if (result.action === 'unchanged') {
          unchanged++
        }

        // Upsert guest contact only when phone is present (never invent PII)
        const phone = booking.guestPhone || booking.guestPhone2
        if (phone && phone.trim()) {
          try {
            await upsertGuestContact(db as any, {
              tenantId,
              phone: phone.trim(),
              email: booking.guestEmail || booking.guestEmail2 || null,
              displayName: booking.guestName || null,
              lastStayAt: booking.checkOutDate || booking.checkInDate || null,
              lastSuite: booking.suiteOrUnit || null,
              source: 'nb',
              nbid: booking.bookingId || null,
            })
          } catch (contactErr: any) {
            console.warn(`guest_contacts upsert skipped for ${booking.guestName}:`, contactErr.message)
          }
        }
      } catch (err: any) {
        errors.push(`${booking.guestName}: ${err.message}`)
      }
    }

    await ensureSprint2Schema(db)
    const cancelResult = await guardedSoftCancel(
      db,
      tenantId,
      importWindow,
      importBatchId,
      parsedBookings as NbParsedBooking[],
      startedAt
    )
    const cancelled = cancelResult.cancelled
    if (!cancelResult.guarded) {
      await recordNbSyncRun(db, {
        layer: 'batch',
        startedAt,
        ok: true,
        code: 'OK',
        rows: parsedBookings.length,
        message: `inserted=${inserted} updated=${updated} cancelled=${cancelled}`,
      })
    }

    // 6. P1: Auto-enqueue welcome and late check-in drafts after successful import
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const tomorrow = format(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

    // P1: Auto-enqueue welcome drafts for arrivals in next 24-48h
    // Owner BLOCKs and cancelled / no-show rows are never guests.
    const arrivingSoonBookings = parsedBookings.filter(b =>
      b.checkInDate >= today && b.checkInDate <= tomorrow &&
      !isCancelledStatus(b.status) &&
      !isOwnerBlock({ guestName: b.guestName })
    )

    let welcomeDraftsCreated = 0
    for (const booking of arrivingSoonBookings) {
      try {
        // Check if welcome draft already exists for this guest/date
        const existing = await db.prepare(`
          SELECT id FROM welcome_drafts
          WHERE tenant_id = ? AND guest_name = ? AND created_at >= datetime('now', '-24 hours')
        `).get(tenantId, booking.guestName) as any

        if (!existing) {
          // Grant Law (CoS 6 Sep 2026): Create welcome draft regardless of phone status
          // Missing phone → mark blocked in queue; resolve from NB booking detail before CoS Admin post
          // Guest-facing message body NEVER contains [GUEST_PHONE] or [RATE CARD REQUIRED] placeholders
          
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

          // If phone missing, draft is still created but marked for blocking in queue
          const draftStatus = booking.guestPhone ? 'pending_approval' : 'blocked_missing_phone'
          
          await db.prepare(`
            INSERT INTO welcome_drafts (
              tenant_id, guest_name, guest_phone,
              draft_message, source, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            tenantId,
            booking.guestName,
            booking.guestPhone || null,
            welcomeText,
            `NightsBridge sync ${format(now, 'yyyy-MM-dd HH:mm')}`,
            draftStatus
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
      !isCancelledStatus(b.status) &&
      String(b.status || '').trim().toLowerCase() !== 'checked in' &&
      !isOwnerBlock({ guestName: b.guestName })
    )

    let lateDraftsCreated = 0
    if (now.getHours() >= 16) { // After 4pm
      for (const booking of todayArrivals) {
        try {
          // Check if late draft already exists
          const existing = await db.prepare(`
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

            await db.prepare(`
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

    // 7. Return enhanced summary with P1 draft stats
    return NextResponse.json({
      success: true,
      targetDate,
      parsed: parsedBookings.length,
      inserted,
      updated,
      cancelled,
      unchanged,
      errors: errors.length > 0 ? errors : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      message: `Successfully imported ${parsedBookings.length} bookings (${inserted} new, ${updated} updated, ${cancelled} cancelled, ${unchanged} unchanged)`,
      summary: {
        importBatchId,
        importWindow: {
          minDate: importWindow.minDate,
          maxDate: importWindow.maxDate,
        },
      },
      p1AutoEnqueue: {
        welcomeDrafts: welcomeDraftsCreated,
        lateDrafts: lateDraftsCreated,
        note: 'Drafts queued in Needs Approval page (never auto-send)'
      }
    })

  } catch (error: any) {
    console.error('Nightsbridge ingest error:', error)
    try {
      const db = await getDbAsync()
      await recordNbSyncRun(db, {
        layer: 'batch',
        startedAt,
        ok: false,
        code: 'ERROR',
        rows: 0,
        message: error.message,
      })
    } catch {
      // ignore
    }
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
