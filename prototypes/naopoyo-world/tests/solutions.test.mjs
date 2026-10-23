import test from "node:test";
import assert from "node:assert/strict";
import { stages } from "../stages.mjs";
import { WorldSession } from "../session.mjs";
import { complete, move, clone } from "../../naopoyo-v2/engine.mjs";
import fs from "node:fs";
function step(q, id, dx, dy) {
  (q.witness??=[]).push({time:q.time,id,dx,dy});
  const a = q.state.actors.find((a) => a.id === id);
  assert.ok(a);
  q.begin(id, { x: a.x + 0.5, y: a.y + 0.5 });
  const r = q.travel({ x: a.x + 0.5 + dx, y: a.y + 0.5 + dy });
  q.end();
  assert.equal(r.at(-1)?.ok, true);
}
// A constructive witness: shortest route for one actor, preserving all others.
function route(q, id, goal) {
  const nodes = [{ s: clone(q.state), path: [] }],
    seen = new Set();
  for (let i = 0; i < nodes.length && i < 40000; i++) {
    const { s, path } = nodes[i],
      a = s.actors.find((a) => a.id === id);
    if (goal(s, a)) {
      for (const [dx, dy] of path) step(q, id, dx, dy);
      return path.length;
    }
    if (!a) continue;
    for (const [dx, dy] of [
      [1, 0],
      [1, -1],
      [1, 1],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [-1, 0],
    ]) {
      const c = clone(s),
        r = move(c, id, dx, dy, q.policy());
      if (!r.ok) continue;
      const key = JSON.stringify([
        c.actors.map((a) => [a.id, a.x, a.y, a.level]).sort(),
        c.rescued,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      nodes.push({ s: c, path: [...path, [dx, dy]] });
    }
  }
  throw Error("route unproven: " + id);
}
for (const stage of stages)
  test(stage.id + " real engine all rescued witness", () => {
    const q = new WorldSession(stage);
    if (["A", "D"].includes(stage.id)) {
      step(q, "a", 1, 0);
      step(q, "a", 1, 0);
      step(q, "a", 1, 0);
      step(q, "a", 1, 0);
    }
    if (["C", "E"].includes(stage.id)) {
      route(q, "a", (s, a) => a?.x === (stage.id === "E" ? 2 : 3));
      q.advance(stage.id === "E" ? 2000 : 2500);
    }
    if (stage.id === "B") {
      route(q, "a", (s, a) => a?.level === 3);
    }
    for (let i = 0; i < 12 && q.state.actors.length; i++) {
      const id = q.state.actors[0].id;
      route(q, id, (s, a) => !a);
    }
    assert.ok(complete(q.state));
    if(process.env.WORLD_EVIDENCE_DIR)fs.writeFileSync(process.env.WORLD_EVIDENCE_DIR+"/solution-"+stage.id+".json",JSON.stringify({stage:stage.id,complete:true,moves:q.state.moves,time:q.time,commands:q.witness,shortestProven:false},null,2));
  });
for (const stage of stages.filter((s) => s.gates.length))
  for (const gate of stage.gates)
    test(
      stage.id +
        " gate " +
        gate.x +
        " is structural cut under 8-neighbor movement",
      () => {
        const walls = [...stage.walls, [gate.x, gate.y]],
          start = stage.actors[0],
          seen = new Set([`${start.x},${start.y}`]),
          todo = [[start.x, start.y]];
        while (todo.length) {
          const [x, y] = todo.pop();
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
              const nx = x + dx,
                ny = y + dy,
                k = `${nx},${ny}`;
              if (
                nx < 0 ||
                ny < 0 ||
                nx >= 8 ||
                ny >= 8 ||
                seen.has(k) ||
                walls.some((p) => p[0] === nx && p[1] === ny)
              )
                continue;
              seen.add(k);
              todo.push([nx, ny]);
            }
        }
        assert.ok(stage.exits.every((e) => !seen.has(`${e.x},${e.y}`)));
      },
    );
