const { JSDOM } = require("jsdom"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const dom = new JSDOM(
    fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"),
    { url: "http://localhost/", pretendToBeVisual: true },
  );
  global.window = dom.window;
  global.document = dom.window.document;
  global.setInterval = () => 0;
  global.setTimeout = () => 0;
  global.clearTimeout = () => {};
  await import("../ui.mjs");
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click();
  const { standardRules } = await import("../rules.mjs"),
    { board } = await import("../engine.mjs"),
    { createSession, stateData, replay } = await import("../session.mjs");
  const r = standardRules(),
    b = board(r);
  b[13][0] = { id: 1, k: 0, s: 3 };
  const s = createSession(1, r, { board: b, eggs: [0, 0, 1, 0] });
  $("json").value = JSON.stringify({
    version: s.version,
    initial: stateData(s),
    actions: [],
  });
  click("import");
  $("manualWave").checked = true;
  click("railEgg2");
  document.querySelector('#kindChoices [data-kind="0"]').click();
  document.querySelector('#board [data-x="0"][data-y="13"]').click();
  click("confirmTool");
  click("confirmTool");
  assert.match($("railEgg0").textContent, /×0/);
  click("stepWave");
  assert.match($("railEgg0").textContent, /×1/);
  assert.match($("status").textContent, /卵＋1/);
  assert.doesNotMatch($("status").textContent, /寿命/);
  click("finishWave");
  click("export");
  const log = JSON.parse($("json").value);
  assert.equal(log.actions.length, 1);
  assert.deepEqual(replay(log).eggs, [1, 0, 0, 0]);
  assert.equal(document.querySelector("#rule-eggReward").value, "evolution");
  click("restart");
  click("export");
  assert.equal(
    JSON.parse($("json").value).initial.rules.eggReward,
    "evolution",
  );
  assert.match(document.title, /なおぽよ/);
  console.log(
    "evolution egg UI: phase-synchronized stock, reward text, double confirmation, replay and restart PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
