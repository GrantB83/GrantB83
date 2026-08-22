import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../src/agent.js";
import type { Session } from "../src/types.js";

function blank(waId: string): Session {
  return {
    waId,
    businessId: null,
    messages: [],
    handoff: false,
    updatedAt: new Date().toISOString(),
  };
}

test("asks which brand when the message is vague", async () => {
  const decision = await decide("Hello", blank("1"));
  assert.match(decision.reply, /The Browns|Rivendell|Hospitality/i);
  assert.equal(decision.handoff, false);
});

test("answers The Browns with dates request and no invented price", async () => {
  const decision = await decide("I want to book The Browns this weekend, what is the rate?", blank("2"));
  assert.equal(decision.businessId, "the-browns");
  assert.match(decision.reply, /dates|adults|quote|availability/i);
  assert.doesNotMatch(decision.reply, /R\s?\d{3,}/);
});

test("hands off when the guest asks for Grant", async () => {
  const decision = await decide("I need to speak to Grant please", {
    ...blank("3"),
    businessId: "the-browns",
  });
  assert.equal(decision.handoff, true);
  assert.match(decision.reply, /person|Grant|stay@hospitality/i);
});
