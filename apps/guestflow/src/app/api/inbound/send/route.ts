import { NextRequest, NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendEmail, isEmailAddress, extractEmailAddress } from '@/lib/email'
import { createQueuedJob } from '@/lib/send-jobs'
import { consumeConfirmToken, isSendEligible } from '@/lib/confirm-token'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { sendSms } from '@/lib/sms'
import { mapSourceToChannel, sendApiChannel } from '@/lib/umi-channels'
import { markThreadOutbound } from '@/lib/umi-threads'
import { ensureUmiSchema } from '@/lib/umi-schema'
import type { SendMessageRequest, SendMessageResponse, SendChannel } from '@/types/inbound'
import { actorStamp, getStaffSessionFromRequest } from '@/lib/staff-session'
import { notifyFailedApproveSend, stampLastHandler } from '@/lib/staff-alerts'
import { guestFirstName } from '@/lib/staff-alert-email'

export const dynamic = 'force-dynamic'

function redactRecipient(value: string): string {
  if (value.includes('@')) {
    const [name, domain] = value.split('@')
    const keep = name.slice(0, 1)
    return `${keep}***@${domain}`
  }
  return value.length > 4
    ? value.slice(0, -4).replace(/./g, '*') + value.slice(-4)
    : value
}

async function writeEmailAudit(
  db: Awaited<ReturnType<typeof getDbAsync>>,
  threadId: number,
  status: string,
  to: string,
  messageId: string | null,
  timestamp: string,
  actor = 'Grant'
) {
  try {
    await db
      .prepare(
        `
      INSERT INTO audit_log (tenant_id, actor, action, item_type, item_id, content_before, content_after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        1,
        actor,
        'email_send',
        'inbound_thread',
        threadId,
        '',
        JSON.stringify({
          status,
          to: redactRecipient(to),
          messageId,
          timestamp,
        }),
        timestamp
      )
  } catch (error) {
    console.warn('[Email Send] audit_log insert skipped:', error)
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString()
  const staffSession = await getStaffSessionFromRequest(request).catch(() => null)
  const actingActor = actorStamp(staffSession, 'Grant')

  try {
    const body = (await request.json()) as SendMessageRequest
    const { threadId } = body
    let channel: SendChannel = body.channel || 'whatsapp'

    if (!threadId || typeof threadId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'threadId is required and must be a number' } as SendMessageResponse,
        { status: 400 }
      )
    }

    const confirmToken = typeof body.confirmToken === 'string' ? body.confirmToken.trim() : ''
    if (!confirmToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'confirmToken is required. Approve the thread, confirm in the UI, then send.',
        } as SendMessageResponse,
        { status: 400 }
      )
    }

    const db = await getDbAsync()
    await ensurePhase0Schema(db)
    await ensureUmiSchema(db)

    const thread = (await db
      .prepare(
        `
      SELECT id, from_number, status, guest_name, metadata, last_inbound_channel, last_channel, booking_id
      FROM inbound_threads
      WHERE id = ?
    `
      )
      .get(threadId)) as any

    if (!thread) {
      return NextResponse.json(
        { success: false, error: 'Thread not found' } as SendMessageResponse,
        { status: 400 }
      )
    }

    if (!body.channel && thread.last_inbound_channel) {
      channel = sendApiChannel(mapSourceToChannel(thread.last_inbound_channel))
    }

    const latestMessage = (await db
      .prepare(
        `
      SELECT id, draft_reply, status, draft_source
      FROM inbound_messages
      WHERE thread_id = ?
      ORDER BY message_timestamp DESC
      LIMIT 1
    `
      )
      .get(threadId)) as any

    if (!isSendEligible(thread.status, latestMessage?.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thread is not approved or ready. Approve before sending.',
        } as SendMessageResponse,
        { status: 400 }
      )
    }

    const outboundBody = (body.body || latestMessage?.draft_reply || '').trim()
    if (!outboundBody) {
      return NextResponse.json(
        { success: false, error: 'Thread has no draft reply to send' } as SendMessageResponse,
        { status: 400 }
      )
    }

    const consumed = await consumeConfirmToken(db, { threadId, confirmToken })
    if (!consumed.ok) {
      return NextResponse.json(
        { success: false, error: consumed.error } as SendMessageResponse,
        { status: 400 }
      )
    }

    if (latestMessage?.id && body.body && body.body.trim() !== (latestMessage.draft_reply || '').trim()) {
      try {
        await db
          .prepare(`UPDATE inbound_messages SET draft_reply = ?, draft_source = 'human' WHERE id = ?`)
          .run(outboundBody, latestMessage.id)
      } catch (error) {
        console.warn('[Send] draft_source human update skipped:', error)
      }
    }

    if (channel === 'email') {
      const to = extractEmailAddress(body.to || (isEmailAddress(thread.from_number) ? thread.from_number : ''))
      if (!isEmailAddress(to)) {
        return NextResponse.json(
          { success: false, error: 'A valid To email address is required' } as SendMessageResponse,
          { status: 400 }
        )
      }

      let subject = (body.subject || '').trim()
      if (!subject) {
        try {
          const meta = thread.metadata ? JSON.parse(thread.metadata) : {}
          subject = meta.subject ? `Re: ${meta.subject}` : `Message from The Browns`
        } catch {
          subject = 'Message from The Browns'
        }
      }

      console.log(`[Email Send] threadId=${threadId}, to=${redactRecipient(to)}, timestamp=${timestamp}`)

      const sendResult = await sendEmail({ to, subject, text: outboundBody })

      if (sendResult.success) {
        await db.batch([
          {
            sql: `
              INSERT INTO inbound_messages (
                thread_id, message_text, message_timestamp, tenant_id,
                direction, channel, from_number, whatsapp_message_id
              ) VALUES (?, ?, ?, 1, 'outbound', 'email', ?, ?)
            `,
            args: [threadId, outboundBody, sendResult.timestamp, to, sendResult.messageId || null],
          },
          {
            sql: `
              UPDATE inbound_threads
              SET status = 'sent', last_message_at = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [sendResult.timestamp, threadId],
          },
        ])
        await markThreadOutbound(db, threadId, {
          timestamp: sendResult.timestamp,
          channel: 'email',
          status: 'sent',
        })
        await writeEmailAudit(db, threadId, 'sent', to, sendResult.messageId || null, sendResult.timestamp, actingActor)
        await stampLastHandler(db, threadId, staffSession?.email)

        return NextResponse.json({
          success: true,
          data: {
            channel: 'email',
            messageId: sendResult.messageId || null,
            timestamp: sendResult.timestamp,
            provider: 'resend',
            threadStatus: 'sent',
          },
        } as SendMessageResponse)
      }

      await db.batch([
        {
          sql: `
            INSERT INTO inbound_messages (
              thread_id, message_text, message_timestamp, tenant_id,
              direction, send_error
            ) VALUES (?, ?, ?, 1, 'outbound', ?)
          `,
          args: [threadId, outboundBody, sendResult.timestamp, sendResult.error || 'Email send failed'],
        },
        {
          sql: `
            UPDATE inbound_threads
            SET status = 'failed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [threadId],
        },
      ])
      await writeEmailAudit(db, threadId, 'failed', to, null, sendResult.timestamp, actingActor)
      await notifyFailedApproveSend({
        db,
        actorEmail: staffSession?.email,
        threadId,
        guestFirstName: guestFirstName(thread.guest_name),
        bookingRef: `T-${threadId}`,
        channel: 'email',
        attemptId: sendResult.timestamp,
      }).catch(() => undefined)

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: sendResult.error,
        } as SendMessageResponse,
        { status: sendResult.error?.includes('not configured') ? 503 : 500 }
      )
    }

    if (channel === 'whatsapp_web') {
      const to = (body.to || thread.from_number || '').trim()
      if (!to) {
        return NextResponse.json(
          { success: false, error: 'A recipient phone number is required' } as SendMessageResponse,
          { status: 400 }
        )
      }

      const job = await createQueuedJob(db, {
        channel: 'whatsapp_web',
        threadId,
        toAddress: to,
        bodyText: outboundBody,
        subject: body.subject || null,
      })

      await db
        .prepare(
          `
        UPDATE inbound_threads
        SET status = 'queued', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
        )
        .run(threadId)

      console.log(`[WA Web Queue] threadId=${threadId}, jobId=${job.id}, to=${redactRecipient(to)}`)

      return NextResponse.json({
        success: true,
        queued: true,
        data: {
          channel: 'whatsapp_web',
          jobId: job.id,
          jobStatus: 'queued',
          provider: 'whatsapp_web',
          threadStatus: 'queued',
          timestamp,
        },
      } as SendMessageResponse)
    }

    if (channel === 'sms') {
      const to = (body.to || thread.from_number || '').replace(/^whatsapp:/i, '').trim()
      if (!to) {
        return NextResponse.json(
          { success: false, error: 'A recipient phone number is required for SMS' } as SendMessageResponse,
          { status: 400 }
        )
      }

      const sendResult = await sendSms({ to, body: outboundBody })
      if (sendResult.success) {
        await db.batch([
          {
            sql: `
              INSERT INTO inbound_messages (
                thread_id, message_text, message_timestamp, tenant_id,
                direction, channel, from_number
              ) VALUES (?, ?, ?, 1, 'outbound', 'sms', ?)
            `,
            args: [threadId, outboundBody, sendResult.timestamp, to],
          },
          {
            sql: `
              UPDATE inbound_threads
              SET status = 'sent', last_message_at = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [sendResult.timestamp, threadId],
          },
        ])
        await markThreadOutbound(db, threadId, {
          timestamp: sendResult.timestamp,
          channel: 'sms',
          status: 'sent',
        })
        await stampLastHandler(db, threadId, staffSession?.email)
        return NextResponse.json({
          success: true,
          data: {
            channel: 'sms',
            messageId: sendResult.messageId || null,
            timestamp: sendResult.timestamp,
            provider: 'twilio',
            threadStatus: 'sent',
          },
        } as SendMessageResponse)
      }

      await notifyFailedApproveSend({
        db,
        actorEmail: staffSession?.email,
        threadId,
        guestFirstName: guestFirstName(thread.guest_name),
        bookingRef: `T-${threadId}`,
        channel: 'sms',
        attemptId: sendResult.timestamp,
      }).catch(() => undefined)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send SMS',
          details: sendResult.error,
        } as SendMessageResponse,
        { status: sendResult.error?.includes('not configured') ? 503 : 500 }
      )
    }

    const redactedPhone =
      thread.from_number.length > 4
        ? thread.from_number.slice(0, -4).replace(/./g, '*') + thread.from_number.slice(-4)
        : thread.from_number

    console.log(`[Send] threadId=${threadId}, to=${redactedPhone}, timestamp=${timestamp}`)

    const sendResult = await sendWhatsAppMessage({
      to: thread.from_number,
      message: outboundBody,
    })

    if (sendResult.success) {
      console.log(
        `[Send Success] threadId=${threadId}, messageId=${sendResult.messageId}, provider=${sendResult.provider}, sandbox=${sendResult.sandboxMode}`
      )

      await db.batch([
        {
          sql: `
            INSERT INTO inbound_messages (
              thread_id, message_text, message_timestamp, tenant_id,
              direction, channel, from_number, whatsapp_provider, whatsapp_message_id
            ) VALUES (?, ?, ?, 1, 'outbound', 'whatsapp_cloud', ?, ?, ?)
          `,
          args: [threadId, outboundBody, sendResult.timestamp, thread.from_number, sendResult.provider, sendResult.messageId],
        },
        {
          sql: `
            UPDATE inbound_threads
            SET status = 'sent', last_message_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          args: [sendResult.timestamp, threadId],
        },
      ])
      await markThreadOutbound(db, threadId, {
        timestamp: sendResult.timestamp,
        channel: 'whatsapp_cloud',
        status: 'sent',
      })
      await stampLastHandler(db, threadId, staffSession?.email)

      return NextResponse.json({
        success: true,
        data: {
          messageId: sendResult.messageId,
          timestamp: sendResult.timestamp,
          provider: sendResult.provider!,
          sandboxMode: sendResult.sandboxMode!,
          threadStatus: 'sent',
        },
      } as SendMessageResponse)
    }

    const errorMessage = sendResult.error || 'Unknown error'
    console.error(`[Send Error] threadId=${threadId}, error=${errorMessage}, provider=${sendResult.provider}`)

    await db.batch([
      {
        sql: `
          INSERT INTO inbound_messages (
            thread_id, message_text, message_timestamp, tenant_id,
            direction, whatsapp_provider, send_error
          ) VALUES (?, ?, ?, 1, 'outbound', ?, ?)
        `,
        args: [threadId, outboundBody, sendResult.timestamp, sendResult.provider, errorMessage],
      },
      {
        sql: `
          UPDATE inbound_threads
          SET status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [threadId],
      },
    ])
    await notifyFailedApproveSend({
      db,
      actorEmail: staffSession?.email,
      threadId,
      guestFirstName: guestFirstName(thread.guest_name),
      bookingRef: `T-${threadId}`,
      channel: 'whatsapp',
      attemptId: sendResult.timestamp,
    }).catch(() => undefined)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send WhatsApp message',
        details: errorMessage,
      } as SendMessageResponse,
      { status: 500 }
    )
  } catch (error) {
    console.error('[Send Fatal Error]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as SendMessageResponse,
      { status: 500 }
    )
  }
}
