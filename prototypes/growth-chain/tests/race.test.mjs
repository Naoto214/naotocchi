import test from "node:test";
import assert from "node:assert/strict";
import { standardRules } from "../rules.mjs";
import { board } from "../engine.mjs";
import {
  createSession,
  stateData,
  applyAction,
  placements,
} from "../session.mjs";
const record = (s, actions) => ({
  version: s.version,
  initial: stateData(s),
  actions,
});
function fixture() {
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 8 };
  b[13][1] = { id: 2, k: 1, s: 8 };
  return createSession(12, r, { board: b, gauge: 24, eggs: [1, 0, 0, 0] });
}
const death = { type: "transform", x: 1, y: 13, to: 0 },
  egg = { type: "egg", rank: 0, k: 2, x: 5 };
test("race prioritizes first death, symmetric same-clock draw and explicit alternate clock", async () => {
  const { compareRace } = await import("../race.mjs");
  const s = fixture(),
    a = record(s, [death]),
    b = record(s, [egg, death]);
  assert.equal(compareRace(a, b).winner, "A");
  assert.equal(compareRace(b, a).winner, "B");
  assert.equal(compareRace(a, a).winner, "draw");
  assert.equal(compareRace(a, b, { clock: "slots" }).winner, "draw");
});
test("nonterminal caps remain unresolved, terminal ties draw, incompatible or illegal logs reject", async () => {
  const { compareRace } = await import("../race.mjs");
  const s = fixture(),
    a = record(s, []);
  assert.equal(compareRace(a, a).reason, "unfinished");
  assert.throws(
    () => compareRace(a, record({ ...s, seed: 13 }, [])),
    /initial/,
  );
  assert.throws(() => compareRace(a, record(s, [{ ...egg, rank: 3 }])));
  assert.throws(() => compareRace(a, a, { clock: "seconds" }));
  const r = standardRules(),
    b = board(r);
  let id = 1;
  for (let y = 2; y < 14; y++)
    for (let x = 0; x < 6; x++) b[y][x] = { id: id++, k: (x + y) % 5, s: 1 };
  const ended = createSession(1, r, { board: b });
  assert.ok(ended.over);
  assert.equal(
    compareRace(record(ended, []), record(ended, [])).winner,
    "draw",
  );
});
test("finished no-death games fall back to actual replay score, not supplied totals", async () => {
  const { compareRace } = await import("../race.mjs");
  const initial = createSession(3, standardRules()),
    logs = [];
  for (const offset of [0, 7]) {
    let s = initial,
      actions = [];
    while (!s.over && actions.length < 300) {
      const aa = placements(s),
        a = aa[Math.min(offset, aa.length - 1)];
      actions.push(a);
      s = applyAction(s, a, false);
    }
    assert.ok(s.over);
    logs.push({
      ...record(initial, actions),
      score: 999999,
      expected: s.score,
    });
  }
  const z = compareRace(...logs);
  assert.equal(z.reason, "score");
  assert.deepEqual(
    z.scores,
    logs.map((l) => l.expected),
  );
  assert.equal(
    z.winner,
    logs[0].expected === logs[1].expected
      ? "draw"
      : logs[0].expected > logs[1].expected
        ? "A"
        : "B",
  );
});
test("partial opponent history cannot lose before reaching the winning clock", async () => {
  const { compareRace } = await import("../race.mjs");
  const s = fixture(),
    win = record(s, [egg, death]);
  assert.equal(compareRace(win, record(s, [])).winner, null);
  assert.equal(compareRace(win, record(s, [egg])).reason, "unfinished");
});
test("same committed action compares death waves without scan-order priority", async () => {
  const { compareRace } = await import("../race.mjs");
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 8 };
  b[13][1] = { id: 2, k: 1, s: 8 };
  b[13][4] = { id: 3, k: 2, s: 7 };
  b[12][4] = { id: 4, k: 2, s: 8 };
  b[13][5] = { id: 5, k: 3, s: 7 };
  const s = createSession(0, r, { board: b, gauge: 8 }),
    a = record(s, [death]),
    c = record(s, [{ type: "transform", x: 5, y: 13, to: 2 }]);
  assert.equal(compareRace(a, c).winner, "A");
  assert.deepEqual(
    compareRace(a, c).deaths.map((d) => d.wave),
    [1, 2],
  );
});
test('fabricated ended flag on a playable initial board cannot trigger score adjudication',async()=>{const {compareRace}=await import('../race.mjs');const s=createSession(1,standardRules());s.over='spawn-blocked';assert.throws(()=>compareRace(record(s,[]),record(s,[])),/ended/);});
