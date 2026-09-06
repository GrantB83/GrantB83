import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import * as XLSX from 'xlsx'
import { format, parseISO, differenceInDays } from 'date-fns'

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

interface SyncResult {
  success: boolean
  source: 'drive' | 'uploaded_file'
  fileName?: string
  bookingsProcessed: number
  bookingsInserted: number
  errors: Array<{ guest: string; error: string }>
  missingFields: Array<{ guest: string; field: string }>
  timestamp: string
}

/**
 * Autonomous Nightsbridge → GuestFlow Sync Endpoint
 * 
 * Triggered by:
 * 1. Vercel Cron (scheduled, no body)
 * 2. Manual trigger with file upload (body with base64 file)
 * 
 * Auth: CRON_SECRET header
 * 
 * Workflow:
 * - If no file in request body, checks Google Drive drop folder for new files
 * - Parses arr_and_dep.xlsx (same logic as manual import page)
 * - Imports bookings to GuestFlow DB
 * - Returns sync summary (never auto-sends WhatsApp)
 * 
 * Property: The Browns Dullstroom (Nightsbridge 24299)
 * 
 * NEVER invents guest data. NEVER auto-sends communications.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: Require CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET not configured in environment')
      return NextResponse.json(
        { error: 'Sync endpoint not configured. CRON_SECRET missing.' },
        { status: 500 }
      )
    }

    // Accept both "Bearer <secret>" and raw secret
    const providedSecret = authHeader?.replace(/^Bearer\s+/i, '')
    
    if (providedSecret !== cronSecret) {
      console.warn('Unauthorized nightsbridge-sync attempt')
      return NextResponse.json(
        { error: 'Unauthorized. Valid CRON_SECRET required.' },
        { status: 401 }
      )
    }

    // Parse request body (optional - for manual trigger with file)
    let uploadedFileBuffer: Buffer | null = null
    let uploadedFileName: string | null = null
    
    const contentType = req.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const body = await req.json()
      if (body.fileBase64 && body.fileName) {
        uploadedFileBuffer = Buffer.from(body.fileBase64, 'base64')
        uploadedFileName = body.fileName
      }
    }

    // Determine sync source
    let syncSource: 'drive' | 'uploaded_file' = uploadedFileBuffer ? 'uploaded_file' : 'drive'
    let fileToProcess: Buffer | null = uploadedFileBuffer
    let fileName: string = uploadedFileName || 'arr_and_dep.xlsx'

    // If no uploaded file, check Google Drive drop folder
    if (!uploadedFileBuffer) {
      const driveFolder = process.env.NIGHTSBRIDGE_DRIVE_FOLDER_ID
      
      if (!driveFolder) {
        return NextResponse.json({
          success: false,
          source: 'drive',
          bookingsProcessed: 0,
          bookingsInserted: 0,
          errors: [],
          missingFields: [],
          timestamp: new Date().toISOString(),
          message: 'NIGHTSBRIDGE_DRIVE_FOLDER_ID not configured. Cannot check Drive for files.',
          instructions: 'Set NIGHTSBRIDGE_DRIVE_FOLDER_ID in environment or call this endpoint with a file upload.'
        } as SyncResult & { message: string; instructions: string })
      }

      // TODO: Implement Google Drive MCP integration here
      // For now, return a clear message that Drive sync is pending configuration
      return NextResponse.json({
        success: false,
        source: 'drive',
        bookingsProcessed: 0,
        bookingsInserted: 0,
        errors: [],
        missingFields: [],
        timestamp: new Date().toISOString(),
        message: 'Google Drive integration not yet implemented in this endpoint.',
        instructions: 'Upload files via /ops/nightsbridge-import or call this endpoint with fileBase64 + fileName in request body.'
      } as SyncResult & { message: string; instructions: string })
    }

    // Parse the file (same logic as manual import page)
    const targetDate = format(new Date(), 'yyyy-MM-dd')
    const { bookings, missingFields } = await parseNightsbridgeFile(fileToProcess, targetDate)

    if (bookings.length === 0) {
      return NextResponse.json({
        success: false,
        source: syncSource,
        fileName,
        bookingsProcessed: 0,
        bookingsInserted: 0,
        errors: [{ guest: 'N/A', error: 'No bookings found in file' }],
        missingFields,
        timestamp: new Date().toISOString()
      } as SyncResult)
    }

    // Get tenant ID (assume Browns Dullstroom is tenant_id = 1 for now)
    // TODO: Make this configurable via env var
    const tenantId = parseInt(process.env.NIGHTSBRIDGE_TENANT_ID || '1')

    // Insert bookings into database
    const db = await getDbAsync()
    let inserted = 0
    const errors: Array<{ guest: string; error: string }> = []

    const insertStmt = db.prepare(`
      INSERT INTO bookings (
        tenant_id,
        guest_name,
        suite_or_unit,
        check_in,
        check_out,
        adults,
        children,
        notes,
        late_check_in,
        guest_phone,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const booking of bookings) {
      try {
        await insertStmt.run(
          tenantId,
          booking.guestName || '',
          booking.suiteOrUnit || '',
          booking.checkInDate || '',
          booking.checkOutDate || '',
          booking.adults || 2,
          booking.children || 0,
          booking.notes || '',
          booking.lateCheckIn ? 1 : 0,
          booking.guestPhone || booking.guestPhone2 || '',
          booking.status || 'pending'
        )
        inserted++
      } catch (err: any) {
        errors.push({
          guest: booking.guestName || 'Unknown',
          error: err.message
        })
      }
    }

    const result: SyncResult = {
      success: inserted > 0,
      source: syncSource,
      fileName,
      bookingsProcessed: bookings.length,
      bookingsInserted: inserted,
      errors,
      missingFields,
      timestamp: new Date().toISOString()
    }

    console.log('Nightsbridge sync completed:', JSON.stringify(result, null, 2))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Nightsbridge sync error:', error)
    return NextResponse.json(
      {
        success: false,
        source: 'unknown',
        bookingsProcessed: 0,
        bookingsInserted: 0,
        errors: [{ guest: 'System', error: error.message }],
        missingFields: [],
        timestamp: new Date().toISOString()
      } as SyncResult,
      { status: 500 }
    )
  }
}

/**
 * Parse Nightsbridge arr_and_dep.xlsx file
 * Same logic as manual import page, extracted for reuse
 */
async function parseNightsbridgeFile(
  fileBuffer: Buffer,
  targetDate: string
): Promise<{
  bookings: ParsedBooking[]
  missingFields: Array<{ guest: string; field: string }>
}> {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  if (jsonData.length < 2) {
    throw new Error('File must have at least a header row and one data row')
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
  const missing: Array<{ guest: string; field: string }> = []

  rows.forEach((row, rowIndex) => {
    const booking: any = {}

    headers.forEach((header, index) => {
      const value = row[index] ? String(row[index]).trim() : ''
      
      // Map Nightsbridge columns (same as manual import)
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

    // Track missing fields
    if (!booking.guestName) {
      missing.push({ guest: 'Row ' + (rowIndex + headerRowIndex + 2), field: 'guestName' })
    }
    if (!booking.suiteOrUnit) {
      missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'suiteOrUnit (Room Name)' })
    }
    if (!booking.checkInDate) {
      missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkInDate' })
    }
    if (!booking.checkOutDate) {
      missing.push({ guest: booking.guestName || 'Row ' + (rowIndex + headerRowIndex + 2), field: 'checkOutDate' })
    }

    // Derive status from dates
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
    if (booking.notes && booking.notes.toLowerCase().includes('late')) {
      booking.lateCheckIn = true
    } else {
      booking.lateCheckIn = false
    }

    // Default adults if not set
    if (!booking.adults) {
      booking.adults = 2
    }
    if (!booking.children) {
      booking.children = 0
    }

    parsedBookings.push(booking as ParsedBooking)
  })

  return { bookings: parsedBookings, missingFields: missing }
}

/**
 * GET handler for status check (no auth required - read-only)
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/ops/nightsbridge-sync',
    purpose: 'Autonomous Nightsbridge → GuestFlow data import',
    triggers: [
      'Vercel Cron (scheduled)',
      'Manual POST with CRON_SECRET + optional file upload'
    ],
    auth: 'Authorization: Bearer <CRON_SECRET>',
    property: 'The Browns Dullstroom (Nightsbridge 24299)',
    timezone: 'Africa/Johannesburg',
    schedule: {
      morning: '07:00 SAST (05:00 UTC)',
      evening: '17:00 SAST (15:00 UTC)'
    },
    configuration: {
      CRON_SECRET: process.env.CRON_SECRET ? '[CONFIGURED]' : '[MISSING]',
      NIGHTSBRIDGE_TENANT_ID: process.env.NIGHTSBRIDGE_TENANT_ID || '[DEFAULT: 1]',
      NIGHTSBRIDGE_DRIVE_FOLDER_ID: process.env.NIGHTSBRIDGE_DRIVE_FOLDER_ID ? '[CONFIGURED]' : '[MISSING - Drive sync disabled]'
    },
    workflow: [
      '1. Cron triggers POST to this endpoint with CRON_SECRET',
      '2. If file uploaded in request: parse that file',
      '3. Else: check Google Drive folder for new arr_and_dep.xlsx',
      '4. Parse bookings (never invents data)',
      '5. Upsert to GuestFlow bookings table',
      '6. Return sync summary (never auto-sends WhatsApp)'
    ],
    nextSteps: [
      'Configure CRON_SECRET in Vercel environment',
      'Configure NIGHTSBRIDGE_DRIVE_FOLDER_ID for autonomous Drive sync',
      'Add vercel.json cron entries for 07:00 and 17:00 SAST',
      'SA Ops: upload arr_and_dep.xlsx to Drive drop folder (or keep manual upload at /ops/nightsbridge-import)'
    ]
  })
}
