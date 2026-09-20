/**
 * ZA-friendly E.164 normalize. Never invents a number.
 * Unparseable input returns null.
 */

export function normalizeZaE164(raw?: string | null): string | null {
  if (raw == null) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  if (/[a-zA-Z]/.test(trimmed) && !/^whatsapp:/i.test(trimmed)) return null

  let value = trimmed.replace(/^whatsapp:/i, '').replace(/[\s\-().]/g, '')
  if (!value) return null

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`
  }

  if (value.startsWith('+')) {
    const digits = value.slice(1).replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 15) return `+${digits}`
    return null
  }

  const digits = value.replace(/\D/g, '')
  if (!digits) return null

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+27${digits.slice(1)}`
  }
  if (digits.length === 11 && digits.startsWith('27')) {
    return `+${digits}`
  }
  // Ambiguous international without + — do not guess country
  return null
}

export function normalizeEmail(raw?: string | null): string | null {
  if (raw == null) return null
  const value = String(raw).trim().toLowerCase()
  if (!value || !value.includes('@') || value.length < 3) return null
  return value
}
