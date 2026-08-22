const { test } = require("node:test");
const assert = require("node:assert");
const { createStore } = require("../store");

test("addMessage + getHistory returns rows in order, respects limit", async () => {
  const store = createStore(":memory:");
  await store.addMessage("u1", "c1", "user", "hello");
  await store.addMessage("u1", "c1", "model", "hi there");
  await store.addMessage("u1", "c1", "user", "how are you");

  const all = await store.getHistory("u1", 10);
  assert.equal(all.length, 3);
  assert.equal(all[0].content, "hello");
  assert.equal(all[2].role, "user");

  const last2 = await store.getHistory("u1", 2);
  assert.equal(last2.length, 2);
  assert.equal(last2[0].content, "hi there");
  assert.equal(last2[1].content, "how are you");
});

test("history is scoped per user", async () => {
  const store = createStore(":memory:");
  await store.addMessage("u1", "c1", "user", "mine");
  await store.addMessage("u2", "c1", "user", "theirs");
  const h = await store.getHistory("u1", 10);
  assert.equal(h.length, 1);
  assert.equal(h[0].content, "mine");
});

test("clearUser wipes messages and facts for that user only", async () => {
  const store = createStore(":memory:");
  await store.addMessage("u1", "c1", "user", "a");
  await store.addMessage("u2", "c1", "user", "b");
  await store.addFact("u1", "likes ramen");
  await store.clearUser("u1");
  assert.equal((await store.getHistory("u1", 10)).length, 0);
  assert.equal((await store.getFacts("u1")).length, 0);
  assert.equal((await store.getHistory("u2", 10)).length, 1);
});

test("facts add and list", async () => {
  const store = createStore(":memory:");
  await store.addFact("u1", "fav anime is FMAB");
  await store.addFact("u1", "hates spoilers");
  const facts = await store.getFacts("u1");
  assert.deepEqual(facts, ["fav anime is FMAB", "hates spoilers"]);
});

test("scores upsert increments and leaderboard sorts desc", async () => {
  const store = createStore(":memory:");
  await store.addScorePoint("u1", "Alice");
  await store.addScorePoint("u1", "Alice");
  await store.addScorePoint("u2", "Bob");
  const top = await store.topScores(10);
  assert.equal(top.length, 2);
  assert.equal(top[0].uid, "u1");
  assert.equal(top[0].score, 2);
  assert.equal(top[0].name, "Alice");
  assert.equal(top[1].score, 1);
});

test("score upsert refreshes name on rename", async () => {
  const store = createStore(":memory:");
  await store.addScorePoint("u1", "OldName");
  await store.addScorePoint("u1", "NewName");
  const top = await store.topScores(10);
  assert.equal(top[0].name, "NewName");
  assert.equal(top[0].score, 2);
});

test("trimHistory keeps only newest N rows per user", async () => {
  const store = createStore(":memory:");
  for (let i = 0; i < 10; i++) {
    await store.addMessage("u1", "c1", i % 2 ? "model" : "user", `m${i}`);
  }
  await store.trimHistory("u1", 4);
  const h = await store.getHistory("u1", 100);
  assert.equal(h.length, 4);
  assert.deepEqual(h.map(r => r.content), ["m6", "m7", "m8", "m9"]);
});
