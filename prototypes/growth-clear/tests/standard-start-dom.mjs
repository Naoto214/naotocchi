import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Player } from '../player-model.mjs';
import { createSession } from '../session.mjs';
import { Player as OldPlayer } from '../../growth-chain/player-model.mjs';
import { createSession as oldSession } from '../../growth-chain/session.mjs';
import { Settings, SETTINGS_KEY } from '../../naopoyo/settings.mjs';
import { INITIAL_SPECIES } from '../../growth-chain/roster.mjs';
import { PlayerStore } from '../../growth-chain/player-store.mjs';
const { JSDOM } = createRequire(import.meta.url)(process.env.JSDOM_PATH || '/tmp/naopoyo-ui-deps/node_modules/jsdom');
const html = fs.readFileSync(new URL('../player.html', import.meta.url), 'utf8');
const series = new JSDOM(fs.readFileSync(new URL('../../naopoyo/legacy.html', import.meta.url), 'utf8')).window.document;
assert.equal(series.querySelectorAll('.mode-card')[1].getAttribute('href'), '../growth-clear/player.html');
const KEY = 'naopoyo-growth-clear-phone-v1';
const old = new OldPlayer(oldSession(214));
const history = [{ id: 'old:clear', category: 'clear', score: 77, deaths: 1, maxChain: 3 }];
for (const scenario of ['empty', 'old', 'both2', 'both8', 'corruptOld', 'corruptNew']) {
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
  for (const k of ['window', 'document', 'Option', 'localStorage']) globalThis[k] = dom.window[k];
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  globalThis.requestAnimationFrame = () => {};
  if (scenario !== 'empty') {
    const store = new PlayerStore(localStorage); store.load(); store.save(old.snapshot(), history);
  }
  if (scenario === 'corruptOld') localStorage.setItem('naopoyo-player-v1', '{broken');
  let saved;
  if (scenario.startsWith('both')) {
    const p = new Player(createSession(385, { gaugeUnit: scenario === 'both8' ? 8 : 2 }));
    p.resume(); p.drop(); p.settle(); p.motion('left'); p.advance(150); p.pause();
    saved = p.checkpoint();
    const store = new PlayerStore(localStorage, KEY); store.load(); store.save(saved, [], { sound: true, reduced: true });
  }
  if (scenario === 'corruptNew') localStorage.setItem(KEY, '{broken');
  localStorage.setItem('naotocchi-save-v1', 'main-unchanged');
  localStorage.setItem('naopoyo-slide-player-v1', 'slide-unchanged');
  const favorites = new Settings(localStorage, INITIAL_SPECIES);
  const shared = favorites.load(); shared.sets[0].reverse(); favorites.save(shared);
  const protectedKeys = ['naopoyo-player-v1', 'naotocchi-save-v1', 'naopoyo-slide-player-v1', SETTINGS_KEY];
  const before = protectedKeys.map(k => localStorage.getItem(k));
  const newBefore = localStorage.getItem(KEY);
  await import(`../phone.mjs?standard=${scenario}`);
  const $ = id => document.getElementById(id);
  assert.equal(localStorage.getItem(KEY), newBefore, `${scenario}: opening never overwrites save`);
  assert.equal($('developer').open, false);
  assert.equal($('legacy').open, false);
  assert.equal(document.querySelector('[data-old-rule]').closest('details').id, 'legacy');
  if (scenario === 'old' || scenario.startsWith('both')) assert.match($('legacy-notice').textContent, /旧ルールの途中保存/);
  if (scenario === 'corruptOld') assert.match($('legacy-notice').textContent, /確認できません/);
  if (scenario === 'corruptNew') {
    assert.equal($('new').disabled, true); assert.equal($('resume').disabled, true);
    assert.equal(localStorage.getItem(KEY), '{broken');
  } else {
    if (saved) {
      $('resume').click();
      const resumed = JSON.parse(localStorage.getItem(KEY)).snapshot;
      for (const k of ['state', 'actions', 'pose', 'path', 'elapsed', 'fallMs', 'id']) assert.deepEqual(resumed[k], saved[k], `resume ${scenario}: ${k}`);
      $('pause').click();
    }
    $('cost').value = '8'; // Hidden developer selection must not leak into a normal start.
    $('new').click();
    assert.equal(JSON.parse(localStorage.getItem(KEY)).snapshot.state.rules.gaugeUnit, 2);
    assert.deepEqual(JSON.parse(localStorage.getItem(KEY)).snapshot.state.species, shared.sets[0]);
    $('pause').click(); assert.match($('resume').textContent, /続きから/);
    $('developer').open = true; $('cost').value = '8'; $('new').click();
    assert.equal(JSON.parse(localStorage.getItem(KEY)).snapshot.state.rules.gaugeUnit, 2, 'normal start remains2/6 even with developer controls open');
    $('pause').click(); $('developer-start').click();
    assert.equal(JSON.parse(localStorage.getItem(KEY)).snapshot.state.rules.gaugeUnit, 8);
    $('pause').click(); $('developer').open = false; $('new').click();
    assert.equal(JSON.parse(localStorage.getItem(KEY)).snapshot.state.rules.gaugeUnit, 2);
  }
  assert.deepEqual(protectedKeys.map(k => localStorage.getItem(k)), before, `${scenario}: protected raw saves`);
  dom.window.close();
  console.log(`PASS standard start/save compatibility: ${scenario}`);
}
