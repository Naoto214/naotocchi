import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { catalog, aliases } from "../catalog.mjs";
test("catalog snapshot and all stage paths exactly match canonical main metadata and existing PNGs", () => {
  const root = new URL("../../../", import.meta.url);
  const master = vm.runInNewContext(
    fs.readFileSync(new URL("character-world-master.v1.js", root), "utf8") +
      ";NAOTOCCHI_CHARACTER_WORLD_MASTER_V1",
  );
  const defs = [
    ...master.playerSpecies.normal,
    ...master.playerSpecies.rare,
    ...master.playerSpecies.secret,
  ].map(({ id, label, stages }) => ({ id, label, stages }));
  assert.deepEqual(catalog, JSON.parse(JSON.stringify(defs)));
  assert.deepEqual(
    aliases,
    JSON.parse(JSON.stringify(master.compatibility.speciesAliases)),
  );
  for (const c of catalog)
    for (let i = 1; i <= 8; i++) {
      const bytes = fs.readFileSync(
        new URL(
          `assets/characters/${c.id}/${String(i).padStart(2, "0")}.png`,
          root,
        ),
      );
      assert.deepEqual(
        [...bytes.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
    }
});
