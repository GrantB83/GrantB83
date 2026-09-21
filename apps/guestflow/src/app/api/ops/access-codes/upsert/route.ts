import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync, getDefaultTenantIdAsync } from '@/lib/db'
import { upsertAccessCode } from '@/lib/access-codes'
import { ACCESS_CODE_REDACTED } from '@/lib/access-codes-schema'

export async function POST(request: NextRequest) {
  try {
    const { property, code_type, suite, code } = await request.json()

    // Validation
    if (!property || !code_type || suite === undefined || !code) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'property, code_type, suite, and code are required' 
        },
        { status: 400 }
      )
    }

    if (!['gate_pinpad', 'lockbox', 'wifi_network', 'wifi_password'].includes(code_type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'code_type must be gate_pinpad, lockbox, wifi_network, or wifi_password' 
        },
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    const tenantId = await getDefaultTenantIdAsync()
    
    // For now, staff ID is 'staff' - can be enhanced with real staff auth
    const staffId = 'staff'
    
    const result = await upsertAccessCode(
      db,
      tenantId,
      property,
      code_type,
      suite,
      code,
      staffId
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        updated_at: result.updated_at,
        redacted_code: ACCESS_CODE_REDACTED, // Always redacted in response
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[access-codes-upsert] Error:', message)
    return NextResponse.json(
      { success: false, error: 'Failed to upsert access code' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upsert codes.' },
    { status: 405 }
  )
}
