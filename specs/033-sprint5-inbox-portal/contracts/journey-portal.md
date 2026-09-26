# Contracts — Journey 4a–4g and Guest Portal

## Journey job

Existing: `GET /api/cron/arrival-drafts` → `runArrivalDraftsJob`.

Behaviour:

- Timezone `Africa/Johannesburg`
- No send
- Booking query includes check-in in [today, today+7], checkout = today, and comfort (check-in = yesterday AND nights > 1)
- Stage emitted only when `hourSast >= stage.hourSast` (4a uses job floor 06:00)
- 4a writes **two** drafts when both phone and email exist (email + whatsapp_cloud). Missing one channel → one draft + attention if both missing
- 4f: no inbound_messages guest body; security clock is the rescind
- Template names must exist in `wa_templates` / seed; WhatsApp-unapproved → `template_pending_approval`, still not sent
- Preview text: `Arrival draft {label}` (no Approve&Send sermon)

## Portal GET `/api/guest-portal/[code]`

Add / keep:

```json
{
  "rooms": [{ "bookedName": "", "displayName": "", "publicUrl": "https://www.thebrowns.co.za/", "mappingGap": false }],
  "stayPacket": {
    "securityOpen": false,
    "wifi": { "network": "", "password": "" },
    "accessCodes": { "available": false, "message": "Access codes appear on check-in day from 14:00." }
  }
}
```

- `securityOpen` true only 14:00 SAST check-in day through 12:00 SAST departure
- When closed: `wifi.password` empty; gate/lockbox empty; message as above
- When open: SSID `The Browns Guests`; password from access-codes SoR or empty + mapping gap
- `displayName` applies Wolery → Heritage Cottage

## Locks (all routes)

- Redirect ON
- No auto-send
- From +27600200825
- No invented PII/codes
