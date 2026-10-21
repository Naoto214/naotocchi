const { JSDOM } = require("jsdom"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const dom = new JSDOM(
  fs.readFileSync(
    path.join(__dirname, "../growth-chain-standalone.html"),
    "utf8",
  ),
  {
    runScripts: "dangerously",
    beforeParse(window) {
      window.structuredClone = structuredClone;
    },
  },
);
try {
  const d = dom.window.document;
  assert.equal(d.querySelectorAll("link[href],script[src]").length,0,"standalone must have no external resources");
  assert.equal(d.querySelectorAll("#board .cell").length, 72);
  d.getElementById("natural5").click();
  d.getElementById("trigger").click();
  assert.match(d.getElementById("status").textContent, /5連鎖/);
  d.getElementById("restart").click();
  assert.match(d.getElementById("stats").textContent, /落下 0/);
  console.log("standalone offline DOM PASS");
} finally {
  dom.window.close();
}
