# UI Contracts — Inbox list, header, composer

## List card

Must render, in order:

1. Booker name (semibold)
2. Journey state right: `ARRIVING` \| `IN HOUSE` \| `DEPARTING` (muted caps, not a pill)
3. Room · dates (one muted line; display helper applies Wolery→Heritage Cottage)
4. Preview (one line). If `hasOpenDraft`, prefix `Draft ·`

Must not render a chip row. Forbidden strings on the card: `WA closed`, `WA closing`, `Needs attention` as a pill, `WhatsApp Web` as a pill, `T-1` as a pill.

Optional: one unread/attention **dot**, not a chip stack.

## Thread header (Zone A)

- Identity, room·dates, last channel
- `HeaderStatusChips`: ≤3 pills + ghost Details
- Chip classes: info `#DCE8F9`, neutral `#EEF1F4`, attention `#FCE8E8`
- Closed window label: `Window closed`
- Details opens existing Booking & Contact modal

## Composer (Zone C)

```
[channel icon] [templates icon] [attach icon]
[textarea: collapsed 40–48px / expanded ≥96px]
[Cancel ghost]                    [Approve & Send navy #0A3775]
```

- `data-inbox-composer` remains
- `data-sprint5-composer="overlay"`
- Approve&Send button text `Approve & Send`
- No `Template & Care` string in the thread column
- No four channel pills
- Attach button `disabled` unless an upload SoR appears later
- Pending bubble: `data-pending-draft="true"`; click loads body + channel

## Details modal

- Title: `Booking & Contact Details`
- Labels: `Guest phone`, `Guest email`
- Save POST `{ phone, email }`
- No `Staff phone` / `Staff email` visible strings

## Accessibility

- Composer textarea focus expands Zone C
- Icons have `aria-label`
- Chips have accessible names
- Portal sections use `h1`/`h2`
