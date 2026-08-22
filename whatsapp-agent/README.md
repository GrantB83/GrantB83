# WhatsApp Cloud API agent (+27836458313)

Autonomous inbound assistant for **Hospitality Partners** (The Browns, Rivendell) plus Perfect Water, CrediMed, and AutoPost AI on one official WhatsApp Business number.

This talks to **Meta Cloud API only**. It does not drive WhatsApp Web. Cursor Cloud Agents and Grok Bot can develop and test this repo; they cannot be Meta’s 24/7 webhook host.

## What is already built

- Webhook verification and signature check
- Brand router (keywords + optional LLM)
- Knowledge-grounded replies (no invented rates)
- Human handoff (“speak to Grant”)
- Local simulation without Meta credentials

## What you must still do (cannot be done from this VM)

1. Keep WhatsApp Business for Android on **+27836458313** (v2.24.17+).
2. Connect the number to Cloud API with **Coexistence** so the phone app stays live. Meta only offers that path through a [Tech Provider / Solution Partner](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/). Cheapest practical option: Chatwoot Cloud WhatsApp inbox Embedded Signup → choose **Connect a WhatsApp Business App**. Do **not** add the number as a brand-new Cloud API line (that removes it from Android).
3. Copy secrets into `.env` / the host: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `LLM_API_KEY`.
4. Deploy this folder to Railway, Render, or Fly and set Meta’s callback to `https://YOUR-HOST/webhook/whatsapp`. Subscribe to `messages` (and `smb_message_echoes` if using Coexistence).

## Local check (no Meta)

```bash
cd whatsapp-agent
npm install
npm test
npm run simulate -- "Can I book The Browns in Dullstroom this Friday for two adults?"
```

## Run

```bash
cp .env.example .env
npm run build
npm start
```

Health: `GET /health`

## Safety

- Replies stay inside `/knowledge`. Update those files when rates or policies change.
- Group chats are not supported on Cloud API Coexistence.
- Messages you send yourself in the Android app are free; API replies are billed by Meta when they fall under Cloud API pricing.
