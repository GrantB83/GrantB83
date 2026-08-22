import { config } from "./config.js";
import { getBrief, getBusiness, getCatalog } from "./knowledge.js";
import { completeJson } from "./llm.js";
import { detectBusiness, wantsHandoff } from "./router.js";
import type { AgentDecision, BusinessId, Session } from "./types.js";

const ASK_WHICH =
  "Welcome — this WhatsApp is Hospitality Partners (+27 83 645 8313). Are you enquiring about The Browns Luxury Guest Suites in Dullstroom, Rivendell Trout Estate (fly fishing near Lydenburg), Perfect Water, CrediMed, or AutoPost AI?";

function fallbackReply(text: string, businessId: BusinessId): string {
  const business = getBusiness(businessId);
  const lower = text.toLowerCase();
  if (businessId === "the-browns") {
    if (/(book|avail|rate|price|quote|weekend|night)/.test(lower)) {
      return "I can help with The Browns in Dullstroom (279 Blue Crane Drive). Please send your dates, number of adults and children, and whether you want a suite, a family combination, or the whole house. I will not guess rates — Grant or reservations will confirm availability and a quote here or at stay@hospitality.partners";
    }
    return "The Browns is four luxury ensuite suites (plus cottage) a short walk from Dullstroom village, with Wi-Fi, backup power/water, and Nespresso. Tell me dates and party size, or ask about a specific suite (Master, Loft, Garden, Cove).";
  }
  if (businessId === "rivendell") {
    return "Rivendell Trout Estate is self-catering cottages on the Spekboom River in the Finsbury Valley (Lydenburg), with fly fishing included. Which cottage (Hobbiton, Bag End, Mirkwood, Stone House, Bucklebury, Elvinbrook) and which dates should I pass to the team?";
  }
  if (businessId === "perfect-water") {
    return "I can log a Perfect Water request. Please send your name, area, product (refill / bottles / dispenser), quantity, and preferred time. Grant will confirm — I will not quote stock or prices.";
  }
  if (businessId === "credimed") {
    return "CrediMed helps compare South African medical-aid options; advice must come from an authorised broker. Share your name, dependants, and what you want to improve, and Grant will follow up.";
  }
  if (businessId === "autopost") {
    return "AutoPost AI drafts and reviews social posts (Facebook first, still in development). Share your business name and what you want automated, and Grant will reply.";
  }
  return ASK_WHICH;
}

function parseModel(raw: string): { businessId?: BusinessId; reply?: string; handoff?: boolean } {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return {};
  }
  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      businessId?: BusinessId;
      reply?: string;
      handoff?: boolean;
    };
  } catch {
    return {};
  }
}

export async function decide(text: string, session: Session): Promise<AgentDecision> {
  const catalog = getCatalog();
  const detected = detectBusiness(text, session);
  const handoffRequested = wantsHandoff(text) || session.handoff;

  if (!detected && !session.businessId && !handoffRequested) {
    const ids = new Set(catalog.businesses.map((item) => item.id));
    const prompt = `Classify this inbound WhatsApp into one business id or null if unclear.
Ids: ${[...ids].join(", ")}
Message: ${JSON.stringify(text)}
Return JSON: {"businessId":"the-browns"|null,"reply":null,"handoff":false}`;
    try {
      const raw = await completeJson(prompt);
      const parsed = raw ? parseModel(raw) : {};
      if (parsed.businessId) {
        return decideForBusiness(text, session, parsed.businessId, false);
      }
    } catch {
      // Rule-based fallback below.
    }
    return {
      businessId: catalog.defaultBusinessId,
      reply: ASK_WHICH,
      handoff: false,
      usedLlm: false,
    };
  }

  const businessId = detected ?? session.businessId ?? catalog.defaultBusinessId;
  return decideForBusiness(text, session, businessId, handoffRequested);
}

async function decideForBusiness(
  text: string,
  session: Session,
  businessId: BusinessId,
  handoffRequested: boolean,
): Promise<AgentDecision> {
  const business = getBusiness(businessId);
  if (handoffRequested) {
    return {
      businessId,
      reply: `I am passing this to a person now. ${business.name} — ${config.handoffContact}. Someone will continue on this chat.`,
      handoff: true,
      usedLlm: false,
    };
  }

  const history = session.messages
    .slice(-8)
    .map((item) => `${item.role}: ${item.content}`)
    .join("\n");
  const prompt = `Use only this knowledge. Never invent prices, availability, medical advice, or stock.

BUSINESS: ${business.name}
KNOWLEDGE:
${getBrief(businessId)}

HISTORY:
${history || "(none)"}

USER:
${text}

Return JSON:
{"businessId":"${businessId}","reply":"whatsapp-length helpful reply","handoff":false}
Set handoff true if the user needs a human (payment dispute, complaint, custom rate, legal/medical advice, or you lack a fact).`;

  try {
    const raw = await completeJson(prompt);
    const parsed = raw ? parseModel(raw) : {};
    if (parsed.reply) {
      return {
        businessId,
        reply: parsed.reply.slice(0, 1500),
        handoff: Boolean(parsed.handoff),
        usedLlm: true,
      };
    }
  } catch {
    // Use deterministic copy.
  }

  return {
    businessId,
    reply: fallbackReply(text, businessId),
    handoff: false,
    usedLlm: false,
  };
}
