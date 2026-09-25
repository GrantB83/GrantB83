# UI Contract: Inbox layout shell

No HTTP contract changes. This is the rebase contract for parallel Sprint 2 thread-UI PRs.

## Breakpoints

| Name | Width | Panes |
| --- | --- | --- |
| phone | `< 768px` | Single pane |
| tablet | `768–1199px` | Two pane, list narrower / collapsible |
| desktop | `≥ 1200px` | Two pane, list `max-w-md` as today |

## DOM hooks

| Hook | Required | Purpose |
| --- | --- | --- |
| `[data-inbox-shell]` | yes | Root shell; hosts `--inbox-keyboard-inset` |
| `[data-inbox-pane="list"]` | yes | List pane |
| `[data-inbox-pane="thread"]` | yes | Thread pane |
| `[data-inbox-slot="header-badge"]` | yes | Empty slot in pinned header |
| `[data-inbox-slot="header-actions"]` | yes | Empty slot in pinned header |
| `[data-inbox-slot="bubble-status"]` | yes, per bubble | Empty slot on each bubble |
| `[data-inbox-confirm]` | yes when open | Phone-fitting confirm dialog |
| `[data-inbox-composer]` | yes | Pinned composer |

## Query

| Param | Effect |
| --- | --- |
| `thread=<id>` | Open that thread (phone: full screen) |
| `fixture=1` | Load mock guests for screenshots / Lighthouse |
| `keyboard=1` | Simulate keyboard inset for screenshots |

## Unchanged send sequence

1. Human opens confirm
2. Confirm → save draft (existing PUT) → approve (existing POST) → `POST /api/inbound/confirm-token` → `POST /api/inbound/send` with that token
3. Cancel → no network send

## Accessibility

- Inbox landmark heading remains “Inbox”
- Back control has an accessible name
- Confirm dialog is labelled and focus-trapped
- Inputs ≥ 16px; primary controls ≥ 44×44px
