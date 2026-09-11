/**
 * TypeScript types for WhatsApp Send functionality
 * 
 * Defines request/response shapes for the send API and related entities
 */

export interface SendMessageRequest {
  threadId: number
}

export interface SendMessageResponse {
  success: boolean
  data?: {
    messageId: string | null
    timestamp: string
    provider: 'meta' | 'twilio' | 'sandbox'
    sandboxMode: boolean
    threadStatus: 'sent' | 'failed'
  }
  error?: string
  details?: string
}

export interface OutboundMessage {
  id: number
  thread_id: number
  message_text: string
  message_timestamp: string
  tenant_id: number
  direction: 'outbound'
  whatsapp_provider: 'meta' | 'twilio' | 'sandbox'
  whatsapp_message_id: string | null
  send_error: string | null
}

export interface SendHistoryEntry {
  timestamp: string
  provider: 'meta' | 'twilio' | 'sandbox'
  messageId: string | null
  error: string | null
  outcome: 'success' | 'failed'
}

export interface ThreadWithSendHistory {
  threadId: number
  fromNumber: string
  guestName: string | null
  status: string
  latestMessage: {
    id: number
    text: string
    timestamp: string
    draftReply: string | null
  } | null
  sendHistory: SendHistoryEntry[]
}
