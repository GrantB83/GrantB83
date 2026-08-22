export type BusinessId =
  | "hospitality"
  | "the-browns"
  | "rivendell"
  | "perfect-water"
  | "credimed"
  | "autopost";

export interface BusinessProfile {
  id: BusinessId;
  name: string;
  aliases: string[];
  keywords: string[];
  handoffEmail: string;
  website: string;
}

export interface Catalog {
  phoneNumber: string;
  operator: string;
  defaultBusinessId: BusinessId;
  businesses: BusinessProfile[];
}

export interface Session {
  waId: string;
  businessId: BusinessId | null;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  handoff: boolean;
  updatedAt: string;
}

export interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
  timestamp: string;
  name?: string;
}

export interface AgentDecision {
  businessId: BusinessId;
  reply: string;
  handoff: boolean;
  usedLlm: boolean;
}
