# Data Model: Staff Ops Daily Brief

**Feature**: 002-staff-ops-daily-brief

## Existing Tables (read-only for this feature)

### bookings

| Column | Type | Brief usage |
|--------|------|-------------|
| id | INTEGER | Reference |
| tenant_id | INTEGER | Filter by Browns tenant |
| guest_name | TEXT | Display; missing → exception |
| guest_phone | TEXT | Missing → exception flag |
| check_in | DATE/TEXT | Derive arriving/inhouse |
| check_out | DATE/TEXT | Derive departing/inhouse |
| suite_or_unit | TEXT | Suite label; blank → exception |
| property_name | TEXT | Display grouping |
| room_number | TEXT | Display; may mirror suite |
| adults, children | INTEGER | Party size in export |
| notes | TEXT | Late keyword scan |
| late_check_in | BOOLEAN/INT | RED exception |
| status | TEXT | Booking lifecycle (not daily ops slice) |

### tenants

| Column | Brief usage |
|--------|-------------|
| id, name | Tenant filter and export header |

## Derived Types (application layer — not persisted)

### DailyBriefBooking

Enriched booking row for UI/export:

```typescript
{
  id: number
  guestName: string
  propertyName: string
  roomNumber: string
  suiteOrUnit: string
  checkIn: string       // YYYY-MM-DD
  checkOut: string
  derivedStatus: 'arriving' | 'inhouse' | 'departing'
  lateCheckIn: boolean
  missingFields: string[]
  adults?: number
  children?: number
  specialRequests?: string
}
```

### DailyBriefDaySlice

```typescript
{
  date: string            // YYYY-MM-DD
  arrivals: DailyBriefBooking[]
  departures: DailyBriefBooking[]
  inHouse: DailyBriefBooking[]
}
```

### DailyBriefExceptions

```typescript
{
  lateCheckIns: DailyBriefBooking[]
  missingData: DailyBriefBooking[]
  emptySuites: { unit: string; propertyName: string; reason: string }[]
}
```

### DailyBriefSnapshot

```typescript
{
  tenantId: number
  tenantName: string
  targetDate: string
  tomorrowDate: string
  today: DailyBriefDaySlice
  tomorrow: DailyBriefDaySlice
  exceptions: DailyBriefExceptions
  generatedAt: string     // ISO timestamp
}
```

## Relationships

- `bookings.tenant_id` → `tenants.id`
- Brief snapshot is computed at request time; no new tables
- Export POST accepts either raw booking array (legacy) or snapshot from GET

## Validation Rules

- Never emit rate or payment fields in snapshot or export
- Empty guest name bookings appear in exceptions, not as normal arrival cards
- If DB query fails, API returns `{ success: false, error }` — no synthetic bookings
