import { NextRequest, NextResponse } from 'next/server'
import { applyBookingContact, validateContactInput } from '@/lib/contact-apply'
import { ensureContactSchema } from '@/lib/contact-schema'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { hashToken } from '@/lib/token'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const token = params.code
  if (!token) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { phone?: string; email?: string }
  const validated = validateContactInput(body)
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const db = await getDbAsync()
  await ensureContactSchema(db)
  const tokenHash = hashToken(token)
  const row = (await db
    .prepare(
      `SELECT gt.revoked, gt.expires_at as expiresAt,
              b.id as bookingId, b.guest_name as guestName,
              b.nightsbridge_booking_id as nbid, b.check_out as checkOut, b.suite_or_unit as suite
       FROM guest_tokens gt
       INNER JOIN bookings b ON gt.booking_id = b.id
       WHERE gt.token_hash = ?`
    )
    .get(tokenHash)) as
    | {
        revoked: number
        expiresAt: string
        bookingId: number
        guestName: string
        nbid: string | null
        checkOut: string | null
        suite: string | null
      }
    | undefined

  if (!row) {
    return NextResponse.json({ error: 'Invalid access link' }, { status: 404 })
  }
  if (row.revoked) {
    return NextResponse.json({ error: 'This access link has been revoked' }, { status: 403 })
  }
  if (new Date() > new Date(row.expiresAt)) {
    return NextResponse.json({ error: 'This access link has expired' }, { status: 403 })
  }

  const tenantId = await getDefaultTenantIdAsync()
  const result = await applyBookingContact(db, {
    tenantId,
    bookingId: row.bookingId,
    phone: validated.phone,
    email: validated.email,
    source: 'guest',
    sourceRef: 'guest-portal',
    displayName: row.guestName,
    lastStayAt: row.checkOut,
    lastSuite: row.suite,
    nbid: row.nbid,
  })

  return NextResponse.json({
    success: true,
    sent: false,
    phoneApplied: result.phoneApplied,
    emailApplied: result.emailApplied,
    phone: result.phone,
    email: result.email,
    source: 'guest',
  })
}
