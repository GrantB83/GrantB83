import { NextResponse } from 'next/server'
import { getDbAsync } from '@/lib/db'
import { staffApiResponseInit } from '@/lib/json-safe'
import { parseDatabaseUrlHost, queryMaxInboundId } from '@/lib/health-deep-diagnostics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const timestamp = new Date().toISOString()
  const { headers } = staffApiResponseInit()
  try {
    const db = await getDbAsync()
    await db.prepare('SELECT 1 AS ok').get()

    const [threads, messages] = await Promise.all([
      queryMaxInboundId(db, 'inbound_threads'),
      queryMaxInboundId(db, 'inbound_messages'),
    ])

    const databaseUrlHost = parseDatabaseUrlHost(process.env.DATABASE_URL)
    const hasTursoAuthToken = Boolean(process.env.TURSO_AUTH_TOKEN?.trim())

    const notes: string[] = []
    if (threads.note) notes.push(threads.note)
    if (messages.note) notes.push(messages.note)

    return NextResponse.json(
      {
        status: 'ok',
        service: 'guestflow',
        check: 'deep',
        database: db.type,
        touched: true,
        timestamp,
        maxInboundThreadId: threads.value,
        maxInboundMessageId: messages.value,
        databaseUrlHost,
        hasTursoAuthToken,
        ...(notes.length > 0 ? { notes } : {}),
      },
      { headers }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'guestflow',
        check: 'deep',
        touched: false,
        timestamp,
        error: error instanceof Error ? error.message : 'deep health failed',
      },
      { status: 503, headers }
    )
  }
}
