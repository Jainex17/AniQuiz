const { test } = require("node:test");
const assert = require("node:assert");
const { buildSystemPrompt, buildContents } = require("../persona");

test("system prompt includes requester name, facts and roster", () => {
  const p = buildSystemPrompt({
    requester: { name: "Jainex", roles: ["Admin", "Weeb"], joined: "2023-01-05" },
    roster: [{ name: "Jainex", topRole: "Admin" }, { name: "Miku", topRole: "@everyone" }],
    facts: ["fav anime is FMAB"],
  });
  assert.ok(p.includes("Jainex"));
  assert.ok(p.includes("Admin"));
  assert.ok(p.includes("fav anime is FMAB"));
  assert.ok(p.includes("Miku"));
  assert.match(p, /Aniquiz/i);
});

test("requester appears in prompt even when not in roster", () => {
  const p = buildSystemPrompt({
    requester: { name: "Zed", roles: [], joined: null },
    roster: [{ name: "OtherGuy", topRole: "x" }],
    facts: [],
  });
  assert.ok(p.includes("Zed"));
});

test("buildContents maps history to gemini format with current message last", () => {
  const history = [
    { role: "user", content: "Alice: hi" },
    { role: "model", content: "hello!" },
  ];
  const c = buildContents(history, "Bob: sup");
  assert.equal(c.length, 3);
  assert.equal(c[0].role, "user");
  assert.equal(c[1].role, "model");
  assert.equal(c[2].role, "user");
  assert.equal(c[2].parts[0].text, "Bob: sup");
});

test("buildContents merges consecutive same-role rows", () => {
  const history = [
    { role: "user", content: "a" },
    { role: "user", content: "b" },
    { role: "model", content: "c" },
  ];
  const c = buildContents(history, "d");
  assert.equal(c.length, 3);
  assert.equal(c[0].parts[0].text, "a\nb");
});

test("buildContents drops leading model row so turn starts with user", () => {
  const history = [
    { role: "model", content: "orphan reply" },
    { role: "user", content: "hi" },
  ];
  const c = buildContents(history, "yo");
  assert.equal(c[0].role, "user");
  assert.equal(c.length, 2);
});

test("buildContents works with empty history", () => {
  const c = buildContents([], "only msg");
  assert.equal(c.length, 1);
  assert.equal(c[0].role, "user");
});
