/**
 * GuestFlow outbound/inbound email via existing Resend env.
 * Never invent From addresses. Never log API keys.
 */

export const RESEND_EMAILS_URL = 'https://api.resend.com/emails'
export const RESEND_RECEIVING_URL = 'https://api.resend.com/emails/receiving'

export interface SendEmailInput {
  to: string
  subject: string
  text: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  timestamp: string
  error?: string
}

export interface ReceivedEmailContent {
  text: string
  subject?: string
  from?: string
}

export interface NormalizedInboundEmail {
  from: string
  text: string
  timestamp: string
  source: 'email' | 'email_forward'
  subject?: string
  externalMessageId?: string
  emailId?: string
  needsBodyFetch: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmailAddress(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  const angle = trimmed.match(/<([^>]+)>/)
  return EMAIL_RE.test(angle ? angle[1].trim() : trimmed)
}

export function extractEmailAddress(value: string): string {
  const trimmed = value.trim()
  const angle = trimmed.match(/<([^>]+)>/)
  return (angle ? angle[1] : trimmed).trim()
}

export function getResendFromEmail(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  return from || null
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && getResendFromEmail())
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const timestamp = new Date().toISOString()
  const from = getResendFromEmail()

  if (!process.env.RESEND_API_KEY) {
    return {
      success: false,
      timestamp,
      error: 'RESEND_API_KEY environment variable not configured',
    }
  }

  if (!from) {
    return {
      success: false,
      timestamp,
      error: 'RESEND_FROM_EMAIL environment variable not configured',
    }
  }

  const to = extractEmailAddress(input.to)
  if (!isEmailAddress(to)) {
    return { success: false, timestamp, error: 'Invalid recipient email address' }
  }

  if (!input.text?.trim()) {
    return { success: false, timestamp, error: 'Email body is required' }
  }

  const subject = (input.subject || '').trim() || '(no subject)'

  // OUTBOUND REDIRECT: Resolve recipient (may redirect to test sink or block if misconfigured)
  let resolution
  let effectiveTo = to
  try {
    const { resolveOutboundRecipient } = await import('./outbound-redirect')
    resolution = await resolveOutboundRecipient({
      channel: 'email',
      intendedTo: to
    })
    
    // Override to with resolved recipient
    effectiveTo = resolution.to
    
    // Log redirect metadata for audit
    if (resolution.redirected) {
      console.log(`[OUTBOUND REDIRECT] Email send redirected: intended=${resolution.intendedTo} → actual=${resolution.to} mode=${resolution.mode}`)
    }
  } catch (resolverError) {
    // Resolver threw (missing sink or live mode without CLEAR)
    return {
      success: false,
      timestamp,
      error: resolverError instanceof Error ? resolverError.message : 'Outbound redirect configuration error'
    }
  }

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [effectiveTo],
        subject,
        text: input.text,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const details =
        typeof payload?.message === 'string'
          ? payload.message
          : `Resend HTTP ${response.status}`
      return { success: false, timestamp, error: details }
    }

    return {
      success: true,
      timestamp,
      messageId: payload?.id || null,
    }
  } catch (error) {
    return {
      success: false,
      timestamp,
      error: error instanceof Error ? error.message : 'Email send failed',
    }
  }
}

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmailContent | null> {
  if (!process.env.RESEND_API_KEY || !emailId) return null

  try {
    const response = await fetch(`${RESEND_RECEIVING_URL}/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    })
    if (!response.ok) return null
    const data = await response.json()
    const text =
      (typeof data.text === 'string' && data.text.trim()) ||
      (typeof data.html === 'string' ? stripHtml(data.html) : '')
    return {
      text: text.trim(),
      subject: typeof data.subject === 'string' ? data.subject : undefined,
      from: typeof data.from === 'string' ? data.from : undefined,
    }
  } catch {
    return null
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeInboundEmailPayload(body: unknown): NormalizedInboundEmail | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, any>

  if (raw.type === 'email.received' && raw.data && typeof raw.data === 'object') {
    const data = raw.data as Record<string, any>
    const from = extractEmailAddress(String(data.from || ''))
    if (!from) return null
    const emailId = typeof data.email_id === 'string' ? data.email_id : undefined
    const subject = typeof data.subject === 'string' ? data.subject : undefined
    return {
      from,
      text: '',
      timestamp: String(data.created_at || raw.created_at || new Date().toISOString()),
      source: 'email',
      subject,
      externalMessageId: emailId || (typeof data.message_id === 'string' ? data.message_id : undefined),
      emailId,
      needsBodyFetch: true,
    }
  }

  const from = extractEmailAddress(String(raw.from || ''))
  if (!from) return null
  const text = String(raw.text || raw.body || raw.html || '').trim()
  const subject = typeof raw.subject === 'string' ? raw.subject : undefined
  if (!text && !subject) return null

  return {
    from,
    text,
    timestamp: String(raw.timestamp || new Date().toISOString()),
    source: raw.source === 'email_forward' ? 'email_forward' : 'email',
    subject,
    externalMessageId: raw.externalMessageId || raw.external_message_id || undefined,
    needsBodyFetch: false,
  }
}

export function composeInboundEmailText(subject: string | undefined, text: string): string {
  const body = text.trim()
  if (body) return body
  if (subject) return `[body unavailable]\nSubject: ${subject}`
  return '[body unavailable]'
}

export function composeEmailSourceTag(sender: string): string {
  return `source=email · sender=${sender}`
}
