import test from "node:test";
import assert from "node:assert/strict";
import * as core from "../../naopoyo-v2/engine.mjs";
const fixture = () => ({
  id: "T",
  w: 8,
  h: 8,
  actors: [{ id: "a", x: 1, y: 3, level: 4, species: "dog" }],
  walls: [],
  spikes: [],
  gates: [],
  exits: [{ x: 7, y: 7 }],
  gravity: false,
});
test("external split API reuses v2 allocation and conserves mass", () => {
  assert.equal(typeof core.externalSplit, "function");
  const s = core.createState(fixture());
  const r = core.externalSplit(s, "a", 2, 1, 0);
  assert.equal(r.split, 2);
  assert.equal(core.mass(s), 4);
  assert.equal(s.actors.length, 3);
});
test("optional passability applies to normal, gravity, and split placement", () => {
  const s = core.createState(fixture());
  const policy = { canEnter: (s, a, x, y) => x < 2 };
  assert.equal(core.move(s, "a", 1, 0, policy).ok, false);
});
const runtime = await import("../session.mjs").catch(() => ({}));
const make = (extra = {}) =>
  new runtime.WorldSession({
    ...fixture(),
    water: [],
    guests: [],
    events: [],
    ...extra,
  });
test("wave pushes held actor once; drag continues relative to new position; Undo includes clock", () => {
  assert.equal(typeof runtime.WorldSession, "function");
  const q = make({
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        offset: 0,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  });
  q.begin("a", { x: 1.5, y: 3.5 });
  q.advance(200);
  assert.equal(q.state.actors[0].x, 2);
  q.travel({ x: 2.5, y: 3.5 });
  assert.equal(q.state.actors[0].x, 3);
  q.end();
  q.undo();
  assert.equal(q.state.actors[0].x, 1);
  assert.equal(q.time, 0);
});
test("fish only terrain applies to forced moves", () => {
  const q = make({
    water: [[2, 3]],
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  });
  q.advance(200);
  assert.equal(q.state.actors[0].x, 1);
  q.state.actors[0].species = "fish";
  q.advance(1000);
  assert.equal(q.state.actors[0].x, 2);
});
test("beam once per irradiation including children and newly entering bodies", () => {
  const q = make({
    events: [
      {
        id: "l",
        kind: "beam",
        period: 1000,
        warn: 200,
        on: 300,
        cells: [
          [1, 3],
          [2, 3],
        ],
        power: 2,
      },
    ],
  });
  q.advance(200);
  assert.equal(q.state.actors.length, 3);
  q.advance(100);
  assert.equal(q.state.actors.length, 3);
  assert.equal(core.mass(q.state), 4);
});
test("clock partition, snapshot resume, pause, retry are deterministic", () => {
  const e = {
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  };
  const a = make(e),
    b = make(e);
  a.advance(1500);
  for (let i = 0; i < 150; i++) b.advance(10);
  assert.deepEqual(a.snapshot(), b.snapshot());
  const c = new runtime.WorldSession(
    { ...fixture(), water: [], guests: [], ...e },
    a.serialize(),
  );
  a.advance(400);
  c.advance(400);
  assert.deepEqual(a.snapshot(), c.snapshot());
  c.paused = true;
  c.advance(5000);
  assert.equal(c.time, 1900);
  c.retry();
  assert.equal(c.time, 0);
});
test("nonoperable guests reject begin and block ordinary movement", () => {
  const q = make({ guests: [{ id: "owl", x: 2, y: 3, operable: false }] });
  assert.equal(q.begin("owl", { x: 2.5, y: 3.5 }), false);
  q.begin("a", { x: 1.5, y: 3.5 });
  q.travel({ x: 2.5, y: 3.5 });
  assert.equal(q.state.actors[0].x, 1);
});
test("Undo of idle autonomous event pauses before replay", () => {
  const q = make({
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  });
  q.advance(200);
  q.undo();
  const before = q.snapshot();
  q.advance(16);
  assert.deepEqual(q.snapshot(), before);
});
test("deferred chamfer entry is independent of sample frequency", () => {
  const q = make();
  q.begin("a", { x: 1.5, y: 3.5 });
  q.travel({ x: 2.01, y: 3.01 });
  q.travel({ x: 2.5, y: 3.5 });
  assert.equal(q.state.actors[0].x, 2);
});
test("restore rejects changed aquatic rules and impossible terrain", () => {
  const q = make({ water: [[2, 3]] });
  const raw = JSON.parse(q.serialize());
  raw.current.state.actors[0].x = 2;
  assert.equal(q.restore(raw), false);
  raw.current.state.actors[0].x = 1;
  raw.current.state.aquatic = ["fish", "dog"];
  assert.equal(q.restore(raw), false);
});
test("wave merges without losing held active identity", () => {
  const q = make({
    actors: [
      { id: "a", x: 2, y: 3, level: 4, species: "dog" },
      { id: "b", x: 1, y: 3, level: 5, species: "dog" },
    ],
    walls: [[3, 3]],
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  });
  q.begin("a", { x: 2.5, y: 3.5 });
  q.advance(200);
  assert.equal(q.state.actors.find((a) => a.id === "a").level, 8);
  assert.equal(q.state.actors.find((a) => a.id === "b").level, 1);
  assert.equal(core.mass(q.state), 9);
  assert.equal(q.active.id, "a");
});
test("wave onto spike uses v2 partial split and mass", () => {
  const q = make({
    spikes: [{ x: 2, y: 3, power: 3 }],
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  });
  q.advance(200);
  assert.equal(q.state.actors.length, 4);
  assert.equal(core.mass(q.state), 4);
});
test("gravity respects water policy and external split families", () => {
  const s = core.createState({ ...fixture(), gravity: true, water: [[1, 4]] });
  const policy = { canEnter: (s, a, x, y) => !(x === 1 && y === 4) };
  core.externalSplit(s, "a", 2, 1, 0, policy);
  assert.ok(s.actors.every((a) => a.x !== 1 || a.y !== 4));
  assert.equal(core.mass(s), 4);
});
test("nonfish split children never spawn in water", () => {
  const q = make({
    water: [
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [1, 4],
      [2, 2],
      [2, 3],
      [2, 4],
    ],
  });
  core.externalSplit(q.state, "a", 3, 1, 0, q.policy());
  assert.equal(q.state.actors.length, 1);
});
test("wave stops at rock and incompatible numeric gate", () => {
  for (const extra of [
    { walls: [[2, 3]] },
    { gates: [{ x: 2, y: 3, exact: 1 }] },
  ]) {
    const q = make({
      ...extra,
      events: [
        {
          id: "w",
          kind: "wave",
          period: 1000,
          warn: 200,
          on: 200,
          rows: [3],
          dx: 1,
          dy: 0,
        },
      ],
    });
    q.advance(200);
    assert.equal(q.state.actors[0].x, 1);
  }
});
test("beam detects entry during active irradiation and retains active pointer", () => {
  const q = make({
    events: [
      {
        id: "l",
        kind: "beam",
        period: 1000,
        warn: 200,
        on: 300,
        cells: [[2, 3]],
        power: 2,
      },
    ],
  });
  q.advance(200);
  q.begin("a", { x: 1.5, y: 3.5 });
  q.travel({ x: 2.5, y: 3.5 });
  assert.equal(q.state.actors.find((a) => a.id === "a").level, 2);
  assert.equal(q.active.id, "a");
  q.travel({ x: 3.5, y: 3.5 });
  assert.equal(q.state.actors.find((a) => a.id === "a").x, 3);
});
test("all eight destination directions accepted independently of corners", () => {
  for (const dx of [-1, 0, 1])
    for (const dy of [-1, 0, 1]) {
      if (!dx && !dy) continue;
      const q = make();
      q.begin("a", { x: 1.5, y: 3.5 });
      q.travel({ x: 1.5 + dx, y: 3.5 + dy });
      assert.equal(q.state.actors[0].x, 1 + dx);
      assert.equal(q.state.actors[0].y, 3 + dy);
    }
});
test("fast vs slow pointer paths preserve additive results", () => {
  const extra = {
    actors: [
      { id: "a", x: 0, y: 3, level: 1, species: "dog" },
      { id: "b", x: 1, y: 3, level: 2, species: "dog" },
      { id: "c", x: 3, y: 3, level: 3, species: "dog" },
    ],
  };
  const a = make(extra),
    b = make(extra);
  a.begin("a", { x: 0.5, y: 3.5 });
  b.begin("a", { x: 0.5, y: 3.5 });
  a.travel({ x: 6.5, y: 3.5 });
  for (let x = 1.5; x <= 6.5; x++) b.travel({ x, y: 3.5 });
  assert.deepEqual(a.state, b.state);
});
test("save during held drag restores whole gesture Undo including realtime", () => {
  const e = {
    events: [
      {
        id: "w",
        kind: "wave",
        period: 1000,
        warn: 200,
        on: 200,
        rows: [3],
        dx: 1,
        dy: 0,
      },
    ],
  };
  const q = make(e);
  q.begin("a", { x: 1.5, y: 3.5 });
  q.travel({ x: 2.5, y: 3.5 });
  q.advance(200);
  const r = make(e);
  assert.equal(r.restore(q.serialize()), true);
  r.undo();
  assert.equal(r.time, 0);
  assert.equal(r.state.actors[0].x, 1);
});
test("corrupt save is rejected without replacing current state", () => {
  const q = make(),
    before = q.snapshot();
  assert.equal(q.restore("{"), false);
  assert.deepEqual(q.snapshot(), before);
});
