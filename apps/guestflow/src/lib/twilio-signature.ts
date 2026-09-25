import crypto from 'crypto'

/**
 * Twilio request signature (StatusCallback and inbound).
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function buildTwilioSignature(
  url: string,
  params: Record<string, string>,
  authToken: string
): string {
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }
  return crypto.createHmac('sha1', authToken).update(data).digest('base64')
}

export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken?: string
): boolean {
  const token = authToken ?? process.env.TWILIO_AUTH_TOKEN
  if (!token) {
    return process.env.NODE_ENV !== 'production'
  }
  if (!signature) return false
  const expected = buildTwilioSignature(url, params, token)
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return signature === expected
  }
}

export function parseFormUrlEncoded(text: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (!text) return params
  for (const pair of text.split('&')) {
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    const key = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, ' '))
    const value = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '))
    params[key] = value
  }
  return params
}
