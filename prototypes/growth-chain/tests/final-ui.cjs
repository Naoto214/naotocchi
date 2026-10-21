const { JSDOM } = require("jsdom"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
(async () => {
  const dom = new JSDOM(
    fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"),
    { url: "http://localhost/", pretendToBeVisual: true },
  );
  global.window = dom.window;
  global.document = dom.window.document;
  let tick;
  global.setInterval = (fn) => {
    tick = fn;
  };
  global.setTimeout = () => 0;
  global.clearTimeout = () => {};
  await import(pathToFileURL(path.join(__dirname, "../ui.mjs")));
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click(),
    record = () => {
      click("export");
      return JSON.parse($("json").value);
    };
  assert.equal(record().initial.rules.gaugeUnit, 8);
  assert.equal($("board").dataset.phase, "falling");
  assert.equal(document.querySelectorAll("#roster label").length, 5);
  assert.ok(document.querySelector('#board img[src*="/01.png"]'));
  assert.equal(document.querySelectorAll("#next .nextpair").length, 3);
  const { createSession, stateData, replay } = await import("../session.mjs"),
    { standardRules } = await import("../rules.mjs"),
    { board } = await import("../engine.mjs");
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 1 };
  const s = createSession(1, r, { board: b, gauge: 32, eggs: [2, 0, 0, 0] });
  $("json").value = JSON.stringify({
    version: s.version,
    initial: stateData(s),
    actions: [],
  });
  click("import");
  click("railEgg0");
  assert.equal($("toolSheet").hidden, false);
  const active = () =>
    [...document.querySelectorAll(".cell.active")]
      .map((e) => e.dataset.y)
      .join(",");
  const before = active();
  tick();
  assert.notEqual(active(), before, "tool choice never stops falling");
  assert.equal(record().actions.length, 0, "selection never spends");
  document.querySelector('#kindChoices [data-kind="1"]').click();
  document.querySelector('#board [data-x="5"][data-y="13"]').click();
  assert.equal($("confirmTool").disabled, false);
  click("confirmTool");
  click("confirmTool");
  assert.equal(record().actions.length, 1, "double confirm spends once");
  assert.equal(replay(record()).eggs[0], 1);
  assert.equal($("board").dataset.phase, "falling");
  click("tool-transform");
  document.querySelector('#board [data-x="0"][data-y="13"]').click();
  document.querySelector('#kindChoices [data-kind="1"]').click();
  click("cancelTool");
  assert.equal(record().actions.length, 1);
  const img = document.querySelector("#board img");
  img.dispatchEvent(new window.Event("error"));
  assert.equal(img.hidden, true);
  assert.ok(img.parentElement.classList.contains("image-fallback"));
  click("drop");
  click("finishWave");
  replay(record());
  assert.equal($("board").dataset.phase, "falling");
  console.log(
    "Final UI: standard rules, initial roster/images/NEXT3, falling tool selection, preview/confirm/cancel, double consumption, fallback and replay PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
