# Implementation Plan: GuestFlow Favicon P2

**Branch**: `cursor/guestflow-favicon-p2-5165` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

## Summary

Ship Browns emblem favicons for GuestFlow: commit `public/favicon.ico` plus PNG touch icons generated from approved raster `the-browns-logo.png` (emblem crop aligned with the live SVG pack). Wire `metadata.icons` in `apps/guestflow/src/app/layout.tsx` only. **MERGE HOLD until GFM ACCEPT after Design PASS on Preview.**

## Operator Job & Saleable DoD

| ID | Plan obligation |
| --- | --- |
| S1 | Tab shows Browns mark (staff + guest) |
| S2 | `/favicon.ico` 200 + image type; tab evidence staff login + guest portal |
| S3 | N/A static — file must exist |
| S4–S5 | N/A icon only |
| S6 | **No change**: Redirect ON; no guest sends; Approve&Send human; From `+27600200825` |
| S7 | N/A |
| S8 | `rel=icon` + `apple-touch-icon` sizes documented |
| S9 | Design Y on Preview mark |
| S10 | `curl -sI` + tab screenshots in PR |

## Technical Context

**Language/Version**: Next.js 14.2 App Router (`apps/guestflow`)

**Asset generation**: One-shot `sharp` + `to-ico` (dev-only); committed binaries in `public/`. Regenerate via `apps/guestflow/scripts/generate-favicon.mjs` after `npm install --no-save sharp to-ico`.

**Source of record**:

- Primary vector: `public/logos/thebrowns-logo-live_079f.svg` (symlink `thebrowns-logo-live.svg`)
- Raster for favicon crop: `public/logos/the-browns-logo.png` — square crop of navy/gold circular “B” emblem (no wordmark bar)

**Metadata location**: `export const metadata` in `apps/guestflow/src/app/layout.tsx` — `icons.icon` + `icons.apple`

**Static serving**: `public/favicon.ico` → `GET /favicon.ico` (middleware already excludes `favicon.ico`)

**Testing**: `npm run build` in `apps/guestflow`; `curl -sI` on Preview/local; browser tab screenshots for `/staff-login` and guest portal

**Constraints**: No layout chrome changes; no middleware/redirect edits; no auth or send-path edits

## Constitution Check

| Principle | Status |
| --- | --- |
| Human-Gated Guest Send | PASS — no send changes |
| Fail-Closed Facts | PASS — brand from approved files only |
| Extend Live Systems | PASS — static assets + metadata |
| Channel Identity Freeze | PASS — WA From untouched |

## Project Structure

```text
apps/guestflow/
├── public/
│   ├── favicon.ico
│   ├── icon-16.png
│   ├── icon-32.png
│   └── apple-touch-icon.png
├── scripts/generate-favicon.mjs
└── src/app/layout.tsx          # metadata.icons only

specs/031-guestflow-favicon-p2/
├── spec.md
├── plan.md
├── tasks.md
├── research.md
├── quickstart.md
└── checklists/requirements.md
```

## Proxy acceptance criteria

| Check | Method |
| --- | --- |
| `/favicon.ico` 200 | `curl -sI $PREVIEW/favicon.ico` |
| Icon link tags | View page source on `/staff-login` |
| Operator job | Tab screenshots staff login + guest portal |
| Locks unchanged | Plan note only; no code in redirect/send paths |
| Design | Preview URL in PR; MERGE HOLD for GFM |

## Phase 0 — Research

See [research.md](./research.md): Prod 404 root cause, crop parameters, Next metadata pattern.

## Phase 1 — Implementation

1. Generate and commit favicon binaries
2. Add `metadata.icons` to root layout
3. Self-check curl + browser evidence on Preview
