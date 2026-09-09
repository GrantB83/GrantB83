/**
 * WhatsApp Messaging Service
 * 
 * Provides functions to send WhatsApp messages via Meta's Graph API or Twilio Messaging API.
 * All sends require explicit human approval via UI confirmation.
 * 
 * Hard Gates:
 * - NEVER auto-send without explicit button click + confirmation
 * - Disabled when env vars not configured
 * - Logs send attempts without storing message bodies
 * 
 * Provider Selection:
 * - WHATSAPP_PROVIDER=twilio OR auto-detect Twilio creds → Twilio Messaging API
 * - Meta credentials present → Meta Graph API (default)
 * - WHATSAPP_MODE=sandbox OR incomplete creds → Sandbox dry-run
 * 
 * Sandbox Mode:
 * - When WHATSAPP_MODE=sandbox OR live credentials are missing
 * - Logs dry-run attempts without calling external API
 * - Returns success-shaped responses for UI smoke testing
 * - NEVER sends real messages to guests
 */

type WhatsAppProvider = 'meta' | 'twilio' | 'sandbox'

interface MetaConfig {
  token: string
  phoneNumberId: string
  businessAccountId: string
}

interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
  messagingServiceSid?: string
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
  provider?: WhatsAppProvider // Which provider was used
}

/**
 * Determine which WhatsApp provider to use
 * @returns 'twilio' | 'meta' | 'sandbox'
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  const mode = process.env.WHATSAPP_MODE?.toLowerCase()
  const explicitProvider = process.env.WHATSAPP_PROVIDER?.toLowerCase()
  
  // Explicit sandbox mode
  if (mode === 'sandbox') {
    return 'sandbox'
  }
  
  // Check for explicit provider selection
  if (explicitProvider === 'twilio') {
    const twilioConfig = getTwilioConfig()
    if (twilioConfig) {
      return 'twilio'
    }
    // Fall through to auto-detect if Twilio creds missing
  }
  
  // Auto-detect Twilio when creds present
  const twilioConfig = getTwilioConfig()
  if (twilioConfig) {
    return 'twilio'
  }
  
  // Check for Meta credentials
  const metaConfig = getMetaConfig()
  if (metaConfig) {
    return 'meta'
  }
  
  // Default to sandbox when no credentials
  return 'sandbox'
}

/**
 * Get WhatsApp mode from environment
 * @returns 'sandbox' | 'live'
 * @deprecated Use getWhatsAppProvider() for provider-aware detection
 */
export function getWhatsAppMode(): 'sandbox' | 'live' {
  const provider = getWhatsAppProvider()
  return provider === 'sandbox' ? 'sandbox' : 'live'
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
 * Get Meta WhatsApp configuration from env vars
 */
function getMetaConfig(): MetaConfig | null {
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
 * Get Twilio WhatsApp configuration from env vars
 */
function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM

  if (!accountSid || !authToken || !fromNumber) {
    return null
  }

  return {
    accountSid,
    authToken,
    fromNumber,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
  }
}

/**
 * Normalize phone number to whatsapp: format for Twilio
 * @param phone - Phone number (e.g., +27836458313 or whatsapp:+27836458313)
 * @returns Normalized whatsapp:+... format
 */
function normalizeTwilioWhatsAppNumber(phone: string): string {
  if (phone.startsWith('whatsapp:')) {
    return phone
  }
  return `whatsapp:${phone}`
}

/**
 * Send a WhatsApp message via Twilio Messaging API
 * 
 * @param params - Message parameters
 * @param config - Twilio configuration
 * @returns Send result
 */
async function sendViaTwilio(
  params: SendMessageParams,
  config: TwilioConfig,
  timestamp: string
): Promise<SendResult> {
  // Build message text with optional portal link
  let messageText = params.message
  if (params.portalUrl) {
    messageText += `\n\n🔗 View Your Booking Portal:\n${params.portalUrl}`
  }

  // Normalize phone numbers to whatsapp: format
  const toNumber = normalizeTwilioWhatsAppNumber(params.to)
  const fromNumber = normalizeTwilioWhatsAppNumber(config.fromNumber)

  // Twilio API endpoint
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`

  // Build form body
  const formBody = new URLSearchParams()
  formBody.append('To', toNumber)
  formBody.append('Body', messageText)
  
  // Use MessagingServiceSid if available, otherwise From
  if (config.messagingServiceSid) {
    formBody.append('MessagingServiceSid', config.messagingServiceSid)
  } else {
    formBody.append('From', fromNumber)
  }

  // Call Twilio API with Basic auth
  const authHeader = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString()
  })

  const responseData = await response.json()

  if (!response.ok) {
    console.error('Twilio API error:', responseData)
    return {
      success: false,
      error: responseData.message || `Twilio API error: ${response.status}`,
      timestamp,
      sandboxMode: false,
      provider: 'twilio'
    }
  }

  // Log success (without storing message body)
  console.log(`WhatsApp message sent via Twilio to ${params.to} at ${timestamp}`, {
    messageSid: responseData.sid,
    hasPortalLink: !!params.portalUrl,
    provider: 'twilio',
    status: responseData.status
  })

  return {
    success: true,
    messageId: responseData.sid,
    timestamp,
    sandboxMode: false,
    provider: 'twilio'
  }
}

/**
 * Send a WhatsApp message via Meta Graph API
 * 
 * @param params - Message parameters
 * @param config - Meta configuration
 * @returns Send result
 */
async function sendViaMeta(
  params: SendMessageParams,
  config: MetaConfig,
  timestamp: string
): Promise<SendResult> {
  // Build message text with optional portal link
  let messageText = params.message
  if (params.portalUrl) {
    messageText += `\n\n🔗 View Your Booking Portal:\n${params.portalUrl}`
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
    console.error('Meta WhatsApp API error:', responseData)
    return {
      success: false,
      error: responseData.error?.message || `Meta API error: ${response.status}`,
      timestamp,
      sandboxMode: false,
      provider: 'meta'
    }
  }

  // Log success (without storing message body)
  console.log(`WhatsApp message sent via Meta to ${params.to} at ${timestamp}`, {
    messageId: responseData.messages?.[0]?.id,
    hasPortalLink: !!params.portalUrl,
    provider: 'meta'
  })

  return {
    success: true,
    messageId: responseData.messages?.[0]?.id,
    timestamp,
    sandboxMode: false,
    provider: 'meta'
  }
}

/**
 * Send a WhatsApp message via configured provider (Meta, Twilio, or sandbox)
 * 
 * @param params - Message parameters (to, message, optional portalUrl)
 * @returns Send result with success status and message ID or error
 */
export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<SendResult> {
  const timestamp = new Date().toISOString()
  const provider = getWhatsAppProvider()

  try {
    // Validate phone number format (applies to all modes)
    if (!params.to.startsWith('+')) {
      return {
        success: false,
        error: 'Phone number must be in international format (e.g., +27836458313)',
        timestamp,
        sandboxMode: provider === 'sandbox',
        provider
      }
    }

    // Build message text with optional portal link (for sandbox logging)
    let messageText = params.message
    if (params.portalUrl) {
      messageText += `\n\n🔗 View Your Booking Portal:\n${params.portalUrl}`
    }

    // SANDBOX MODE: Dry-run without calling live API
    if (provider === 'sandbox') {
      const sandboxMessageId = `sandbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`[SANDBOX] WhatsApp dry-run to ${params.to} at ${timestamp}`, {
        messageId: sandboxMessageId,
        hasPortalLink: !!params.portalUrl,
        messageLength: messageText.length,
        provider: 'sandbox'
      })

      return {
        success: true,
        messageId: sandboxMessageId,
        timestamp,
        sandboxMode: true,
        provider: 'sandbox'
      }
    }

    // TWILIO LIVE MODE
    if (provider === 'twilio') {
      const config = getTwilioConfig()
      if (!config) {
        return {
          success: false,
          error: 'Twilio not configured (missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM)',
          timestamp,
          sandboxMode: false,
          provider: 'twilio'
        }
      }
      
      return await sendViaTwilio(params, config, timestamp)
    }

    // META LIVE MODE
    const metaConfig = getMetaConfig()
    if (!metaConfig) {
      return {
        success: false,
        error: 'Meta WhatsApp not configured (missing WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or WHATSAPP_BUSINESS_ACCOUNT_ID)',
        timestamp,
        sandboxMode: false,
        provider: 'meta'
      }
    }

    return await sendViaMeta(params, metaConfig, timestamp)

  } catch (error) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
      sandboxMode: provider === 'sandbox',
      provider
    }
  }
}

/**
 * Provider Selection and Configuration
 * 
 * PROVIDER SELECTION:
 * 1. WHATSAPP_MODE=sandbox OR incomplete provider creds → sandbox dry-run
 * 2. WHATSAPP_PROVIDER=twilio OR auto-detect (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM) → Twilio live send
 * 3. Else Meta path when WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_BUSINESS_ACCOUNT_ID present
 * 
 * SANDBOX MODE (default when credentials missing):
 * - Set WHATSAPP_MODE=sandbox (or omit all provider env vars)
 * - All sends return success without calling external API
 * - Logs dry-run attempts with [SANDBOX] prefix
 * - Safe for demos, testing, and development
 * - Staff flows, approve→draft, portal, and Nightsbridge sync continue working
 * 
 * TWILIO LIVE MODE (recommended - approved Business Profile ready):
 * - Set WHATSAPP_PROVIDER=twilio OR provide Twilio credentials (auto-detect)
 * - Required environment variables:
 *   - TWILIO_ACCOUNT_SID (from Twilio Console)
 *   - TWILIO_AUTH_TOKEN (from Twilio Console)
 *   - TWILIO_WHATSAPP_FROM (e.g., whatsapp:+14155238886 or +14155238886)
 * - Optional:
 *   - TWILIO_MESSAGING_SERVICE_SID (uses Messaging Service instead of From)
 * - Twilio handles message routing and WhatsApp channel automatically
 * - Supports both whatsapp:+E164 and +E164 formats (auto-normalized)
 * 
 * META LIVE MODE (original - requires Meta Business Profile approval):
 * - Provide Meta credentials (used when Twilio creds absent):
 *   - WHATSAPP_TOKEN (from Meta Business Manager)
 *   - WHATSAPP_PHONE_NUMBER_ID (from WhatsApp Business Account)
 *   - WHATSAPP_BUSINESS_ACCOUNT_ID (from Meta)
 * - Only enable after Grant completes:
 *   1. Meta Business Profile approval (typically 1-3 days)
 *   2. Purchase SA phone number from approved provider
 *   3. Link number to WhatsApp Business Account
 * 
 * Template message notes (Meta only):
 * 
 * Meta requires approved Message Templates for messages sent outside 
 * the 24-hour customer service window. Twilio does not have this restriction.
 * For messages within 24h of customer contact, free-form text is allowed.
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
 * Twilio does not require template approval.
 */
