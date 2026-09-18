import { describe, it, expect } from 'vitest'
import {
  getStaffOpsEnqueueGate,
  ENQUEUE_BLOCKER_REASON,
  APPROVAL_QUEUE_PATH,
} from '../daily-brief-enqueue'

describe('getStaffOpsEnqueueGate (sync fallback)', () => {
  it('reports enqueue unsupported without DB context', () => {
    const gate = getStaffOpsEnqueueGate()
    expect(gate.enqueueSupported).toBe(false)
    expect(gate.enqueueBlocker).toBe(ENQUEUE_BLOCKER_REASON)
  })

  it('points to existing approval queue path for context', () => {
    const gate = getStaffOpsEnqueueGate()
    expect(gate.approvalQueuePath).toBe(APPROVAL_QUEUE_PATH)
  })

  it('lists copy/export fallbacks from PR #187', () => {
    const gate = getStaffOpsEnqueueGate()
    expect(gate.fallbackActions).toEqual(['copy', 'export_text', 'export_markdown'])
  })

  it('does not imply send on enqueue — no send action in gate', () => {
    const gate = getStaffOpsEnqueueGate()
    const serialized = JSON.stringify(gate)
    expect(serialized).not.toMatch(/auto.?send/i)
    expect(gate.enqueueSupported).toBe(false)
  })
})
