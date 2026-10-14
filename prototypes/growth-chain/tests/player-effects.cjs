const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const root = path.resolve(__dirname, "../../.."),
    out = path.resolve(__dirname, "../qa-player-20261014");
  fs.mkdirSync(out, { recursive: true });
  const { Player } = await import("../player-model.mjs"),
    { createSession } = await import("../session.mjs"),
    { standardRules } = await import("../rules.mjs"),
    { board } = await import("../engine.mjs"),
    { INITIAL_SPECIES } = await import("../roster.mjs");
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
  const errors = [];
  async function open(snapshot) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    if (snapshot)
      await ctx.addInitScript((d) => {
        if (!localStorage.getItem("naopoyo-player-v1"))
          localStorage.setItem(
            "naopoyo-player-v1",
            JSON.stringify({
              version: 1,
              revision: 0,
              snapshot: d,
              history: [],
              seen: {},
              totals: {},
              preferences: { selected: [] },
            }),
          );
      }, snapshot);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `http://127.0.0.1:${server.address().port}/prototypes/growth-chain/player.html`,
    );
    await page.waitForFunction(
      () => !document.getElementById("playStart").disabled,
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
    return { ctx, page };
  }

  try {
    for (const n of [3, 5, 6]) {
      const r = standardRules(),
        b = board(r);
      for (let s = 1; s <= n; s++) b[14 - s][0] = { id: s, k: 0, s };
      const state = createSession(1, r, { board: b, species: INITIAL_SPECIES });
      state.queue[0] = [0, 1];
      const { ctx, page } = await open(new Player(state).snapshot());
      await page.locator("#restore").click();
      await page.locator("#resume").click();
      await page.locator("#left").click();
      await page.locator("#rotate").click();
      await page.locator("#drop").click();
      await page.waitForFunction(
        (n) =>
          document.querySelector("#status").textContent.startsWith(n + "連鎖"),
        n,
      );
      await page.screenshot({ path: `${out}/chain-${n}.png` });
      if (n === 6)
        assert.ok(await page.locator("#celebration.grand-chain").count());
      await page.waitForFunction(
        () => document.querySelector("#board").dataset.phase === "playing",
      );
      await page.locator("#pause").click();
      const d = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("naopoyo-player-v1")),
      );
      assert.equal(d.snapshot.maxChain, n);
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log("player effects:actual 3/5/6-chain trace and celebration PASS");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
