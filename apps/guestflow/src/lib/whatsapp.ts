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
}

/**
 * Check if WhatsApp is configured (env vars present)
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  )
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
 * Send a WhatsApp message via Meta Graph API
 * 
 * @param params - Message parameters (to, message, optional portalUrl)
 * @returns Send result with success status and message ID or error
 */
export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<SendResult> {
  const timestamp = new Date().toISOString()

  try {
    const config = getWhatsAppConfig()
    
    if (!config) {
      return {
        success: false,
        error: 'WhatsApp not configured (missing env vars)',
        timestamp
      }
    }

    // Validate phone number format
    if (!params.to.startsWith('+')) {
      return {
        success: false,
        error: 'Phone number must be in international format (e.g., +27836458313)',
        timestamp
      }
    }

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
      console.error('WhatsApp API error:', responseData)
      return {
        success: false,
        error: responseData.error?.message || `API error: ${response.status}`,
        timestamp
      }
    }

    // Log success (without storing message body)
    console.log(`WhatsApp message sent successfully to ${params.to} at ${timestamp}`, {
      messageId: responseData.messages?.[0]?.id,
      hasPortalLink: !!params.portalUrl
    })

    return {
      success: true,
      messageId: responseData.messages?.[0]?.id,
      timestamp
    }

  } catch (error) {
    console.error('WhatsApp send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    }
  }
}

/**
 * Template message notes for documentation
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
 * approved template usage). Production deployment requires Grant to:
 * - Register templates in Meta Business Manager
 * - Update this code to use template messages for out-of-window sends
 */
