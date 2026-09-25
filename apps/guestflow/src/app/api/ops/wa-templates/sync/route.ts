import { NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { syncTemplateApprovalsReadonly } from '@/lib/wa-templates'

export const dynamic = 'force-dynamic'

export async function POST() {
  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()
  const result = await syncTemplateApprovalsReadonly(db, tenantId)
  return NextResponse.json({
    success: true,
    readonly: true,
    ...result,
  })
}
