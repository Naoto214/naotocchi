const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const root = path.resolve(__dirname, "../../.."),
    out = process.env.QA_OUT || path.resolve(__dirname, "../qa-player-20261014");
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(root + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (e, d) => {
      res.writeHead(e ? 404 : 200, {
        "Content-Type": file.endsWith(".mjs")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".png")
              ? "image/png"
              : "text/html",
      });
      res.end(e ? "missing" : d);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell",
    headless: true,
  });
  try {
    for (const [w, h] of [
      [320, 568],
      [375, 667],
      [390, 844],
      [430, 932],
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        hasTouch: true,
      });
      const page = await ctx.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        `http://127.0.0.1:${server.address().port}/prototypes/growth-chain/player.html`,
      );
      if (process.env.QA_FONT_CSS) {
        const f = process.env.QA_FONT_CSS;
        const css = fs
          .readFileSync(f, "utf8")
          .replace(
            /url\(([^)]+)\)/g,
            (_, v) =>
              `url(data:font/woff2;base64,${fs.readFileSync(path.resolve(path.dirname(f), v.replace(/["']/g, ""))).toString("base64")})`,
          );
        await page.addStyleTag({
          content: css + '\nbody{font-family:"Noto Sans JP",sans-serif}',
        });
        await page.evaluate(() => document.fonts.ready);
      }
      if (w === 390) await page.screenshot({ path: `${out}/title.png` });
      await page.locator("#playStart").click();
      if (w === 390) await page.screenshot({ path: `${out}/modes.png` });
      await page.locator('[data-mode="clear"]').click();
      if (w === 390)
        await page.screenshot({
          path: `${out}/characters.png`,
          fullPage: true,
        });
      await page.locator("#startSelected").click();
      await page.locator("#board .cell").first().waitFor();
      const geom = await page.evaluate(() => {
        const b = document.querySelector("#board").getBoundingClientRect();
        return {
          ratio: b.height / b.width,
          count: document.querySelectorAll("#board .cell").length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          railFits:
            document.querySelector("#bulk").getBoundingClientRect().bottom <=
            document.querySelector(".rail").getBoundingClientRect().bottom,
          buttons: [
            ...document.querySelectorAll(
              ".controls button, #normalRail button",
            ),
          ].map((e) => {
            let r = e.getBoundingClientRect();
            return [r.width, r.height, r.bottom];
          }),
        };
      });
      assert.equal(geom.count, 72);
      assert.ok(Math.abs(geom.ratio - 2) < 0.01);
      assert.equal(geom.overflow, false);
      assert.equal(
        geom.railFits,
        true,
        "all tools must fit without rail scrolling",
      );
      assert.ok(
        geom.buttons.every(([x, y, b]) => x >= 44 && y >= 44 && b <= h),
      );
      await page.locator("#left").tap();
      await page.locator("#ccw").tap();
      await page.locator("#drop").tap();
      await page.waitForTimeout(1500);
      await page.locator("#pause").click();
      await page.screenshot({ path: `${out}/pause-${w}.png` });
      await page.locator("#resume").click();
      await page.screenshot({ path: `${out}/play-${w}.png` });
      assert.deepEqual(errors, []);
      await ctx.close();
    }
    console.log("player browser:4 portrait sizes PASS");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
