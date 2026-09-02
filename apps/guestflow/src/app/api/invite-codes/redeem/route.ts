import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { z } from 'zod'

const RedeemCodeSchema = z.object({
  code: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = RedeemCodeSchema.parse(body)
    
    const db = getDb()
    
    const inviteCode = db.prepare(`
      SELECT * FROM invite_codes
      WHERE code = ?
    `).get(code.toUpperCase()) as any
    
    if (!inviteCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid code' 
      }, { status: 404 })
    }
    
    if (inviteCode.current_uses >= inviteCode.max_uses) {
      return NextResponse.json({ 
        success: false, 
        error: 'Code has reached maximum uses' 
      }, { status: 400 })
    }
    
    if (inviteCode.expires_at) {
      const expiry = new Date(inviteCode.expires_at)
      if (expiry < new Date()) {
        return NextResponse.json({ 
          success: false, 
          error: 'Code has expired' 
        }, { status: 400 })
      }
    }
    
    db.prepare(`
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE id = ?
    `).run(inviteCode.id)
    
    const tenant = db.prepare(`
      SELECT * FROM tenants WHERE id = ?
    `).get(inviteCode.tenant_id)
    
    return NextResponse.json({
      success: true,
      tenant,
      message: 'Demo access unlocked! This is demo/preview access only — NOT a paid account.'
    })
  } catch (error) {
    console.error('Error redeeming code:', error)
    return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 })
  }
}
