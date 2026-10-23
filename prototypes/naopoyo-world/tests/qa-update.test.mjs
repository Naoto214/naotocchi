import test from "node:test";
import assert from "node:assert/strict";
import { WorldSession } from "../session.mjs";
import { stages } from "../stages.mjs";
import { mass, move, clone, complete } from "../../naopoyo-v2/engine.mjs";
import * as view from "../render.mjs";
const B = () => new WorldSession(stages.find((s) => s.id === "B"));
test("B has a visibly wave-only numeric gate and no manual entry", () => {
  const q = B(),
    gate = q.stage.gates.find((g) => g.waveOnly);
  assert.ok(gate);
  q.state.actors = [
    { id: "a", x: gate.x - 1, y: gate.y, level: 3, species: "fish" },
  ];
  assert.equal(move(q.state, "a", 1, 0, q.policy()).ok, false);
  q.begin("a", { x: gate.x - 0.5, y: gate.y + 0.5 });
  q.advance(q.stage.events[0].warn);
  assert.equal(q.state.actors[0].x, gate.x);
  assert.equal(q.active.id, "a");
  assert.equal(mass(q.state), 3);
  assert.equal(q.lastWave.outcomes[0].moved, true);
  q.travel({ x: gate.x + 0.5, y: gate.y + 0.5 });
  assert.equal(q.state.actors.find((a) => a.id === "a").x, gate.x + 1);
  assert.ok(q.state.actors.length > 1);
  q.end();
  assert.ok(q.undo());
  assert.equal(q.time, 0);
});
test("wave receipt distinguishes blocked movement from real push and is transient", () => {
  const q = B();
  q.state.walls.push([2, 4]);
  q.state.actors = [{ id: "a", x: 1, y: 4, level: 3, species: "fish" }];
  q.advance(q.stage.events[0].warn);
  assert.ok(q.lastWave);
  assert.equal(q.lastWave.outcomes[0].moved, false);
  assert.equal(q.lastWave.outcomes[0].reason, "wall");
  assert.equal(q.state.actors[0].x, 1);
  q.retry();
  assert.equal(q.lastWave, null);
});
test("held geometry stays centered in own row, enlarged, with visible top digit at every edge", () => {
  assert.equal(typeof view.actorLayout, "function");
  for (const x of [0, 3, 7])
    for (const y of [0, 3, 7]) {
      const a = { x, y };
      const normal = view.actorLayout(a, false, 40, 320, 320);
      const held = view.actorLayout(a, true, 40, 320, 320);
      assert.ok(held.bw > normal.bw);
      assert.ok(held.by + held.bh / 2 >= y * 40);
      assert.ok(held.by + held.bh / 2 < (y + 1) * 40);
      assert.ok(held.by >= 0 && held.by + held.bh <= (y + 1) * 40 + 1e-9);
      assert.ok(held.numberY - held.numberSize / 2 >= 0);
      assert.ok(held.numberY < held.by + held.bh / 2);
      assert.equal(held.footY, (y + 0.72) * 40);
    }
});
test("owl explains off-board; host source classification and controlled events explicit", () => {
  const s = stages.find((s) => s.id === "E");
  assert.ok(s.narrator?.asset.endsWith("companions/owl.png"));
  assert.ok(!s.guests.some((g) => g.id === "owl"));
  const host = s.guests.find((g) => g.id === "rock_octopus");
  assert.equal(host.category, "partner");
  assert.ok(s.events.every((e) => e.host === host.id));
});
test("B exhausts all no-wave reachable states without a solution", () => {
  const q = B(),
    nodes = [clone(q.state)],
    seen = new Set();
  let solved = false;
  const key = (s) =>
    JSON.stringify([
      s.actors.map((a) => [a.species, a.level, a.x, a.y]).sort(),
      s.rescued,
    ]);
  seen.add(key(nodes[0]));
  for (let i = 0; i < nodes.length; i++) {
    assert.ok(i < 40000, "UNPROVEN: no-wave search cap");
    const s = nodes[i];
    if (complete(s)) {
      solved = true;
      break;
    }
    for (const a of s.actors)
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          if (!dx && !dy) continue;
          const c = clone(s);
          if (!move(c, a.id, dx, dy, q.policy()).ok) continue;
          const k = key(c);
          if (!seen.has(k)) {
            seen.add(k);
            nodes.push(c);
          }
        }
  }
  assert.equal(solved, false);
  console.log("B exhaustive no-wave reachable states:", nodes.length);
});
test("B valid save inside wave gate restores and replays deterministically", () => {
  const q = B();
  q.state.actors = [{ id: "a", x: 3, y: 4, level: 3, species: "fish" }];
  q.advance(3000);
  const r = B();
  assert.equal(r.restore(q.serialize()), true);
  r.advance(900);
  q.advance(900);
  assert.deepEqual(q.snapshot(), r.snapshot());
});
test("held pointer waiting against wave gate continues one step after wave without extra move", () => {
  const q = B();
  q.state.actors = [{ id: "a", x: 3, y: 4, level: 3, species: "fish" }];
  q.begin("a", { x: 3.5, y: 4.5 });
  q.travel({ x: 4.5, y: 4.5 });
  assert.equal(q.state.actors[0].x, 3);
  q.advance(3000);
  assert.equal(q.state.actors[0].x, 4);
  q.travel({ x: 5.5, y: 4.5 });
  assert.equal(q.state.actors.find((a) => a.id === "a").x, 5);
});
test("returning pointer from rejected numeric gate does not move or merge actor", () => {
  const q = new WorldSession(stages[0]);
  q.begin("b", { x: 1.5, y: 4.5 });
  q.travel({ x: 2.5, y: 4.5 });
  q.travel({ x: 1.5, y: 4.5 });
  assert.equal(q.state.actors.length, 2);
  assert.equal(q.state.actors.find((a) => a.id === "b").x, 1);
});
