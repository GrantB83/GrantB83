import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { lead_id, tenant_id, note_text } = body

    if (!lead_id || !tenant_id || !note_text || note_text.trim() === '') {
      return NextResponse.json({ 
        error: 'Missing required fields: lead_id, tenant_id, note_text' 
      }, { status: 400 })
    }

    const db = getDb()
    
    const lead = db.prepare('SELECT id, tenant_id FROM waitlist WHERE id = ? AND tenant_id = ?')
      .get(parseInt(lead_id, 10), parseInt(tenant_id, 10))

    if (!lead) {
      return NextResponse.json({ 
        error: 'Lead not found or does not belong to specified tenant' 
      }, { status: 404 })
    }

    const insert = db.prepare(`
      INSERT INTO lead_notes (lead_id, tenant_id, note_text, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `)
    
    const result = insert.run(
      parseInt(lead_id, 10),
      parseInt(tenant_id, 10),
      note_text.trim()
    )

    const newNote = db.prepare('SELECT * FROM lead_notes WHERE id = ?')
      .get(result.lastInsertRowid)

    return NextResponse.json({ 
      success: true,
      note: newNote
    })
  } catch (error) {
    console.error('Error creating lead note:', error)
    return NextResponse.json({ 
      error: 'Failed to create lead note' 
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('lead_id')
    const tenantId = searchParams.get('tenant_id')

    if (!leadId || !tenantId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: lead_id, tenant_id' 
      }, { status: 400 })
    }

    const db = getDb()
    
    const lead = db.prepare('SELECT id, tenant_id FROM waitlist WHERE id = ? AND tenant_id = ?')
      .get(parseInt(leadId, 10), parseInt(tenantId, 10))

    if (!lead) {
      return NextResponse.json({ 
        error: 'Lead not found or does not belong to specified tenant' 
      }, { status: 404 })
    }

    const notes = db.prepare(`
      SELECT id, lead_id, tenant_id, note_text, created_at
      FROM lead_notes
      WHERE lead_id = ? AND tenant_id = ?
      ORDER BY created_at DESC
    `).all(parseInt(leadId, 10), parseInt(tenantId, 10))

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching lead notes:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch lead notes' 
    }, { status: 500 })
  }
}
