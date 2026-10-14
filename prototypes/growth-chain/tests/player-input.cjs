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

  const saveData = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem("naopoyo-player-v1")));
  async function pointer(page, type, id, x, y) {
    await page.locator("#board").evaluate(
      (b, v) =>
        b.dispatchEvent(
          new PointerEvent(v.type, {
            pointerId: v.id,
            pointerType: "touch",
            clientX: v.x,
            clientY: v.y,
            bubbles: true,
          }),
        ),
      { type, id, x, y },
    );
  }
  async function pose(page) {
    await page.locator("#pause").click();
    const p = (await saveData(page)).snapshot.pose;
    await page.locator("#resume").click();
    return p;
  }
  try {
    {
      const { ctx, page } = await open();
      await page.locator("#playStart").click();
      await page.locator('[data-mode="endless"]').click();
      await page.locator("#startSelected").click();
      let r = await page.locator("#board").boundingBox(),
        x = r.x + r.width / 2,
        y = r.y + 60;
      // Synthetic PointerEvent lacks browser-managed pointer capture, so disable only that DOM API for dispatch tests.
      await page
        .locator("#board")
        .evaluate((b) => (b.setPointerCapture = () => {}));
      await pointer(page, "pointerdown", 1, x, y);
      await pointer(page, "pointerup", 1, x, y);
      assert.equal((await pose(page)).rot, 1);
      await pointer(page, "pointerdown", 1, x, y);
      await pointer(page, "pointerdown", 2, x + 15, y);
      await pointer(page, "pointerup", 1, x, y);
      await pointer(page, "pointerup", 2, x + 15, y);
      assert.equal((await pose(page)).rot, 0);
      await pointer(page, "pointerdown", 1, x, y);
      await pointer(page, "pointermove", 1, x - 60, y);
      await pointer(page, "pointerup", 1, x - 60, y);
      assert.equal((await pose(page)).x, 1);
      await pointer(page, "pointerdown", 1, x, y);
      await page.waitForTimeout(380);
      await pointer(page, "pointermove", 1, x, y + 50);
      await pointer(page, "pointerup", 1, x, y + 50);
      assert.ok((await pose(page)).y >= 3);
      await pointer(page, "pointerdown", 1, x, y);
      await pointer(page, "pointermove", 1, x, y + 100);
      await pointer(page, "pointerup", 1, x, y + 100);
      await page.waitForFunction(
        () => document.querySelector("#board").dataset.phase === "playing",
      );
      await page.locator("#pause").click();
      assert.equal((await saveData(page)).snapshot.state.drops, 1);
      await page.locator("#resume").click();
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.locator("#resume").waitFor();
      const d = await saveData(page);
      await page.waitForTimeout(1600);
      assert.deepEqual(await saveData(page), d);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: false,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      assert.ok(await page.locator("#resume").isVisible());
      await ctx.close();
    }
    // Terminal normal endless restore and retry preserves mode; screenshot genuine result.
    {
      const r = standardRules(),
        b = board(r);
      for (let y = 2; y < 14; y++)
        for (let x = 0; x < 6; x++)
          b[y][x] = { id: y * 6 + x, k: (x + y) % 5, s: 1 };
      const p = new Player(
        createSession(1, r, { board: b, species: INITIAL_SPECIES }),
        { mode: "endless" },
      );
      p.resume();
      p.settle();
      assert.equal(p.phase, "over");
      const { ctx, page } = await open(p.snapshot());
      await page.locator("#restore").click();
      await page
        .getByRole("heading", { name: "ここまで そだったね" })
        .waitFor();
      await page.screenshot({ path: `${out}/gameover.png` });
      await page.getByRole("button", { name: "もう一度", exact: true }).click();
      await page.locator("#pause").click();
      assert.equal((await saveData(page)).snapshot.mode, "endless");
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "player input:tap/2finger/swipe/drag/flick,hidden/manual-resume,endless-retry PASS",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
