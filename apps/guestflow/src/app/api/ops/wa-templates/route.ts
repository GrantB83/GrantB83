import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { listWaTemplates } from '@/lib/wa-templates'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const picker = request.nextUrl.searchParams.get('picker') === '1'
  const db = await getDbAsync()
  const tenantId = await getDefaultTenantIdAsync()
  const templates = await listWaTemplates(db, tenantId, picker)
  return NextResponse.json({
    success: true,
    picker,
    emptyReason: picker
      ? 'Picker shows only templates APPROVED by WhatsApp. Grant-approved copy is stored but unsubmitted — none appear until Grant’s submit go-ahead and WhatsApp approval.'
      : null,
    templates,
  })
}
