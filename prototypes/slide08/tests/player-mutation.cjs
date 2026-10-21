const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../../.."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "slide-player-mutations-"));
const files = [
  "slide08/engine.mjs",
  "slide08/player-model.mjs",
  "slide08/player-store.mjs",
  "slide08/tests/player.test.mjs",
  "naopoyo/settings.mjs",
  "growth-chain/roster.mjs",
  "growth-chain/catalog.mjs",
];
const mutants = [
  ["player-model.mjs", "p.previous = null;", "/* retain prior undo */"],
  ["player-model.mjs", "p.practice = true;", "p.practice = false;"],
  ["player-model.mjs", "p.undoCount++;", "p.undoCount++; p.elapsedMs = 0;"],
  [
    "player-model.mjs",
    "if (!r.valid) return r;",
    "if (!r.valid) { p.previous = null; return r; }",
  ],
  ["player-model.mjs", "(!p.practice && !confirmed)", "false"],
  ["player-store.mjs", "if (d.revision !== this.revision)", "if (false)"],
  ["player-store.mjs", "r.practice ? d.practice : d.normal", "d.normal"],
  ["player-store.mjs", "if (r && !d.seen[r.id])", "if (r)"],
];
try {
  for (const f of files) {
    const to = path.join(temp, "prototypes", f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(root, "prototypes", f), to);
  }
  let n = 0;
  for (const [file, from, to] of mutants) {
    const dest = path.join(temp, "prototypes/slide08", file),
      original = fs.readFileSync(dest, "utf8");
    assert.ok(original.includes(from), from);
    fs.writeFileSync(dest, original.replace(from, to));
    const r = spawnSync(
      process.execPath,
      ["--test", path.join(temp, "prototypes/slide08/tests/player.test.mjs")],
      { encoding: "utf8" },
    );
    assert.notEqual(r.status, 0, `survived ${from}`);
    assert.ok(
      !r.stderr.includes("SyntaxError") &&
        !r.stderr.includes("ERR_MODULE_NOT_FOUND"),
    );
    fs.writeFileSync(dest, original);
    n++;
  }
  console.log(`${n}/${mutants.length} player mutations detected`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
