# Contract: Lockbox property resolver (shared)

Module: `apps/guestflow/src/lib/property-resolve.ts`

```ts
type PropertyKey = 'cottage' | 'main-house'

resolvePropertyForSuite(db, tenantId, suite): Promise<PropertyKey | null>
propertyDisplayName(key: PropertyKey | null): string
// unknown → "Property unknown – check suite"

CODES_UNRESOLVED_REASON = 'codes: property unresolved'

resolveAccessCodesForSuite(db, tenantId, suite): Promise<
  | { ok: true; property: PropertyKey; codes: ResolvedAccessCodes }
  | { ok: false; property: null; codes: null; reason: typeof CODES_UNRESOLVED_REASON }
>
```

Rules:

- Match lockbox rows with existing `suiteMatches` only.
- Property = the `property` column on those rows.
- 0 matches, blank property, or >1 distinct property → `null` / `ok: false`.
- Never `includes('cottage')` (or any other substring) to choose property.

Required fixtures:

1. Every suite in the lockbox SoR fixture resolves.
2. Suite name contains `cottage` but lockbox `property='main-house'` → Main House codes.
3. Missing row → no codes.
