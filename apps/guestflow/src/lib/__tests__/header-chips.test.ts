import { describe, expect, it } from 'vitest'
import { buildHeaderChips, stayStateLabel, WINDOW_CLOSED_LABEL } from '../header-chips'

describe('header-chips', () => {
  it('uses one Window closed spelling and caps visible chips at 3', () => {
    const { visible, overflow } = buildHeaderChips({
      windowState: 'closed',
      timingLabel: 'Day-of',
      channelReadyLabel: 'Redirect sink',
      attentionLabel: 'code missing, ask staff',
    })
    expect(visible).toHaveLength(3)
    expect(visible[0].label).toBe(WINDOW_CLOSED_LABEL)
    expect(visible.map((chip) => chip.label)).not.toContain('WA closed')
    expect(overflow).toHaveLength(1)
    expect(overflow[0].label).toBe('code missing, ask staff')
  })

  it('derives ARRIVING / IN HOUSE / DEPARTING from SAST dates', () => {
    expect(stayStateLabel('2026-09-27', '2026-09-29', '2026-09-26')).toBe('ARRIVING')
    expect(stayStateLabel('2026-09-26', '2026-09-29', '2026-09-27')).toBe('IN HOUSE')
    expect(stayStateLabel('2026-09-20', '2026-09-26', '2026-09-26')).toBe('DEPARTING')
  })
})
