/**
 * One header chip language (Design SoR #3).
 * Cap visible chips at 3; overflow the rest. List cards must not use this row.
 */

export type HeaderChipTone = 'info' | 'neutral' | 'attention'

export interface HeaderChip {
  id: string
  label: string
  tone: HeaderChipTone
  priority: 0 | 1 | 2 | 3
}

export const WINDOW_CLOSED_LABEL = 'Window closed'
export const WINDOW_OPEN_LABEL = 'Window open'

export const CHIP_TONE_CLASS: Record<HeaderChipTone, string> = {
  info: 'bg-[#DCE8F9] text-[#0A3775]',
  neutral: 'bg-[#EEF1F4] text-[#5B6B7C]',
  attention: 'bg-[#FCE8E8] text-[#9B1C1C]',
}

export function buildHeaderChips(input: {
  windowState?: 'open' | 'closing_soon' | 'closed' | null
  timingLabel?: string | null
  channelReadyLabel?: string | null
  attentionLabel?: string | null
}): { visible: HeaderChip[]; overflow: HeaderChip[] } {
  const chips: HeaderChip[] = []
  if (input.windowState === 'closed') {
    chips.push({ id: 'window', label: WINDOW_CLOSED_LABEL, tone: 'neutral', priority: 0 })
  } else if (input.windowState === 'closing_soon') {
    chips.push({ id: 'window', label: 'Window closing', tone: 'neutral', priority: 0 })
  } else if (input.windowState === 'open') {
    chips.push({ id: 'window', label: WINDOW_OPEN_LABEL, tone: 'info', priority: 0 })
  }
  if (input.timingLabel) {
    chips.push({ id: 'timing', label: input.timingLabel, tone: 'info', priority: 1 })
  }
  if (input.channelReadyLabel) {
    chips.push({
      id: 'channel',
      label: input.channelReadyLabel,
      tone: 'neutral',
      priority: 2,
    })
  }
  if (input.attentionLabel) {
    chips.push({
      id: 'attention',
      label: input.attentionLabel,
      tone: 'attention',
      priority: 3,
    })
  }
  chips.sort((a, b) => a.priority - b.priority)
  return { visible: chips.slice(0, 3), overflow: chips.slice(3) }
}

export type StayStateLabel = 'ARRIVING' | 'IN HOUSE' | 'DEPARTING'

export function stayStateLabel(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  todaySast: string
): StayStateLabel {
  const inDate = String(checkIn || '').slice(0, 10)
  const outDate = String(checkOut || '').slice(0, 10)
  if (outDate && outDate <= todaySast) return 'DEPARTING'
  if (inDate && inDate <= todaySast && outDate && outDate > todaySast) return 'IN HOUSE'
  return 'ARRIVING'
}
