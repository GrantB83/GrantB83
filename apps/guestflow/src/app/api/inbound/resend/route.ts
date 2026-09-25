import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { consumeConfirmToken } from '@/lib/confirm-token'
import { ensureDeliverySchema } from '@/lib/delivery-schema'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { isStuckPending, plainDeliveryError } from '@/lib/delivery-status'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail, isEmailAddress, extractEmailAddress } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { createQueuedJob } from '@/lib/send-jobs'
import { markThreadOutbound } from '@/lib/umi-threads'
import { ensureUmiSchema } from '@/lib/umi-schema'
import { getStaffIdentityFromRequest } from '@/lib/staff-identity'
import { guestFirstName } from '@/lib/staff-alert-email'
import { findApprovedTemplateFor, getWindowState } from '@/lib/wa-window'
import { onSendFailed } from '@/lib/send-failed-hook'

export const dynamic = 'force-dynamic'

function sendChannel(value?: string | null): 'whatsapp' | 'email' | 'whatsapp_web' | 'sms' {
  if (value === 'email') return 'email'
  if (value === 'sms') return 'sms'
  if (value === 'whatsapp_web') return 'whatsapp_web'
  return 'whatsapp'
}

function persistChannel(channel: string): string {
  if (channel === 'whatsapp') return 'whatsapp_cloud'
  return channel
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      messageId?: number
      confirmToken?: string
      acknowledgeDuplicate?: boolean
    }
    const messageId = Number(body.messageId)
    const confirmToken = typeof body.confirmToken === 'string' ? body.confirmToken.trim() : ''
    if (!Number.isFinite(messageId) || messageId <= 0) {
      return NextResponse.json({ success: false, error: 'messageId is required' }, { status: 400 })
    }
    if (!confirmToken) {
      return NextResponse.json(
        { success: false, error: 'confirmToken is required. Confirm in the UI, then resend.' },
        { status: 400 }
      )
    }

    const staffIdentity = await getStaffIdentityFromRequest(request)
    const db = await getDbAsync()
    await ensurePhase0Schema(db)
    await ensureUmiSchema(db)
    await ensureDeliverySchema(db)

    const original = (await db
      .prepare(`SELECT * FROM inbound_messages WHERE id = ?`)
      .get(messageId)) as {
      id: number
      thread_id: number
      direction?: string
      message_text?: string
      from_number?: string
      channel?: string
      delivery_status?: string
      queued_at?: string
      resend_in_flight?: number
    } | undefined

    if (!original || original.direction !== 'outbound') {
      return NextResponse.json({ success: false, error: 'Outbound message not found' }, { status: 400 })
    }

    const threadMeta = (await db
      .prepare(`SELECT guest_name FROM inbound_threads WHERE id = ?`)
      .get(original.thread_id)) as { guest_name?: string } | undefined

    const failed = original.delivery_status === 'failed'
    const stuck = isStuckPending(original.delivery_status || 'pending', original.queued_at)
    if (!failed && !stuck) {
      return NextResponse.json(
        { success: false, error: 'Resend is only available for Failed or stuck-Pending messages' },
        { status: 400 }
      )
    }
    if (stuck && !failed && !body.acknowledgeDuplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stuck pending may already be in transit. Confirm possible duplicate to resend.',
          duplicateWarning: true,
        },
        { status: 400 }
      )
    }

    const inFlightChild = (await db
      .prepare(
        `SELECT id FROM inbound_messages
         WHERE resend_of = ?
           AND COALESCE(delivery_status, 'pending') = 'pending'
         LIMIT 1`
      )
      .get(original.id)) as { id: number } | undefined

    if (original.resend_in_flight || inFlightChild) {
      return NextResponse.json(
        { success: false, error: 'A resend is already in flight for this message' },
        { status: 409 }
      )
    }

    const channel = sendChannel(original.channel)
    if (channel === 'whatsapp' || channel === 'whatsapp_web') {
      const window = await getWindowState(db, Number(original.thread_id))
      if (!window.open) {
        const template = await findApprovedTemplateFor(db, {
          threadId: Number(original.thread_id),
          purpose: 'resend',
          body: original.message_text || '',
        })
        return NextResponse.json(
          { success: false, windowClosed: true, template, error: 'WhatsApp 24h window is closed' },
          { status: 409 }
        )
      }
    }

    const outboundBody = (original.message_text || '').trim()
    if (!outboundBody) {
      return NextResponse.json({ success: false, error: 'Original message has no body to resend' }, { status: 400 })
    }

    const consumed = await consumeConfirmToken(db, {
      threadId: Number(original.thread_id),
      confirmToken,
    })
    if (!consumed.ok) {
      return NextResponse.json({ success: false, error: consumed.error }, { status: 400 })
    }

    await db
      .prepare(`UPDATE inbound_messages SET resend_in_flight = 1 WHERE id = ?`)
      .run(original.id)

    const { actor } = staffIdentity
    const to = (original.from_number || '').trim()
    const timestamp = new Date().toISOString()

    const insertChild = async (input: {
      providerMessageId: string | null
      provider?: string | null
      failed?: boolean
      errorPlain?: string | null
      redirected?: boolean
    }) => {
      const result = await db
        .prepare(
          `INSERT INTO inbound_messages (
            thread_id, message_text, message_timestamp, tenant_id,
            direction, channel, from_number, whatsapp_provider, whatsapp_message_id,
            provider_message_id, delivery_status, delivery_read, delivery_error_plain,
            queued_at, sent_to_test_sink, delivery_updated_at, resend_of, resent_by, send_error
          ) VALUES (?, ?, ?, 1, 'outbound', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          original.thread_id,
          outboundBody,
          timestamp,
          persistChannel(channel),
          to,
          input.provider || null,
          input.providerMessageId,
          input.providerMessageId,
          input.failed ? 'failed' : 'pending',
          input.failed ? input.errorPlain || 'delivery failed' : null,
          timestamp,
          input.redirected ? 1 : 0,
          timestamp,
          original.id,
          actor,
          input.failed ? input.errorPlain || 'delivery failed' : null
        )
      return Number(result.lastInsertRowid)
    }

    try {
      if (channel === 'email') {
        const emailTo = extractEmailAddress(to)
        if (!isEmailAddress(emailTo)) {
          await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
          return NextResponse.json({ success: false, error: 'A valid To email address is required' }, { status: 400 })
        }
        const sendResult = await sendEmail({
          to: emailTo,
          subject: 'Message from The Browns',
          text: outboundBody,
        })
        const childId = await insertChild({
          providerMessageId: sendResult.messageId || null,
          provider: 'resend',
          failed: !sendResult.success,
          errorPlain: sendResult.error ? plainDeliveryError(null, sendResult.error) : null,
          redirected: sendResult.redirected,
        })
        if (!sendResult.success) {
          await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
          onSendFailed({
            db,
            actorEmail: staffIdentity.email,
            threadId: Number(original.thread_id),
            messageId: childId,
            guestFirstName: guestFirstName(threadMeta?.guest_name),
            bookingRef: `T-${original.thread_id}`,
            channel: 'email',
            errorPlain: plainDeliveryError(null, sendResult.error),
            provider: 'resend',
            attemptId: timestamp,
          })
          return NextResponse.json(
            { success: false, error: 'Failed to resend email', details: sendResult.error },
            { status: 500 }
          )
        }
        await markThreadOutbound(db, Number(original.thread_id), {
          timestamp,
          channel: 'email',
          status: 'sent',
        })
        return NextResponse.json({
          success: true,
          data: {
            messageId: childId,
            providerMessageId: sendResult.messageId || null,
            resendOf: original.id,
            resentBy: actor,
            sentToTestSink: Boolean(sendResult.redirected),
          },
        })
      }

      if (channel === 'whatsapp_web') {
        if (!to) {
          await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
          return NextResponse.json({ success: false, error: 'A recipient phone number is required' }, { status: 400 })
        }
        const job = await createQueuedJob(db, {
          channel: 'whatsapp_web',
          threadId: Number(original.thread_id),
          toAddress: to,
          bodyText: outboundBody,
        })
        const childId = await insertChild({
          providerMessageId: `waweb-job-${job.id}`,
          provider: 'whatsapp_web',
          redirected: true,
        })
        return NextResponse.json({
          success: true,
          queued: true,
          data: {
            messageId: childId,
            jobId: job.id,
            resendOf: original.id,
            resentBy: actor,
            sentToTestSink: true,
          },
        })
      }

      if (channel === 'sms') {
        const sendResult = await sendSms({ to, body: outboundBody })
        const childId = await insertChild({
          providerMessageId: sendResult.messageId || null,
          provider: 'twilio',
          failed: !sendResult.success,
          errorPlain: sendResult.error ? plainDeliveryError(null, sendResult.error) : null,
          redirected: sendResult.redirected,
        })
        if (!sendResult.success) {
          await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
          onSendFailed({
            db,
            actorEmail: staffIdentity.email,
            threadId: Number(original.thread_id),
            messageId: childId,
            guestFirstName: guestFirstName(threadMeta?.guest_name),
            bookingRef: `T-${original.thread_id}`,
            channel: 'sms',
            errorPlain: plainDeliveryError(null, sendResult.error),
            provider: 'twilio',
            attemptId: timestamp,
          })
          return NextResponse.json(
            { success: false, error: 'Failed to resend SMS', details: sendResult.error },
            { status: 500 }
          )
        }
        await markThreadOutbound(db, Number(original.thread_id), {
          timestamp,
          channel: 'sms',
          status: 'sent',
        })
        return NextResponse.json({
          success: true,
          data: {
            messageId: childId,
            providerMessageId: sendResult.messageId || null,
            resendOf: original.id,
            resentBy: actor,
            sentToTestSink: Boolean(sendResult.redirected),
          },
        })
      }

      const sendResult = await sendWhatsAppMessage({ to, message: outboundBody })
      const childId = await insertChild({
        providerMessageId: sendResult.messageId || null,
        provider: sendResult.provider || null,
        failed: !sendResult.success,
        errorPlain: sendResult.error ? plainDeliveryError(null, sendResult.error) : null,
        redirected: sendResult.redirected,
      })
      if (!sendResult.success) {
        await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
        onSendFailed({
          db,
          actorEmail: staffIdentity.email,
          threadId: Number(original.thread_id),
          messageId: childId,
          guestFirstName: guestFirstName(threadMeta?.guest_name),
          bookingRef: `T-${original.thread_id}`,
          channel: 'whatsapp',
          errorPlain: plainDeliveryError(null, sendResult.error),
          provider: sendResult.provider,
          attemptId: timestamp,
        })
        return NextResponse.json(
          { success: false, error: 'Failed to resend WhatsApp message', details: sendResult.error },
          { status: 500 }
        )
      }
      await markThreadOutbound(db, Number(original.thread_id), {
        timestamp,
        channel: 'whatsapp_cloud',
        status: 'sent',
      })
      return NextResponse.json({
        success: true,
        data: {
          messageId: childId,
          providerMessageId: sendResult.messageId || null,
          resendOf: original.id,
          resentBy: actor,
          sentToTestSink: Boolean(sendResult.redirected),
        },
      })
    } catch (error) {
      await db.prepare(`UPDATE inbound_messages SET resend_in_flight = 0 WHERE id = ?`).run(original.id)
      throw error
    }
  } catch (error) {
    console.error('[Resend]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
