import { NextResponse } from 'next/server'

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
  return NextResponse.json(serializeForJson(body), init)
}
