# Contract: outbound redirect setting (Decision L)

Base: staff-only. Session cookie required.

## GET /api/staff/outbound-redirect

Returns the live stored ON/OFF value (fail-closed ON on read errors).

**401** if no valid session.

```json
{ "on": true, "mode": "redirect", "redirectStatus": "on" }
```

When OFF:

```json
{ "on": false, "mode": "live", "redirectStatus": "off" }
```

## POST /api/staff/outbound-redirect

Any signed-in user. Body `{ "on": true | false }`. Confirm-to-OFF is a header UI gate only.

Writes `app_settings.outbound_redirect` and a `staff_user_audit` row (`action=outbound_redirect_flip`, `target=old->new`, `actor` = session email).

**401** if no valid session.
**400** if `on` is not boolean.

```json
{ "on": false, "old": "on", "next": "off" }
```

## GET /api/health (existing)

Public. `outboundMode` and `outboundRedirect` MUST read the live stored value (not env).
