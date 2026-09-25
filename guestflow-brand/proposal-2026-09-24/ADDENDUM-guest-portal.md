# Addendum — Guest portal brand scope
**Date:** 24 Sep 2026 CT  
**Status:** READY  
**Trigger:** Grant amendment via CoS — guest-facing portal IS in brand scope  
**Parent pack:** `/workspace/guestflow-brand/proposal-2026-09-24/`  
**Constraint:** Visual alignment only. No invent features / pages / guest PII. Same SoT tokens as staff.

## 1. Evidence — what exists
| Route / host | Evidence | Notes |
|---|---|---|
| `https://guestflow.thebrowns.co.za/guest/[code]` | Live + repo `app/guest/[code]/page.tsx` | Magic-link stay hub (SoR) |
| `/guest/login`, `/guest/stay`, `/guest/test-code` | Live screenshots 01–03 | Ungated → same “Unable to Access / Invalid access link” card |
| `https://stay.thebrowns.co.za` | Does not resolve | Prefer guestflow host until DNS/cert fixed (ops/infra) |

**Authenticated hub sections (source-evidenced — not inventable without magic link):**  
Stay summary · Wi-Fi · Access codes (time-gated) · Parking · Directions · House rules · Contact · Rebook/next-stay · Loading / Unable to Access empty-states

**GFM locked product-sensitive surfaces (visual only — no copy/gate/data invent):**  
1. Magic-link entry / expired  
2. Access codes SoR  
3. WiFi / network_ask_staff  
4. Stay summary  
5. Check-in chips/CTAs  
6. Contact handoff (+27600200825 / stay@)

## 2. Before shots
`screenshots/guest-portal/`
- `01-guest-login.png` — `/guest/login` invalid/empty
- `02-guest-stay-gated.png` — `/guest/stay` gated (same card)
- `03-guest-test-code-invalid.png` — `/guest/test-code` invalid

Authenticated hub with live guest data **not** captured (no invent tokens). Notes: `notes/guest-portal-ui-brand-notes.txt`

## 3. Gap vs SoT
| Sev | Gap |
|---|---|
| P0 | Pale cool-blue wash (~`#EAF7FE`) ≠ warm muted `#F6F5F3` / navy |
| P0 | No CI mark on empty-state; generic red home icon |
| P0 | Cyan link + sky-tinted chrome ≠ navy `#0A3775` / gold `#FAC72E` |
| P0 | Source hub uses multicolor section headers (blue/indigo/teal) ≠ navy/gold restraint |
| P1 | Sans-only H1 “Unable to Access” — needs Playfair; dense copy → Montserrat |
| P2 | stay.thebrowns.co.za unresolved — infra, not Design invent |

## 4. Proposed mocks (visual only)
| File | Surface |
|---|---|
| `mockups/guest-portal/01-guest-stay-hub-proposed.png` | Stay hub — navy + CI; Playfair H1; Montserrat cards; `[placeholder]` labels only |
| `mockups/guest-portal/02-guest-invalid-proposed.png` | Unable to Access — CI + Playfair H1 + Montserrat body |

## 5. Spec-Kit
**Phase 2b — Guest portal (M)** — Coding CA `bc-8b5078c2` (same PR preferred, after staff primary ops).  
Apply Phase 0 tokens to `/guest/[code]` loading, error, and hub sections. Restyle only. Magic-link auth + access-code time-gating unchanged.

## 6. GFM acceptance (add)
- [ ] Guest portal magic-link only; no staff chrome / redirect banner on `/guest/*`
- [ ] Six locked surfaces restyled only — no new cards/features/copy invent
- [ ] Playfair H1 / empty-state titles; Montserrat dense stay-packet UI
- [ ] CI / live mark on guest chrome; navy/gold/warm wash
- [ ] Design visual QA vs token board after Coding ships Phase 2b

## 7. Non-goals
Ads spend · auto-send · OUTBOUND mode change · Rivendell · inventing rates/PII · inventing portal pages · fixing stay.thebrowns.co.za DNS (separate infra)

*Addendum READY — Design → CoS + Coding.*
