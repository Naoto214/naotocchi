// Reuses saved probe/fixture builders. These endowed cases are NOT natural rates.
import fs from "node:fs";
import { probes } from "./probes.mjs";
import { chainFixture } from "./fixtures.mjs";
import { standardRules } from "./rules.mjs";
import {
  createSession,
  applyAction,
  replay,
  stateData,
  stateHash,
} from "./session.mjs";
const sources = probes().filter((p) =>
  /^(anchor-(transform|bulk)-bottom|large-(6|10|12)-all|life-.*-1234|egg-count-group|four-targets-)/.test(
    p.id,
  ),
);
for (const n of [3, 5]) {
  const f = chainFixture(n);
  sources.push({ id: `egg-chain-${n}`, initial: f.state, actions: [f.action] });
}
const rows = sources.map((p) => {
  const initial = createSession(p.initial.seed, standardRules(), {
    board: p.initial.board,
    eggs: p.initial.eggs,
    gauge: 48,
  });
  let s = initial;
  for (const a of p.actions) s = applyAction(s, a);
  const record = {
    version: s.version,
    initial: stateData(initial),
    actions: p.actions,
    hash: stateHash(s),
  };
  replay(record);
  return {
    id: p.id,
    origin: "artificial endowed probe, not natural frequency",
    before: initial.board.flat().filter(Boolean).length,
    after: s.board.flat().filter(Boolean).length,
    chains: s.last.waves.length,
    score: s.score,
    gauge: s.gauge,
    eggs: s.eggs,
    record,
  };
});
fs.writeFileSync(
  new URL("./qa-final-20261014/artificial-probes.json", import.meta.url),
  JSON.stringify(rows, null, 2),
);
console.log(
  JSON.stringify(
    rows.map(({ record, ...r }) => r),
    null,
    2,
  ),
);
