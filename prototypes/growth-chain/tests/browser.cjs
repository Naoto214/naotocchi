const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, "../../..");
  const { createSession, stateData, stateHash } =
    await import("../session.mjs");
  const { board } = await import("../engine.mjs");
  const { standardRules } = await import("../rules.mjs");
  const rules = standardRules(),
    b = board(rules);
  b[13][0] = { id: 1, k: 0, s: 1 };
  b[13][1] = { id: 2, k: 1, s: 1 };
  const endowed = createSession(1, rules, {
    board: b,
    gauge: 48,
    eggs: [1, 1, 1, 1],
  });
  const endowedLog = JSON.stringify({
    version: endowed.version,
    initial: stateData(endowed),
    actions: [],
    hash: stateHash(endowed),
  });
  const server = http.createServer((req, res) => {
    const file = path.resolve(
      root,
      "." + (req.url.endsWith("/") ? req.url + "index.html" : req.url),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const type = file.endsWith(".mjs")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : file.endsWith(".png")
          ? "image/png"
          : "text/html";
    fs.readFile(file, (err, data) => {
      res.writeHead(err ? 404 : 200, { "Content-Type": type });
      res.end(err ? "missing" : data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.unref();
  const url = `http://127.0.0.1:${server.address().port}/prototypes/growth-chain/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
  });
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
      { width: 375, height: 667 },
      { width: 844, height: 390 },
    ]) {
      const page = await browser.newPage({ viewport, hasTouch: true });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      if (process.env.QA_FONT_CSS) {
        const cssFile = process.env.QA_FONT_CSS;
        const css = fs
          .readFileSync(cssFile, "utf8")
          .replace(
            /url\(([^)]+)\)/g,
            (_, name) =>
              `url(data:font/woff2;base64,${fs.readFileSync(path.resolve(path.dirname(cssFile), name.replace(/["']/g, ""))).toString("base64")})`,
          );
        await page.addStyleTag({
          content: css + '\nbody {font-family:"Noto Sans JP",sans-serif;}',
        });
        await page.evaluate(() => document.fonts.ready);
      }
      await page.waitForSelector("#board .cell", { timeout: 3000 });
      assert.equal(await page.locator("#board .cell").count(), 72);
      assert.equal(await page.locator("#labPanel").isVisible(), false);
      assert.equal(
        await page.locator("#board").getAttribute("data-phase"),
        "falling",
      );
      await page.waitForFunction(() =>
        [...document.querySelectorAll("#board img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      );
      const boardRect = await page.locator("#board").boundingBox(),
        railRect = await page.locator(".toolbelt").boundingBox();
      assert.ok(
        railRect.x >= boardRect.x + boardRect.width,
        "tools right of board",
      );
      assert.ok(
        await page
          .locator(".toolbelt button:not(.lab-only)")
          .evaluateAll((ns) =>
            ns.every((n) => n.getBoundingClientRect().height >= 44),
          ),
      );

      const left = await page.locator("#left").boundingBox();
      await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(400);
      await page.mouse.up();
      await page.locator("#rotate").tap();
      await page.locator("#drop").click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `${path.resolve(__dirname, "../qa-final-20261014")}/growth-play-${viewport.width}.png`,
        fullPage: true,
      });
      assert.ok(
        await page
          .locator(".controls button")
          .evaluateAll((nodes) =>
            nodes.every(
              (n) =>
                n.getBoundingClientRect().height >= 44 &&
                n.getBoundingClientRect().width >= 44,
            ),
          ),
      );
      await page.locator("#toggleLab").click();
      await page.locator("#fixture5").click();
      await page.locator("#trigger").click();
      if (await page.locator("#finishWave").isEnabled())
        await page.locator("#finishWave").click();
      assert.match(await page.locator("#status").innerText(), /5連鎖/);
      await page.locator("summary").filter({ hasText: "比較用ルール" }).click();
      await page.locator("#restart").click();
      assert.match(await page.locator("#stats").innerText(), /落下 0/);
      await page.locator("#drop").click();
      if (await page.locator("#finishWave").isEnabled())
        await page.locator("#finishWave").click();
      assert.match(await page.locator("#stats").innerText(), /落下 1/);
      await page.locator("summary").filter({ hasText: "再現データ" }).click();
      await page.locator("#export").click();
      const value = await page.locator("#json").inputValue();
      assert.ok(JSON.parse(value).hash);
      await page.locator("#import").click();
      assert.match(await page.locator("#stats").innerText(), /落下 1/);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${path.resolve(__dirname, "../qa-final-20261014")}/growth-ui-${viewport.width}.png`,
        fullPage: true,
      });
      await page.locator("#json").fill(endowedLog);
      await page.locator("#import").click();
      await page.locator("#toggleLab").click();
      await page.locator("#tool-transform").tap();
      await page.locator('#board [data-x="0"][data-y="13"]').tap();
      await page.locator('#kindChoices [data-kind="1"]').tap();
      assert.ok(await page.locator(".preview-piece").count());
      await page.screenshot({
        path: `${path.resolve(__dirname, "../qa-final-20261014")}/growth-tool-${viewport.width}.png`,
        fullPage: true,
      });
      await page.locator("#confirmTool").tap();
      await page.waitForFunction(
        () => document.getElementById("board").dataset.phase === "falling",
      );
      await page.locator("#toggleLab").click();
      await page.locator("#export").click();
      assert.equal(
        JSON.parse(await page.locator("#json").inputValue()).actions.length,
        1,
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "Chromium new-standard 4 viewports PASS; iPhone hardware Safari NOT tested",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
