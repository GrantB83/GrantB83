import { createHash } from 'crypto'
import { normalizeEmail, normalizeZaE164 } from '@/lib/phone'

const DEDUP_WINDOW_MS = 120_000

export function normalizeDedupBody(text: string | null | undefined): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function bucketTimestamp(timestamp: string | null | undefined): string {
  const ms = timestamp ? Date.parse(timestamp) : Date.now()
  const safe = Number.isFinite(ms) ? ms : Date.now()
  const bucket = Math.floor(safe / DEDUP_WINDOW_MS) * DEDUP_WINDOW_MS
  return new Date(bucket).toISOString()
}

export function normalizeDedupSender(from: string | null | undefined): string {
  const raw = String(from || '').replace(/^whatsapp:/i, '').trim()
  return normalizeZaE164(raw) || normalizeEmail(raw) || raw.toLowerCase()
}

/**
 * Cloud API ↔ WA Web fingerprint for the same guest message.
 */
export function computeDedupKey(
  from: string | null | undefined,
  text: string | null | undefined,
  timestamp: string | null | undefined
): string {
  const payload = [
    normalizeDedupSender(from),
    normalizeDedupBody(text),
    bucketTimestamp(timestamp),
  ].join('|')
  return createHash('sha256').update(payload).digest('hex')
}
