/**
 * Outbound Redirect Banner
 *
 * Decision L: reads the live app_settings row (fail-closed ON).
 * Hidden when redirect is OFF (live recipients). Hidden on /guest/*.
 */

import { getDbAsync } from '@/lib/db'
import { getOutboundStatus } from '@/lib/outbound-redirect'

export async function OutboundRedirectBanner() {
  let status
  try {
    const db = await getDbAsync()
    status = await getOutboundStatus(db)
  } catch {
    status = { mode: 'redirect' as const, redirectStatus: 'on' as const }
  }

  if (status.redirectStatus === 'off') {
    return null
  }

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
      ℹ️ Outbound Redirect ON – All guest sends go to test sinks. Flip the header switch to send to real recipients.
    </div>
  )
}
