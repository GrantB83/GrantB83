/**
 * Guest-facing room names and verified public links.
 * Do not invent per-room slugs or access codes.
 */

export const THEBROWNS_HOME_URL = 'https://www.thebrowns.co.za/'

export interface RoomDisplay {
  bookedName: string
  displayName: string
  publicUrl: string
  mappingGap: boolean
}

const ALIASES: Array<{ match: RegExp; displayName: string }> = [
  { match: /\bwolery\b/i, displayName: 'Heritage Cottage' },
  { match: /\bheritage cottage\b/i, displayName: 'Heritage Cottage' },
  { match: /\bgarden\b/i, displayName: 'Garden Suite' },
  { match: /\bmaster\b/i, displayName: 'Master Suite' },
  { match: /\bloft\b/i, displayName: 'Loft Family Suite' },
  { match: /\bfalcon\b/i, displayName: 'The Falcon Suite' },
  { match: /\beagle\b/i, displayName: 'Eagle' },
  { match: /\bcrane\b/i, displayName: 'Crane' },
  { match: /\btrout\b/i, displayName: 'Trout' },
  { match: /\brobin\b/i, displayName: 'Robin' },
]

export function displaySuiteName(bookedName: string | null | undefined): string {
  const raw = String(bookedName || '').trim()
  if (!raw) return ''
  for (const alias of ALIASES) {
    if (alias.match.test(raw)) return alias.displayName
  }
  return raw
}

export function roomDisplay(
  bookedName: string | null | undefined,
  options: { mappingGap?: boolean } = {}
): RoomDisplay {
  const raw = String(bookedName || '').trim()
  const displayName = displaySuiteName(raw) || '[SUITE NOT ASSIGNED]'
  return {
    bookedName: raw,
    displayName,
    publicUrl: THEBROWNS_HOME_URL,
    mappingGap: Boolean(options.mappingGap || !raw),
  }
}
