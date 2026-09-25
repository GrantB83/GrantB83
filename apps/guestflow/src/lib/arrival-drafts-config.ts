/**
 * Single config for scheduled arrival drafts (Sprint 2 item G).
 * Offsets are Johannesburg calendar days relative to check-in.
 * runHourSast is when the job may first emit drafts for that date.
 */

export const ARRIVAL_TIME_ZONE = 'Africa/Johannesburg'

export const ARRIVAL_STAGES = ['t-3', 't-1', 'day-of'] as const
export type ArrivalStageId = (typeof ARRIVAL_STAGES)[number]

export interface ArrivalStageConfig {
  id: ArrivalStageId
  label: 'T-3' | 'T-1' | 'Day-of'
  offsetDays: number
  templateNames: string[]
}

export const ARRIVAL_DRAFTS_CONFIG = {
  timeZone: ARRIVAL_TIME_ZONE,
  runHourSast: 6,
  stages: {
    't-3': {
      id: 't-3',
      label: 'T-3',
      offsetDays: -3,
      templateNames: ['browns_pre_arrival_welcome'],
    },
    't-1': {
      id: 't-1',
      label: 'T-1',
      offsetDays: -1,
      templateNames: ['browns_checkin_instructions', 'browns_access_codes'],
    },
    'day-of': {
      id: 'day-of',
      label: 'Day-of',
      offsetDays: 0,
      templateNames: ['browns_day_of_reminder'],
    },
  } satisfies Record<ArrivalStageId, ArrivalStageConfig>,
} as const

export const ARRIVAL_STAGE_LIST: ArrivalStageConfig[] = [
  ARRIVAL_DRAFTS_CONFIG.stages['t-3'],
  ARRIVAL_DRAFTS_CONFIG.stages['t-1'],
  ARRIVAL_DRAFTS_CONFIG.stages['day-of'],
]

export const ACCESS_CODES_BLOCK_START = '--- access-codes:start ---'
export const ACCESS_CODES_BLOCK_END = '--- access-codes:end ---'
export const CODE_MISSING_PLACEHOLDER = 'code missing, ask staff'
export const NO_CONTACT_REASON = 'no contact'
export const TEMPLATE_PENDING_REASON = 'template pending approval'
export const CHECK_IN_TIME_LINE = 'From 14:00'
