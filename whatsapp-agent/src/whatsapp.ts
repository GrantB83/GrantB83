import { config, isWhatsAppConfigured } from "./config.js";

export async function sendText(to: string, body: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.log(`[dry-run] WhatsApp to ${to}: ${body}`);
    return;
  }
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WhatsApp send ${response.status}: ${detail.slice(0, 500)}`);
  }
}

export async function markRead(messageId: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    return;
  }
  await fetch(
    `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    },
  ).catch(() => undefined);
}
