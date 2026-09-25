# Seed source list (PR)

Every non-empty seed value in this package traces to an in-repo source. Demo fixtures under `tools/browns-guest-facts-pack/fixtures/` are **excluded** (conflicting addresses, demo phones).

## WhatsApp templates

| Template | Category | Body / var source |
|----------|----------|-------------------|
| `browns_pre_arrival_welcome` | Utility | Structure and phrases from `specs/012-guestflow-cottage-falcon-v1/template-source.txt` and `apps/guestflow/src/app/api/welcome-drafts/route.ts` (`generateWelcomeMessage`) |
| `browns_checkin_instructions` | Utility | Falcon check-in 14:00, gate “drive through”, housekeepers at 279 until 5 PM, parking cottage line from Falcon / `.env.example` `PROPERTY_PARKING_COTTAGE` |
| `browns_access_codes` | Utility | Variable slots only; live values from access-codes SoR at send time. No codes hardcoded in the seed body |
| `browns_mid_stay_checkin` | Utility | Offer-to-help wording only; no invented restaurants/amenities (P knowledge is injected into drafts, not this template) |
| `browns_checkout_reminder` | Utility | Check-out 10:00 from guest portal `stayPacket.checkOut.by` in `apps/guestflow/src/app/api/guest-portal/[code]/route.ts` |
| `browns_post_stay_thank_you` | Marketing | Thank-you + required STOP footer; no invented offers |
| `browns_review_request` | Marketing | Guest name `{{1}}`; review URL **static** `https://g.page/r/CZafj2WHDxDjEBM/review` from `GuestFlow-WA-template-approvals.md` (Grant 24 Sep 2026 18:53 CT). STOP footer |

Language: `en` for all. Status: `approved_by_grant_unsubmitted`. No Content SIDs.

Note: The attached tracker file listed names, categories, Grant approval, and the review URL. It did **not** include full bodies. Bodies above are assembled from existing Grant-facing copy, not new marketing.

## Property knowledge

| Property | Section | Key | Seeded value | Source |
|----------|---------|-----|--------------|--------|
| shared | checkin_checkout | check_in_from | From 14:00 | Falcon `template-source.txt` L7; portal `stayPacket.checkIn.from`; welcome-drafts |
| shared | checkin_checkout | check_out_by | 10:00 | portal `stayPacket.checkOut.by`; `DRAFT_PROMPT.md` |
| shared | house_rules | quiet_hours | 22:00–07:00 | portal `houseRules` |
| shared | house_rules | no_smoking_inside | No smoking inside the suites | portal `houseRules` |
| shared | house_rules | respect_property | Please respect the property and fellow guests | portal `houseRules` |
| shared | house_rules | housekeepers_until | Housekeepers available at 279 Blue Crane Drive until 5 PM | Falcon L18; portal `houseRules` |
| shared | house_rules | gate_drive_through | Once the gate has opened please drive through. Do not wait in the gate. | Falcon L15 |
| shared | contact_escalation | guest_email | stay@thebrowns.co.za | `.env.example` `PROPERTY_EMAIL` / `PROPERTY_CONTACT_EMAIL` |
| shared | contact_escalation | ops_whatsapp | +27600200825 | `.env.example` `PROPERTY_OPS_WHATSAPP`; constitution IV |
| shared | contact_escalation | property_label | The Browns Luxury Guest Suites, Dullstroom, South Africa | `DRAFT_PROMPT.md`; ticket-playbooks `BROWNS_KNOWN_FACTS` |
| cottage | checkin_checkout | display_name | The Browns' Cottage Suites | `.env.example` `PROPERTY_NAME_COTTAGE` |
| cottage | checkin_checkout | address | 278 Blue Crane Drive, Dullstroom | Falcon L8; `.env.example` `PROPERTY_ADDRESS_COTTAGE` |
| cottage | checkin_checkout | maps_url | https://maps.app.goo.gl/m8WeQe56Fd9AKqpa8 | Falcon L9; `.env.example` `PROPERTY_MAPS_URL_COTTAGE` |
| cottage | amenities | parking | Park left of the entrance gate or further into the garden on the lawn. Do not obstruct other guests. | Falcon L16; `.env.example` `PROPERTY_PARKING_COTTAGE` |
| main-house | checkin_checkout | display_name | The Browns' Luxury Suites | `.env.example` `PROPERTY_NAME_MAIN` |
| main-house | checkin_checkout | address | 279 Blue Crane Drive, Dullstroom | `.env.example` `PROPERTY_ADDRESS_MAIN`; Falcon L18 “next door” |
| main-house | checkin_checkout | maps_url | ask staff | `.env.example` `PROPERTY_MAPS_URL_MAIN` empty |
| main-house | amenities | parking | ask staff | `.env.example` `PROPERTY_PARKING_MAIN` empty |

## Explicitly not seeded (ask staff / empty)

- Local restaurants, activities, fly-fishing spots, shops, driving distances (no trusted in-repo list; demo fixtures discarded)
- WiFi SSID/password (access-codes SoR only; never hardcoded)
- Gate / lockbox codes (SoR only)
- Fireplace/wood, braai, heating, kitchen items, extra towels/linen (no verified source)
- Personal / housekeeper mobile numbers from Falcon (`+27836458313`, Zandile) — NeedsGrant / observe-only
- Loadshedding status from 2023 Falcon text (stale)

## Eval fixture

Ten questions in `apps/guestflow/__tests__/fixtures/kb-eval-questions.json` mix known times/addresses with unknown restaurant/amenity asks so GFM can confirm drafts say ask staff on gaps.
