/**
 * GuestFlow Outbound Redirect System
 * 
 * Pre-live testing: Routes all outbound guest communications (WhatsApp, email, WhatsApp Web jobs)
 * to Grant's test sinks when OUTBOUND_MODE=redirect. Enforces dual-gate safety with fail-closed defaults.
 * 
 * ENVIRONMENT VARIABLES:
 * 
 * - OUTBOUND_MODE: 'redirect' | 'live' (default: 'redirect' if unknown/missing - fail-closed)
 * - OUTBOUND_REDIRECT_TO_WA: E.164 phone number for WhatsApp redirect (e.g., '+15124064300')
 * - OUTBOUND_REDIRECT_TO_EMAIL: Email address for email redirect (e.g., 'grant830318@gmail.com')
 * - OUTBOUND_LIVE_CLEAR: Must be exactly "true" (string) to enable live guest sends. Any other value blocks live mode.
 * 
 * FAIL-CLOSED BEHAVIOR:
 * - Unknown/missing OUTBOUND_MODE → defaults to 'redirect'
 * - MODE=redirect but sink missing → throws Error (send blocked, never fallback to guest To)
 * - MODE=live but OUTBOUND_LIVE_CLEAR != "true" → blocks send (treats as redirect or throws)
 * 
 * FROM IDENTITIES:
 * - TWILIO_WHATSAPP_FROM (+27600200825) remains unchanged
 * - RESEND_FROM_EMAIL remains unchanged
 * - Redirect only changes To/recipient, never From/sender
 * 
 * GO-LIVE CHECKLIST:
 * 
 * 1. Smoke Test in Preview/Dev:
 *    - Set OUTBOUND_MODE=redirect + both sinks
 *    - Approve WhatsApp draft → Send → Verify arrival at +15124064300 (not real guest)
 *    - Approve email draft → Send → Verify arrival at grant830318@gmail.com
 *    - Check send_jobs.to_address is Grant's sink, metadata has intended_to
 * 
 * 2. Production Environment Setup (NeedsGrant):
 *    - In Vercel Production env settings, set:
 *      - OUTBOUND_MODE=live
 *      - OUTBOUND_LIVE_CLEAR=true
 *      - (Keep OUTBOUND_REDIRECT_TO_WA and OUTBOUND_REDIRECT_TO_EMAIL for rollback)
 * 
 * 3. Redeploy Production:
 *    - Trigger redeploy in Vercel (auto or manual)
 * 
 * 4. Verify Health:
 *    - curl https://guestflow.example.com/api/health | jq .outboundRedirect
 *    - Should return "off" (live mode active)
 * 
 * 5. Verify Banner:
 *    - Staff UI should show NO redirect banner
 * 
 * 6. Safe Live Test:
 *    - Approve and send one message to a known-safe guest contact (Grant's own reservation or test guest)
 *    - Verify message reaches real guest (not Grant's sink)
 * 
 * 7. Monitor:
 *    - First 5-10 live sends: verify they reach real guests
 * 
 * ROLLBACK:
 * - Set OUTBOUND_MODE=redirect + redeploy → sends revert to Grant's sinks
 * 
 * FORBIDDEN:
 * - Flipping Production env inside this Cloud Agent (Coding sets env after merge)
 * - Auto-flip or scheduled live mode activation
 * - Expiry timers that revert to live mode
 * - Hardcoding Grant's sink numbers in source code (env-only)
 * - Changing From identities during redirect
 * 
 * NOTES:
 * - WHATSAPP_MODE=sandbox is separate from this redirect system
 * - Sandbox mode dry-runs Twilio API only; does NOT rewrite Resend to or send_jobs.to_address
 * - This redirect system works for all three channels (Twilio WA, Resend email, WA Web jobs)
 */

export interface OutboundRecipientResolution {
  to: string                     // Resolved recipient (sink or original guest)
  redirected: boolean            // True if redirect was applied
  intendedTo: string             // Original guest contact (phone/email)
  mode: 'redirect' | 'live'      // Active outbound mode at resolution time
}

export interface OutboundStatus {
  mode: 'redirect' | 'live'                   // Current OUTBOUND_MODE (or default)
  redirectStatus: 'on' | 'off' | 'blocked'    // Effective redirect state
}

/**
 * Resolve final recipient for an outbound message or job based on redirect configuration.
 * 
 * @param input - Channel and intended recipient
 * @param input.channel - 'whatsapp' or 'email' (use 'whatsapp' for 'whatsapp_web' jobs)
 * @param input.intendedTo - Original guest contact (phone E.164 or email)
 * @returns OutboundRecipientResolution with resolved recipient and metadata
 * @throws Error when redirect enabled but sink missing (fail-closed)
 * @throws Error when channel is invalid
 * @throws Error when intendedTo is missing/empty
 */
export function resolveOutboundRecipient(input: {
  channel: 'whatsapp' | 'email'
  intendedTo: string
}): OutboundRecipientResolution {
  const { channel, intendedTo } = input

  // Validate input
  if (!intendedTo || !intendedTo.trim()) {
    throw new Error('intendedTo is required')
  }

  if (channel !== 'whatsapp' && channel !== 'email') {
    throw new Error(`Invalid channel: ${channel}`)
  }

  // Read environment configuration
  const modeEnv = process.env.OUTBOUND_MODE?.toLowerCase().trim()
  const liveClear = process.env.OUTBOUND_LIVE_CLEAR?.trim()

  // Determine mode (default to redirect for fail-closed safety)
  const mode: 'redirect' | 'live' = modeEnv === 'live' ? 'live' : 'redirect'

  // LIVE MODE: Check dual-gate
  if (mode === 'live') {
    // Require exact string "true" for LIVE_CLEAR
    if (liveClear === 'true') {
      // Live mode active, send to original guest contact
      return {
        to: intendedTo,
        redirected: false,
        intendedTo,
        mode: 'live'
      }
    } else {
      // Live mode requested but LIVE_CLEAR not true → block by throwing
      throw new Error('Live mode requires OUTBOUND_LIVE_CLEAR=true')
    }
  }

  // REDIRECT MODE: Read appropriate sink and apply redirect
  const sinkEnvKey = channel === 'whatsapp' ? 'OUTBOUND_REDIRECT_TO_WA' : 'OUTBOUND_REDIRECT_TO_EMAIL'
  const sink = process.env[sinkEnvKey]?.trim()

  if (!sink) {
    // Fail-closed: missing sink blocks send
    throw new Error(`Redirect enabled but ${sinkEnvKey} not set`)
  }

  // Redirect to sink
  return {
    to: sink,
    redirected: true,
    intendedTo,
    mode: 'redirect'
  }
}

/**
 * Get current outbound mode and redirect status for health endpoint and banner.
 * 
 * @returns OutboundStatus with mode and effective redirect state
 */
export function getOutboundStatus(): OutboundStatus {
  const modeEnv = process.env.OUTBOUND_MODE?.toLowerCase().trim()
  const liveClear = process.env.OUTBOUND_LIVE_CLEAR?.trim()

  // Determine mode (default to redirect for fail-closed safety)
  const mode: 'redirect' | 'live' = modeEnv === 'live' ? 'live' : 'redirect'

  // Determine redirectStatus
  let redirectStatus: 'on' | 'off' | 'blocked'

  if (mode === 'redirect') {
    redirectStatus = 'on'
  } else if (mode === 'live' && liveClear === 'true') {
    redirectStatus = 'off'
  } else {
    // mode=live but LIVE_CLEAR != "true" → blocked
    redirectStatus = 'blocked'
  }

  return {
    mode,
    redirectStatus
  }
}
