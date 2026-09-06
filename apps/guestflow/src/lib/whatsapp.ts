/**
 * WhatsApp Cloud API Service
 * 
 * Provides functions to send WhatsApp messages via Meta's Graph API.
 * All sends require explicit human approval via UI confirmation.
 * 
 * Hard Gates:
 * - NEVER auto-send without explicit button click + confirmation
 * - Disabled when env vars not configured
 * - Logs send attempts without storing message bodies
 * 
 * Sandbox Mode:
 * - When WHATSAPP_MODE=sandbox OR live credentials are missing
 * - Logs dry-run attempts without calling Meta API
 * - Returns success-shaped responses for UI smoke testing
 * - NEVER sends real messages to guests
 */

interface WhatsAppConfig {
  token: string
  phoneNumberId: string
  businessAccountId: string
}

interface SendMessageParams {
  to: string // Phone number in international format (e.g., +27836458313)
  message: string
  portalUrl?: string // Optional portal link to include
}

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: string
  sandboxMode?: boolean // Indicates if this was a dry-run
}

/**
 * Get WhatsApp mode from environment
 * @returns 'sandbox' | 'live'
 */
export function getWhatsAppMode(): 'sandbox' | 'live' {
  const mode = process.env.WHATSAPP_MODE?.toLowerCase()
  
  // Explicit sandbox mode
  if (mode === 'sandbox') {
    return 'sandbox'
  }
  
  // Auto-detect: if credentials are missing, use sandbox
  if (!process.env.WHATSAPP_TOKEN || 
      !process.env.WHATSAPP_PHONE_NUMBER_ID || 
      !process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) {
    return 'sandbox'
  }
  
  // Live mode requires both credentials AND explicit live mode (or no mode set)
  return 'live'
}

/**
 * Check if WhatsApp is in sandbox mode
 */
export function isWhatsAppSandboxMode(): boolean {
  return getWhatsAppMode() === 'sandbox'
}

/**
 * Check if WhatsApp is configured for live sending
 */
export function isWhatsAppConfigured(): boolean {
  return getWhatsAppMode() === 'live'
}

/**
 * Get WhatsApp configuration from env vars
 */
function getWhatsAppConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

  if (!token || !phoneNumberId || !businessAccountId) {
    return null
  }

  return {
    token,
    phoneNumberId,
    businessAccountId
  }
}

/**
 * Send a WhatsApp message via Meta Graph API or sandbox dry-run
 * 
 * @param params - Message parameters (to, message, optional portalUrl)
 * @returns Send result with success status and message ID or error
 */
export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<SendResult> {
  const timestamp = new Date().toISOString()
  const mode = getWhatsAppMode()

  try {
    // Validate phone number format (applies to both modes)
    if (!params.to.startsWith('+')) {
      return {
        success: false,
        error: 'Phone number must be in international format (e.g., +27836458313)',
        timestamp,
        sandboxMode: mode === 'sandbox'
      }
    }

    // Build message text with optional portal link
    let messageText = params.message
    if (params.portalUrl) {
      messageText += `\n\n🔗 View Your Booking Portal:\n${params.portalUrl}`
    }

    // SANDBOX MODE: Dry-run without calling live API
    if (mode === 'sandbox') {
      const sandboxMessageId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`[SANDBOX] WhatsApp dry-run to ${params.to} at ${timestamp}`, {
        messageId: sandboxMessageId,
        hasPortalLink: !!params.portalUrl,
        messageLength: messageText.length,
        mode: 'sandbox'
      })

      return {
        success: true,
        messageId: sandboxMessageId,
        timestamp,
        sandboxMode: true
      }
    }

    // LIVE MODE: Call Meta WhatsApp Cloud API
    const config = getWhatsAppConfig()
    
    if (!config) {
      return {
        success: false,
        error: 'WhatsApp not configured (missing env vars)',
        timestamp,
        sandboxMode: false
      }
    }

    // Call Meta WhatsApp Cloud API
    // https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    const apiUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: params.to.replace(/\s+/g, ''), // Remove any spaces
        type: 'text',
        text: {
          preview_url: true, // Enable link previews
          body: messageText
        }
      })
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', responseData)
      return {
        success: false,
        error: responseData.error?.message || `API error: ${response.status}`,
        timestamp,
        sandboxMode: false
      }
    }

    // Log success (without storing message body)
    console.log(`WhatsApp message sent successfully to ${params.to} at ${timestamp}`, {
      messageId: responseData.messages?.[0]?.id,
      hasPortalLink: !!params.portalUrl,
      mode: 'live'
    })

    return {
      success: true,
      messageId: responseData.messages?.[0]?.id,
      timestamp,
      sandboxMode: false
    }

  } catch (error) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
      sandboxMode: mode === 'sandbox'
    }
  }
}

/**
 * Sandbox vs Live Mode Configuration
 * 
 * SANDBOX MODE (default when credentials missing):
 * - Set WHATSAPP_MODE=sandbox (or omit env vars entirely)
 * - All sends return success without calling Meta API
 * - Logs dry-run attempts with [SANDBOX] prefix
 * - Safe for demos, testing, and development
 * - Staff flows, approve→draft, portal, and Nightsbridge sync continue working
 * 
 * LIVE MODE (requires approved Business Profile):
 * - Set WHATSAPP_MODE=live AND provide all credentials:
 *   - WHATSAPP_TOKEN (from Meta Business Manager)
 *   - WHATSAPP_PHONE_NUMBER_ID (from WhatsApp Business Account)
 *   - WHATSAPP_BUSINESS_ACCOUNT_ID (from Meta)
 * - Only enable after Grant completes:
 *   1. Meta Business Profile approval (typically 1-3 days)
 *   2. Purchase SA phone number from approved provider
 *   3. Link number to WhatsApp Business Account
 *   4. Test with Twilio magic number (+15005550006) first
 * 
 * Template message notes:
 * 
 * Meta requires approved Message Templates for messages sent outside 
 * the 24-hour customer service window. For messages within 24h of 
 * customer contact, free-form text is allowed.
 * 
 * Required templates for The Browns' Dullstroom operations:
 * 
 * 1. stay_packet_link - Link to guest portal with booking details
 *    Template: "Hi {{1}}, your booking at {{2}} is confirmed. 
 *              Access your stay packet: {{3}}"
 * 
 * 2. welcome_message - Same-day welcome with arrival details
 *    Template: "Welcome! Looking forward to hosting you today at {{1}}. 
 *              Check-in from {{2}}. Questions? Reply anytime."
 * 
 * 3. custom_within_24h - Free-form text within 24h service window
 *    (No template required - can send custom text)
 * 
 * Note: Template approval is done via Meta Business Manager.
 * This implementation uses free-form text (assumes 24h window or 
 * approved template usage).
 */
