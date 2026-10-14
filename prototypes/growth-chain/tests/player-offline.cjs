const { chromium } = require("playwright"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell",
  });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("https://**", (r) => r.abort());
    await p.goto(
      "file://" + path.resolve(__dirname, "../naopoyo-player-standalone.html"),
    );
    await p.locator("#playStart").click();
    await p.locator('[data-mode="clear"]').click();
    await p.locator("#startSelected").click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll("#board img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    assert.equal(await p.locator("#board .cell").count(), 72);
    await p.locator("#drop").click();
    await p.locator("#pause").click();
    assert.ok(await p.locator("#resume").isVisible());
    assert.deepEqual(errors, []);
    console.log("standalone offline:embedded images,game,input,pause PASS");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
