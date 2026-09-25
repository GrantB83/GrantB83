import { NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const timestamp = new Date().toISOString()
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  }
  try {
    const db = await getDbAsync()
    await db.prepare('SELECT 1 AS ok').get()
    return NextResponse.json(
      {
        status: 'ok',
        service: 'guestflow',
        check: 'deep',
        database: db.type,
        touched: true,
        timestamp,
      },
      { headers }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'guestflow',
        check: 'deep',
        touched: false,
        timestamp,
        error: error instanceof Error ? error.message : 'deep health failed',
      },
      { status: 503, headers }
    )
  }
}
