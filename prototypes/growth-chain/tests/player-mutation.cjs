const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { spawnSync } = require("node:child_process"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "naopoyo-mut-"));
fs.mkdirSync(path.join(temp, "tests"));
for (const file of fs.readdirSync(root).filter((f) => f.endsWith(".mjs")))
  fs.copyFileSync(path.join(root, file), path.join(temp, file));
for (const f of ["player-model.test.mjs", "player-store.test.mjs"])
  fs.copyFileSync(path.join(__dirname, f), path.join(temp, "tests", f));
const run = () =>
  spawnSync(
    process.execPath,
    ["--test", "tests/player-model.test.mjs", "tests/player-store.test.mjs"],
    { cwd: temp, encoding: "utf8" },
  );
assert.equal(run().status, 0, "clean control");
const cases = [
  [
    "player-model.mjs",
    "600 - this.lockMs",
    "601 - this.lockMs",
    "lock duration",
  ],
  ["player-model.mjs", "this.resets < 10", "this.resets < 11", "reset cap"],
  [
    "player-model.mjs",
    "token.revision !== this.revision",
    "false",
    "stale transaction",
  ],
  [
    "player-model.mjs",
    'this.phase === "playing" && !this.state.over',
    "!this.state.over",
    "pause freeze",
  ],
  [
    "player-model.mjs",
    "if (this.practice) return;",
    "if (false) return;",
    "practice records",
  ],
  [
    "player-model.mjs",
    'this.category = "post-clear"',
    'this.category = "clear"',
    "record categories",
  ],
  [
    "player-model.mjs",
    'this.phase === "animating" ||',
    "false ||",
    "unstable save",
  ],
  [
    "player-store.mjs",
    "d.history.slice(0, 100)",
    "d.history.slice(0, 101)",
    "history cap",
  ],
  [
    "player-store.mjs",
    "this.revision !== d.revision",
    "false",
    "revision lease",
  ],
  ["player-store.mjs", "d.seen[r.id]\n", "false\n", "duplicate record"],
];
try {
  for (const [file, from, to, name] of cases) {
    const f = path.join(temp, file),
      original = fs.readFileSync(f, "utf8");
    assert.ok(original.includes(from), "mutation anchor " + name);
    fs.writeFileSync(f, original.replace(from, to));
    const r = run();
    assert.notEqual(r.status, 0, "SURVIVED " + name);
    console.log("KILLED " + name);
    fs.writeFileSync(f, original);
  }
  console.log(
    `${cases.length}/${cases.length} player mutants killed; clean baseline PASS`,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
