# Contract: Composer pop-out, tooltips, list chrome

## ThreadComposer

| Control | `title` + tooltip + `aria-label` |
|---------|----------------------------------|
| Channel `<select>` | Send channel |
| Templates button | Templates |
| Attach button | Attach file |
| Pop-out button | Expand editor |

- Pop-out is rightmost after attach; Maximize2-class glyph; ≥40px hit.
- `data-sprint6-popout="open"` on the overlay/sheet.
- Desktop overlay: max-width 720–840px; max-height `min(88vh, 720px)`; sticky toolbar + footer; backdrop `rgba(10,55,117,0.28)` or black/40.
- Textarea in pop-out: min-height 280px / ≥12 rows.
- One draft store (parent state). Compact CTAs hidden while overlay open.
- Esc / close / backdrop restore compact; focus returns to Expand editor.
- Approve & Send remains the navy filled primary; human confirm unchanged.
- No `Template & Care` string.

## List header

```
Row 1: Inbox                          [Refresh inbox]
Row 2: [🔍 Search…]  [☑ Needs attention]
```

- Title padding 8–10px; search height 36–40px; search `padding-left` ≥ 36–40px.
- Refresh `title` / `aria-label`: **Refresh inbox**.
- Loading: skeleton rows, then page.
- Cards: Sprint 5 lean (name, stay state caps, room · dates, preview). No chip row.
- `?thread=` preserved.
