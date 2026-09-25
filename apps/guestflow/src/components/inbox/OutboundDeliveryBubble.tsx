'use client'

import { ThreadBubbleStatusSlot } from '@/components/inbox/ThreadLayoutShell'
import type { ThreadDetail } from '@/components/inbox/inbox-types'

type OutboundMessage = ThreadDetail['messages'][number]

function deliveryLabel(message: OutboundMessage): string {
  if (message.deliveryStatus === 'failed') return 'Failed'
  if (message.deliveryStatus === 'delivered') {
    return message.deliveryRead ? 'Delivered · read' : 'Delivered'
  }
  if (message.stuckPending) return 'Pending · stuck'
  if (message.direction === 'outbound') return 'Pending'
  return ''
}

export function OutboundDeliveryBubble({
  message,
  busy,
  onResend,
}: {
  message: OutboundMessage
  busy: boolean
  onResend: (messageId: number, stuck: boolean) => void
}) {
  if (message.direction !== 'outbound') {
    return <ThreadBubbleStatusSlot />
  }

  const label = deliveryLabel(message)
  return (
    <ThreadBubbleStatusSlot>
      <div className="flex flex-col items-start gap-0.5 min-w-0">
        {label ? (
          <span className="text-[10px] uppercase tracking-wide opacity-90 inbox-wrap">{label}</span>
        ) : null}
        {message.deliveryErrorPlain ? (
          <span className="text-[10px] opacity-90 inbox-wrap">{message.deliveryErrorPlain}</span>
        ) : null}
        {message.sentToTestSink ? (
          <span className="text-[10px] italic opacity-80">sent to test sink</span>
        ) : null}
        {message.resendOf ? (
          <span className="text-[10px] opacity-70 inbox-wrap">
            Resend of #{message.resendOf}
            {message.resentBy ? ` · ${message.resentBy}` : ''}
          </span>
        ) : null}
        {message.canResend ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onResend(message.id, Boolean(message.stuckPending))}
            className="inbox-tap text-[10px] px-2 py-0.5 rounded bg-white/20 border border-white/30 disabled:opacity-50"
          >
            Resend
          </button>
        ) : null}
      </div>
    </ThreadBubbleStatusSlot>
  )
}
