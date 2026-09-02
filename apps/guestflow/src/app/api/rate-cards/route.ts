import { NextRequest, NextResponse } from 'next/server'
import { getDb, getDefaultTenantId } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantIdParam = searchParams.get('tenant_id')
    
    const db = getDb()
    const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : getDefaultTenantId()

    const rateCards = db.prepare(`
      SELECT rc.*, p.name as property_name
      FROM rate_cards rc
      LEFT JOIN properties p ON rc.property_id = p.id
      WHERE rc.tenant_id = ?
      ORDER BY rc.created_at DESC
    `).all(tenantId)

    return NextResponse.json({ rateCards })
  } catch (error: any) {
    console.error('Error fetching rate cards:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = await request.json()

    const { rateCards, tenant_id } = body
    const tenantId = tenant_id || getDefaultTenantId()

    if (!Array.isArray(rateCards) || rateCards.length === 0) {
      return NextResponse.json({ error: 'Invalid rate cards data' }, { status: 400 })
    }

    const insert = db.prepare(`
      INSERT INTO rate_cards (
        tenant_id, property_id, room_type, season, rate_per_night, 
        currency, min_nights, valid_from, valid_to, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertMany = db.transaction((cards: any[]) => {
      for (const card of cards) {
        insert.run(
          tenantId,
          card.property_id || null,
          card.room_type,
          card.season || 'standard',
          card.rate_per_night,
          card.currency || 'ZAR',
          card.min_nights || 1,
          card.valid_from || null,
          card.valid_to || null,
          card.notes || null
        )
      }
    })

    insertMany(rateCards)

    return NextResponse.json({ success: true, count: rateCards.length })
  } catch (error: any) {
    console.error('Error uploading rate cards:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantIdParam = searchParams.get('tenant_id')
    
    const db = getDb()
    const tenantId = tenantIdParam ? parseInt(tenantIdParam, 10) : getDefaultTenantId()

    db.prepare('DELETE FROM rate_cards WHERE tenant_id = ?').run(tenantId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting rate cards:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
