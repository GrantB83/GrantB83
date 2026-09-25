import { getSmsFromNumber, isSmsConfigured } from '@/lib/umi-channels'
import { resolveOutboundRecipient } from '@/lib/outbound-redirect'

export interface SendSmsResult {
  success: boolean
  messageId?: string
  timestamp: string
  error?: string
  redirected?: boolean
}

/**
 * Twilio SMS on the same account/family as dedicated WhatsApp.
 * Does not buy or invent a number. Never auto-called.
 */
export async function sendSms(input: { to: string; body: string }): Promise<SendSmsResult> {
  const timestamp = new Date().toISOString()
  if (!isSmsConfigured()) {
    return {
      success: false,
      timestamp,
      error:
        'SMS sender is not configured on the existing Twilio account/family. Do not buy a number; set TWILIO_SMS_FROM or reuse TWILIO_WHATSAPP_FROM.',
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID as string
  const authToken = process.env.TWILIO_AUTH_TOKEN as string
  const from = getSmsFromNumber()
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()

  let resolution
  try {
    resolution = await resolveOutboundRecipient({
      channel: 'whatsapp',
      intendedTo: input.to,
    })
  } catch (error) {
    return {
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Outbound redirect configuration error',
    }
  }

  const to = resolution.to.replace(/^whatsapp:/i, '')
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const formBody = new URLSearchParams()
  formBody.append('To', to)
  formBody.append('Body', input.body)
  if (messagingServiceSid) {
    formBody.append('MessagingServiceSid', messagingServiceSid)
  } else if (from) {
    formBody.append('From', from)
  } else {
    return {
      success: false,
      timestamp,
      error: 'SMS From missing (TWILIO_SMS_FROM or TWILIO_WHATSAPP_FROM)',
    }
  }

  const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  })
  const data = (await response.json()) as { sid?: string; message?: string }

  if (!response.ok) {
    return {
      success: false,
      timestamp,
      error: data.message || 'Twilio SMS send failed',
      redirected: resolution.redirected,
    }
  }

  return {
    success: true,
    messageId: data.sid,
    timestamp,
    redirected: resolution.redirected,
  }
}
