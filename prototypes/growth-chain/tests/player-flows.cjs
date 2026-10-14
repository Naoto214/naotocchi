const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const root = path.resolve(__dirname, "../../.."),
    out = process.env.QA_OUT || path.resolve(__dirname, "../qa-player-20261014");
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
  const snap = (unit = 8, stage = 3) => {
    const r = standardRules({ gaugeUnit: unit }),
      b = board(r);
    b[13][0] = { id: 1, k: 0, s: stage };
    b[13][1] = { id: 2, k: 1, s: stage };
    return new Player(
      createSession(1, r, {
        board: b,
        gauge: unit * 3,
        eggs: [1, 1, 1, 1],
        species: INITIAL_SPECIES,
        selected: [0, 1, 2, 3, 4],
      }),
    ).snapshot();
  };
  const saved = (page) =>
    page.evaluate(() => JSON.parse(localStorage.getItem("naopoyo-player-v1")));
  try {
    for (const unit of [8, 2, 3, 4]) {
      const { ctx, page } = await open(snap(unit));
      await page.locator("#restore").click();
      assert.ok(await page.locator("#resume").isVisible());
      await page.locator("#resume").click();
      assert.match(
        await page.locator("#transform").innerText(),
        new RegExp(`${unit}で`),
      );
      assert.match(
        await page.locator("#bulk").innerText(),
        new RegExp(`${unit * 3}で`),
      );
      await page.locator("#transform").click();
      await page.locator('#board [data-x="0"][data-y="13"]').tap();
      await page.locator('[data-kind="1"]').click();
      assert.ok(await page.locator(".direct").count());
      if (unit === 8) await page.screenshot({ path: `${out}/transform.png` });
      await page.locator("#cancelTool").click();
      await page.locator("#pause").click();
      assert.equal((await saved(page)).snapshot.state.gauge, unit * 3);
      await page.locator("#resume").click();
      await page.locator("#bulk").click();
      await page.locator("#sourceChoices button").first().click();
      await page.locator('[data-kind="1"]').click();
      if (unit === 8) await page.screenshot({ path: `${out}/bulk.png` });
      await page.locator("#confirmTool").click();
      await page.waitForFunction(
        () => document.querySelector("#board").dataset.phase === "playing",
      );
      await page.locator("#pause").click();
      assert.equal((await saved(page)).snapshot.state.gauge, 1);
      await page.locator("#resume").click();
      await page.locator('.egg[data-rank="0"]').click();
      await page.locator('[data-kind="2"]').click();
      await page.locator('#board [data-x="5"][data-y="13"]').tap();
      if (unit === 8) await page.screenshot({ path: `${out}/egg.png` });
      await page.locator("#confirmTool").click();
      await page.locator('.egg[data-rank="1"]').click();
      await page.waitForTimeout(1600);
      assert.ok(
        await page.locator("#toolPanel").isVisible(),
        "automatic falling must retain tool selection after a prior action",
      );
      await page.locator("#cancelTool").click();
      await page.locator("#pause").click();
      assert.equal((await saved(page)).snapshot.state.eggs[0], 1); // stage04 evolution supplied an extra ordinary egg before use
      const before = (await saved(page)).snapshot;
      await page.waitForTimeout(800);
      assert.deepEqual((await saved(page)).snapshot, before);
      await page.reload();
      await page.locator("#restore").click();
      assert.ok(await page.locator("#resume").isVisible());
      await ctx.close();
    }
    // Incomplete gallery selection must not break independent practice.
    {
      const { ctx, page } = await open();
      await page.locator("#playStart").click();
      await page.locator('[data-mode="endless"]').click();
      await page.locator("#gallery input").first().uncheck();
      await page.locator("#characters .back").click();
      await page.locator("#modes .back").click();
      await page.locator("#learn").click();
      await page.locator("#practiceBar").waitFor({ state: "visible" });
      await ctx.close();
    }
    // Six actual practice completions, no record writes.
    {
      const { ctx, page } = await open();
      await page.locator("#learn").click();
      await page.locator("#left").click();
      await page.locator("#rotate").click();
      await page.locator("#drop").click();
      await page.locator("#practiceNext").waitFor({ state: "visible" });
      await page.locator("#practiceNext").click();
      await page.locator("#drop").click();
      await page.locator("#practiceNext").waitFor({ state: "visible" });
      await page.locator("#practiceNext").click();
      await page.locator("#left").click();
      await page.locator("#rotate").click();
      await page.locator("#drop").click();
      await page.locator("#practiceNext").waitFor({ state: "visible" });
      await page.locator("#practiceNext").click();
      await page.locator('.egg[data-rank="0"]').click();
      await page.locator('[data-kind="0"]').click();
      await page.locator('#board [data-x="0"][data-y="13"]').tap();
      await page.locator("#confirmTool").click();
      await page.locator("#practiceNext").click();
      for (let step = 4; step <= 5; step++) {
        await page.locator("#transform").click();
        await page.locator('#board [data-x="0"][data-y="13"]').tap();
        await page.locator('[data-kind="1"]').click();
        await page.locator("#confirmTool").click();
        if (step === 5) {
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${out}/tutorial-life.png` });
        }
        await page.locator("#practiceNext").waitFor({ state: "visible" });
        await page.screenshot({ path: `${out}/tutorial-${step + 1}.png` });
        await page.locator("#practiceNext").click();
      }
      assert.equal((await saved(page)).history.length, 0);
      assert.equal((await saved(page)).preferences.tutorialDone, true);
      await ctx.close();
    }
    // Win, persistent clear record and continuing same board.
    {
      const { ctx, page } = await open(snap(8, 8));
      await page.locator("#restore").click();
      await page.locator("#resume").click();
      await page.locator("#transform").click();
      await page.locator('#board [data-x="0"][data-y="13"]').tap();
      await page.locator('[data-kind="1"]').click();
      await page.locator("#confirmTool").click();
      await page.waitForTimeout(300);
      await page.locator("#pause").click();
      assert.equal(
        await page
          .locator("#celebration")
          .evaluate((e) => getComputedStyle(e).animationPlayState),
        "paused",
      );
      const pausedData = await saved(page);
      await page.waitForTimeout(2800);
      assert.deepEqual(await saved(page), pausedData);
      await page.locator("#resume").click();
      await page.locator("#continueEndless").waitFor();
      await page.screenshot({ path: `${out}/victory.png` });
      const clear = await saved(page);
      assert.equal(clear.history.length, 1);
      assert.equal(clear.history[0].category, "clear");
      await page.locator("#continueEndless").click();
      await page.locator("#pause").click();
      assert.deepEqual((await saved(page)).history, clear.history);
      assert.deepEqual(
        (await saved(page)).snapshot.state.board,
        clear.snapshot.state.board,
      );
      await page
        .getByRole("button", { name: "タイトルへ", exact: true })
        .click();
      await page.locator('[data-screen="records"]').click();
      await page.screenshot({ path: `${out}/records.png` });
      await page.locator("#records .back").click();
      await page.locator('[data-screen="settings"]').click();
      await page.screenshot({ path: `${out}/settings.png` });
      const tab = await ctx.newPage();
      await tab.goto(page.url());
      await tab.waitForFunction(() =>
        document.getElementById("bootError").textContent.includes("別のタブ"),
      );
      assert.ok(await tab.locator("#playStart").isDisabled());
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "player flows:cost8/2/3/4,3tools,cancel,pause,restore,6practice,win/continue,records,exclusive-tab PASS",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
