import { NextResponse } from 'next/server'
import {
  generateMarkdownBrief,
  generateMarkdownFromBookings,
  generatePlainTextFromBookings,
  generateWhatsAppBrief,
  type DailyBriefSnapshot,
} from '@/lib/daily-brief'

export const dynamic = 'force-dynamic'

interface BookingData {
  guestName: string
  propertyName: string
  roomNumber: string
  checkIn: string
  checkOut: string
  status: string
  lateCheckIn: boolean
  missingFields: string[]
  adults?: number
  children?: number
  pets?: boolean
  specialRequests?: string
}

/**
 * POST /api/daily-brief/export
 *
 * Export daily ops brief as markdown or plain text (draft only).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantName, targetDate, bookings, format, snapshot } = body as {
      tenantName: string
      targetDate: string
      bookings?: BookingData[]
      format: 'markdown' | 'text'
      snapshot?: DailyBriefSnapshot
    }

    if (!tenantName || !targetDate) {
      return NextResponse.json(
        { error: 'tenantName and targetDate are required' },
        { status: 400 }
      )
    }

    let content = ''

    if (snapshot) {
      content =
        format === 'markdown'
          ? generateMarkdownBrief(snapshot)
          : generateWhatsAppBrief(snapshot)
    } else if (bookings) {
      content =
        format === 'markdown'
          ? generateMarkdownFromBookings(tenantName, targetDate, bookings)
          : generatePlainTextFromBookings(tenantName, targetDate, bookings)
    } else {
      return NextResponse.json(
        { error: 'bookings or snapshot is required' },
        { status: 400 }
      )
    }

    const contentType = format === 'markdown' ? 'text/markdown' : 'text/plain'
    const extension = format === 'markdown' ? 'md' : 'txt'

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="daily-brief-${targetDate}.${extension}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting daily brief:', error)
    return NextResponse.json(
      {
        error: 'Failed to export brief',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
