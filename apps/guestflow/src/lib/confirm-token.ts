import { randomBytes } from 'crypto'
import type { DbClient } from '@/lib/db'
import { ensurePhase0Schema } from '@/lib/phase0-schema'
import { hashToken } from '@/lib/token'

export const SEND_APPROVED_STATUSES = ['approved', 'ready'] as const
export const CONFIRM_TOKEN_TTL_MS = 15 * 60 * 1000

export type SendApprovedStatus = (typeof SEND_APPROVED_STATUSES)[number]

export function isApprovedForSend(status?: string | null): boolean {
  return Boolean(status && (SEND_APPROVED_STATUSES as readonly string[]).includes(status))
}

export function isSendEligible(threadStatus?: string | null, messageStatus?: string | null): boolean {
  return isApprovedForSend(threadStatus) || isApprovedForSend(messageStatus)
}

export async function issueConfirmToken(
  db: DbClient,
  input: { tenantId?: number; threadId: number }
): Promise<{ confirmToken: string; expiresAt: string; threadId: number }> {
  await ensurePhase0Schema(db)
  const confirmToken = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(confirmToken)
  const expiresAt = new Date(Date.now() + CONFIRM_TOKEN_TTL_MS).toISOString()
  await db
    .prepare(
      `
      INSERT INTO send_confirm_tokens (tenant_id, thread_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `
    )
    .run(input.tenantId ?? 1, input.threadId, tokenHash, expiresAt)

  return { confirmToken, expiresAt, threadId: input.threadId }
}

export async function consumeConfirmToken(
  db: DbClient,
  input: { threadId: number; confirmToken: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensurePhase0Schema(db)
  const raw = (input.confirmToken || '').trim()
  if (!raw) {
    return { ok: false, error: 'confirmToken is required' }
  }

  const tokenHash = hashToken(raw)
  const now = new Date().toISOString()
  const result = (await db
    .prepare(
      `
      UPDATE send_confirm_tokens
      SET consumed_at = ?
      WHERE token_hash = ?
        AND thread_id = ?
        AND consumed_at IS NULL
        AND expires_at > ?
    `
    )
    .run(now, tokenHash, input.threadId, now)) as { changes?: number }

  if (!result || !result.changes) {
    return {
      ok: false,
      error: 'confirmToken is missing, invalid, expired, or already used',
    }
  }

  return { ok: true }
}
