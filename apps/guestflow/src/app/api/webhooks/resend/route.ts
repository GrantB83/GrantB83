import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { applyProviderReceipt } from '@/lib/delivery-status'
import {
  parseResendDeliveryEvent,
  verifyResendDeliveryRequest,
} from '@/lib/resend-delivery-webhook'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (!verifyResendDeliveryRequest(request, raw)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: unknown
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const event = parseResendDeliveryEvent(parsed)
  if (!event) {
    return NextResponse.json({ success: true, ignored: true })
  }

  try {
    const db = await getDbAsync()
    const result = await applyProviderReceipt(db, {
      providerMessageId: event.providerMessageId,
      providerStatus: event.providerStatus,
    })
    return NextResponse.json({ success: true, ignored: !result.updated })
  } catch (error) {
    console.error('[resend/delivery]', error)
    return NextResponse.json({ success: false, error: 'Failed to apply receipt' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'resend-delivery' })
}
