/**
 * Outbound Redirect Banner Component
 * 
 * Displays an info-level banner when outbound redirect is active (mode=redirect)
 * or when live mode is disabled by OUTBOUND_LIVE_CLEAR.
 * Hidden when mode=live and OUTBOUND_LIVE_CLEAR=true (full live mode active).
 */

import { getOutboundStatus } from '@/lib/outbound-redirect'

export function OutboundRedirectBanner() {
  const status = getOutboundStatus()

  // Hide banner when live mode is fully active (off)
  if (status.redirectStatus === 'off') {
    return null
  }

  // Determine message based on status
  const message = status.redirectStatus === 'on'
    ? 'ℹ️ Outbound Redirect Active – All guest sends go to test sinks. Live mode disabled.'
    : 'ℹ️ Live Mode Blocked – OUTBOUND_LIVE_CLEAR not set to true. Sends are blocked or redirected.'

  return (
    <div
      style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '12px 16px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '500',
        borderBottom: '1px solid #2563eb'
      }}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
