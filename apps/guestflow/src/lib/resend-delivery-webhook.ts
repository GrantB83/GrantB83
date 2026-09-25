import crypto from 'crypto'
import { verifySharedSecret } from '@/lib/inbound-ingest'

function svixSecretBytes(secret: string): Buffer {
  const trimmed = secret.trim()
  if (trimmed.startsWith('whsec_')) {
    return Buffer.from(trimmed.slice('whsec_'.length), 'base64')
  }
  return Buffer.from(trimmed)
}

export function verifyResendSvixSignature(input: {
  payload: string
  svixId: string
  svixTimestamp: string
  svixSignature: string
  secret: string
}): boolean {
  const signedContent = `${input.svixId}.${input.svixTimestamp}.${input.payload}`
  const expected = crypto
    .createHmac('sha256', svixSecretBytes(input.secret))
    .update(signedContent)
    .digest('base64')
  const candidates = input.svixSignature
    .split(' ')
    .map((part) => part.replace(/^v1,?/, '').replace(/^v1=/, ''))
    .filter(Boolean)
  return candidates.some((candidate) => {
    try {
      const a = Buffer.from(candidate)
      const b = Buffer.from(expected)
      if (a.length !== b.length) return false
      return crypto.timingSafeEqual(a, b)
    } catch {
      return candidate === expected
    }
  })
}

export function verifyResendDeliveryRequest(
  request: { headers: { get(name: string): string | null } },
  rawBody: string
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (secret && svixId && svixTimestamp && svixSignature) {
    return verifyResendSvixSignature({
      payload: rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
      secret,
    })
  }

  return verifySharedSecret(request, [secret], ['x-webhook-secret'])
}

export function verifyResendInboundEmailRequest(
  request: { headers: { get(name: string): string | null } },
  rawBody: string
): boolean {
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (svixId && svixTimestamp && svixSignature) {
    const secrets = [
      process.env.RESEND_INBOUND_WEBHOOK_SECRET,
      process.env.RESEND_WEBHOOK_SECRET,
    ].filter((s): s is string => Boolean(s))
    for (const secret of secrets) {
      if (
        verifyResendSvixSignature({
          payload: rawBody,
          svixId,
          svixTimestamp,
          svixSignature,
          secret,
        })
      ) {
        return true
      }
    }
    return false
  }

  return verifySharedSecret(
    request,
    [process.env.RESEND_WEBHOOK_SECRET, process.env.INBOUND_WEBHOOK_SECRET],
    ['x-webhook-secret']
  )
}

export function parseResendDeliveryEvent(body: unknown): {
  providerMessageId: string
  providerStatus: string
} | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, any>
  const type = String(raw.type || raw.event || '')
  const data = (raw.data && typeof raw.data === 'object' ? raw.data : raw) as Record<string, any>
  const id = String(data.email_id || data.id || '')
  if (!id || !type) return null
  return { providerMessageId: id, providerStatus: type }
}
