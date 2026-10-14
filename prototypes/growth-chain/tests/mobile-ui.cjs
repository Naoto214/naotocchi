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
  let pending = [],
    intervals = [];
  global.setTimeout = (fn) => {
    pending.push(fn);
    return pending.length;
  };
  global.clearTimeout = () => {};
  global.setInterval = (fn) => intervals.push(fn);
  await import(pathToFileURL(path.join(__dirname, "../ui.mjs")));
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click(),
    record = () => {
      click("export");
      return JSON.parse($("json").value);
    };
  // Archived intermission behavior is still exercised via a laboratory import.
  const legacy = await import(pathToFileURL(path.join(__dirname,"../session.mjs")));
  const legacyState=legacy.createSession(1);
  $("json").value=JSON.stringify({version:legacyState.version,initial:legacy.stateData(legacyState),actions:[]});
  click("import");
  assert.ok($("tool-transform"), "visible tool card exists");
  assert.equal($("labPanel").hidden, true, "lab hidden in play mode");
  assert.equal($("board").dataset.phase, "ready");
  click("pause");
  intervals.forEach((f) => f());
  assert.equal(
    $("board").dataset.phase,
    "ready",
    "auto cannot skip tool window",
  );
  click("startFall");
  intervals.forEach((f) => f());
  assert.equal($("board").dataset.phase, "falling");
  assert.equal($("tool-transform").disabled, true);
  click("drop");
  click("finishWave");
  assert.equal($("board").dataset.phase, "ready");
  intervals.forEach((f) => f());
  assert.equal($("board").dataset.phase, "ready");
  const { createSession, stateData, stateHash } = await import(
    pathToFileURL(path.join(__dirname, "../session.mjs"))
  );
  const { board } = await import(
    pathToFileURL(path.join(__dirname, "../engine.mjs"))
  );
  const { configuration } = await import(
    pathToFileURL(path.join(__dirname, "../rules.mjs"))
  );
  const rules = configuration(),
    b = board(rules);
  b[13][0] = { id: 1, k: 0, s: 1 };
  b[13][1] = { id: 2, k: 1, s: 1 };
  const state = createSession(1, rules, {
    board: b,
    gauge: 48,
    eggs: [1, 1, 1, 1],
  });
  const load = () => {
    $("json").value = JSON.stringify({
      version: state.version,
      initial: stateData(state),
      actions: [],
      hash: stateHash(state),
    });
    click("import");
  };
  load();
  const before = record();
  click("tool-transform");
  assert.equal($("toolSheet").hidden, false);
  document.querySelector('[data-x="0"][data-y="13"]').click();
  document.querySelector('#kindChoices [data-kind="1"]').click();
  assert.ok(
    document.querySelector(".preview-piece"),
    "preview is on the board",
  );
  assert.match($("toolHint").textContent, /予告/);
  assert.equal(record().hash, before.hash);
  const focusedChoice = document.querySelector('#kindChoices [data-kind="2"]');
  focusedChoice.focus();
  focusedChoice.click();
  assert.equal(
    document.activeElement.dataset.kind,
    "2",
    "choice keeps keyboard focus",
  );
  click("cancelTool");
  assert.equal(record().hash, before.hash);
  assert.equal(document.querySelectorAll(".preview-piece").length, 0);
  click("tool-transform");
  document.querySelector('[data-x="0"][data-y="13"]').click();
  document.querySelector('#kindChoices [data-kind="1"]').click();
  click("confirmTool");
  click("confirmTool");
  click("finishWave");
  const after = record();
  assert.equal(after.actions.length, 1, "double confirm spends once");
  assert.equal(after.actions[0].type, "transform");
  assert.notEqual(after.hash, before.hash);
  assert.equal($("board").dataset.phase, "ready");
  load();
  click("tool-bulk");
  document.querySelector('[data-x="0"][data-y="13"]').click();
  document.querySelector('#kindChoices [data-kind="1"]').click();
  click("confirmTool");
  click("finishWave");
  assert.equal(record().actions[0].type, "bulk");
  load();
  click("tool-egg");
  document.querySelector('#eggChoices [data-rank="1"]').click();
  document.querySelector('#kindChoices [data-kind="2"]').click();
  document.querySelector('[data-x="4"][data-y="13"]').click();
  click("confirmTool");
  click("finishWave");
  assert.equal(record().actions[0].type, "egg");
  assert.equal(record().actions[0].rank, 1);
  load();
  click("tool-transform");
  click("startFall");
  assert.equal(
    $("board").dataset.phase,
    "ready",
    "tool selection cannot start fall",
  );
  click("cancelTool");
  click("left");
  assert.equal($("tool-transform").disabled, true);
  click("natural5");
  click("trigger");
  assert.equal($("board").dataset.phase, "connect");
  click("stepWave");
  assert.equal($("board").dataset.phase, "evolve");
  click("stepWave");
  assert.equal($("board").dataset.phase, "fall");
  const stale = [...pending];
  click("restart");
  stale.forEach((f) => f());
  assert.equal($("board").dataset.phase, "ready");
  assert.equal(record().actions.length, 0);
  load();
  click("toggleLab");
  $("action").value = "edit";
  click("toggleLab");
  document.querySelector('[data-x="0"][data-y="13"]').click();
  assert.equal($("drop").disabled, false, "hidden lab cannot edit play board");
  click("toggleLab");
  load();
  click("tool-transform");
  document.querySelector('[data-x="0"][data-y="13"]').click();
  document.querySelector('#kindChoices [data-kind="1"]').click();
  click("toggleLab");
  assert.equal($("toolSheet").hidden, true, "closing lab cancels tool safely");
  assert.equal(record().hash, before.hash);
  click("toggleLab");
  $("manualWave").checked = true;
  click("natural5");
  click("trigger");
  click("toggleLab");
  assert.equal(
    $("manualWave").checked,
    false,
    "play mode cannot retain manual waves",
  );
  for (let i = 0; i < 20; i++) {
    const q = pending;
    pending = [];
    q.forEach((f) => f());
  }
  assert.equal(
    $("board").dataset.phase,
    "ready",
    "closing lab resumes animation",
  );
  click("toggleLab");
  click("empty");
  click("toggleLab");
  assert.equal($("labPanel").hidden, false, "unfinished editor stays visible");
  console.log(
    "mobile UI: tool window, pause, target preview/cancel, three items, single spend, phase order, stale reset PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
