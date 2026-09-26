# Quickstart: Favicon P2 verification

## Local

```bash
cd apps/guestflow
npm ci
npm run build
npm run start
```

```bash
curl -sI http://localhost:3000/favicon.ico | head -5
curl -sI http://localhost:3000/icon-32.png | head -3
```

Open:

- `http://localhost:3000/staff-login`
- `http://localhost:3000/guest/login` (or active guest portal entry)

Confirm tab icon = Browns circular “B” emblem.

## Regenerate assets (optional)

```bash
cd apps/guestflow
npm install --no-save sharp to-ico
node scripts/generate-favicon.mjs
```

## Preview (Design / GFM)

Replace `$PREVIEW` with Vercel Preview URL from PR checks.

```bash
curl -sI "$PREVIEW/favicon.ico"
```

**MERGE HOLD** until Design PASS + GFM ACCEPT.
