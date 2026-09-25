# Contract: resolver shims (#218 / #219 / #221)

Prefer importing live APIs from #218 / #219 when those files exist on this tree. Otherwise these interfaces are the wire point. Document `wire after #218/#219 merges` in `apps/guestflow/docs/ARRIVAL-DRAFTS.md`.

## #221 (on this base — import, do not copy)

```ts
resolveAccessCodesForSuite(db, tenantId, suite)
// { ok: true, property, codes } | { ok: false, property: null, codes: null, reason: 'codes: property unresolved' }

isActiveGuestBooking(row)
isOwnerBlock(row)
isCancelledStatus(status)
```

## #218 WhatsApp window + templates

```ts
type WindowState = {
  open: boolean
  lastInboundAt: string | null
  closesAt: string | null
  remainingMs: number
}

function getWindowState(lastInboundAt: string | null | undefined, now?: Date): WindowState

type ApprovedTemplate = {
  name: string
  contentSid: string | null
  status: 'approved' | 'pending' | 'local'
  body: string
  variables: string[]
}

function findApprovedTemplateFor(name: string): ApprovedTemplate | null
function fillTemplate(body: string, vars: Record<string, string>): string
```

`findApprovedTemplateFor` returns a usable send template only when `status === 'approved'` **and** `contentSid` is present. Grant-local copy with `status: 'local' | 'pending'` → mark draft `template pending approval`.

## #219 contact presence

```ts
function hasGuestContact(input: { phone?: string | null; email?: string | null }): boolean

function resolveContactPresence(input: {
  phone?: string | null
  email?: string | null
}): { phone: string | null; email: string | null; hasContact: boolean; channel: 'whatsapp' | 'email' | null }
```

Phone wins for channel. No phone + email → email. Neither → no contact.

## Approve&Send hook

`POST /api/inbound/send` MUST call `refreshArrivalDraftCodesAtSend` for T-1 (and any draft whose `codes_snapshot` is set) **after** eligibility and **before** the provider send. Replace the delimited codes block from a fresh `resolveAccessCodesForSuite`. Do not send the stored snapshot.

## Redirect

Keep current `/api/inbound/send` redirect behaviour on this base. Decision L is out of scope.
