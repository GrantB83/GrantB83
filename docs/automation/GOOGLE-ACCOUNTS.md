# Link every Google account (Gmail, Drive, Calendar)

**Goal:** Every Brown Google login is reachable by Grok Bots **and** by Cursor Cloud Agents. One hub mailbox is not enough. School mail is already missing from `grant830318@gmail.com` (zero `austinisd.org` in 90 days). Drive roots are owned by more than one login.

**Do not** put passwords, OAuth tokens, or recovery codes in git or chat. Grant signs in on the Grok Bot computer or Cursor OAuth card himself.

**Related:** `google-accounts.yaml`, `entity-map.yaml`, gate `G1`.

---

## 1. Why “all accounts”, not one hub

| Login | Why a hub-only design fails |
| --- | --- |
| `grant830318@gmail.com` | Connected today (Gmail + Calendar MCP). Personal + forwarded mix. **Not** where AISD mail lives. |
| `thebrownsusa@gmail.com` | US household Drive (Receipts, School files, Tax Emigration folder owner). Liana uses this address on school/PTA shares. **Must** be a first-class Gmail + Drive + Calendar link. |
| `grant@hospitality.partners` | Owns Drive root **The Browns USA**. Calendar/Drive actions on that tree need this login or an explicit share. |
| `grant@thebrowns.co.za` | **Not a Google login.** Forwards all mail to `grant830318@gmail.com`. Hiver + send-as already on the hub. Do not Add account. |
| `stay@hospitality.partners` | Reservations. Forwarding is visible on the hub; native link needed if Stay must send as stay@. |
| `accounts@bvrgroup.co.za` | **Not a Google login.** Forwards to `grant@bvrgroup.co.za` (already signed in). Do not Add account. |
| `grant@hmsand.co.za` | **Not a Google login.** Forwards to `grant830318@gmail.com`. Do not Add account. |
| `mail@hmsand.co.za` | Live **sender**. Confirm whether it is a Google login or a catch-all. If it is a login, link it. |
| Liana personal (if not `thebrownsusa`) | School / medical / PTA. Ask once; do not guess. |

Also link **any extra Google login Grant names** with:

`APPROVE GOOGLE ACCOUNT <email> gmail,drive,calendar`

---

## 2. Three layers (use all three)

Grok Bot plugins are **account-wide** (one authorize is shared by every Bot). Official docs do **not** promise multiple concurrent Gmail OAuth identities. Treat plugins as **one login per plugin type** unless the UI shows “Add another account”.

### Layer A — Grok Bot Plugins (shared by all Bots)

1. Grok Bot → **Plugins** → add **Gmail**, **Google Drive**, **Google Calendar**.
2. Authorize. If the UI offers **Add another account**, add **every** row in `google-accounts.yaml` with `google_login: true`.
3. If adding a second Gmail **replaces** the first token: keep the hub (`grant830318@gmail.com`) on the plugin and use Layer B + C for the rest. Do not bounce the token every morning.

### Layer B — Grok Bot computer browser (this is how ALL logins are guaranteed)

Sessions persist on the shared Bot computer and are available to every Bot.

1. Open the desktop Grok Bot computer → browser.
2. Go to `mail.google.com`, `drive.google.com`, `calendar.google.com`.
3. Sign in **every** Google login (Google avatar → Add account). Grant types the password; the Bot does not see it.
4. Leave all accounts signed in. Do not use Incognito.
5. Standing instruction: “When you need mailbox/drive/calendar X, switch the Google avatar to X before you act.”

This is the required path for `thebrownsusa@gmail.com`, `grant@hospitality.partners`, and every Workspace login the plugin cannot hold at once.

### Layer C — Share / forward / send-as (so Cloud Agents and $0 filters still work)

Cursor Cloud MCP on this environment is **one OAuth identity** (`grant830318@gmail.com` today). Cloud Agents will not see other mailboxes unless:

1. **Gmail:** Forward (or Google Workspace delegation) from each native mailbox → hub, **and/or** Grant adds another Gmail MCP connection after `APPROVE GOOGLE ACCOUNT`.
2. **Calendar:** Share every calendar with the hub as **Make changes to events** (or add the calendar to the hub’s calendar list). Family events stay on calendar `Family` in `America/Chicago`.
3. **Drive:** Share each business/household root with the hub as **Editor** (`H4` if sharing outside Grant/Liana). Prefer this over agent-led bulk copy.

Layer C is **in addition to** Layer B, not a substitute for Stay sending as stay@ or Family reading thebrownsusa natively.

---

## 3. Click path (Grant)

### 3.1 Grok Bot (all Bots inherit this)

| Step | Where | What |
| --- | --- | --- |
| 1 | Plugins | Connect Gmail, Drive, Calendar as hub |
| 2 | Plugins | Add another account **if the UI allows** — every `google_login: true` |
| 3 | Bot computer browser | Sign in every remaining Google login (Layer B) |
| 4 | Each specialist Bot | Paste the amend prompt; name the logins that Bot may use |
| 5 | Reply here | `APPROVE GOOGLE ACCOUNT <email> gmail,drive,calendar` per account you actually signed in |

### 3.2 Cursor Desktop / Cloud environment (this repo)

| Step | Where | What |
| --- | --- | --- |
| 1 | Cursor Settings → MCP | Confirm Gmail, Drive, Calendar show **ready** for the hub |
| 2 | After `G1` | Add a **second** Google MCP connection per extra login, **or** complete Layer C shares so the hub MCP can see them |
| 3 | Do not | Paste refresh tokens into `AGENTS.md` or chat |

### 3.3 Gmail / Workspace admin (per mailbox)

For each native mailbox that must stay independent:

1. Gmail Settings → **Accounts** → **Add another email address** (send-as) on the hub if Stay/Aqua/Yard must draft from that address.
2. Gmail Settings → **Forwarding** → forward inbound to hub **or** Workspace delegation (read).
3. Calendar Settings → **Share with specific people** → hub + Liana as needed.
4. Drive → share the entity root with hub + Liana.

Do not skip inbox on family FYI until `APPROVE FAMILY FILE`.

---

## 4. Which Bot uses which login

| Plan role | Gmail logins | Drive logins / roots | Calendars |
| --- | --- | --- | --- |
| family | `thebrownsusa@gmail.com` (primary), hub only for `Family/*` labels | The Browns USA (owners: `grant@hospitality.partners`, `thebrownsusa@gmail.com`) | `Family`, `School Holidays`; write in `America/Chicago` |
| ops-chief | hub (includes forwarded `grant@thebrowns.co.za`) | sees all shared roots; does not bulk-move | primary + Private (read); does not write Private daily routine |
| stay | `stay@`, `grant@hospitality.partners`; thebrowns.co.za mail on hub | hospitality roots when they exist | hospitality / property calendars once named |
| aqua | `grant@bvrgroup.co.za` (includes forwarded `accounts@`) | PW root when created | `PW Technical Schedule` |
| yard | hub (includes forwarded `grant@hmsand.co.za`); `mail@hmsand.co.za` is a sender | HM root when created | none yet |
| vault | hub Finance/Tax + CIPC | Properties, Legal; **filenames only** on Tax Emigration / Last Will | proposed reminders only until `H5` |

---

## 5. Cursor Cloud vs Grok Bot (do not collapse)

| Surface | Gmail | Drive | Calendar |
| --- | --- | --- | --- |
| **This Cloud Agent** | MCP = hub only today | MCP sees files shared with hub, including The Browns USA | MCP = calendars on hub list |
| **Grok Bot plugin** | One OAuth unless “Add account” works | Same | Same |
| **Grok Bot browser** | All signed-in Google avatars | All | All |
| **$0 filters** | Must exist **on the mailbox that actually receives the mail** (AISD → thebrownsusa, not only hub) | — | — |

Family filters in `family-filters.yaml` must be created on **`thebrownsusa@gmail.com`** (and Liana if that is a third mailbox), not only on the hub. Hub filters never see AISD if AISD never arrives there.

---

## 6. Approval phrases

| Phrase | Effect |
| --- | --- |
| `APPROVE GOOGLE ACCOUNT <email> gmail` | Agents may use that mailbox (plugin, browser, or MCP) |
| `APPROVE GOOGLE ACCOUNT <email> drive` | Agents may use that Drive identity / roots |
| `APPROVE GOOGLE ACCOUNT <email> calendar` | Agents may read/write calendars on that login after `H5`/`S11` |
| `APPROVE GOOGLE ACCOUNT <email> gmail,drive,calendar` | All three for that login |
| `GOOGLE ACCOUNTS: <email>, <email>, …` | Grant names extra logins not in the yaml |

Still never: payments (`N1`), statutory submit (`N2`), medical/will bodies (`N3`).

---

## 7. Done when

Every `google_login: true` row in `google-accounts.yaml` has `link.grok_bot` and `link.cursor_mcp` not `missing`, **or** Layer C share/forward is `live` and STATUS says so.

Labour this removes: “which inbox was the school form in?” and “Drive search only sees one Google user.”
