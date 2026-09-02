import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { z } from 'zod'

const CreateInviteCodeSchema = z.object({
  tenant_id: z.number(),
  max_uses: z.number().min(1).default(1),
  expires_at: z.string().optional(),
  note: z.string().optional()
})

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = CreateInviteCodeSchema.parse(body)
    
    const db = getDb()
    const code = generateCode()
    
    const stmt = db.prepare(`
      INSERT INTO invite_codes (tenant_id, code, max_uses, expires_at, note)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      validated.tenant_id,
      code,
      validated.max_uses,
      validated.expires_at || null,
      validated.note || null
    )
    
    return NextResponse.json({
      id: result.lastInsertRowid,
      code,
      tenant_id: validated.tenant_id,
      max_uses: validated.max_uses,
      current_uses: 0,
      expires_at: validated.expires_at || null,
      note: validated.note || null
    })
  } catch (error) {
    console.error('Error creating invite code:', error)
    return NextResponse.json({ error: 'Failed to create invite code' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
    }
    
    const db = getDb()
    const codes = db.prepare(`
      SELECT * FROM invite_codes
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).all(parseInt(tenantId))
    
    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Error fetching invite codes:', error)
    return NextResponse.json({ error: 'Failed to fetch invite codes' }, { status: 500 })
  }
}
