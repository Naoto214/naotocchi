// Targeted endowed/constructed cases, kept separate from natural-play rates.
import fs from "node:fs";
import { configuration, VERSION } from "./rules.mjs";
import { board } from "./engine.mjs";
import { createSession, applyAction, stateHash } from "./session.mjs";
export function probes() {
  const results = [];
  function save(id, r, b, a) {
    let initial = createSession(7, r, {
        board: b,
        gauge: 6 * r.gaugeUnit,
        eggs: [2, 2, 2, 2],
      }),
      z = applyAction(initial, a);
    results.push({
      id,
      origin: "constructed endowed probe; not natural-play distribution",
      version: VERSION,
      initial,
      actions: [a],
      hash: stateHash(z),
      chain: z.last.waves.length,
      created08: z.last.created08,
      eggDelta: z.eggs.map((n, i) => n - initial.eggs[i]),
      gaugeDelta: z.gauge - initial.gauge,
      events: z.last.waves.map((w) => w.events),
      final: z.board,
    });
  }
  for (let anchor of ["bottom", "changed"])
    for (let source of ["drop", "transform", "bulk"]) {
      let r = configuration({ anchor, bulkAnchor: anchor }),
        b = board(r);
      b[13][0] = { id: 1, k: 0, s: source === "drop" ? 1 : 2 };
      if (source !== "drop") {
        b[13][1] = { id: 2, k: 1, s: 2 };
        b[13][2] = { id: 3, k: 0, s: 2 };
      }
      let a =
        source === "drop"
          ? { type: "drop", path: ["left", "rotate", "hard"] }
          : source === "transform"
            ? { type: source, x: 1, y: 13, to: 0 }
            : { type: source, from: 1, to: 0 };
      save(`anchor-${source}-${anchor}`, r, b, a);
    }
  for (let size of [6, 10, 12])
    for (let mode of ["all", "five", "disjoint"]) {
      let r = configuration({
          consume: mode === "all" ? "all" : "five",
          competition: mode === "disjoint" ? "disjoint" : "component",
        }),
        b = board(r);
      for (let i = 0; i < size; i++) {
        let x = i % 6,
          y = 13 - Math.floor(i / 6);
        b[y][x] = { id: i + 1, k: (x + y) % 2, s: 1 };
      }
      save(`large-${size}-${mode}`, r, b, { type: "bulk", from: 1, to: 0 });
    }
  for (let chain of [1, 2, 3, 4, 5, 7])
    for (let boundary of [
      [1, 2, 3, 4],
      [1, 3, 5, 7],
    ]) {
      let r = configuration({ eggThresholds: boundary }),
        b = board(r),
        start = 9 - chain;
      for (let i = 0; i < chain; i++)
        b[13 - i][0] = { id: i + 1, k: 0, s: start + i };
      b[13][1] = { id: 20, k: 1, s: start };
      save(`life-${chain}-${boundary.join("")}`, r, b, {
        type: "transform",
        x: 1,
        y: 13,
        to: 0,
      });
    }
  for (let count of ["group", "pairs"]) {
    let r = configuration({ eggCount: count }),
      b = board(r);
    for (let x = 0; x < 6; x++) b[13][x] = { id: x + 1, k: x % 2, s: 8 };
    save(`egg-count-${count}`, r, b, { type: "bulk", from: 1, to: 0 });
  }
  for (let type of ["transform", "bulk"]) {
    let r = configuration(),
      b = board(r);
    for (let y = 12; y < 14; y++)
      for (let x = 0; x < 6; x++)
        b[y][x] = {
          id: y * 10 + x,
          k: x % 3 === 1 ? 1 : 0,
          s: y === 13 ? (x < 3 ? 2 : 3) : x < 3 ? 4 : 6,
        };
    save(
      `four-targets-${type}`,
      r,
      b,
      type === "bulk" ? { type, from: 1, to: 0 } : { type, x: 1, y: 13, to: 0 },
    );
  }
  return results;
}
if (process.argv[1]?.endsWith("/probes.mjs")) {
  let data = probes();
  fs.writeFileSync(
    new URL("./results/constructed-probes.json", import.meta.url),
    JSON.stringify(data, null, 2),
  );
  console.log("constructed probes", data.length);
}
