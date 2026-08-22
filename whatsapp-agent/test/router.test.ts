import assert from "node:assert/strict";
import { test } from "node:test";
import { detectBusiness, wantsHandoff } from "../src/router.js";

test("routes Dullstroom suite language to The Browns", () => {
  assert.equal(detectBusiness("Can I book a guest suite in Dullstroom?"), "the-browns");
});

test("routes fly fishing to Rivendell", () => {
  assert.equal(detectBusiness("Is Hobbiton available for trout fishing?"), "rivendell");
});

test("routes medical aid to CrediMed", () => {
  assert.equal(detectBusiness("I need medical aid comparison via CrediMed"), "credimed");
});

test("detects human handoff", () => {
  assert.equal(wantsHandoff("Please let me speak to Grant"), true);
  assert.equal(wantsHandoff("What time is check in?"), false);
});
