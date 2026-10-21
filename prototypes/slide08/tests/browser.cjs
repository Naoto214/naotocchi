const assert = require('node:assert/strict');
const { chromium } = require(process.env.SLIDE08_PLAYWRIGHT || 'playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || chromium.executablePath(),
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/prototypes/slide08/');
  await page.waitForFunction(() =>
    document.querySelector('#proofStatus')?.textContent.includes('確認済み'),
  );
  assert.equal(await page.locator('#board button').count(), 36);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator('#replayAll').click();
  await page.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('クリア'),
  );
  assert.equal(await page.locator('#moves').textContent(), '17');
  await page.locator('#reset').click();
  assert.equal(await page.locator('#moves').textContent(), '0');
  await page.locator('#replayOne').click();
  assert.equal(await page.locator('#moves').textContent(), '1');
  await page.locator('#replayAll').click();
  await page.locator('#reset').click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#moves').textContent(), '0');
  await page
    .getByText('比較設定・試験生成（解法未証明）', { exact: true })
    .click();
  await page.locator('#cost').selectOption('2');
  await page.locator('#generate').click();
  assert.match(await page.locator('#proofStatus').textContent(), /未証明/);
  await page.locator('#kind').selectOption('1');
  await page.locator('#mode').selectOption('single');
  const before = await page.locator('#moves').textContent();
  await page.locator('#cancel').click();
  assert.equal(await page.locator('#moves').textContent(), before);
  await page.screenshot({ path: '/tmp/slide08-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    'Browser: mobile layout, 17-step replay, reset/cancel race, unproven settings PASS',
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
