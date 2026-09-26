/**
 * Scheduled guest-journey drafts (Sprint 5 4a–4g).
 * Offsets and hours are Africa/Johannesburg. Job never sends.
 */

import {
  JOURNEY_STAGE_LIST,
  JOURNEY_STAGES,
  JOURNEY_TIME_ZONE,
  type JourneyStageId,
} from './journey-config'

export const ARRIVAL_TIME_ZONE = JOURNEY_TIME_ZONE

/** Legacy Sprint 2 ids — readable on historical rows only. */
export const LEGACY_ARRIVAL_STAGES = ['t-3', 't-1', 'day-of'] as const
export type LegacyArrivalStageId = (typeof LEGACY_ARRIVAL_STAGES)[number]

export type ArrivalStageId = JourneyStageId | LegacyArrivalStageId

export const ARRIVAL_STAGES = [
  ...Object.keys(JOURNEY_STAGES),
  ...LEGACY_ARRIVAL_STAGES,
] as ArrivalStageId[]

export interface ArrivalStageConfig {
  id: ArrivalStageId
  label: string
  offsetDays: number
  templateNames: string[]
}

export const ARRIVAL_DRAFTS_CONFIG = {
  timeZone: ARRIVAL_TIME_ZONE,
  runHourSast: 6,
  stages: {
    ...JOURNEY_STAGES,
    't-3': {
      id: 't-3' as const,
      label: 'T-3',
      offsetDays: -3,
      templateNames: ['browns_pre_arrival_welcome'],
    },
    't-1': {
      id: 't-1' as const,
      label: 'T-1',
      offsetDays: -1,
      templateNames: ['browns_checkin_instructions', 'browns_access_codes'],
    },
    'day-of': {
      id: 'day-of' as const,
      label: 'Day-of',
      offsetDays: 0,
      templateNames: ['browns_day_of_reminder'],
    },
  },
} as const

export const ARRIVAL_STAGE_LIST: ArrivalStageConfig[] = JOURNEY_STAGE_LIST.map((stage) => ({
  id: stage.id,
  label: stage.label,
  offsetDays: stage.offsetDays,
  templateNames: [...stage.templateNames],
}))

export const ACCESS_CODES_BLOCK_START = '--- access-codes:start ---'
export const ACCESS_CODES_BLOCK_END = '--- access-codes:end ---'
export const CODE_MISSING_PLACEHOLDER = 'code missing, ask staff'
export const NO_CONTACT_REASON = 'no contact'
export const TEMPLATE_PENDING_REASON = 'template pending approval'
export const CHECK_IN_TIME_LINE = 'From 14:00'
