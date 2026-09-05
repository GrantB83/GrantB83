import { NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDbAsync()
    
    return NextResponse.json({ 
      status: 'ok',
      service: 'guestflow',
      tenant: 'Browns Dullstroom',
      database: db.type,
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
