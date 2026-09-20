import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { getAllAccessCodes } from '@/lib/access-codes'
import { ACCESS_CODE_REDACTED } from '@/lib/access-codes-schema'

export async function GET(request: NextRequest) {
  try {
    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    
    const codes = await getAllAccessCodes(db, tenantId)
    
    // Redact code values for display (staff will see masked version)
    const redactedCodes = codes.map(code => ({
      ...code,
      code_value: ACCESS_CODE_REDACTED, // Mask actual codes
      code_value_hint: code.code_value.substring(0, 2) + '****', // Show first 2 chars
    }))

    return NextResponse.json({
      codes: redactedCodes,
      total: codes.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[access-codes-list] Error:', message)
    return NextResponse.json(
      { error: 'Failed to fetch access codes' },
      { status: 500 }
    )
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to list codes.' },
    { status: 405 }
  )
}
