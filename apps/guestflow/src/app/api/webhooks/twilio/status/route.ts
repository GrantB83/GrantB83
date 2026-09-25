import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { applyProviderReceipt } from '@/lib/delivery-status'
import { parseFormUrlEncoded, verifyTwilioSignature } from '@/lib/twilio-signature'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const raw = await request.text()
  const params = parseFormUrlEncoded(raw)
  const signature = request.headers.get('x-twilio-signature') || ''

  if (!verifyTwilioSignature(signature, request.url, params)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const sid = (params.MessageSid || params.SmsSid || '').trim()
  const status = (params.MessageStatus || params.SmsStatus || '').trim()
  if (!sid || !status) {
    return new NextResponse('', { status: 200 })
  }

  try {
    const db = await getDbAsync()
    await applyProviderReceipt(db, {
      providerMessageId: sid,
      providerStatus: status,
      errorCode: params.ErrorCode || null,
      errorMessage: params.ErrorMessage || null,
    })
  } catch (error) {
    console.error('[twilio/status]', error)
  }

  return new NextResponse('', { status: 200 })
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'twilio-status' })
}
