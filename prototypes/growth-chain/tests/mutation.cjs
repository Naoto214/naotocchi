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
    "auto && (!ready || standard()) && (!tool || standard())",
    "auto && (!tool || standard())",
    "ui",
  ],
  [
    "preview writes state",
    "ui.mjs",
    "toolPreview = standard() ? toolTransaction(s,pose,item(),selected?.id).state : preview(s,item());",
    "toolPreview = s = preview(s,item());",
    "ui",
  ],
  [
    "hidden editor",
    "ui.mjs",
    '$("action").value = "transform";',
    '$("action").value = "edit";',
    "ui",
  ],
  [
    "final whole component",
    "rules.mjs",
    "return configuration({gaugeMetric:",
    'return configuration({consume:"five", gaugeMetric:',
    "final",
  ],
  [
    "final score",
    "engine.mjs",
    "(death ? 100 : 0)",
    "(death ? 200 : 0)",
    "final",
  ],
  [
    "final growth gauge",
    "rules.mjs",
    'gaugeMetric: "growth", gaugeUnit: 8',
    'gaugeMetric: "consumed", gaugeUnit: 8',
    "final",
  ],
  [
    "partial unlock",
    "roster.mjs",
    "c.stages.every(",
    "c.stages.some(",
    "roster",
  ],
  [
    "live collision",
    "live-tools.mjs",
    "if(path===null)throw",
    "if(false)throw",
    "live",
  ],
  [
    "selection freezes time",
    "ui.mjs",
    "&& (!tool || standard()) && !document.hidden",
    "&& !tool && !document.hidden",
    "final-ui",
  ],
];
function run(kind) {
  return spawnSync(
    process.execPath,
    kind === "final"
      ? ["--test", "tests/final-rules.test.mjs"]
      : kind === "roster"
        ? ["--test", "tests/roster.test.mjs"]
        : kind === "live"
          ? ["--test", "tests/live-tools.test.mjs"]
          : kind === "final-ui"
            ? ["tests/final-ui.cjs"]
            : kind === "controls"
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
  for (const kind of [
    "controls",
    "ui",
    "final",
    "roster",
    "live",
    "final-ui",
  ]) {
    const r = run(kind);
    if (r.status !== 0)
      throw Error(`baseline ${kind} failed: ${r.stderr}${r.stdout}`);
  }
  for (const [name, file, from, to, kind] of cases) {
    const dest = path.join(temp, file),
      original = fs.readFileSync(dest, "utf8");
    const pattern = new RegExp(
      [...from]
        .filter((c) => !/\s/.test(c))
        .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s*"),
    );
    if (!pattern.test(original)) throw Error(`missing mutation: ${name}`);
    fs.writeFileSync(dest, original.replace(pattern, to));
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
    `${cases.length}/${cases.length} targeted mutants killed; 6 clean baselines PASS`,
  );
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
