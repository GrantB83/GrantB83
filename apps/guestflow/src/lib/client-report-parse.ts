/**
 * Header-driven NB Client report parser.
 * Fills only what applyBookingContact allows (never overwrites A&D).
 * Unknown columns are ignored. Never invents PII.
 */

export interface ClientReportRow {
  guestName?: string
  bookingId?: string
  phone?: string
  email?: string
  checkIn?: string
  checkOut?: string
}

function normHeader(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function cell(row: unknown[], index: number): string {
  const value = row[index]
  return value == null ? '' : String(value).trim()
}

export function mapClientReportHeaders(headers: unknown[]): {
  guestName?: number
  bookingId?: number
  phone?: number
  email?: number
  checkIn?: number
  checkOut?: number
} {
  const mapped: ReturnType<typeof mapClientReportHeaders> = {}
  headers.forEach((header, index) => {
    const h = normHeader(header)
    if (!h) return
    if (
      (h.includes('clientname') || h === 'name' || h === 'guestname' || h === 'guest') &&
      mapped.guestName == null
    ) {
      mapped.guestName = index
    } else if (h.includes('bookingid') || h === 'booking' || h === 'nbid' || h === 'reference') {
      mapped.bookingId = index
    } else if (h.includes('phone') || h.includes('tel') || h.includes('mobile')) {
      if (mapped.phone == null) mapped.phone = index
    } else if (h.includes('email') || h.includes('mail')) {
      if (mapped.email == null) mapped.email = index
    } else if (h.includes('arriv') || h.includes('checkin') || h === 'from') {
      mapped.checkIn = index
    } else if (h.includes('depart') || h.includes('checkout') || h === 'to') {
      mapped.checkOut = index
    }
  })
  return mapped
}

export function parseClientReportGrid(jsonData: unknown[][]): ClientReportRow[] {
  if (!jsonData.length) return []

  let headerRow = 0
  let mapped = mapClientReportHeaders(jsonData[0] || [])
  if (mapped.guestName == null && mapped.bookingId == null) {
    for (let i = 1; i < Math.min(jsonData.length, 8); i++) {
      const trial = mapClientReportHeaders(jsonData[i] || [])
      if (trial.guestName != null || trial.bookingId != null) {
        headerRow = i
        mapped = trial
        break
      }
    }
  }

  if (mapped.guestName == null && mapped.bookingId == null) return []

  const rows: ClientReportRow[] = []
  for (let i = headerRow + 1; i < jsonData.length; i++) {
    const row = jsonData[i] || []
    const guestName = mapped.guestName != null ? cell(row, mapped.guestName) : ''
    const bookingId = mapped.bookingId != null ? cell(row, mapped.bookingId) : ''
    const phone = mapped.phone != null ? cell(row, mapped.phone) : ''
    const email = mapped.email != null ? cell(row, mapped.email) : ''
    if (!guestName && !bookingId && !phone && !email) continue
    rows.push({
      guestName: guestName || undefined,
      bookingId: bookingId || undefined,
      phone: phone || undefined,
      email: email || undefined,
      checkIn: mapped.checkIn != null ? cell(row, mapped.checkIn) || undefined : undefined,
      checkOut: mapped.checkOut != null ? cell(row, mapped.checkOut) || undefined : undefined,
    })
  }
  return rows
}

export function normalizeClientBookingId(raw?: string | null): string | null {
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (!trimmed) return null
  const nb = trimmed.match(/NB-?(\d{4,10})/i)
  if (nb) return nb[1]
  const digits = trimmed.replace(/\D/g, '')
  return digits || trimmed
}
