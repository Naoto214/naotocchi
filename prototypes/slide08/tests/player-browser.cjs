const { chromium } = require(process.env.SLIDE08_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH,
    args: ["--no-sandbox"],
  });
  const out = path.resolve(__dirname, "../qa-series");
  fs.mkdirSync(out, { recursive: true });
  const errors = [];
  let count = 0;
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [414, 896],
    [430, 932],
  ]) {
    const context = await browser.newContext({
        viewport: { width, height },
        isMobile: true,
        hasTouch: true,
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8765/prototypes/naopoyo/");
    await page.locator("#slidePreview span").last().waitFor();
    assert.equal(await page.locator("#slidePreview span").count(), 36);
    assert.equal(await page.locator("#dropPreview span").count(), 72);
    await page.locator("#favoritesButton").click();
    assert.equal(await page.locator("#gallery button").count(), 5);
    await page.locator("#sets button").nth(1).click();
    await page.locator("#saveFavorites").click();
    await page.locator("[data-home]").first().click();
    await page.screenshot({ path: path.join(out, `entry-${width}.png`) });
    await page.locator('a[href="../slide08/player.html"]').click();
    await page.waitForFunction(
      () => !document.querySelector("#start").disabled,
    );
    assert.equal(await page.locator("#choices button").count(), 5);
    await page.locator("#start").click();
    await page.locator("#game").waitFor({ state: "visible" });
    assert.equal(await page.locator("#board button").count(), 36);
    const layout = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth > innerWidth,
      bottom: document.querySelector("#status").getBoundingClientRect().bottom,
      height: innerHeight,
      buttons: [
        ...document.querySelectorAll("#tools button,#undo,#pause,#back"),
      ].map((b) => b.getBoundingClientRect().height),
      broken: [...document.querySelectorAll("#board img")].some(
        (i) => !i.complete || !i.naturalWidth,
      ),
    }));
    assert.equal(layout.scroll, false);
    assert.ok(layout.bottom <= height, JSON.stringify(layout));
    assert.ok(layout.buttons.every((h) => h >= 44));
    assert.equal(layout.broken, false);
    await page.screenshot({ path: path.join(out, `slide-${width}.png`) });
    if (width === 375)
      console.log(
        "VISUALQA-slide:" +
          (await page.screenshot({ type: "jpeg", quality: 55 })).toString(
            "base64",
          ),
      );
    await page.locator("#eggs button").first().click();
    await page.locator("#targets button").first().click();
    await page.screenshot({ path: path.join(out, `egg-${width}.png`) });
    if (width === 375)
      console.log(
        "VISUALQA-egg:" +
          (await page.screenshot({ type: "jpeg", quality: 55 })).toString(
            "base64",
          ),
      );
    assert.ok(
      await page
        .locator("#top button")
        .first()
        .evaluate((b) => b.getBoundingClientRect().height >= 44),
    );
    await page.locator("#cancel").click();
    // Complete the saved certificate using only the actual player controls.
    const saved = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("naopoyo-slide-player-v1")).snapshot,
      ),
      cert = JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "../balance-20261015/results", saved.proof),
        ),
      );
    async function action(a) {
      if (a.type === "slide")
        await page.keyboard.press(
          {
            left: "ArrowLeft",
            right: "ArrowRight",
            up: "ArrowUp",
            down: "ArrowDown",
          }[a.dir],
        );
      else if (a.type === "egg") {
        await page.locator("#eggs button").nth(a.rank).click();
        await page.locator("#targets button").nth(a.kind).click();
        await page
          .locator(
            "#" +
              {
                down: "top",
                up: "bottom",
                right: "leftEdge",
                left: "rightEdge",
              }[a.dir] +
              " button",
          )
          .nth(a.lane)
          .click();
      } else if (a.type === "single") {
        await page.locator("#single").click();
        await page.locator("#board button").nth(a.index).click();
        await page.locator("#targets button").nth(a.kind).click();
      } else {
        await page.locator("#bulk").click();
        await page.locator("#sources button").nth(a.from).click();
        await page.locator("#targets button").nth(a.kind).click();
      }
    }
    // Real pointer drag, followed by the same undo contract as keyboard input.
    if (cert.actions[0].type === "slide") {
      const box = await page.locator("#board").boundingBox(),
        d = cert.actions[0].dir;
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(
        x + (d === "right" ? 60 : d === "left" ? -60 : 0),
        y + (d === "down" ? 60 : d === "up" ? -60 : 0),
        { steps: 5 },
      );
      await page.mouse.up();
      assert.equal(
        await page.evaluate(() => scrollY),
        0,
        "board drag must not scroll page",
      );
    } else await action(cert.actions[0]);
    await page.locator("#undo").click();
    await page.getByRole("button", { name: "キャンセル", exact: true }).click();
    assert.equal(await page.locator("#moves").textContent(), "1");
    await page.locator("#undo").click();
    await page.getByRole("button", { name: "戻す", exact: true }).click();
    assert.equal(await page.locator("#moves").textContent(), "0");
    assert.equal(await page.locator("#undo").isDisabled(), true);
    await page.reload();
    await page.locator("#restore").waitFor({ state: "visible" });
    await page.locator("#restore").click();
    await page.getByRole("button", { name: "再開", exact: true }).click();
    assert.match(await page.locator("#practice").textContent(), /れんしゅう/);
    for (const a of cert.actions) await action(a);
    await page.locator("dialog[open]").waitFor();
    assert.equal(
      await page.locator("#dialogTitle").textContent(),
      "おめでとう！",
    );
    assert.match(
      await page.locator("#dialogText").textContent(),
      /れんしゅうクリア/,
    );
    const d = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("naopoyo-slide-player-v1")),
    );
    assert.deepEqual(d.snapshot.state, cert.final);
    assert.equal(d.practice.plays, 1);
    assert.equal(d.normal.plays, 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("naotocchi-save-v1")),
      null,
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("naopoyo-player-v1")),
      null,
    );
    await page.screenshot({ path: path.join(out, `victory-${width}.png`) });
    await page
      .locator("#dialogChoices")
      .getByRole("button", { name: "モード選択へ戻る", exact: true })
      .click();
    await page
      .locator('.mode-card[href="../growth-clear/player.html"]')
      .click();
    await page.locator("#menu").waitFor({ state: "visible" });
    await page.locator("#new").click();
    await page.locator("#board").waitFor({ state: "visible" });
    assert.match(await page.locator("#cost-label").innerText(), /2 \/ 6/);
    assert.equal(await page.evaluate(() => localStorage.getItem("naopoyo-player-v1")), null);
    await page.screenshot({ path: path.join(out, `drop-${width}.png`) });
    count++;
    await context.close();
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    `PASS ${count} iPhone sizes: series, favorites, item controls, witness replay, undo/cancel/reload, practice records, drop entry, main save protection, no page errors`,
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
