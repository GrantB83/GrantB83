/**
 * Contact field provenance and OTA relay classification.
 *
 * Precedence (highest wins), documented per Sprint 2 item E and
 * NB-contact-fields-sources.md:
 *   1. arrivals_departures  (A&D xlsx — source of record)
 *   2. staff                (staff entry on booking/thread)
 *   3. guest                (guest portal self-fill)
 *   4. client_report        (NB Client report — gap-fill only)
 *   5. stay_at              (inbound stay@ sender — speed layer)
 *
 * A&D may refresh its own fields. stay@ may replace an A&D *relay*
 * email with a *direct* sender. stay@ never overwrites a direct A&D email.
 * Never invent PII. Never send from this module.
 */

export const CONTACT_SOURCES = [
  'arrivals_departures',
  'staff',
  'guest',
  'client_report',
  'stay_at',
] as const

export type ContactSource = (typeof CONTACT_SOURCES)[number]

export type EmailKind = 'direct' | 'relay'

export const CONTACT_SOURCE_RANK: Record<ContactSource, number> = {
  arrivals_departures: 100,
  staff: 80,
  guest: 60,
  client_report: 40,
  stay_at: 20,
}

/** Maps field provenance onto the existing guest_contacts.source CHECK. */
export const GUEST_CONTACT_SOURCE_MAP: Record<ContactSource, 'nb' | 'inbound' | 'manual'> = {
  arrivals_departures: 'nb',
  client_report: 'nb',
  staff: 'manual',
  guest: 'manual',
  stay_at: 'inbound',
}

/**
 * Confirmed / listed OTA relay hosts from NB-contact-fields-sources.md §5
 * and the layered sync spec L2.2. Hosts compared case-insensitively.
 */
export const RELAY_EMAIL_HOSTS = [
  'guest.booking.com',
  'm.expediapartnercentral.com',
  'guest.airbnb.com',
  'reply.airbnb.com',
  'agoda-messaging.com',
  'lekkeslaap.co.za',
  'travelground.com',
] as const

export const RELAY_EMAIL_HOST_SUFFIXES = [
  '.expediapartnercentral.com',
  '.lekkeslaap.co.za',
  '.travelground.com',
] as const

const PLACEHOLDER_EMAIL_RE = /^(noemail@|none@|test@)|@example\.|example\./i

export function isContactSource(value: string | null | undefined): value is ContactSource {
  return Boolean(value && (CONTACT_SOURCES as readonly string[]).includes(value))
}

export function contactSourceRank(source: string | null | undefined): number {
  if (!isContactSource(source)) return 0
  return CONTACT_SOURCE_RANK[source]
}

export function emailHost(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null
  const host = email.trim().toLowerCase().split('@').pop()
  return host || null
}

export function isRelayEmail(email: string | null | undefined): boolean {
  const host = emailHost(email)
  if (!host) return false
  if ((RELAY_EMAIL_HOSTS as readonly string[]).includes(host)) return true
  return RELAY_EMAIL_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

export function classifyEmailKind(email: string | null | undefined): EmailKind | null {
  if (!email) return null
  return isRelayEmail(email) ? 'relay' : 'direct'
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return PLACEHOLDER_EMAIL_RE.test(email.trim())
}

export function isBlockGuestName(name: string | null | undefined): boolean {
  if (!name) return false
  const normalised = name.trim().toUpperCase()
  return normalised === 'BLOCK' || normalised.startsWith('BLOCK ')
}

/**
 * Decide whether incoming may replace stored.
 * stay@ + direct may replace A&D + relay; nothing else may replace a higher rank.
 */
export function mayReplaceContactField(input: {
  incomingSource: ContactSource
  incomingKind?: EmailKind | null
  storedSource?: string | null
  storedKind?: EmailKind | string | null
  storedValue?: string | null
}): boolean {
  if (!input.storedValue) return true
  // Pre-provenance booking fields came from A&D ingest; protect them as SoR.
  const storedSource = input.storedSource || 'arrivals_departures'
  const storedRank = contactSourceRank(storedSource)
  const incomingRank = CONTACT_SOURCE_RANK[input.incomingSource]

  if (
    input.incomingSource === 'stay_at' &&
    input.incomingKind === 'direct' &&
    storedSource === 'arrivals_departures' &&
    input.storedKind === 'relay'
  ) {
    return true
  }

  if (incomingRank > storedRank) return true
  if (incomingRank === storedRank && input.incomingSource === input.storedSource) return true
  return false
}
