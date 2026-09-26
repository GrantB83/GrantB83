import { normalizeZaE164 } from '@/lib/phone'

export const WA_WEB_SENTINEL_BODIES = [
  '[metadata-only]',
  '[body unavailable]',
  '[observe-probe]',
] as const

export type WaWebNameSource = {
  from?: string | null
  text?: string | null
  displayName?: string | null
  contactName?: string | null
  pushName?: string | null
  notifyName?: string | null
  chatTitle?: string | null
  name?: string | null
  metadata?: Record<string, unknown> | null
}

const NAME_KEYS = [
  'contactName',
  'pushName',
  'notifyName',
  'chatTitle',
  'displayName',
  'name',
] as const

export function isWaWebSentinelBody(text?: string | null): boolean {
  const value = String(text || '').trim()
  if (!value) return true
  return (WA_WEB_SENTINEL_BODIES as readonly string[]).includes(value)
}

export function isPhoneLikeDisplayName(name?: string | null, from?: string | null): boolean {
  const trimmed = String(name || '').trim()
  if (!trimmed) return true
  if (isWaWebSentinelBody(trimmed)) return true

  const nameE164 = normalizeZaE164(trimmed)
  const fromE164 = normalizeZaE164(from)
  if (nameE164 && fromE164 && nameE164 === fromE164) return true

  const compact = trimmed.replace(/[\s\-().]/g, '')
  if (/^\+?\d{8,15}$/.test(compact)) return true
  return false
}

function readNameField(bag: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!bag) return null
  const value = bag[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * First WhatsApp Web contact / push / chat title that is not just the raw number.
 * Never invents a name.
 */
export function extractWaWebDisplayName(source: WaWebNameSource | null | undefined): string | null {
  if (!source) return null
  const bags: Array<Record<string, unknown> | null | undefined> = [
    source as unknown as Record<string, unknown>,
    source.metadata,
  ]
  for (const bag of bags) {
    for (const key of NAME_KEYS) {
      const candidate = readNameField(bag, key)
      if (candidate && !isPhoneLikeDisplayName(candidate, source.from)) {
        return candidate
      }
    }
  }
  return null
}
