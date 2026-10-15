import test from "node:test";
import assert from "node:assert/strict";
import { create, actions, step } from "../engine.mjs";
import * as model from "../player-model.mjs";
import { Settings } from "../../naopoyo/settings.mjs";
import { SlideStore } from "../player-store.mjs";
const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
};
const initial = () => create(3, { count: 30, single: 2, bulk: 6 });
const species = ["dog", "penguin", "mushroom"];
test("one-step undo restores resources, survives reload, time never rewinds", () => {
  let p = model.newRun(initial(), species, "proof-D-cluster-3.json", "test");
  const before = structuredClone(p.state);
  model.advance(p, actions(p.state)[0]);
  p.elapsedMs = 1234;
  assert.equal(model.undo(p, false), false);
  assert.equal(p.practice, false);
  assert.equal(model.undo(p, true), true);
  assert.deepEqual(p.state, before);
  assert.equal(p.elapsedMs, 1234);
  assert.equal(p.practice, true);
  assert.equal(model.undo(p, true), false);
  model.advance(p, actions(p.state)[0]);
  p = model.restore(JSON.parse(JSON.stringify(p)), species);
  assert.equal(model.undo(p, true), true);
  assert.equal(p.practice, true);
});
test("invalid operation never replaces undo state or spends resources", () => {
  const p = model.newRun(initial(), species, "proof-D-cluster-3.json", "test");
  model.advance(p, actions(p.state)[0]);
  const before = structuredClone(p);
  assert.equal(
    model.advance(p, { type: "bulk", from: 0, kind: 0 }).valid,
    false,
  );
  assert.deepEqual(p, before);
});
test("all four valid operation kinds restore exactly including chains", () => {
  for (const type of ["slide", "egg", "single", "bulk"]) {
    const s = initial();
    s.gauge = 24;
    const p = model.newRun(s, species, "x", "test");
    const a = actions(s).find((a) => a.type === type);
    assert.ok(a);
    const expected = step(s, a).state;
    model.advance(p, a);
    assert.deepEqual(p.state, expected);
    model.undo(p, true);
    assert.deepEqual(p.state, s);
  }
});
test("restore rejects locked species and inconsistent undo", () => {
  const p = model.newRun(initial(), species, "x", "test");
  assert.throws(() => model.restore(p, ["dog"]));
  model.advance(p, actions(p.state)[0]);
  p.previous.state.gauge = 999;
  assert.throws(() => model.restore(p, species));
});
test("records are separated and deduplicated, stale writer cannot overwrite", () => {
  const storage = memory(),
    a = new SlideStore(storage),
    b = new SlideStore(storage);
  a.load();
  b.load();
  const p = model.newRun(initial(), species, "x", "test");
  p.practice = true;
  a.save(p, {
    id: p.id,
    practice: true,
    won: true,
    moves: 4,
    elapsedMs: 50,
    score: 100,
    deaths: 1,
  });
  a.save(p, {
    id: p.id,
    practice: true,
    won: true,
    moves: 4,
    elapsedMs: 50,
    score: 100,
    deaths: 1,
  });
  assert.equal(a.load().practice.plays, 1);
  assert.equal(a.load().normal.plays, 0);
  assert.throws(() => b.save(null));
});
test("three favorite sets preserve five unlocked species and selected three", () => {
  const storage = memory(),
    allowed = ["dog", "penguin", "clownfish", "mushroom", "butterfly", "cat"];
  const s = new Settings(storage, allowed);
  let d = s.load();
  assert.equal(d.sets.length, 3);
  assert.equal(d.sets[0].length, 5);
  d.sets[1] = allowed.slice(1);
  d.active = 1;
  d.slide = allowed.slice(1, 4);
  s.save(d);
  assert.deepEqual(s.load(), d);
  d.sets[0][0] = "secret";
  assert.throws(() => s.save(d));
  assert.equal(storage.getItem("naotocchi-save-v1"), null);
});
