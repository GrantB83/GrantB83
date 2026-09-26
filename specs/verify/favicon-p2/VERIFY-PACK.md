# VERIFY PACK — GuestFlow Favicon P2

**Ship**: Favicon P2 (MF-6)  
**Branch / PR**: `cursor/guestflow-favicon-p2-5165` · https://github.com/GrantB83/GrantB83/pull/247  
**Preview (tip)**: https://browns-guestflow-git-cursor-gue-18a997-grants-projects-db46fb3a.vercel.app  
**Coding agent status**: **Preview READY (remedia tip)** — ICO rebuilt; Design re-check required  
**Merge**: **MERGE HOLD** until Design PASS → GFM Preview ACCEPT (once)

---

## Remedia — Design FAIL `1b04b3f` (same PR #247)

| Item | Detail |
| --- | --- |
| **Verdict** | FAIL — `/favicon.ico` decoded as noisy pixel grid in browser; PNG `icon-32` / apple-touch **PASS** |
| **Root cause** | Invalid ICO encode via `to-ico` on PNG buffers (24bpp mis-decode) |
| **Fix** | Regenerate `favicon.ico` with `png-to-ico` from same emblem PNGs (16, 32, 48) — see `scripts/generate-favicon.mjs` |
| **Coding self-check** | Pillow decode of remedia ICO → Browns circular **B** at 32×32 (matches `icon-32.png`); `file` reports 3 icons 16/32/48 @ 32bpp |
| **Design** | **RE-PENDING** — re-run D1–D4 on new Preview tip after deploy |

---

## Operator job

Staff and guests opening GuestFlow in a browser tab see the Browns emblem favicon (not broken/default). Prod symptom fixed: missing `public/favicon.ico` + no root `metadata.icons`.

---

## Saleable DoD S1–S10

| ID | Required | Verification | Result |
| --- | --- | --- | --- |
| **S1** | Operator job | This pack + PR scope | **PASS** |
| **S2** | Happy path | Preview `GET /favicon.ico` → 200 image; tab mark on staff login + guest portal | **Coding PASS** (curl + ICO decode); **Design RE-PENDING** after remedia |
| **S3** | Empty/error | Static asset — must not 404 | **PASS** (was 404; now 200) |
| **S4** | Desktop layout | N/A icon only | **N/A** |
| **S5** | Mobile layout | N/A icon only | **N/A** |
| **S6** | Standing locks | No code changes to redirect/send/approve paths | **PASS** (see locks section) |
| **S7** | Copy bar | N/A | **N/A** |
| **S8** | Icons / a11y | `rel=icon` + apple-touch sizes; no new primary controls | **PASS** (HTML links on `/staff-login`) |
| **S9** | Peers | Design **Y** (brand mark on Preview tabs) · QA coding self-check | **Design RE-PENDING** (post-remedia) · Coding **PASS** |
| **S10** | Evidence | `curl -sI` + tab screenshots | **PASS** (artifacts linked below) |

---

## Standing locks (unchanged — must remain true after merge)

| Lock | Expected | This ship |
| --- | --- | --- |
| Redirect ON at `/` | Unchanged | **No edits** to redirect middleware/routes |
| Guest auto-send | Off | **No edits** to outbound/send handlers |
| Approve&Send | Human | **No edits** to approval flows |
| WhatsApp From | `+27600200825` | **No edits** to WA config |
| Staff copy | N/A this ship | **No copy changes** |

---

## Re-run commands (Coding agent — 2026-09-26 UTC)

### Local production build (`apps/guestflow`)

```bash
cd apps/guestflow
npm ci
npm run build
npm run start   # listens on :3100 per package.json
```

```bash
curl -sI http://127.0.0.1:3100/favicon.ico | head -8
```

**Observed (coding agent)**:

```http
HTTP/1.1 200 OK
Content-Type: image/x-icon
Content-Length: 15086
```

**ICO decode (remedia — must show Browns B, not noise)**:

```bash
python3 -c "from PIL import Image; Image.open('apps/guestflow/public/favicon.ico').convert('RGBA').save('/tmp/ico-32.png')"
# expect circular B emblem; sizes in ICO: 16, 32, 48
```

### Preview tip (Vercel SSO)

Anonymous `curl` to Preview returns **302 → Vercel SSO**. Use an authenticated browser session **or** a one-time share link from Vercel Deployment Protection (do not commit share tokens).

**Procedure used for automated Preview check**:

1. Obtain shareable Preview URL via Vercel (team member) — expires ~23h.
2. Hit share URL once to set `_vercel_jwt` cookie.
3. `curl -sI` `/favicon.ico` with cookie jar.

```bash
PREVIEW="https://browns-guestflow-git-cursor-gue-18a997-grants-projects-db46fb3a.vercel.app"
COOKIE="/tmp/vercel-preview-cookies.txt"
# Replace SHARE with current share token from Vercel (not stored in repo)
curl -sI -c "$COOKIE" "${PREVIEW}/?_vercel_share=SHARE" -o /dev/null
curl -sI -b "$COOKIE" "${PREVIEW}/favicon.ico" | head -12
```

**Observed on Preview tip (coding agent, 2026-09-26)**:

```http
HTTP/2 200
content-type: image/vnd.microsoft.icon
content-length: 14510
x-matched-path: /favicon.ico
```

Log: `/opt/cursor/artifacts/curl-preview-favicon-ico.txt` (agent VM; not in git).

### Icon metadata (HTML)

```bash
curl -s "$PREVIEW/staff-login" | grep -E 'rel="(icon|apple-touch-icon)"'
```

**Expected links**: `/favicon.ico`, `/icon-16.png`, `/icon-32.png`, `/apple-touch-icon.png` (180×180).

---

## Design job-script (peer — mark OK on Preview)

**Goal**: Confirm browser tab shows Browns circular **B** emblem (not generic globe) on both surfaces.

| Step | Action | Pass criterion |
| --- | --- | --- |
| D1 | Open Preview `/staff-login` (authenticated or share link) | Tab favicon = Browns emblem |
| D2 | Open Preview `/guest/demo` (or any `/guest/{code}` route) | Same emblem in tab |
| D3 | Optional: open `/favicon.ico` in tab | Renders emblem image |
| D4 | Compare to SoR | Matches `public/logos/the-browns-logo.png` emblem crop (no new mark) |

**Coding agent tab evidence (local build, same assets as Preview)**:

| Surface | Path | Artifact |
| --- | --- | --- |
| Staff login | `/staff-login` | `/opt/cursor/artifacts/staff-login-favicon-tab.png` |
| Guest portal | `/guest/demo` | `/opt/cursor/artifacts/guest-portal-favicon-tab.png` |
| Both tabs | — | `/opt/cursor/artifacts/both-tabs-favicon-evidence.png` |

**Design sign-off**: _______________  Date: __________  **PASS / FAIL**

---

## CI / ship loop

| Gate | Status |
| --- | --- |
| Vercel Preview deploy | **SUCCESS** (PR #247 checks) |
| Spec Kit `specs/031-guestflow-favicon-p2/` | **Converged** |
| VERIFY PACK (this file) | **Present** |
| Design PASS | **RE-PENDING** (remedia ICO; was FAIL on `1b04b3f`) |
| GFM Preview ACCEPT | **PENDING** — **MERGE HOLD** |

---

## Scope proof (no drive-by changes)

| Area | Touched? |
| --- | --- |
| `apps/guestflow/public/favicon*.ico`, `icon-*.png`, `apple-touch-icon.png` | Yes |
| `apps/guestflow/src/app/layout.tsx` (`metadata.icons` only) | Yes |
| `apps/guestflow/scripts/generate-favicon.mjs` | Yes |
| Redirect / outbound / Approve&Send / WA From | **No** |

---

## Remediation (this PR only)

If Design or GFM FAIL: fix on branch `cursor/guestflow-favicon-p2-5165`, re-run this VERIFY PACK, update PR — **no second Cloud Agent**.
