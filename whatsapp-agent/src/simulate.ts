import { decide } from "./agent.js";
import { getSession, saveSession } from "./session.js";

const text = process.argv.slice(2).join(" ") || "Hi, I want to book The Browns this Friday";
const session = getSession("simulate-user");
const decision = await decide(text, session);
session.businessId = decision.businessId;
session.handoff = decision.handoff;
session.messages.push({ role: "user", content: text });
session.messages.push({ role: "assistant", content: decision.reply });
saveSession(session);
console.log(JSON.stringify({ input: text, ...decision }, null, 2));
