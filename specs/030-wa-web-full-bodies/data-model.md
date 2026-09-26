# Data Model: WA Web Full Bodies + Source Display Names

No new tables. Additive use of live UMI columns only.

## InboundMessage (existing `inbound_messages`)

| Field | Rule for this feature |
| --- | --- |
| `message_text` | WhatsApp Web: real guest body only. MUST NOT be `[metadata-only]`, `[body unavailable]`, or `[observe-probe]` |
| `body_unavailable` | `1` only for historical email/other sentinels. WhatsApp Web going-forward writes `0` or skips the row |
| `external_message_id` | Preferred durable key. Unique when present |
| `dedup_key` | `sha256(normalizedSender \| normalizedBody \| 2-minute timestamp bucket)`. After replace, recomputed from the **real** body |
| `channel` | `whatsapp_web` for this path |
| `from_number` | Source sender (E.164 or as observed). Never invent |
| `message_timestamp` | Source timestamp. Used with sender when external id is missing |
| `direction` | `inbound` |

**Validation**:
- Sentinel / empty WhatsApp Web body → no insert
- Replace allowed only when current `message_text` is exactly `[metadata-only]` or `[body unavailable]` (or `body_unavailable = 1` on `whatsapp_web`) and incoming text is a real body
- Real-body `dedup_key` match (Cloud or Web) → duplicate, no second row

## InboundThread (existing `inbound_threads`)

| Field | Rule for this feature |
| --- | --- |
| `guest_name` | Source display name when current value is empty or phone-like; never invent |
| `from_number` | Phone fallback for title when no source name |
| `thread_kind` | `temp` unmatched / `booking` when linked |
| `metadata` | May store `observedOn` and raw source-name fields; not a substitute for `guest_name` |

**Title resolution (unchanged formula, better inputs)**:

`bookerName = booking_guest_name || guest_name || from_number`

For unmatched temps, `booking_guest_name` is null, so `guest_name` from WhatsApp Web becomes the title.

## SourceDisplayName (derived, not a table)

Candidates, first real win, no invent:

1. `contactName`
2. `pushName` / `notifyName`
3. `chatTitle`
4. `displayName` / `name`

Reject if empty, sentinel, or phone-like (same number as `from` after E.164 normalize, or digits-only matching the sender).

## State transitions

```text
WA Web observe (empty/sentinel) → skip row
WA Web observe (real body, new key) → insert inbound + touch thread
WA Web observe/backfill (real body, sentinel row) → UPDATE message in place; refresh guest_name if source name present
WA Web observe/backfill (real body, Cloud already has same key) → duplicate; delete leftover WA Web sentinel if it is a different row
```

## Retention

Unchanged: 5 years after last stay, then delete. This feature does not extend or invent a window.
