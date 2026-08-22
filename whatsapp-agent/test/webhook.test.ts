import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { extractMessages, verifySignature } from "../src/webhook.js";

test("extracts inbound text messages", () => {
  const messages = extractMessages({
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ profile: { name: "Sam" } }],
              messages: [
                {
                  from: "27820000000",
                  id: "wamid.1",
                  timestamp: "1",
                  type: "text",
                  text: { body: "Book Rivendell" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.text, "Book Rivendell");
});

test("validates Meta HMAC signatures", () => {
  const body = '{"ok":true}';
  const secret = "app-secret";
  const header = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  assert.equal(verifySignature(body, header, secret), true);
  assert.equal(verifySignature(body, header, "wrong"), false);
});
