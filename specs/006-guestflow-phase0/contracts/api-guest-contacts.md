# Contract: guest_contacts upsert (library + NB ingest)

No public CRM API in Phase 0. Ingest calls `upsertGuestContact(db, input)`.

## Input

```ts
{
  tenantId: number
  phone?: string | null   // raw; never invent
  email?: string | null
  displayName?: string | null
  lastStayAt?: string | null
  lastSuite?: string | null
  source: 'nb' | 'inbound' | 'manual'
  nbid?: string | null
}
```

## Behaviour

- `normalizeZaE164(phone)` → store or null
- `retention_years = 5`
- `retention_delete_after = lastStayAt + 5y` when last stay present
- Unique per tenant on non-null phone
- Null-tolerant match: phone → email → nbid → insert

A&D ingest: for each parsed booking, upsert with `source: 'nb'` using parsed phone/email/name/checkout/suite/bookingId. Continue ingest if one upsert throws.
