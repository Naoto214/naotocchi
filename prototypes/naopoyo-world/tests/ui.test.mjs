import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("independent entry provides every required control", () => {
  const p = new URL("../index.html", import.meta.url);
  assert.ok(fs.existsSync(p), "Pilot entry exists");
  const html = fs.readFileSync(p, "utf8");
  for (const id of [
    "board",
    "undo",
    "retry",
    "hint",
    "pause",
    "select",
    "compare",
  ])
    assert.ok(html.includes(`id="${id}"`), id);
});
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
test("preview includes complete relative module graph", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "world-package-"));
  execFileSync(process.execPath, [
    new URL("../build-preview.mjs", import.meta.url).pathname,
    root,
  ]);
  function walk(f, seen = new Set()) {
    if (seen.has(f)) return;
    seen.add(f);
    assert.ok(fs.existsSync(f), f);
    const code = fs.readFileSync(f, "utf8");
    for (const m of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
      if (m[1].startsWith(".")) walk(path.resolve(path.dirname(f), m[1]), seen);
    }
  }
  walk(root + "/prototypes/naopoyo-world/app.mjs");
  fs.rmSync(root, { recursive: true, force: true });
});
