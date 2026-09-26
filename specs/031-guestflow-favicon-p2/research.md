# Research: GuestFlow Favicon P2

## Prod symptom

- `GET https://guestflow.thebrowns.co.za/favicon.ico` → 404 (`/_not-found`)
- `apps/guestflow/public/logos/` exists; no `public/favicon.ico`
- Root `layout.tsx` had no `metadata.icons`

## Brand asset choice

| Asset | Use for favicon |
| --- | --- |
| `thebrowns-logo-live_079f.svg` | Wide wordmark; poor fit for 16×16 without redesign |
| `the-browns-logo.png` | Contains circular script “B” emblem — crop 270×270 centered on emblem |

Crop parameters (committed generator): `left=293`, `top=10`, `size=270` on 856×451 PNG.

## Next.js serving

- Files in `public/` are served at site root
- `metadata.icons` in root layout emits `<link rel="icon">` and apple-touch tags
- `middleware.ts` matcher already excludes `favicon.ico`

## Standing locks (unchanged)

- Redirect ON at `/`
- No automated guest sends; Approve&Send remains human
- WhatsApp From `+27600200825`
