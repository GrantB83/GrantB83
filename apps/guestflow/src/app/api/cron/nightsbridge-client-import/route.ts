import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { applyBookingContact } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { isBlockGuestName } from '@/lib/contact-provenance'
import {
  normalizeClientBookingId,
  parseClientReportGrid,
  type ClientReportRow,
} from '@/lib/client-report-parse'
import { getDbAsync } from '@/lib/db'
import { normalizeGuestName } from '@/lib/nightsbridge-upsert'

export const dynamic = 'force-dynamic'

function authorize(request: NextRequest): { ok: true } | { ok: false; status: number; body: object } {
  const envSecret = process.env.CRON_SECRET
  if (!envSecret) {
    return { ok: false, status: 500, body: { error: 'CRON_SECRET not configured' } }
  }
  const provided = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret')
  if (!provided || provided !== envSecret) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  return { ok: true }
}

async function readFileBuffer(request: NextRequest): Promise<ArrayBuffer | null> {
  const contentType = request.headers.get('content-type')
  if (contentType?.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    return file ? await file.arrayBuffer() : null
  }
  if (contentType?.includes('application/json')) {
    const body = await request.json()
    if (body.fileUrl) {
      const fileResponse = await fetch(body.fileUrl)
      if (!fileResponse.ok) return null
      return await fileResponse.arrayBuffer()
    }
    if (body.fileBase64) {
      const base64Data = String(body.fileBase64).split(',')[1] || body.fileBase64
      const buffer = Buffer.from(base64Data, 'base64')
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }
  }
  return null
}

interface BookingRow {
  id: number
  guest_name: string
  nightsbridge_booking_id: string | null
  check_in: string
  check_out: string
}

function matchClientRow(row: ClientReportRow, bookings: BookingRow[]): BookingRow | null {
  const wantId = normalizeClientBookingId(row.bookingId)
  if (wantId) {
    const hits = bookings.filter((booking) => {
      const have = normalizeClientBookingId(booking.nightsbridge_booking_id)
      return have === wantId || have?.endsWith(wantId) || wantId.endsWith(have || '')
    })
    if (hits.length === 1) return hits[0]
    if (hits.length > 1) return null
  }
  if (!row.guestName) return null
  const name = normalizeGuestName(row.guestName)
  const named = bookings.filter((booking) => normalizeGuestName(booking.guest_name) === name)
  if (named.length === 1) return named[0]
  return null
}

export async function POST(request: NextRequest) {
  const auth = authorize(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })

  const dryRun =
    request.nextUrl.searchParams.get('dryRun') === '1' ||
    request.nextUrl.searchParams.get('dry_run') === '1'

  const fileBuffer = await readFileBuffer(request)
  if (!fileBuffer) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const workbook = XLSX.read(fileBuffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
  const rows = parseClientReportGrid(jsonData)

  const db = await getDbAsync()
  await ensureContactSchema(db)

  const tenant = (await db
    .prepare(`SELECT id FROM tenants WHERE name LIKE '%Browns%' LIMIT 1`)
    .get()) as { id: number } | undefined
  const tenantId = tenant?.id || 1

  const bookings = ((await db
    .prepare(
      `SELECT id, guest_name, nightsbridge_booking_id, check_in, check_out
       FROM bookings WHERE tenant_id = ? AND COALESCE(status, '') NOT IN ('cancelled', 'canceled')`
    )
    .all(tenantId)) || []) as BookingRow[]

  let filled = 0
  let skippedExisting = 0
  let unmatched = 0
  let skippedBlocks = 0

  for (const row of rows) {
    if (isBlockGuestName(row.guestName)) {
      skippedBlocks++
      continue
    }
    const booking = matchClientRow(row, bookings)
    if (!booking) {
      unmatched++
      continue
    }
    if (dryRun) {
      if (row.phone || row.email) filled++
      continue
    }
    const result = await applyBookingContact(db, {
      tenantId,
      bookingId: booking.id,
      phone: row.phone,
      email: row.email,
      source: 'client_report',
      sourceRef: `client:${booking.id}`,
      displayName: row.guestName || booking.guest_name,
      nbid: booking.nightsbridge_booking_id,
    })
    if (result.phoneApplied || result.emailApplied) filled++
    else skippedExisting++
  }

  return NextResponse.json({
    success: true,
    parsed: rows.length,
    filled,
    skippedExisting,
    unmatched,
    skippedBlocks,
    dryRun,
  })
}

export async function GET(request: NextRequest) {
  const auth = authorize(request)
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status })
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/cron/nightsbridge-client-import',
    methods: ['POST'],
    note: 'Gap-fill only. Never overwrites A&D. Use ?dryRun=1 to preview.',
  })
}
