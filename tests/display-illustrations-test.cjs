const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createDOM} = require('./helpers/display-dom.cjs');

function load() {
  const context = vm.createContext({});
  const filename = path.join(__dirname, '..', 'display-illustrations.js');
  if (fs.existsSync(filename)) vm.runInContext(fs.readFileSync(filename, 'utf8'), context);
  assert.equal(typeof context.NaotocchiDisplayIllustrations?.create, 'function', 'display adapter exports create');
  return context.NaotocchiDisplayIllustrations;
}
const iconHTML = emoji => emoji === '💰'
  ? '<i class="care-icon" data-care-icon="coin" aria-label="コイン"><span class="icon-fallback">💰</span></i>'
  : emoji === '🌸'
    ? '<span class="comment-drawing"><svg><title>さくら</title><path d="M0 0"></path></svg><span class="icon-fallback">🌸</span></span>'
    : '';

test('initial decoration preserves all text, existing elements and listeners', () => {
  const adapter = load();
  const document = createDOM();
  const button = document.createElement('button');
  button.id = 'reward'; button.setAttribute('data-value', '💰5000');
  const literal = '<img src=x onerror="bad()">💰5000 & 🌸!';
  button.textContent = literal;
  let clicks = 0; button.addEventListener('click', () => { clicks++; });
  document.body.appendChild(button);
  adapter.create({document, iconHTML}).install(document.body);

  assert.equal(document.body.firstChild, button);
  assert.equal(button.id, 'reward');
  assert.equal(button.getAttribute('data-value'), '💰5000');
  assert.equal(button.textContent, literal);
  assert.equal(button.querySelectorAll('.display-icon').length, 2);
  assert.equal(button.querySelectorAll('.display-source').length, 2);
  assert.ok(button.querySelectorAll('.display-source').every(node => node.hidden));
  assert.equal(button.querySelectorAll('.icon-fallback').length, 0);
  assert.equal(button.querySelectorAll('img').length, 0, 'ordinary text never enters an HTML parser');
  assert.equal(button.querySelector('i').getAttribute('data-care-icon'), 'coin');
  assert.equal(button.querySelector('svg').textContent, '', 'SVG titles do not add to game-observed text');
  button.dispatchEvent({type:'click'}); assert.equal(clicks, 1);
});

test('token auditing keeps joined, modified, flag and keycap glyphs whole', () => {
  const adapter = load();
  const subdivisionFlag = '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
  const text = '© 2026 ® plain ©️ ®️ ❤️‍🔥 👩🏽‍🚀 👍🏿 👨‍👩‍👧‍👦 🇯🇵 1️⃣ *⃣ ' + subdivisionFlag + ' \uE000';
  assert.deepEqual(Array.from(adapter.tokens(text)), [
    '©️', '®️', '❤️‍🔥', '👩🏽‍🚀', '👍🏿', '👨‍👩‍👧‍👦', '🇯🇵', '1️⃣', '*⃣', subdivisionFlag, '\uE000',
  ]);
});

test('unknown whole sequences remain unchanged even when a component is known', () => {
  const adapter = load(), document = createDOM();
  const text = '❤️‍🔥 👩🏽‍🚀 👍🏿 🇯🇵 1️⃣ © 2026 ®';
  document.body.textContent = text;
  adapter.create({document, iconHTML: emoji => ['❤️', '👩', '👍', '🇯', '1', '©', '®'].includes(emoji)
    ? '<i class="wrong-partial-match"></i>' : ''}).install(document.body);
  assert.equal(document.body.textContent, text);
  assert.equal(document.body.querySelectorAll('.display-icon').length, 0);
});

test('editing controls and existing illustration subtrees remain untouched', () => {
  const adapter = load(), document = createDOM();
  const excluded = ['script','style','input','textarea','option','svg','canvas'];
  const classes = ['icon-fallback','character-emoji-fallback','character-visual','comment-picture',
    'comment-drawing','mg-food-picture','care-icon','scenery-picture','display-icon','display-source'];
  const skipped = [];
  for (const name of excluded) { const node = document.createElement(name); node.textContent = '💰'; skipped.push(node); }
  for (const name of classes) { const node = document.createElement('span'); node.className = name; node.textContent = '💰'; skipped.push(node); }
  const editor = document.createElement('div'); editor.setAttribute('contenteditable', 'true');
  const nested = document.createElement('span'); nested.textContent = '💰'; editor.appendChild(nested); skipped.push(editor);
  for (const node of skipped) document.body.appendChild(node);
  adapter.create({document, iconHTML}).install(document.body);
  for (const node of skipped) {
    assert.equal(node.textContent, '💰');
    assert.equal(node.querySelectorAll('.display-icon').length, 0, node.tagName + ' ' + node.className);
  }
  nested.textContent = '🌸'; document.flushMutations();
  assert.equal(nested.firstChild.nodeType, 3, 'later edits inside editable ancestors stay text');
});

test('later added subtrees and character edits are decorated without rescanning unaffected text', () => {
  const adapter = load(), document = createDOM(), calls = [];
  const quiet = document.createElement('p'); quiet.textContent = '🤖'; document.body.appendChild(quiet);
  const changing = document.createTextNode('待機'); document.body.appendChild(changing);
  const renderer = adapter.create({document, iconHTML: emoji => { calls.push(emoji); return iconHTML(emoji); }});
  const stop = renderer.install(document.body);
  assert.deepEqual(calls, ['🤖']);
  assert.equal(renderer.install(document.body), stop, 'reinstalling the same root reuses its observer');
  const later = document.createElement('p'); later.textContent = '💰'; document.body.appendChild(later);
  const nested = document.createElement('b'); later.appendChild(nested); nested.textContent = ' 🌸';
  changing.nodeValue = 'おめでとう💰';
  assert.ok(document.flushMutations() <= 2, 'generated markup settles without observer loops');
  assert.deepEqual(calls, ['🤖', '💰', '🌸', '💰']);
  assert.equal(later.textContent, '💰 🌸');
  assert.equal(later.querySelectorAll('.display-icon').length, 2);
  assert.equal(document.body.querySelectorAll('.display-icon').length, 3);
  later.textContent = '🌸更新'; document.flushMutations();
  assert.equal(later.textContent, '🌸更新');
  assert.equal(later.querySelectorAll('.display-icon').length, 1);
  stop();
  later.textContent = '💰停止後'; document.flushMutations();
  assert.equal(later.querySelectorAll('.display-icon').length, 0);
});

test('nodes removed before observer delivery are ignored', () => {
  const adapter = load(), document = createDOM();
  adapter.create({document, iconHTML}).install(document.body);
  const retired = document.createElement('p'); retired.textContent = '💰';
  document.body.appendChild(retired); retired.remove();
  document.flushMutations();
  assert.equal(retired.firstChild.nodeType, 3);
  assert.equal(retired.textContent, '💰');
});

test('the current actor marker passes through the same display resolver', () => {
  const adapter = load(), document = createDOM();
  document.body.textContent = 'ごほうび\uE000';
  adapter.create({document, iconHTML: emoji => emoji === '\uE000'
    ? '<span class="character-visual" role="img" aria-label="ほし"><img alt="" src="star/05.png"></span>' : ''}).install(document.body);
  assert.equal(document.body.textContent, 'ごほうび\uE000');
  assert.equal(document.body.querySelectorAll('.display-icon').length, 1);
  assert.equal(document.body.querySelector('.character-visual').getAttribute('aria-label'), 'ほし');
  assert.equal(document.body.querySelector('img').getAttribute('src'), 'star/05.png');
});
