import Fastify from "fastify";
import { decide } from "./agent.js";
import { config } from "./config.js";
import { getSession, saveSession } from "./session.js";
import { extractMessages, verifySignature } from "./webhook.js";
import { markRead, sendText } from "./whatsapp.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    done(null, body);
  });

  app.get("/health", async () => ({ ok: true, service: "whatsapp-agent" }));

  app.get("/webhook/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    if (query["hub.mode"] === "subscribe" && query["hub.verify_token"] === config.verifyToken) {
      return reply.type("text/plain").send(query["hub.challenge"] ?? "");
    }
    return reply.code(403).send("Forbidden");
  });

  app.post("/webhook/whatsapp", async (request, reply) => {
    const raw =
      typeof request.body === "string" ? request.body : JSON.stringify(request.body ?? {});
    const signature = request.headers["x-hub-signature-256"];
    if (
      !verifySignature(raw, Array.isArray(signature) ? signature[0] : signature, config.appSecret)
    ) {
      return reply.code(401).send("Invalid signature");
    }
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const incoming = extractMessages(body);
    for (const message of incoming) {
      const session = getSession(message.from);
      const decision = await decide(message.text, session);
      session.businessId = decision.businessId;
      session.handoff = decision.handoff;
      session.messages.push({ role: "user", content: message.text });
      session.messages.push({ role: "assistant", content: decision.reply });
      session.messages = session.messages.slice(-20);
      saveSession(session);
      await markRead(message.messageId);
      await sendText(message.from, decision.reply);
    }
    return reply.code(200).send({ received: incoming.length });
  });

  return app;
}
