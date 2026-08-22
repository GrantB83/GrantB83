import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "./types.js";

export function verifySignature(rawBody: string, header: string | undefined, appSecret: string): boolean {
  if (!appSecret) {
    return true;
  }
  if (!header?.startsWith("sha256=")) {
    return false;
  }
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const actual = header.slice("sha256=".length);
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface WebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type?: string;
          text?: { body?: string };
        }>;
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
      };
    }>;
  }>;
}

export function extractMessages(body: unknown): IncomingMessage[] {
  const payload = body as WebhookBody;
  const out: IncomingMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const name = value?.contacts?.[0]?.profile?.name;
      for (const message of value?.messages ?? []) {
        if (message.type && message.type !== "text") {
          out.push({
            from: message.from,
            text: `[${message.type} received — please type your question]`,
            messageId: message.id,
            timestamp: message.timestamp,
            name,
          });
          continue;
        }
        const text = message.text?.body?.trim();
        if (!text) {
          continue;
        }
        out.push({
          from: message.from,
          text,
          messageId: message.id,
          timestamp: message.timestamp,
          name,
        });
      }
    }
  }
  return out;
}
