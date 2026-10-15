const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require(process.env.SLIDE08_JSDOM || 'jsdom');
(async () => {
  const root = path.resolve(__dirname, '..'),
    dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
      url: 'http://localhost/',
    });
  global.window = dom.window;
  global.document = dom.window.document;
  global.Option = dom.window.Option;
  global.fetch = async (p) => {
    await new Promise((r) => setTimeout(r, 100));
    return {
      json: async () => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')),
    };
  };
  const $ = (id) => document.getElementById(id),
    click = (id) => $(id).click(),
    wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await import(pathToFileURL(path.join(root, 'ui.mjs')));
  click('reset');
  await wait(250);
  assert.match($('proofStatus').textContent, /確認済み/);
  assert.equal($('board').children.length, 36);
  click('replayAll');
  await wait(2800);
  assert.match($('status').textContent, /クリア/);
  assert.equal($('moves').textContent, '17');
  click('reset');
  assert.equal($('moves').textContent, '0');
  click('replayOne');
  assert.equal($('moves').textContent, '1');
  click('replayAll');
  click('reset');
  await wait(300);
  assert.equal($('moves').textContent, '0');
  $('mode').value = 'single';
  const target = [...$('board').children].find((b) =>
    b.className.includes('k0'),
  );
  target.click();
  $('kind').value = '1';
  click('use');
  assert.equal($('moves').textContent, '1');
  assert.equal(
    $('replayAll').disabled,
    false,
    'a manual move must retain access to restart the verified solution',
  );
  click('reset');
  click('replayOne');
  for (const button of document.querySelectorAll('[data-dir]')) {
    if ($('moves').textContent === '1') button.click();
  }
  assert.equal($('moves').textContent, '2');
  let exported;
  URL.createObjectURL = (b) => {
    exported = b;
    return 'blob:test';
  };
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') e.preventDefault();
  });
  click('export');
  assert.equal(JSON.parse(await exported.text()).automated, true);
  click('cancel');
  assert.equal($('moves').textContent, '2');
  $('cost').value = '2';
  click('generate');
  assert.match($('proofStatus').textContent, /未証明/);
  assert.equal($('replayAll').disabled, true);
  assert.equal($('moves').textContent, '0');
  console.log(
    'DOM: verified load, 17-step replay, reset race, single selection, manual/replay restart, cancel and unproven settings PASS',
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
