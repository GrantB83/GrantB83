import type { UmiChannel } from '@/lib/umi-channels'

export interface InboxThread {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  lastMessageAt: string | null
  preview: string
  pendingReply: boolean
  hasOpenDraft: boolean
  needsAttention: boolean
  sortBucket: 0 | 1 | 2
  hygieneStatus: string | null
  fromNumber: string
  careWindow?: {
    state: 'open' | 'closing_soon' | 'closed'
    label: string
    closingSoon: boolean
  }
}

export interface ThreadDetail {
  id: number
  threadKind: 'booking' | 'temp'
  bookingId: number | null
  bookerName: string
  suite: string | null
  checkIn: string | null
  checkOut: string | null
  nightsbridgeBookingId: string | null
  lastChannel: string | null
  lastInboundChannel: string | null
  defaultOutboundChannel: string
  fromNumber: string
  guestPhone?: string | null
  guestEmail?: string | null
  guestPhoneSource?: string | null
  guestEmailSource?: string | null
  guestEmailKind?: string | null
  status: string
  hygieneStatus: string | null
  openDraft: { text: string; source: string; kind: string } | null
  linkCandidates: Array<{
    id: number
    guestName: string
    checkIn: string
    checkOut: string
    suite: string | null
  }>
  messages: Array<{
    id: number
    direction: 'inbound' | 'outbound'
    channel: UmiChannel | string
    sourceTag?: string | null
    senderAddress?: string | null
    body: string
    timestamp: string
    isSpam: boolean
  }>
  careWindow?: {
    state: 'open' | 'closing_soon' | 'closed'
    label: string
    closingSoon: boolean
    windowExpiresAt: string | null
  }
}

export type InboxBreakpoint = 'phone' | 'tablet' | 'desktop'
export type InboxPane = 'list' | 'thread'
