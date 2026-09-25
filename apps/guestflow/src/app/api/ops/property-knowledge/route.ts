import { NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { listPropertyKnowledge } from '@/lib/property-knowledge'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()
  const entries = await listPropertyKnowledge(db, tenantId)
  return NextResponse.json({ success: true, entries })
}
