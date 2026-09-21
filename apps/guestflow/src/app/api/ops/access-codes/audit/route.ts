import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { getAuditLog } from '@/lib/access-codes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)

    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    
    const logs = await getAuditLog(db, tenantId, days)

    return NextResponse.json({
      logs,
      total: logs.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[access-codes-audit] Error:', message)
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to fetch audit log.' },
    { status: 405 }
  )
}
