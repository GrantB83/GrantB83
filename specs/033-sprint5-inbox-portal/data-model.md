# Data Model: Sprint 5 Inbox, Journey, and Guest Portal

## JourneyStage

| Field | Rule |
|-------|------|
| id | `4a` \| `4b` \| `4c` \| `4d` \| `4e` \| `4f` \| `4g` (also readable legacy `t-3` \| `t-1` \| `day-of`) |
| label | Short staff noun (`Gate`, `T−7`, `Day-of`, `Comfort`, `Departure`, `Rescind`, `Review`) |
| offsetFrom | `check_in` \| `check_out` \| `booking` |
| offsetDays | integer (4a = 0 on booking presence; 4b = −7 from check-in; 4d = +1 from check-in) |
| hourSast | 8, 12, or 17; 4a any hour ≥ existing job floor (06:00) once booking exists |
| minNights | 4d requires nights > 1 (`check_out` date − `check_in` date ≥ 2) |
| channels | 4a = `email` AND `whatsapp_cloud`; others = preferred contact |
| templateNames | existing catalogue names only |
| guestFacing | false for 4f |
| systemAction | `rescind_portal_security` for 4f |

Stored in existing `arrival_drafts` (`stage`, `stage_label`, `due_date`, `draft_body`, `template_name`, `status`, `channel`, `attention_reason`). Status enum unchanged: `drafted` \| `needs_attention` \| `template_pending_approval` \| `sent` \| `discarded`.

## HeaderChip

| Field | Rule |
|-------|------|
| id | stable key |
| label | `Window closed` \| `Window open` \| `Day-of` \| `T−1` \| `T−7` \| `Needs attention` \| short attention noun |
| tone | `info` (`#DCE8F9`/`#0A3775`) \| `neutral` (`#EEF1F4`/`#5B6B7C`) \| `attention` (`#FCE8E8`/`#9B1C1C`) |
| priority | 0 window, 1 timing, 2 channel readiness, 3 attention |
| visible | first 3 by priority; rest overflow |

## RoomDisplay

| Field | Rule |
|-------|------|
| bookedName | raw `suite_or_unit` |
| displayName | Wolery → Heritage Cottage; otherwise mapped or raw |
| publicUrl | `https://www.thebrowns.co.za/` (verified) |
| mappingGap | true when lockbox/property unresolved |

## PortalStayPacket (API)

| Field | Rule |
|-------|------|
| rooms[] | RoomDisplay for booked suite(s) |
| localInfo | check-in 14:00, checkout 10:00, gate drive-through, housekeeper hours, house rules, parking, directions — no invented venue lists |
| securityOpen | boolean from SAST window |
| security | gate/lockbox/wifi password only when `securityOpen`; SSID in-window = `The Browns Guests` |
| preSecurityCopy | “Access codes appear on check-in day from 14:00.” |
| mappingGap / needsAttentionReason | staff-visible; guest sees no invented digits |

## ContactDetails

Unchanged persist model: `phone`, `email`, source `staff`. Labels are Guest, not Staff.

## Validation

- Email optional; if present must match existing contact validator
- Never persist invented codes
- 4f writes no guest `draft_body`
- Closed window string exactly `Window closed`
