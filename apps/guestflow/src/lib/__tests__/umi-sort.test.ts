import { describe, expect, it } from 'vitest'
import { inboxSortBucket, isArrivingSoon, sortInboxThreads } from '@/lib/umi-sort'

describe('umi-sort', () => {
  const now = new Date('2026-09-24T10:00:00.000Z')

  it('treats today and tomorrow SAST check-ins as arriving', () => {
    expect(isArrivingSoon('2026-09-24', now)).toBe(true)
    expect(isArrivingSoon('2026-09-25', now)).toBe(true)
    expect(isArrivingSoon('2026-09-26', now)).toBe(false)
  })

  it('sorts arriving → pending → recent', () => {
    const sorted = sortInboxThreads(
      [
        { checkIn: '2026-10-01', pendingReply: false, lastMessageAt: '2026-09-24T18:00:00.000Z' },
        { checkIn: '2026-09-25', pendingReply: false, lastMessageAt: '2026-09-20T10:00:00.000Z' },
        { checkIn: '2026-10-02', pendingReply: true, lastMessageAt: '2026-09-23T10:00:00.000Z' },
      ],
      now
    )
    expect(sorted.map((row) => row.sortBucket)).toEqual([0, 1, 2])
  })

  it('counts open drafts as pending', () => {
    expect(inboxSortBucket({ hasOpenDraft: true, checkIn: '2026-10-10' }, now)).toBe(1)
  })
})
