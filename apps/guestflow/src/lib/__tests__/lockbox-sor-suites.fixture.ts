/**
 * Lockbox SoR fixture for property-resolve tests.
 *
 * Mirrors the documented Production shape from the gap-point-1 cross-check:
 * Cottage = 1 gate + 3 lockboxes; Main House = 1 gate + 5 lockboxes.
 * Suite strings are names already used in GuestFlow tests and Cottage Falcon
 * notes — not a live Production dump and not live codes.
 */

export const LOCKBOX_SOR_COTTAGE_SUITES = [
  'The Falcon Suite',
  'Eagle',
  'Crane',
] as const

export const LOCKBOX_SOR_MAIN_HOUSE_SUITES = [
  'Trout',
  'Robin',
  'Suite 1',
  'Suite 2',
  'Suite 3',
] as const

export const LOCKBOX_SOR_SUITES: Array<{ suite: string; property: 'cottage' | 'main-house' }> = [
  ...LOCKBOX_SOR_COTTAGE_SUITES.map((suite) => ({ suite, property: 'cottage' as const })),
  ...LOCKBOX_SOR_MAIN_HOUSE_SUITES.map((suite) => ({ suite, property: 'main-house' as const })),
]

export const LOCKBOX_MISMATCH_COTTAGE_NAME_MAIN_HOUSE = {
  suite: 'Cottage Garden Loft',
  property: 'main-house' as const,
}
