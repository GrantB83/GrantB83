import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'guestflow',
    tenant: 'Browns Dullstroom',
    timestamp: new Date().toISOString()
  })
}
