/**
 * Sprint 5 stay journey 4a–4g. Africa/Johannesburg clocks.
 * Drafts only — never sends. 4f is system rescind (portal clock).
 */

import { addDaysIsoDate, bookingDateOnly } from './umi-sort'

export const JOURNEY_TIME_ZONE = 'Africa/Johannesburg'

export const JOURNEY_STAGE_IDS = [
  '4a_email',
  '4a_wa',
  '4b',
  '4c',
  '4d',
  '4e',
  '4g',
] as const

export type JourneyStageId = (typeof JOURNEY_STAGE_IDS)[number]

export type JourneyOffsetFrom = 'booking' | 'check_in' | 'check_out'

export interface JourneyStageConfig {
  id: JourneyStageId
  family: '4a' | '4b' | '4c' | '4d' | '4e' | '4g'
  label: string
  offsetFrom: JourneyOffsetFrom
  offsetDays: number
  hourSast: number
  minNights: number
  channel: 'email' | 'whatsapp_cloud' | 'preferred'
  templateNames: string[]
  guestFacing: true
}

export const JOURNEY_STAGES: Record<JourneyStageId, JourneyStageConfig> = {
  '4a_email': {
    id: '4a_email',
    family: '4a',
    label: 'Gate email',
    offsetFrom: 'booking',
    offsetDays: 0,
    hourSast: 6,
    minNights: 0,
    channel: 'email',
    templateNames: ['official_channel_notice'],
    guestFacing: true,
  },
  '4a_wa': {
    id: '4a_wa',
    family: '4a',
    label: 'Gate WA',
    offsetFrom: 'booking',
    offsetDays: 0,
    hourSast: 6,
    minNights: 0,
    channel: 'whatsapp_cloud',
    templateNames: ['official_channel_notice'],
    guestFacing: true,
  },
  '4b': {
    id: '4b',
    family: '4b',
    label: 'T−7',
    offsetFrom: 'check_in',
    offsetDays: -7,
    hourSast: 8,
    minNights: 0,
    channel: 'preferred',
    templateNames: ['browns_pre_arrival_welcome'],
    guestFacing: true,
  },
  '4c': {
    id: '4c',
    family: '4c',
    label: 'Day-of',
    offsetFrom: 'check_in',
    offsetDays: 0,
    hourSast: 8,
    minNights: 0,
    channel: 'preferred',
    templateNames: ['browns_day_of_reminder'],
    guestFacing: true,
  },
  '4d': {
    id: '4d',
    family: '4d',
    label: 'Comfort',
    offsetFrom: 'check_in',
    offsetDays: 1,
    hourSast: 8,
    minNights: 2,
    channel: 'preferred',
    templateNames: ['browns_mid_stay_checkin'],
    guestFacing: true,
  },
  '4e': {
    id: '4e',
    family: '4e',
    label: 'Departure',
    offsetFrom: 'check_out',
    offsetDays: 0,
    hourSast: 8,
    minNights: 0,
    channel: 'preferred',
    templateNames: ['browns_checkout_reminder'],
    guestFacing: true,
  },
  '4g': {
    id: '4g',
    family: '4g',
    label: 'Review',
    offsetFrom: 'check_out',
    offsetDays: 0,
    hourSast: 17,
    minNights: 0,
    channel: 'preferred',
    templateNames: ['browns_review_request'],
    guestFacing: true,
  },
}

export const JOURNEY_STAGE_LIST: JourneyStageConfig[] = JOURNEY_STAGE_IDS.map(
  (id) => JOURNEY_STAGES[id]
)

export const REVIEW_URL_NEEDS_GRANT = '[NeedsGrant: Google review URL]'

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = bookingDateOnly(checkIn)
  const end = bookingDateOnly(checkOut)
  if (!start || !end) return 0
  const a = Date.parse(`${start}T00:00:00.000Z`)
  const b = Date.parse(`${end}T00:00:00.000Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0
  return Math.round((b - a) / 86400000)
}

export function journeyDueDate(
  stage: JourneyStageConfig,
  checkIn: string,
  checkOut: string
): string | null {
  if (stage.offsetFrom === 'booking') {
    return bookingDateOnly(checkIn) // presence marker; 4a is due while stay is upcoming/current
  }
  const base = stage.offsetFrom === 'check_out' ? bookingDateOnly(checkOut) : bookingDateOnly(checkIn)
  if (!base) return null
  return addDaysIsoDate(base, stage.offsetDays)
}

export function dueJourneyStages(input: {
  checkIn: string
  checkOut: string
  todaySast: string
  hourSast: number
}): JourneyStageId[] {
  const nights = nightsBetween(input.checkIn, input.checkOut)
  const due: JourneyStageId[] = []
  for (const stage of JOURNEY_STAGE_LIST) {
    if (nights < stage.minNights) continue
    if (input.hourSast < stage.hourSast) continue
    if (stage.offsetFrom === 'booking') {
      const checkOut = bookingDateOnly(input.checkOut)
      if (checkOut && checkOut >= input.todaySast) due.push(stage.id)
      continue
    }
    const dueDate = journeyDueDate(stage, input.checkIn, input.checkOut)
    if (dueDate === input.todaySast) due.push(stage.id)
  }
  return due
}

export function isJourneyStageId(value: string | null | undefined): value is JourneyStageId {
  return JOURNEY_STAGE_IDS.includes(value as JourneyStageId)
}

export function journeyTimingChip(stageLabel: string | null | undefined): string | null {
  const label = String(stageLabel || '')
  if (/t−7|t-7|4b/i.test(label)) return 'T−7'
  if (/t−1|t-1/i.test(label)) return 'T−1'
  if (/day-of|4c/i.test(label)) return 'Day-of'
  return null
}
