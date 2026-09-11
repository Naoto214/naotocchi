const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const {harness} = require('./helpers/runtime-harness.cjs');

function scenery() {
  return require('../local-scenery.js');
}

test('static script exposes the locality resolver on window', () => {
  const context = {window: {}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../local-scenery.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context.window.NaotocchiLocalScenery).sort(), ['resolveLocality', 'sanitizeLocality']);
});

test('known municipalities resolve to their curated scenery profiles', () => {
  const {resolveLocality} = scenery();
  const fixtures = [
    [{name: '函館市', display: 'はこだてし', prefecture: '北海道'}, 'harbor'],
    [{name: '飯田市', display: 'いいだし', prefecture: '長野県'}, 'basin'],
    [{name: '大阪市', display: 'おおさかし', prefecture: '大阪府'}, 'metropolis'],
    [{name: '千代田区', display: 'ちよだく', prefecture: '東京都'}, 'metropolis'],
  ];
  for (const [municipality, profileId] of fixtures) {
    const resolved = resolveLocality(municipality);
    assert.deepEqual(
      {name: resolved.name, display: resolved.display, prefecture: resolved.prefecture, profileId: resolved.profileId},
      {...municipality, profileId}
    );
    assert.equal(typeof resolved.description, 'string');
    assert.ok(resolved.description.length > 0);
  }
});

test('prefecture-aware matching does not confuse same-named wards or conflicting cities', () => {
  const {resolveLocality} = scenery();
  assert.equal(resolveLocality({name: '中央区', prefecture: '東京都'}).profileId, 'metropolis');
  assert.equal(resolveLocality({name: '中央区', prefecture: '大阪府'}).profileId, 'town');
  assert.equal(resolveLocality({name: '中央区'}).profileId, 'town');
  assert.equal(resolveLocality({name: '函館市'}).profileId, 'harbor');
  assert.equal(resolveLocality({name: '大阪市', prefecture: '北海道'}).profileId, 'town');
});

test('explicit Osaka city wards are metropolitan without capturing other cities or bare wards', () => {
  const {resolveLocality} = scenery();
  assert.equal(resolveLocality({name: '大阪市北区', prefecture: '大阪府'}).profileId, 'metropolis');
  assert.equal(resolveLocality({name: '大阪市中央区'}).profileId, 'metropolis');
  assert.equal(resolveLocality({name: '堺市北区', prefecture: '大阪府'}).profileId, 'town');
  assert.equal(resolveLocality({name: '北区', prefecture: '大阪府'}).profileId, 'town');
  assert.equal(resolveLocality({name: '北区', prefecture: '東京都'}).profileId, 'metropolis');
  assert.equal(resolveLocality({name: '大阪市架空区', prefecture: '大阪府'}).profileId, 'town');
  assert.equal(resolveLocality({name: '大阪市北区<script>', prefecture: '大阪府'}), null);
});

test('unknown municipalities use a general town image without claiming local geography', () => {
  const resolved = scenery().resolveLocality({name: '架空市', display: 'かくうし', prefecture: '架空県'});
  assert.equal(resolved.profileId, 'town');
  assert.match(resolved.description, /一般的|まちなか/);
});

test('sanitizeLocality rejects malformed values and removes unapproved saved fields', () => {
  const {sanitizeLocality} = scenery();
  assert.equal(sanitizeLocality(null), null);
  assert.equal(sanitizeLocality({name: ''}), null);
  assert.equal(sanitizeLocality({name: 'x'.repeat(81)}), null);
  assert.deepEqual(sanitizeLocality({
    name: '  函館市  ', display: ' はこだてし ', prefecture: ' 北海道 ', profileId: 'invalid',
    latitude: 41.7, longitude: 140.7, kana: 'はこだてし', history: ['secret']
  }), {
    name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor',
    description: '港と海が見えるまちの景色'
  });
});

function saveStorage(raw, writes = []) {
  return {
    getItem(key) { return key === 'naotocchi-save-v1' ? raw : null; },
    setItem(key, value) { writes.push([key, value]); },
    removeItem() {},
  };
}

test('reload restores saved municipal scenery without requesting GPS', () => {
  let geoCalls = 0;
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'},
  }});
  const h = harness({resume: true, storage: saveStorage(raw), geolocation: {getCurrentPosition() { geoCalls++; }}});
  assert.equal(geoCalls, 0);
  assert.deepEqual(h.api.currentEnvironment().locality, {
    name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor',
    description: '港と海が見えるまちの景色'
  });
  h.api.render();
  assert.match(h.get('worldLocationLabel').textContent, /はこだてし/);
  assert.equal(h.get('currentLocationBtn').classList.contains('selected'), true);
  assert.equal(h.get('currentLocationBtn').ariaPressed, 'true');
  h.api.openExclusiveMenu('world');
  assert.match(h.get('worldNowCard').innerHTML, /📍はこだてし/);
  h.api.openExclusiveMenu('travel');
  assert.equal(h.get('travelLocationStatus').textContent, '港と海が見えるまちの景色（街のイメージ）');
});

test('unknown saved municipalities describe the neutral generated town image', () => {
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '架空市', display: 'かくうし', prefecture: '架空県', profileId: 'town'},
  }});
  const h = harness({resume: true, storage: saveStorage(raw)});
  h.api.openExclusiveMenu('travel');
  assert.equal(h.get('travelLocationStatus').textContent, '一般的なまちなかの景色（街のイメージ）');
});

test('malformed saved locality is discarded and cannot activate current-location scenery', () => {
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '', display: '<script>', profileId: 'harbor', latitude: 35},
  }});
  const h = harness({resume: true, storage: saveStorage(raw)});
  assert.equal(h.api.state().lifetime.currentLocation, null);
  assert.equal(h.api.state().lifetime.currentLocationSelected, false);
  assert.equal('locality' in h.api.currentEnvironment(), false);
});

test('a successful selection saves only display-safe locality fields', async () => {
  let release;
  const writes = [];
  const h = harness({
    storage: saveStorage(null, writes),
    geolocation: {getCurrentPosition(done) { release = done; }},
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '函館市', city_kana: 'はこだてし', prefecture: '北海道', distance: 5, x: '140', y: '41'}]}}
      : {current: {weather_code: 0, time: 1}}}),
  });
  h.api.openExclusiveMenu('travel');
  h.dispatch(h.get('currentLocationBtn'), 'click');
  const pending = h.api.requestEnvironment();
  release({coords: {latitude: 41.7687, longitude: 140.7288}});
  await pending;
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(JSON.parse(JSON.stringify(h.api.state().lifetime.currentLocation)), {
    name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'
  });
  const saves = writes.filter(([key]) => key === 'naotocchi-save-v1');
  const persisted = JSON.parse(saves.at(-1)[1]).lifetime.currentLocation;
  assert.deepEqual(persisted, {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'});
  assert.equal(JSON.stringify(persisted).includes('41.7687'), false);
});

test('failed refresh keeps saved scenery selected and a later explicit retry can replace it', async () => {
  let mode = 'denied';
  const geo = {getCurrentPosition(done, fail) {
    if (mode === 'denied') fail({code: 1});
    else done({coords: {latitude: 35.5, longitude: 139.5}});
  }};
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'},
  }});
  const h = harness({resume: true, storage: saveStorage(raw), geolocation: geo,
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '飯田市', city_kana: 'いいだし', prefecture: '長野県', distance: 5}]}}
      : {current: {weather_code: 0, time: 1}}})});
  h.api.state().stage = 'growing';
  h.api.openExclusiveMenu('travel');
  h.dispatch(h.get('currentLocationBtn'), 'click');
  await h.api.requestEnvironment();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.api.state().lifetime.currentLocation.profileId, 'harbor');
  assert.equal(h.api.state().lifetime.currentLocationSelected, true);
  assert.match(h.get('travelLocationStatus').textContent, /位置情報の利用が許可されていません。/);
  assert.match(h.get('travelLocationStatus').textContent, /港と海が見えるまちの景色（街のイメージ）/);
  assert.match(h.get('travelLocationStatus').textContent, /表示しています。$/);

  mode = 'ready';
  h.dispatch(h.get('currentLocationBtn'), 'click');
  await h.api.requestEnvironment();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.state().lifetime.currentLocation)), {
    name: '飯田市', display: 'いいだし', prefecture: '長野県', profileId: 'basin'
  });
});

test('an observed municipality is offered for selection when another region remains displayed', async () => {
  const h = harness({
    geolocation: {getCurrentPosition(done) { done({coords: {latitude: 41.7, longitude: 140.7}}); }},
    fetcher: async url => url.includes('heartrails')
      ? {ok: true, json: async () => ({response: {location: [
        {city: '函館市', city_kana: 'はこだてし', prefecture: '北海道', distance: 5},
      ]}})}
      : {ok: false, json: async () => ({})},
  });
  h.api.state().regionId = 'forest';
  h.api.openExclusiveMenu('world');
  h.dispatch(h.get('locationRefreshBtn'), 'click');
  await h.api.requestEnvironment();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.get('travelLocationStatus').textContent, /天気を調べられません。/);
  assert.match(h.get('travelLocationStatus').textContent, /港と海が見えるまちの景色（街のイメージ）を選べます。$/);
  assert.doesNotMatch(h.get('travelLocationStatus').textContent, /表示中|表示しています/);
  assert.equal(h.api.state().regionId, 'forest');
  assert.equal(h.api.state().lifetime.currentLocationSelected, false);
});

test('an invalid live municipality falls back to the sanitized saved selection', async () => {
  let release;
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'},
  }});
  const h = harness({resume: true, storage: saveStorage(raw),
    geolocation: {getCurrentPosition(done) { release = done; }},
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '<invalid>', city_kana: 'ふせい', distance: 5}]}}
      : {current: {weather_code: 0, time: 1}}})});
  h.api.openExclusiveMenu('world');
  h.dispatch(h.get('locationRefreshBtn'), 'click');
  assert.match(h.get('travelLocationStatus').textContent, /現在地とてんきを調べています…/);
  assert.match(h.get('travelLocationStatus').textContent, /港と海が見えるまちの景色（街のイメージ）/);
  const pending = h.api.requestEnvironment();
  release({coords: {latitude: 35, longitude: 139}});
  await pending;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.api.currentEnvironment().locality.profileId, 'harbor');
  assert.equal(h.api.currentEnvironment().locality.display, 'はこだてし');
});

test('manual refresh of a selected locality persists and reloads the new municipality', async () => {
  let release;
  let primary = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'},
  }});
  const storage = {
    getItem(key) { return key === 'naotocchi-save-v1' ? primary : null; },
    setItem(key, value) { if (key === 'naotocchi-save-v1') primary = value; },
    removeItem() {},
  };
  const h = harness({resume: true, storage,
    geolocation: {getCurrentPosition(done) { release = done; }},
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '飯田市', city_kana: 'いいだし', prefecture: '長野県', distance: 5}]}}
      : {current: {weather_code: 0, time: 1}}})});
  h.api.openExclusiveMenu('world');
  h.dispatch(h.get('locationRefreshBtn'), 'click');
  const pending = h.api.requestEnvironment();
  release({coords: {latitude: 35.5, longitude: 137.8}});
  await pending;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.state().lifetime.currentLocation)), {
    name: '飯田市', display: 'いいだし', prefecture: '長野県', profileId: 'basin'
  });
  const reloaded = harness({resume: true, storage});
  assert.equal(reloaded.api.currentEnvironment().locality.profileId, 'basin');
  assert.equal(reloaded.api.currentEnvironment().locality.display, 'いいだし');
});

test('a canceled manual refresh cannot replace or render over the selected locality', async () => {
  let release;
  const raw = JSON.stringify({schemaVersion: 5, regionId: 'home', lifetime: {
    currentLocationSelected: true,
    currentLocation: {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'},
  }});
  const h = harness({resume: true, storage: saveStorage(raw),
    geolocation: {getCurrentPosition(done) { release = done; }},
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '大阪市', city_kana: 'おおさかし', prefecture: '大阪府', distance: 5}]}}
      : {current: {weather_code: 0, time: 1}}})});
  h.api.openExclusiveMenu('world');
  h.dispatch(h.get('locationRefreshBtn'), 'click');
  const pending = h.api.requestEnvironment();
  h.api.closeAllMenuOverlays();
  release({coords: {latitude: 34.7, longitude: 135.5}});
  await pending;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.api.state().lifetime.currentLocation.profileId, 'harbor');
  assert.equal(h.api.currentEnvironment().locality.profileId, 'harbor');
});

test('explicit home selection clears only the current-location presentation', () => {
  const h = harness();
  const state = h.api.state();
  state.regionId = 'home';
  state.lifetime.currentLocationSelected = true;
  state.lifetime.currentLocation = {name: '函館市', display: 'はこだてし', prefecture: '北海道', profileId: 'harbor'};
  const before = {energy: state.energy, hunger: state.hunger, travelStreak: state.travelStreak};
  h.api.openExclusiveMenu('travel');
  assert.match(h.get('travelRegionGrid').innerHTML, /class="theme-swatch travel-card\s+visited" data-id="home"/);
  h.api.travelToRegion(h.api.REGIONS.find(region => region.id === 'home'));
  assert.equal(state.lifetime.currentLocationSelected, false);
  assert.equal('locality' in h.api.currentEnvironment(), false);
  assert.deepEqual({energy: state.energy, hunger: state.hunger, travelStreak: state.travelStreak}, before);
  h.api.openExclusiveMenu('travel');
  assert.match(h.get('travelRegionGrid').innerHTML, /travel-card selected visited" data-id="home" disabled aria-pressed="true"/);
});

test('pending current-location selection cannot override a later travel choice', async () => {
  let release;
  const h = harness({
    geolocation: {getCurrentPosition(done) { release = done; }},
    fetcher: async url => ({ok: true, json: async () => url.includes('heartrails')
      ? {response: {location: [{city: '函館市', city_kana: 'はこだてし', prefecture: '北海道', distance: 5}]}}
      : {current: {weather_code: 0, time: 1}}}),
  });
  h.api.openExclusiveMenu('travel');
  h.dispatch(h.get('currentLocationBtn'), 'click');
  const pending = h.api.requestEnvironment();
  h.api.travelToRegion(h.api.REGIONS.find(region => region.id === 'forest'));
  release({coords: {latitude: 41.7687, longitude: 140.7288}});
  await pending;
  await Promise.resolve();
  assert.equal(h.api.state().regionId, 'forest');
  assert.equal(h.api.state().lifetime.currentLocationSelected, false);
  assert.equal(h.api.state().lifetime.currentLocation, null);
});
