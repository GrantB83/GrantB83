import { NextResponse } from 'next/server'

/** Prevent Vercel CDN from caching staff / health API JSON (stale timestamps, split-brain inbox). */
export const STAFF_API_CACHE_CONTROL = 'no-store, private, no-cache, must-revalidate'

export function staffApiResponseInit(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers)
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', STAFF_API_CACHE_CONTROL)
  }
  return { ...init, headers }
}

/**
 * JSON.stringify replacer: Turso/libsql INTEGER columns and lastInsertRowid often
 * surface as JS bigint, which NextResponse.json cannot serialize.
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value)
    if (Number.isSafeInteger(asNumber)) {
      return asNumber
    }
    return value.toString()
  }
  return value
}

/** Deep-clone via JSON round-trip with BigInt-safe replacer. */
export function serializeForJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, jsonReplacer)) as T
}

/** NextResponse.json wrapper that never throws on BigInt values from the DB layer. */
export function jsonSafeResponse(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(serializeForJson(body), staffApiResponseInit(init))
}
