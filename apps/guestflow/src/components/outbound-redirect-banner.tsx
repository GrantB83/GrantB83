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
      data-outbound-banner
      className="bg-blue-500 text-white text-center font-medium border-b border-blue-600 px-3 py-1.5 text-xs sm:px-4 sm:py-3 sm:text-sm inbox-wrap"
      role="alert"
      aria-live="polite"
    >
      <span className="sm:hidden">Outbound redirect on — test sinks only.</span>
      <span className="hidden sm:inline">
        Outbound Redirect ON – All guest sends go to test sinks. Flip the header switch to send to real
        recipients.
      </span>
    </div>
  )
}
