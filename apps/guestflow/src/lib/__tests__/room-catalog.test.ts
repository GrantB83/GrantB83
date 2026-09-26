import { describe, expect, it } from 'vitest'
import { displaySuiteName, roomDisplay, THEBROWNS_HOME_URL } from '../room-catalog'

describe('room-catalog', () => {
  it('renames Wolery to Heritage Cottage', () => {
    expect(displaySuiteName('Cottage Suites - Wolery')).toBe('Heritage Cottage')
    expect(displaySuiteName('Heritage Cottage')).toBe('Heritage Cottage')
  })

  it('maps luxury Garden / Master without inventing slugs', () => {
    const garden = roomDisplay('Luxury Suites - Garden')
    expect(garden.displayName).toBe('Garden Suite')
    expect(garden.publicUrl).toBe(THEBROWNS_HOME_URL)
    expect(roomDisplay('Luxury Suites - Master').displayName).toBe('Master Suite')
  })

  it('flags missing suite as a mapping gap', () => {
    const gap = roomDisplay('', { mappingGap: true })
    expect(gap.mappingGap).toBe(true)
    expect(gap.displayName).toBe('[SUITE NOT ASSIGNED]')
  })
})
