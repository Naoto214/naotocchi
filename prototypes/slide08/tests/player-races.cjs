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
  let resolveFetch;
  global.fetch = async (file) =>
    new Promise((resolve) => {
      resolveFetch = () =>
        resolve({
          ok: true,
          json: async () =>
            JSON.parse(fs.readFileSync(path.join(root, file), "utf8")),
        });
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
  click("start");
  const before = [...$("choices").querySelectorAll(".selected")].length;
  $("choices").children[0].click();
  assert.equal([...$("choices").querySelectorAll(".selected")].length, before);
  Object.defineProperty(document, "hidden", {
    value: true,
    configurable: true,
  });
  document.dispatchEvent(new dom.window.Event("visibilitychange"));
  resolveFetch();
  await wait();
  await wait();
  const snap = JSON.parse(
    localStorage.getItem("naopoyo-slide-player-v1"),
  ).snapshot;
  assert.equal(snap.species.length, 3);
  assert.equal($("dialogTitle").textContent, "ひとやすみ");
  for (const fn of intervals) fn();
  assert.equal(
    JSON.parse(localStorage.getItem("naopoyo-slide-player-v1")).snapshot
      .elapsedMs,
    0,
  );
  console.log("Loading selection and hidden-tab pause races PASS");
  dom.window.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
