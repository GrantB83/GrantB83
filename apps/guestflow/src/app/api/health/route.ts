import { NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { getOutboundStatus } from '@/lib/outbound-redirect'
import { staffApiResponseInit } from '@/lib/json-safe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const jsonInit = staffApiResponseInit()
  try {
    const db = await getDbAsync()
    const outboundStatus = await getOutboundStatus(db)

    return NextResponse.json(
      {
        status: 'ok',
        service: 'guestflow',
        tenant: 'Browns Dullstroom',
        database: db.type,
        outboundMode: outboundStatus.mode,
        outboundRedirect: outboundStatus.redirectStatus,
        timestamp: new Date().toISOString(),
      },
      jsonInit
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Health check failed'
    return NextResponse.json(
      {
        status: 'error',
        service: 'guestflow',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { ...jsonInit, status: 500 }
    )
  }
}
