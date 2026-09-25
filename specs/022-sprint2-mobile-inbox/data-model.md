# Data Model: Sprint 2 Mobile-Friendly Inbox

UI-only. No tables, columns, or API payloads change. This file records **view-state** the layout shell already has or derives from existing UMI thread DTOs.

## Existing entities (read-only)

### InboxThread (list row)

Fields already returned by `GET /api/umi/inbox`:

- `id`, `threadKind`, `bookingId`, `bookerName`, `suite`, `checkIn`, `checkOut`
- `nightsbridgeBookingId`, `lastChannel`, `preview`, `hasOpenDraft`, `needsAttention`, `sortBucket`, `hygieneStatus`

Validation (unchanged): names and stay facts come from stored booking/contact rows. This feature MUST NOT invent missing suite/dates.

### ThreadDetail (thread pane)

Fields already returned by `GET /api/umi/threads/:id`:

- Header facts: `bookerName`, `suite`, `checkIn`, `checkOut`, `nightsbridgeBookingId`, `bookingId`, `lastChannel`, `defaultOutboundChannel`, `threadKind`
- `openDraft`, `linkCandidates`, `messages[]` (`id`, `direction`, `channel`, `body`, `timestamp`, `isSpam`, `senderAddress`)

## New view-state (client only)

### InboxBreakpoint

- `phone` — width < 768
- `tablet` — 768–1199
- `desktop` — ≥ 1200

### InboxPane

- `list` | `thread`
- Phone: exactly one visible
- Tablet/desktop: both visible (`thread` may be empty-state)

### ListScrollMemory

- `scrollTop: number` captured when leaving the list on phone
- Restored on back

### KeyboardInset

- `insetPx: number` from `visualViewport` (or `--inbox-keyboard-inset` for simulation)
- Applied as bottom padding on the inbox shell

### ConfirmPromptState

- `open: boolean`
- `channelLabel: string`
- Confirm runs existing approve + confirmToken + send
- Cancel leaves draft and thread unchanged

### Layout slots (empty)

| Slot | Location | Later owner |
| --- | --- | --- |
| `header-badge` | Pinned thread header | Window badge PR |
| `header-actions` | Pinned thread header | Redirect toggle PR |
| `bubble-status` | Each message bubble | Delivery-status PR |

No persistence. No new Zod schemas on the server.

## State transitions

```text
phone/list --tap thread--> phone/thread (push ?thread=id, remember scroll)
phone/thread --back/popstate--> phone/list (restore scroll, drop or pop ?thread)
tablet|desktop --select thread--> two-pane (optional ?thread=id, list stays)
any --Approve&Send--> confirm open --confirm--> existing send sequence
any --Approve&Send--> confirm open --cancel--> confirm closed, no send
```
