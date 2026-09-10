const assert = require('node:assert/strict');
const fs = require('node:fs');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

function initializeWipeDialogs(h) {
  h.get('wipeOverlay').classList.add('hidden');
  h.get('wipeConfirmOverlay').classList.add('hidden');
}

function divAncestryById(html) {
  const ancestors = new Map();
  const stack = [];
  for (const match of html.matchAll(/<\/?div\b[^>]*>/gi)) {
    const tag = match[0];
    if (tag.startsWith('</')) {
      stack.pop();
      continue;
    }
    const id = tag.match(/\bid="([^"]+)"/)?.[1] || null;
    if (id) ancestors.set(id, stack.filter(Boolean));
    stack.push(id);
  }
  return ancestors;
}

function finalDeclaration(stylesheets, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let value = null;
  for (const css of stylesheets) {
    for (const match of css.matchAll(new RegExp(escaped + '\\s*\\{([^}]*)\\}', 'g'))) {
      const declaration = match[1].match(new RegExp('(?:^|;)\\s*' + property + '\\s*:\\s*([^;]+)'));
      if (declaration) value = declaration[1].trim();
    }
  }
  return value;
}

test('dying treatment stays on home content without containing viewport overlays', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const style = fs.readFileSync('style.css', 'utf8');
  const ui = fs.readFileSync('ui.css', 'utf8');
  assert.ok(html.indexOf('style.css') < html.indexOf('ui.css'), 'UI overrides load after inherited styles');

  const ancestry = divAncestryById(html);
  assert.deepEqual(ancestry.get('screenNormal').slice(-1), ['screen']);
  const fixedOverlayIds = [...html.matchAll(/<div\b(?=[^>]*\bclass="[^"]*(?:dex-overlay|dex-detail-overlay|wipe-overlay)[^"]*")(?=[^>]*\bid="([^"]+)")[^>]*>/g)].map(match => match[1]);
  assert.ok(fixedOverlayIds.length > 0);
  for (const id of fixedOverlayIds) {
    assert.ok(ancestry.get(id).includes('screen'), `${id} remains in the screen overlay stack`);
    assert.equal(ancestry.get(id).includes('screenNormal'), false, `${id} is outside filtered home content`);
  }

  assert.equal(finalDeclaration([style, ui], '.screen.dying', 'filter'), 'none');
  assert.equal(finalDeclaration([style, ui], '.screen.dying > .screen-normal', 'filter'), 'brightness(0.78) saturate(0.7)');
  assert.equal(finalDeclaration([style, ui], '.dex-overlay', 'position'), 'fixed');
  assert.equal(finalDeclaration([style, ui], '.dex-detail-overlay,.wipe-overlay', 'position'), 'fixed');
});

test('travel opens destinations directly, then closes back to care', () => {
  const h = harness(); h.api.render();
  h.dispatch(h.get('travelBtn'), 'click');
  assert.equal(h.get('travelOverlay').classList.contains('hidden'), false);
  assert.equal(h.get('worldOverlay').classList.contains('hidden'), true);
  h.dispatch(h.get('travelCloseBtn'), 'click');
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
});

test('the menu stops aging and an exclusive page replaces it', () => {
  const h = harness();
  h.dispatch(h.get('menuBtn'), 'click');
  assert.equal(h.api.isAnyMenuOverlayOpen(), true);
  const age = h.api.state().ageTicks;
  h.api.loop(); assert.equal(h.api.state().ageTicks, age);
  h.api.openExclusiveMenu('profile');
  assert.equal(h.get('menuOverlay').classList.contains('hidden'), true);
  assert.equal(h.get('profileOverlay').classList.contains('hidden'), false);
  h.api.closeAllMenuOverlays(); h.api.loop();
  assert.ok(h.api.state().ageTicks > age);
});

test('court rapid taps still count individually', () => {
  const h = harness(), s = h.api.state();
  s.partner = {id:'forest_bear',label:'もりのくまさん',emoji:'🐻',gender:'female',orientationId:'bi',affection:40,bondCount:0,married:true};
  for (let i=0;i<4;i++) h.dispatch(h.get('courtBtn'), 'click');
  assert.ok(s.partner.affection > 40);
  assert.equal(s.energy, 66, 'four taps each spend the existing six energy');
});

test('medicine while healthy still changes the care state and reacts immediately', () => {
  const h = harness(), s = h.api.state();
  const before = JSON.stringify(s);
  h.dispatch(h.get('medicineBtn'), 'click');
  assert.notEqual(JSON.stringify(s), before);
  assert.ok(h.get('message').textContent);
});

test('play starts a random game with no chooser', () => {
  const h = harness();
  h.api.render();
  h.dispatch(h.get('playBtn'), 'click');
  assert.equal(h.get('minigameOverlay').classList.contains('hidden'), false);
  assert.equal(h.api.state().actionCounts.play,1);
  assert.equal(h.api.isAnyMenuOverlayOpen(), false);
});

test('home header and menu cannot interrupt an active minigame', () => {
  const h = harness();
  h.api.render();
  h.dispatch(h.get('playBtn'),'click');
  h.dispatch(h.get('profileBtn'),'click');
  h.dispatch(h.get('menuBtn'),'click');
  assert.equal(h.api.isAnyMenuOverlayOpen(),false);
  assert.equal(h.get('device').classList.contains('ui-game-active'),true);
});

test('game selection and achievements each open their own destination', () => {
  const h=harness(); h.api.render();
  h.dispatch(h.get('gamesBtn'),'click');
  assert.equal(h.get('achTitle').textContent,'ゲームきろく');
  h.api.closeAllMenuOverlays();
  h.dispatch(h.get('achBtn'),'click');
  assert.equal(h.get('achTitle').textContent,'じっせき');
});

test('late weather does not override manual settings or write a location into a save', async () => {
  let release;
  const payloads=[];
  const h = harness({
    geolocation:{getCurrentPosition:done=>{release=done;}},
    fetcher:async url=>({ok:true,json:async()=>url.includes('heartrails')?
      {response:{location:[{city:'函館市',city_kana:'はこだてし',town:'秘密町',distance:5}]}}:
      {current:{weather_code:61,time:1}}}),
    storage:{getItem:()=>null,setItem:(key,value)=>payloads.push(value),removeItem:()=>{}}
  });
  const pending=h.api.requestEnvironment();
  h.api.state().lifetime.weatherMode='snow';
  h.api.state().lifetime.timeMode='evening';
  release({coords:{latitude:41.7687,longitude:140.7288}});
  await pending;
  h.api.saveState();
  assert.equal(h.get('screen').dataset.weather,'snow');
  assert.equal(h.get('screen').dataset.time,'evening');
  assert.equal(h.get('worldLocationLabel').textContent,'げんざいち：はこだてし');
  assert.ok(payloads.every(value=>!value.includes('函館')&&!value.includes('秘密町')&&!value.includes('41.7687')));
});

test('late current-location result cannot pull a player out of another menu', async () => {
  let release;
  const h=harness({geolocation:{getCurrentPosition:done=>{release=done;}},fetcher:async url=>({ok:true,json:async()=>url.includes('heartrails')?
    {response:{location:[{city:'函館市',city_kana:'はこだてし',distance:5}]}}:{current:{weather_code:0,time:1}}})});
  h.api.state().regionId='forest';
  h.api.openExclusiveMenu('travel');
  h.dispatch(h.get('currentLocationBtn'),'click');
  const pending=h.api.requestEnvironment();
  h.api.openExclusiveMenu('profile');
  release({coords:{latitude:41.7687,longitude:140.7288}});
  await pending; await Promise.resolve();
  assert.equal(h.api.state().regionId,'forest');
  assert.equal(h.get('profileOverlay').classList.contains('hidden'),false);
});

test('Escape cancels the first reset prompt and leaves Data paused', () => {
  const h = harness();
  initializeWipeDialogs(h);
  h.api.openExclusiveMenu('profile');
  h.dispatch(h.get('wipeBtn'), 'click');
  assert.equal(h.get('wipeOverlay').classList.contains('hidden'), false);
  const age = h.api.state().ageTicks;

  h.dispatch(h.document, 'keydown', {key: 'Escape'});

  assert.equal(h.get('wipeOverlay').classList.contains('hidden'), true);
  assert.equal(h.get('profileOverlay').classList.contains('hidden'), false);
  assert.equal(h.api.isAnyMenuOverlayOpen(), true);
  assert.equal(h.document.activeElement.id, 'wipeBtn');
  h.api.loop();
  assert.equal(h.api.state().ageTicks, age);
});

test('Escape cancels a held final reset without wiping or resuming age', () => {
  const removed = [];
  const h = harness({storage: {getItem: () => null, setItem: () => {}, removeItem: key => removed.push(key)}});
  initializeWipeDialogs(h);
  h.api.openExclusiveMenu('profile');
  h.dispatch(h.get('wipeBtn'), 'click');
  h.dispatch(h.get('wipeNextBtn'), 'click');
  assert.equal(h.get('wipeConfirmOverlay').classList.contains('hidden'), false);
  h.dispatch(h.get('wipeHoldBtn'), 'mousedown');
  h.advance(1000);
  assert.notEqual(h.get('wipeHoldFill').style.width, '0%');
  const age = h.api.state().ageTicks;

  h.dispatch(h.document, 'keydown', {key: 'Escape'});
  h.advance(3001);
  h.api.loop();

  assert.equal(h.get('wipeConfirmOverlay').classList.contains('hidden'), true);
  assert.equal(h.get('wipeHoldFill').style.width, '0%');
  assert.equal(h.get('profileOverlay').classList.contains('hidden'), false);
  assert.equal(h.api.isAnyMenuOverlayOpen(), true);
  assert.equal(h.document.activeElement.id, 'wipeBtn');
  assert.deepEqual(removed, []);
  assert.equal(h.api.state().ageTicks, age);
});

test('failed location permission waits for explicit retry while successful snapshots auto-refresh', async () => {
  let requests = 0;
  let mode = 'denied';
  const geolocation = {getCurrentPosition(done, fail) {
    requests += 1;
    if (mode === 'denied') fail({code: 1});
    else done({coords: {latitude: 41.7687, longitude: 140.7288}});
  }};
  const fetcher = async url => ({ok: true, json: async () => url.includes('heartrails')
    ? {response: {location: [{city: '函館市', city_kana: 'はこだてし', distance: 5}]}}
    : {current: {weather_code: 0, time: Math.floor(h.sandbox.Date.now() / 1000)}}});
  const h = harness({geolocation, fetcher});

  assert.equal((await h.api.requestEnvironment()).status, 'error');
  assert.equal(requests, 1);
  h.advance(15 * 60 * 1000 + 1);
  h.api.maybeRefreshEnvironment();
  await Promise.resolve();
  assert.equal(requests, 1, 'denial does not cause a later automatic permission request');

  mode = 'ready';
  assert.equal((await h.api.requestEnvironment()).status, 'ready');
  assert.equal(requests, 2, 'the explicit retry still requests permission');
  h.advance(15 * 60 * 1000 + 1);
  h.api.maybeRefreshEnvironment();
  await Promise.resolve();
  assert.equal(requests, 3, 'a successful snapshot remains eligible for automatic refresh');
});

test('blocked sleeping travel preserves the active current-city selection', () => {
  const h = harness();
  const state = h.api.state();
  state.regionId = 'home';
  state.lifetime.currentLocationSelected = true;
  state.isSleeping = true;
  h.api.openExclusiveMenu('travel');

  h.api.travelToRegion({id: 'forest', label: 'もり', emoji: '🌲', lines: []});

  assert.equal(state.regionId, 'home');
  assert.equal(state.lifetime.currentLocationSelected, true);
});
