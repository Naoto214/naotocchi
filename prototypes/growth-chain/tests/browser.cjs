const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "/root/.cache/ms-playwright/chromium-1161/chrome-linux/chrome",
  });
  try {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:8765/prototypes/growth-chain/");
      await page.waitForSelector("#board .cell", { timeout: 3000 });
      assert.equal(await page.locator("#board .cell").count(), 72);
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
        path: `/tmp/growth-ui-${viewport.width}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log("browser 2 viewports PASS");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
