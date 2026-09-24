export type UmiChannel = 'whatsapp_cloud' | 'whatsapp_web' | 'email' | 'sms'

export const UMI_CHANNELS: UmiChannel[] = [
  'whatsapp_cloud',
  'whatsapp_web',
  'email',
  'sms',
]

export const CHANNEL_BADGES: Record<UmiChannel, string> = {
  whatsapp_cloud: 'WhatsApp Cloud',
  whatsapp_web: 'WhatsApp Web',
  email: 'Email',
  sms: 'SMS',
}

export function mapSourceToChannel(source?: string | null): UmiChannel {
  const value = String(source || '').toLowerCase()
  if (value === 'twilio_sms' || value === 'sms') return 'sms'
  if (value === 'email' || value === 'email_forward') return 'email'
  if (value === 'whatsapp_web' || value === 'legacy_wa') return 'whatsapp_web'
  return 'whatsapp_cloud'
}

export function channelBadgeLabel(channel?: string | null): string {
  if (channel && channel in CHANNEL_BADGES) {
    return CHANNEL_BADGES[channel as UmiChannel]
  }
  return CHANNEL_BADGES[mapSourceToChannel(channel)]
}

export function isUmiChannel(value: string | null | undefined): value is UmiChannel {
  return Boolean(value && UMI_CHANNELS.includes(value as UmiChannel))
}

/** Phone channels share the WhatsApp redirect sink. */
export function redirectResolverChannel(channel: UmiChannel): 'whatsapp' | 'email' {
  return channel === 'email' ? 'email' : 'whatsapp'
}

export function sendApiChannel(channel: UmiChannel): 'whatsapp' | 'whatsapp_web' | 'email' | 'sms' {
  if (channel === 'whatsapp_cloud') return 'whatsapp'
  return channel
}

/**
 * SMS From: TWILIO_SMS_FROM if set, else the dedicated WA number family
 * without a whatsapp: prefix. Never invents a new MSIDN.
 */
export function getSmsFromNumber(): string | null {
  const explicit = process.env.TWILIO_SMS_FROM?.trim()
  if (explicit) return explicit.replace(/^whatsapp:/i, '')
  const family = process.env.TWILIO_WHATSAPP_FROM?.trim()
  if (family) return family.replace(/^whatsapp:/i, '')
  return null
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_SMS_FROM ||
        process.env.TWILIO_WHATSAPP_FROM ||
        process.env.TWILIO_MESSAGING_SERVICE_SID)
  )
}
