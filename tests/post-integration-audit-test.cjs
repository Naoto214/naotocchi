const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');

const finalEquipmentIds = ['poop1', 'sleepboost1', 'bowtie', 'ribbon', 'scarf', 'travel1', 'partner1', 'bond1', 'gamepass1', 'star'];

function achievement(h, id) {
  const found = h.api.achievements.find((entry) => entry.id === id);
  assert.ok(found, `missing achievement: ${id}`);
  return found;
}

test('repetitive achievement thresholds use the approved moderate values', () => {
  const h = harness(), l = h.api.state().lifetime, s = h.api.state();
  const cases = [
    ['minigame-50', l, 'minigamesPlayed', 30],
    ['minigame-300', l, 'minigamesPlayed', 150],
    ['minigame-1000', l, 'minigamesPlayed', 500],
    ['devolve-20', l, 'devolutions', 10],
    ['transform-10', l, 'transforms', 5],
    ['transform-25', l, 'transforms', 15],
    ['death-5', l, 'deaths', 3],
    ['death-10', l, 'deaths', 5],
    ['sick-cured-10', l, 'sicknessCured', 5],
    ['sick-cured-30', l, 'sicknessCured', 15],
    ['feed-100', s.actionCounts, 'feed', 30],
    ['play-100', s.actionCounts, 'play', 30],
    ['pet-100', s.actionCounts, 'pet', 30],
    ['clean-50', s.actionCounts, 'clean', 20],
    ['medicine-30', s.actionCounts, 'medicine', 10],
    ['consumable-30', l, 'consumablesUsed', 15],
    ['lifeclear-10', l, 'lifeClears', 5],
    ['reset-20', l, 'resets', 10],
    ['clear-5', l, 'clears', 3],
    ['clear-10', l, 'clears', 5],
    ['clear-25', l, 'clears', 10],
  ];
  for (const [id, target, key, threshold] of cases) {
    const ach = achievement(h, id);
    target[key] = threshold - 1;
    assert.equal(ach.condition(l, s), false, `${id} before threshold`);
    target[key] = threshold;
    assert.equal(ach.condition(l, s), true, `${id} at threshold`);
  }
  l.pastLives = Array(4).fill({});
  assert.equal(achievement(h, 'pastlives-10').condition(l, s), false);
  l.pastLives.push({});
  assert.equal(achievement(h, 'pastlives-10').condition(l, s), true);
  l.minigameRecords = Object.fromEntries(h.api.games.slice(0, 10).map((game) => [game.id, {best:90,last:90}]));
  assert.equal(achievement(h, 'record-rank-s-15').condition(l, s), true);
  s.discoveredStages = Array.from({length:8}, (_, i) => `dog-${i}:7`);
  assert.equal(achievement(h, 'elder-collector').condition(l, s), true);
});

test('duplicate achievements are removed or given distinct collection scopes', () => {
  const h = harness(), s = h.api.state(), l = s.lifetime;
  assert.equal(h.api.achievements.some((entry) => entry.id === 'talk-100'), false);
  const shop = achievement(h, 'shop-all');
  const allItems = achievement(h, 'item-all');
  l.ownedShopItems = [...finalEquipmentIds];
  l.ownedConsumableItems = [];
  assert.equal(shop.condition(l, s), true);
  assert.equal(allItems.condition(l, s), false);
  l.ownedConsumableItems = h.api.CONSUMABLE_ITEMS.map((item) => item.id);
  assert.equal(allItems.condition(l, s), true);
});

test('romance completion copy describes dating every candidate, not merely meeting them', () => {
  const h = harness();
  assert.match(achievement(h, 'partner-all').desc, /こいびとになった/);
});

test('a correct Sudoku cell keeps the incomplete board; only the last cell advances once', () => {
  const h=harness();vm.runInContext('Math.random=()=>0.5',h.sandbox);
  h.api.state().ageTicks=0;
  h.api.startMinigame(h.api.games.find(g=>g.id==='sudoku-mini'));
  const view=h.get('minigameOverlay'),canvas=view.querySelector('#sdCanvas');
  const pad=view.querySelector('#sdPad'),round=view.querySelector('#sdRound');
  const put=(r,c,n)=>{
    h.dispatch(canvas,'pointerdown',{clientX:45+c*70,clientY:45+r*70,pointerId:1});
    const digit=pad.children.find(b=>b.dataset.v===String(n));
    digit.closest=selector=>selector==='button'?digit:null;
    pad.listeners.find(l=>l.type==='pointerdown'&&!l.capture).fn({target:digit,preventDefault(){}});
  };
  put(0,0,1);h.advance(1701);
  assert.equal(round.textContent,'1/3問目','one correct digit is not a completed board');
  for(const [r,c,n] of [[0,1,2],[0,2,3],[0,3,4],[1,0,3],[1,1,4],[1,2,1]])put(r,c,n);
  h.advance(1701);assert.equal(round.textContent,'2/3問目');
  h.advance(1701);assert.equal(round.textContent,'2/3問目','one solved board schedules one transition');
});

const rain=h=>(h.get('weatherFx').innerHTML.match(/wx-drop/g)||[]).length;
function rainyHome(reducedMotion=false) {
  const h=harness({reducedMotion});
  h.api.state().lifetime.weatherMode='rain';h.api.state().lifetime.timeMode='day';
  h.api.renderEnvironment();return h;
}
test('weather follows motion preferences immediately in both directions', () => {
  const h=rainyHome(true);assert.equal(rain(h),0);
  h.setReducedMotion(false);assert.equal(rain(h),42);
  h.setReducedMotion(true);assert.equal(rain(h),0);
});
test('returning home after a slow minigame rebuilds the unchanged rain in lightweight mode', () => {
  const h=rainyHome();assert.equal(rain(h),42);
  for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  h.api.renderEnvironment();assert.equal(rain(h),18);
});
test('life records suppress weather and seasonal foreground effects until returning home', () => {
  const h=rainyHome();h.get('lifeCardOverlay').classList.add('hidden');h.api.render();
  assert.equal(h.get('weatherFx').classList.contains('suppressed'),false);
  h.get('lifeCardOverlay').classList.remove('hidden');h.api.render();
  assert.equal(h.get('screenNormal').classList.contains('hidden'),true);
  assert.equal(h.get('weatherFx').classList.contains('suppressed'),true);
  assert.equal(h.get('seasonFrontFx').classList.contains('suppressed'),true);
});

test('normalization creates no retired crown life state and retains the distinct Naoto crown',()=>{
  const h=harness(),s=h.api.state();
  assert.equal(Object.hasOwn(s.itemLife,'crownUsed'),false);
  s.itemLife={};
  h.api.ITEM_SYSTEM.normalize(s);
  assert.equal(Object.hasOwn(s.itemLife,'crownUsed'),false);
  assert.ok(h.api.ITEM_SYSTEM.CATALOG.naoto_crown);
  s.lifetime.ownedNaotoItems=['naoto_crown'];
  h.api.renderNaotoItemGrid();
  assert.match(h.get('naotoItemGrid').innerHTML,/なおとのかんむり/);
});
