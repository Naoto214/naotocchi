// Snapshot canonical metadata without running the main game or writing its save.
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const root = path.resolve(__dirname, "../..");
const master = vm.runInNewContext(
  fs.readFileSync(path.join(root, "character-world-master.v1.js"), "utf8") +
    ";NAOTOCCHI_CHARACTER_WORLD_MASTER_V1",
);
const defs = [
  ...master.playerSpecies.normal,
  ...master.playerSpecies.rare,
  ...master.playerSpecies.secret,
];
if (defs.some((d) => d.stages.length !== 8))
  throw Error("Expected eight-stage canonical species");
fs.writeFileSync(
  path.join(__dirname, "catalog.mjs"),
  "// Generated from character-world-master.v1.js; do not edit by hand.\nexport const catalog = " +
    JSON.stringify(
      defs.map(({ id, label, stages }) => ({ id, label, stages })),
      null,
      2,
    ) +
    ";\nexport const aliases = " +
    JSON.stringify(master.compatibility.speciesAliases) +
    ";\n",
);
