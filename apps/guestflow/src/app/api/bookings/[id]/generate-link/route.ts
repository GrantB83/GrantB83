import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { generateGuestToken, hashToken, calculateTokenExpiry } from '@/lib/token'
import { getGuestPortalUrl } from '@/lib/portal-url'

/**
 * Generate (or regenerate) a magic link for a booking
 * Staff-only endpoint - requires authentication via middleware
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)
    
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    // Get booking details
    const booking = await db.prepare(`
      SELECT 
        id,
        guest_name as guestName,
        check_in as checkIn,
        check_out as checkOut,
        status
      FROM bookings
      WHERE id = ?
    `).get(bookingId) as any

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Generate new token
    const { token, hash } = generateGuestToken()
    const expiresAt = calculateTokenExpiry(booking.checkOut)

    // Revoke any existing tokens for this booking
    await db.prepare(`
      UPDATE guest_tokens 
      SET revoked = 1 
      WHERE booking_id = ? AND revoked = 0
    `).run(bookingId)

    // Insert new token
    await db.prepare(`
      INSERT INTO guest_tokens (booking_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).run(bookingId, hash, expiresAt.toISOString())

    // Generate the magic link URL using portal URL helper
    // This respects NEXT_PUBLIC_PORTAL_BASE_URL if set, enabling domain split
    const host = req.headers.get('host')
    const magicLink = getGuestPortalUrl(token, host || undefined)

    // Generate WhatsApp stub text
    const checkInDate = new Date(booking.checkIn).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const waStub = `Hi ${booking.guestName.split(' ')[0]},\n\nYour stay details for ${checkInDate}:\n${magicLink}\n\nLooking forward to welcoming you!`

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      guestName: booking.guestName,
      magicLink,
      whatsappStub: waStub,
      expiresAt: expiresAt.toISOString(),
      token, // Return raw token for immediate use (not stored)
    })

  } catch (error: any) {
    console.error('Generate magic link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 }
    )
  }
}

/**
 * Get existing magic link for a booking (if valid)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = parseInt(params.id)
    
    if (isNaN(bookingId)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      )
    }

    const db = await getDbAsync()

    // Get booking details
    const booking = await db.prepare(`
      SELECT 
        id,
        guest_name as guestName,
        check_in as checkIn,
        check_out as checkOut
      FROM bookings
      WHERE id = ?
    `).get(bookingId) as any

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Get active token
    const tokenRecord = await db.prepare(`
      SELECT 
        token_hash,
        created_at as createdAt,
        expires_at as expiresAt,
        used_at as usedAt,
        last_accessed_at as lastAccessedAt
      FROM guest_tokens
      WHERE booking_id = ? 
        AND revoked = 0 
        AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(bookingId) as any

    if (!tokenRecord) {
      return NextResponse.json(
        { 
          hasActiveLink: false,
          message: 'No active magic link found. Generate a new one.'
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      hasActiveLink: true,
      bookingId: booking.id,
      guestName: booking.guestName,
      createdAt: tokenRecord.createdAt,
      expiresAt: tokenRecord.expiresAt,
      usedAt: tokenRecord.usedAt,
      lastAccessedAt: tokenRecord.lastAccessedAt,
      note: 'Token hash is stored securely. Use POST to generate a new link.'
    })

  } catch (error: any) {
    console.error('Get magic link error:', error)
    return NextResponse.json(
      { error: 'Failed to get magic link info' },
      { status: 500 }
    )
  }
}
