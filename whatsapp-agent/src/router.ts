import { getCatalog } from "./knowledge.js";
import type { BusinessId, Session } from "./types.js";

const HANDOFF_RE =
  /\b(human|person|agent|owner|manager|grant|speak to someone|talk to someone|call me|please call)\b/i;

export function wantsHandoff(text: string): boolean {
  return HANDOFF_RE.test(text);
}

export function detectBusiness(text: string, session?: Session | null): BusinessId | null {
  const hay = text.toLowerCase();
  const scored = getCatalog().businesses.map((business) => {
    const needles = [...business.keywords, ...business.aliases, business.name.toLowerCase()];
    const hits = needles.filter((needle) => hay.includes(needle.toLowerCase())).length;
    return { id: business.id, hits };
  });
  scored.sort((a, b) => b.hits - a.hits);
  if (scored[0] && scored[0].hits > 0) {
    return scored[0].id;
  }
  return session?.businessId ?? null;
}
