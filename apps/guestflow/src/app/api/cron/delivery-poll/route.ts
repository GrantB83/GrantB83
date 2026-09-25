import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { pollPendingDeliveries } from '@/lib/delivery-poll'

export const dynamic = 'force-dynamic'

function authorize(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET
  if (!envSecret) return false
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const auth = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return headerSecret === envSecret || querySecret === envSecret || auth === envSecret
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await getDbAsync()
    const result = await pollPendingDeliveries(db)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[delivery-poll]', error)
    return NextResponse.json({ success: false, error: 'Poll failed' }, { status: 500 })
  }
}
