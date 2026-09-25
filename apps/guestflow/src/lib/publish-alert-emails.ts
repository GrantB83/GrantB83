/**
 * Publish active staff login emails for the external health checker.
 * Uses named env only. Never invents tokens. Missing config is a no-op.
 */

import type { DbClient } from '@/lib/db'
import { listActiveAlertEmails } from '@/lib/staff-alerts'

export interface PublishResult {
  published: boolean
  reason?: string
  count?: number
  targets?: string[]
}

function alertsRepo(): string {
  return (process.env.GITHUB_ALERTS_REPO || 'GrantB83/GrantB83').trim()
}

function alertsVariableName(): string {
  return (process.env.GITHUB_ALERTS_VARIABLE || 'GUESTFLOW_ALERT_EMAILS').trim()
}

export async function publishActiveAlertEmails(db: DbClient): Promise<PublishResult> {
  const emails = await listActiveAlertEmails(db)
  const csv = emails.join(',')
  const targets: string[] = []
  const token = process.env.GITHUB_ALERTS_TOKEN?.trim()
  const edgeWrite =
    process.env.VERCEL_API_TOKEN?.trim() &&
    process.env.EDGE_CONFIG_ID?.trim()

  if (!token && !edgeWrite) {
    return { published: false, reason: 'not_configured', count: emails.length }
  }

  if (token) {
    const ok = await publishGithubVariable(token, csv)
    if (ok) targets.push('github_actions_variable')
  }

  if (edgeWrite) {
    const ok = await publishEdgeConfig(csv)
    if (ok) targets.push('edge_config')
  }

  return {
    published: targets.length > 0,
    reason: targets.length ? undefined : 'publish_failed',
    count: emails.length,
    targets,
  }
}

async function publishGithubVariable(token: string, value: string): Promise<boolean> {
  const repo = alertsRepo()
  const name = alertsVariableName()
  const url = `https://api.github.com/repos/${repo}/actions/variables/${encodeURIComponent(name)}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
  try {
    const patch = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, value }),
    })
    if (patch.ok) return true
    if (patch.status !== 404) return false
    const create = await fetch(`https://api.github.com/repos/${repo}/actions/variables`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, value }),
    })
    return create.ok
  } catch {
    return false
  }
}

async function publishEdgeConfig(value: string): Promise<boolean> {
  const id = process.env.EDGE_CONFIG_ID?.trim()
  const token = process.env.VERCEL_API_TOKEN?.trim()
  const key = process.env.EDGE_CONFIG_ALERTS_KEY?.trim() || 'guestflow_alert_emails'
  if (!id || !token) return false
  try {
    const response = await fetch(`https://api.vercel.com/v1/edge-config/${encodeURIComponent(id)}/items`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ operation: 'upsert', key, value }],
      }),
    })
    return response.ok
  } catch {
    return false
  }
}
