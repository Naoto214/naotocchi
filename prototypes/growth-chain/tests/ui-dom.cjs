// Optional dev harness: NODE_PATH=/path/to/node_modules node tests/ui-dom.cjs
const { JSDOM } = require("jsdom");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const dom = new JSDOM(html, { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  let pending = [],
    intervals = [];
  global.setTimeout = (fn) => {
    pending.push(fn);
    return pending.length;
  };
  global.clearTimeout = () => {};
  global.setInterval = (fn) => {
    intervals.push(fn);
    return intervals.length;
  };
  await import(pathToFileURL(path.join(__dirname, "../ui.mjs")));
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click();
  assert.equal(document.querySelectorAll("#board .cell").length, 72);
  click("fixture5");
  click("trigger");
  assert.match($("status").textContent, /5連鎖/);
  const stale = [...pending];
  click("restart");
  stale.forEach((f) => f());
  assert.match($("stats").textContent, /落下 0/);
  assert.equal(
    document.querySelectorAll("#board .cell.piece:not(.active):not(.ghost)")
      .length,
    0,
  );
  click("left");
  let before = Array.from(document.querySelectorAll(".cell.active")).map(
    (e) => e.dataset.x,
  );
  click("finishWave");
  assert.deepEqual(
    Array.from(document.querySelectorAll(".cell.active")).map(
      (e) => e.dataset.x,
    ),
    before,
    "finish without animation must not reset active piece",
  );
  click("drop");
  click("finishWave");
  assert.match($("stats").textContent, /落下 1/);
  click("export");
  let record = JSON.parse($("json").value);
  assert.ok(record.hash);
  click("import");
  assert.match($("stats").textContent, /落下 1/);
  click("fixture3");
  let cell = document.querySelector('[data-x="0"][data-y="13"]');
  cell.click();
  $("species").value = "1";
  click("export");
  const hash = JSON.parse($("json").value).hash;
  click("preview");
  click("export");
  assert.equal(JSON.parse($("json").value).hash, hash);
  assert.match($("prediction").textContent, /予告/);
  click("left");
  assert.equal($("use").disabled, true, "items only before falling motion");
  click("restart");
  $("rule-width").value = "7";
  $("rule-kinds").value = "6";
  click("restart");
  assert.equal(document.querySelectorAll("#board .cell").length, 84);
  $("json").value = "{}";
  click("import");
  assert.match($("status").textContent, /Version mismatch/);
  console.log(
    "DOM integration: reset/stale animation, fixtures, movement, export/import, preview, rule resize PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
