// Focused fault injection in a disposable copy; never edits the working tree.
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  temp = fs.mkdtempSync(path.join(os.tmpdir(), "growth-mutation-"));
const cases = [
  [
    "hold cancel",
    "touch-input.mjs",
    "if (token !== generation || owner === null) return;",
    "",
    "controls",
  ],
  [
    "pointer click double",
    "touch-input.mjs",
    "if (!e.detail && !element.disabled) action();",
    "if (!element.disabled) action();",
    "controls",
  ],
  [
    "phase order",
    "animation.mjs",
    'phase: "fall"',
    'phase: "evolve"',
    "controls",
  ],
  [
    "ready intermission",
    "ui.mjs",
    "auto && !ready && !tool",
    "auto && !tool",
    "ui",
  ],
  [
    "preview writes state",
    "ui.mjs",
    "toolPreview = preview(s, item());",
    "toolPreview = s = preview(s, item());",
    "ui",
  ],
  [
    "hidden editor",
    "ui.mjs",
    '$("action").value = "transform";',
    '$("action").value = "edit";',
    "ui",
  ],
];
function run(kind) {
  return spawnSync(
    process.execPath,
    kind === "controls"
      ? ["--test", "tests/play-controls.test.mjs"]
      : ["tests/mobile-ui.cjs"],
    { cwd: temp, encoding: "utf8", timeout: 30000 },
  );
}
try {
  for (const f of fs.readdirSync(root))
    if (/\.(mjs|html)$/.test(f))
      fs.copyFileSync(path.join(root, f), path.join(temp, f));
  fs.cpSync(path.join(root, "tests"), path.join(temp, "tests"), {
    recursive: true,
  });
  fs.symlinkSync(
    path.join(root, "node_modules"),
    path.join(temp, "node_modules"),
    "dir",
  );
  for (const kind of ["controls", "ui"]) {
    const r = run(kind);
    if (r.status !== 0)
      throw Error(`baseline ${kind} failed: ${r.stderr}${r.stdout}`);
  }
  for (const [name, file, from, to, kind] of cases) {
    const dest = path.join(temp, file),
      original = fs.readFileSync(dest, "utf8");
    if (!original.includes(from)) throw Error(`missing mutation: ${name}`);
    fs.writeFileSync(dest, original.replace(from, to));
    const r = run(kind);
    fs.writeFileSync(dest, original);
    if (
      r.error ||
      r.status === 0 ||
      !`${r.stdout}${r.stderr}`.match(/AssertionError|ERR_ASSERTION/)
    )
      throw Error(`survived or invalid: ${name}\n${r.stdout}${r.stderr}`);
    console.log(`KILLED ${name}`);
  }
  console.log(
    `${cases.length}/${cases.length} targeted mutants killed; 2 clean baselines PASS`,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
