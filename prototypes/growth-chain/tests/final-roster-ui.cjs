const { JSDOM } = require("jsdom"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const dom = new JSDOM(
    fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"),
    { url: "http://localhost/" },
  );
  global.window = dom.window;
  global.document = dom.window.document;
  global.setInterval = () => 0;
  global.setTimeout = () => 0;
  global.clearTimeout = () => {};
  window.localStorage.setItem(
    "naotocchi-save-v1",
    JSON.stringify({
      discoveredStages: ["man", "woman"].flatMap((id) =>
        Array.from({ length: 8 }, (_, i) => `${id}:${i}`),
      ),
    }),
  );
  await import("../ui.mjs");
  const $ = (id) => document.getElementById(id),
    record = () => {
      $("export").click();
      return JSON.parse($("json").value).initial;
    };
  const { createSession, stateData } = await import("../session.mjs"),
    { standardRules } = await import("../rules.mjs");
  const ids = ["dog", "penguin", "clownfish", "mushroom", "butterfly", "woman"];
  const s = createSession(1, standardRules({ kinds: 6 }), {
    species: ids,
    selected: [0, 1, 2, 3, 5],
  });
  $("json").value = JSON.stringify({
    version: s.version,
    initial: stateData(s),
    actions: [],
  });
  $("import").click();
  assert.equal(
    $("species").options[5].textContent,
    "おんなのひと",
    "stored ID overrides changed unlock ordering",
  );
  $("rule-gaugeUnit").value = "12";
  $("restart").click();
  assert.deepEqual(record().species, ids);
  assert.deepEqual(record().bag.selected, [0, 1, 2, 3, 5]);
  assert.equal(record().bag.items.length, 20);
  $("applyBoard").click();
  assert.deepEqual(record().species, ids);
  assert.deepEqual(record().bag.selected, [0, 1, 2, 3, 5]);
  console.log(
    "Roster replay identity and lab restart/editor preserve selected twenty-bag PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
