const { JSDOM } = require(process.env.SLIDE08_JSDOM || "jsdom");
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
(async () => {
  const root = path.resolve(__dirname, ".."),
    dom = new JSDOM(fs.readFileSync(path.join(root, "player.html"), "utf8"), {
      url: "http://localhost/prototypes/slide08/player.html",
      pretendToBeVisual: true,
    });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.location = dom.window.location;
  global.matchMedia = () => ({ matches: true });
  Object.defineProperty(global, "navigator", {
    value: { locks: { request: async (n, o, fn) => fn({ name: n }) } },
    configurable: true,
  });
  global.fetch = async (file) => ({
    ok: true,
    json: async () =>
      JSON.parse(fs.readFileSync(path.join(root, file), "utf8")),
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const intervals = [];
  global.setInterval = (fn, ms) => {
    intervals.push(fn);
    return 1;
  };
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click(),
    wait = () => new Promise((r) => setTimeout(r, 30));
  await import(path.join(root, "player.mjs"));
  await wait();
  assert.equal($("start").disabled, false);
  assert.equal($("choices").children.length, 5);
  assert.equal($("slideSpeed").value, "240", "normal launch uses 240ms");
  assert.equal($("slideSpeed").closest("details")?.open, false, "speed comparisons are hidden in development settings");
  assert.deepEqual([...$("slideSpeed").options].map(o => o.value), ["200", "240", "280"]);
  click("start");
  await wait();
  await wait();
  assert.equal($("game").hidden, false);
  const initial = JSON.parse(
      localStorage.getItem("naopoyo-slide-player-v1"),
    ).snapshot,
    cert = JSON.parse(
      fs.readFileSync(
        path.join(root, "balance-20261015/results", initial.proof),
      ),
    );
  async function action(a) {
    if (a.type === "slide")
      window.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: {
            left: "ArrowLeft",
            right: "ArrowRight",
            up: "ArrowUp",
            down: "ArrowDown",
          }[a.dir],
        }),
      );
    else if (a.type === "egg") {
      $("eggs").children[a.rank].click();
      $("targets").children[a.kind].click();
      $(
        { down: "top", up: "bottom", left: "rightEdge", right: "leftEdge" }[
          a.dir
        ],
      ).children[a.lane].click();
    } else if (a.type === "single") {
      click("single");
      $("board").children[a.index].click();
      $("targets").children[a.kind].click();
    } else {
      click("bulk");
      $("sources").children[a.from].click();
      $("targets").children[a.kind].click();
    }
    await wait();
  }
  await action(cert.actions[0]);
  click("undo");
  assert.equal($("dialog").open, true);
  $("dialogChoices").lastChild.click();
  assert.equal($("moves").textContent, "1");
  click("undo");
  $("dialogChoices").firstChild.click();
  assert.equal($("moves").textContent, "0");
  assert.equal($("undo").disabled, true);
  for (const a of cert.actions) await action(a);
  assert.equal($("dialogTitle").textContent, "おめでとう！");
  assert.match($("dialogText").textContent, /れんしゅうクリア/);
  const d = JSON.parse(localStorage.getItem("naopoyo-slide-player-v1"));
  assert.deepEqual(d.snapshot.state, cert.final);
  assert.equal(d.practice.plays, 1);
  assert.equal(d.normal.plays, 0);
  assert.equal(localStorage.getItem("naotocchi-save-v1"), null);
  global.fetch=async()=>{throw Error('offline retry test')};
  $('dialogChoices').firstChild.click();await wait();
  assert.equal($('setup').hidden,false,'failed retry returns to visible setup');
  assert.match($('boot').textContent,/offline retry test/);
  console.log(
    "Player DOM: actual controls replay, undo confirmation/cancel, all resources, victory, practice record, main save protection PASS",
  );
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
