import { configuration } from "./rules.mjs";
import { board } from "./engine.mjs";
import { createSession } from "./session.mjs";
export function chainFixture(n = 5) {
  const r = configuration(),
    b = board(r);
  for (let s = 1; s <= n; s++) b[14 - s][0] = { id: s, k: 0, s };
  return {
    origin: "synthetic; ordinary-play reachability not claimed",
    state: createSession(1, r, { board: b, eggs: [1, 0, 0, 0], gauge: 48 }),
    action: { type: "egg", rank: 0, k: 0, x: 1 },
  };
}
