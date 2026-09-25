import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { upsertPropertyKnowledge } from '@/lib/property-knowledge'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    property?: string
    section?: string
    key?: string
    value?: string
  }
  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()
  const result = await upsertPropertyKnowledge(db, tenantId, {
    property: String(body.property || ''),
    section: String(body.section || ''),
    key: String(body.key || ''),
    value: String(body.value ?? ''),
    staffId: 'staff',
  })
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
