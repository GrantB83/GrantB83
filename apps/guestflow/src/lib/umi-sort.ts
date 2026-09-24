export const SAST_TIME_ZONE = 'Africa/Johannesburg'
export const ARRIVAL_WINDOW_DAYS = 1
export const TEMP_NUDGE_HOURS = 48
export const TEMP_EXPIRE_DAYS = 14

export function sastDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDaysIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

export function bookingDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

export function isArrivingSoon(
  checkIn: string | null | undefined,
  now: Date = new Date()
): boolean {
  const date = bookingDateOnly(checkIn)
  if (!date) return false
  const today = sastDateString(now)
  const tomorrow = addDaysIsoDate(today, ARRIVAL_WINDOW_DAYS)
  return date === today || date === tomorrow
}

export type InboxSortBucket = 0 | 1 | 2

export interface SortableInboxThread {
  checkIn?: string | null
  pendingReply?: boolean | number | null
  hasOpenDraft?: boolean | number | null
  lastMessageAt?: string | null
  sortBucket?: InboxSortBucket
}

export function inboxSortBucket(
  thread: SortableInboxThread,
  now: Date = new Date()
): InboxSortBucket {
  if (isArrivingSoon(thread.checkIn, now)) return 0
  if (thread.pendingReply || thread.hasOpenDraft) return 1
  return 2
}

export function sortInboxThreads<T extends SortableInboxThread>(
  threads: T[],
  now: Date = new Date()
): T[] {
  return [...threads]
    .map((thread) => ({
      ...thread,
      sortBucket: inboxSortBucket(thread, now),
    }))
    .sort((a, b) => {
      const bucketA = a.sortBucket ?? 2
      const bucketB = b.sortBucket ?? 2
      if (bucketA !== bucketB) return bucketA - bucketB
      const timeA = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0
      const timeB = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0
      return timeB - timeA
    })
}
