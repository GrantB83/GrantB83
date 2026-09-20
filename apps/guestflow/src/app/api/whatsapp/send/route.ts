import { NextResponse } from 'next/server'
import { isWhatsAppConfigured, getWhatsAppMode, isWhatsAppSandboxMode, getWhatsAppProvider } from '@/lib/whatsapp'

const RETIRED_SEND = {
  success: false,
  retired: true,
  error:
    'POST /api/whatsapp/send is retired (410). All channel sends require approve + one-time confirmToken via POST /api/inbound/send.',
} as const

/**
 * POST /api/whatsapp/send
 *
 * Retired. CoS bounce: any channel send must use approve + one-time confirmToken
 * on POST /api/inbound/send. This route never calls the WhatsApp provider.
 */
export async function POST() {
  return NextResponse.json(RETIRED_SEND, { status: 410 })
}

/**
 * GET /api/whatsapp/send
 *
 * Status only. Does not send.
 */
export async function GET() {
  const mode = getWhatsAppMode()
  const provider = getWhatsAppProvider()
  const configured = isWhatsAppConfigured()
  const isSandbox = isWhatsAppSandboxMode()

  const providerInfo: Record<string, unknown> = {
    mode,
    provider,
    configured,
    sandboxMode: isSandbox,
    sendRetired: true,
    sendVia: '/api/inbound/send',
  }

  if (provider === 'sandbox') {
    providerInfo.message = 'WhatsApp is in SANDBOX MODE (dry-run only, safe for demos/testing)'
    providerInfo.note =
      'POST /api/whatsapp/send is retired. Guest send is approve + confirmToken on /api/inbound/send.'
    providerInfo.twilioRequired = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM']
    providerInfo.metaRequired = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID']
  } else if (provider === 'twilio') {
    providerInfo.message = 'WhatsApp is configured via Twilio (LIVE MODE)'
    providerInfo.note =
      'POST /api/whatsapp/send is retired. Live send requires approve + confirmToken on /api/inbound/send.'
  } else if (provider === 'meta') {
    providerInfo.message = 'WhatsApp is configured via Meta (LIVE MODE)'
    providerInfo.note =
      'POST /api/whatsapp/send is retired. Live send requires approve + confirmToken on /api/inbound/send.'
  }

  return NextResponse.json(providerInfo)
}
