import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const { name, email, propertyName, roomCount, currentSystem, phone, notes } = data

    if (!name || !email || !propertyName || !roomCount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getDb()
    
    const stmt = db.prepare(`
      INSERT INTO waitlist (name, email, property_name, room_count, current_system, phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(name, email, propertyName, roomCount, currentSystem || null, phone || null, notes || null)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Waitlist submission error:', error)
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const db = getDb()
    const entries = db.prepare('SELECT id, name, email, property_name, room_count, created_at FROM waitlist ORDER BY created_at DESC').all()
    
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Waitlist fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
