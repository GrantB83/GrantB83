# Research: Sprint 2 Contact Details

## Decision: A&D xlsx is the contact source of record

- **Decision**: Keep the existing staff-upload / cron A&D ingest as the primary writer of phone and email. Persist email even when phone is absent. Classify relay domains.
- **Rationale**: `NB-contact-fields-sources.md` §1 and §7. Arrival blocks already have `Phone Number`, `Email`, `Phone Number 2`, `Email 2`. Excluding BLOCK rows, phone is effectively complete and email is mostly filled. Departure blocks have no contact columns.
- **Alternatives considered**: NB official API / PMS connector / Links Manager — ruled out (NB-activated, declined 3 Jan 2025). HTML scrape of Quick View / Edit Client — ruled out (no HTML scraping).

## Decision: Relay classification list

- **Decision**: Flag as relay (not missing, not direct): `@guest.booking.com`; any host ending `expediapartnercentral.com`; `@guest.airbnb.com` and `@reply.airbnb.com`; `@agoda-messaging.com`. Store the address; set `email_kind = relay`.
- **Rationale**: Research §5 and layered spec L2.2. Booking.com phone is usually real; email is a proxy. Relay is usable for OTA email, not as a CRM direct address.
- **Alternatives considered**: Treat relay as missing — rejected; outreach via the OTA mailbox still works. Invent a replacement — forbidden.

## Decision: Precedence (user + research, not layered L3 order)

- **Decision**: Per field: `arrivals_departures` (100) > `staff` (80) > `guest` (60) > `client_report` (40) > `stay_at` (20). A source may write only if the field is empty or the incoming rank is greater than or equal to the stored rank **and** the stored source is the same A&D source (A&D may refresh itself). Lower ranks never overwrite higher. stay@ may replace a *relay* A&D email only when the incoming address is a *direct* guest mailbox; it never replaces a direct A&D email.
- **Rationale**: Launch prompt: "A&D, then staff entry, then guest self-fill, then Client report, then stay@. Adjust only if the research doc says otherwise." Research §7 names A&D as SoR and stay@ as a speed layer, with staff/guest as the withheld-contact fallback. Layered spec L3 listed notes/history before staff; this package does not implement Notes LLM or history reuse.
- **Alternatives considered**: Layered L4 "first valid non-relay wins" without ranks — weaker for staff/guest protection. stay@ over A&D because it is earlier — rejected; A&D reflects the edited client record.

## Decision: Client report is gap-fill only

- **Decision**: Add a parse + import path (`mode=client_report` or dedicated cron route). Map labelled Name / Phone / Email / Booking ID columns. Apply with `client_report` rank only.
- **Rationale**: Research §5 row 5 and §7 item 5: useful for in-house or bulk backfill, not needed to replace A&D. Columns were unverified at research time; parser is header-driven and ignores unknown columns.
- **Alternatives considered**: Overwrite A&D from Client report — rejected by launch prompt.

## Decision: stay@ match is deterministic

- **Decision**: Match inbound stay@ (and guest mail to stay@) by (1) NB ref `NB-` 8–10 digits or 4-digit A&D booking id, (2) normalised guest name, (3) check-in/out dates in the body/subject. Require a unique booking. Capture `From` as `stay_at`.
- **Rationale**: Research §4 field labels and launch prompt "name/ref/dates". Fail closed on ambiguity (constitution II).
- **Alternatives considered**: Always attach sender to the UMI thread contact without a booking match — that can misfile. LLM parse of NB booking-notification tables — out of scope (parallel layered-sync work).

## Decision: Multi-room merge, not first-occurrence drop

- **Decision**: Rows that share `nightsbridge_booking_id` merge into one booking. Rooms accumulate on `suite_or_unit` (joined) and `extra_rooms`. Contacts apply once via precedence. UMI unique index on booking thread stays in force.
- **Rationale**: Research §6 caveat 4: booking 5667 dropped Cove. Launch prompt: one booker thread, contacts attach to the booking.
- **Alternatives considered**: One booking row per room — duplicates threads and contacts, violates UMI. Keep first room only — current bug.

## Decision: Additive schema, dry-run scripts, no Production writes

- **Decision**: `ensureContactSchema` adds `bookings.guest_email` and provenance columns plus `booking_contacts`. Scripts `migrate-sprint2-contacts.js` and `backfill-booking-contacts.js` default `--dry-run` and refuse Turso URLs unless `ALLOW_TURSO_WRITE=1` (never set in this package).
- **Rationale**: Safety constraints and launch prompt. Runtime ALTER matches Phase 17 / Phase 0 pattern so Preview can boot without a human migration.
- **Alternatives considered**: Edit `db.ts` CREATE TABLE only — existing Turso DBs would miss columns. Run backfill now — forbidden.

## Decision: guest_contacts source CHECK stays

- **Decision**: Do not alter `guest_contacts.source CHECK (nb|inbound|manual)`. Map provenance to those three (`arrivals_departures`/`client_report` → `nb`, `staff`/`guest` → `manual`, `stay_at` → `inbound`). Field-level truth lives on `booking_contacts`.
- **Rationale**: Changing a CHECK on a live table needs a rebuild. Principle V: extend, do not break allowlist.
- **Alternatives considered**: Recreate guest_contacts with new CHECK — migration risk, out of scope.
