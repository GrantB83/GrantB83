import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function env(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    env("WHATSAPP_ACCESS_TOKEN") &&
      env("WHATSAPP_PHONE_NUMBER_ID") &&
      env("WHATSAPP_VERIFY_TOKEN"),
  );
}

export const paths = {
  knowledgeDir: path.resolve(here, "../knowledge"),
  dataDir: path.resolve(env("DATA_DIR", path.resolve(here, "../data"))),
};

export const config = {
  port: Number(env("PORT", "8080")),
  verifyToken: env("WHATSAPP_VERIFY_TOKEN", "dev-verify-token"),
  accessToken: env("WHATSAPP_ACCESS_TOKEN"),
  phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
  appSecret: env("WHATSAPP_APP_SECRET"),
  graphVersion: env("WHATSAPP_GRAPH_VERSION", "v23.0"),
  llmApiKey: env("LLM_API_KEY"),
  llmBaseUrl: env("LLM_BASE_URL", "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  llmModel: env("LLM_MODEL", "llama-3.3-70b-versatile"),
  handoffContact: env("HANDOFF_CONTACT", "stay@hospitality.partners / +27836458313"),
};
