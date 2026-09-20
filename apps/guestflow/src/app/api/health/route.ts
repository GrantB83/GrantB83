import { NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { getOutboundStatus } from '@/lib/outbound-redirect'

export async function GET() {
  try {
    const db = await getDbAsync()
    const outboundStatus = getOutboundStatus()
    
    return NextResponse.json({ 
      status: 'ok',
      service: 'guestflow',
      tenant: 'Browns Dullstroom',
      database: db.type,
      outboundMode: outboundStatus.mode,
      outboundRedirect: outboundStatus.redirectStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      service: 'guestflow',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
