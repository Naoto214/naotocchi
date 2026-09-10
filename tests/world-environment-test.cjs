const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const env = require('../world-environment.js');

const NOW = new Date('2026-09-10T12:00:00.000Z');

test('static script exposes the same interface on window', () => {
  const context = { window: {}, URL, URLSearchParams, AbortController, Date, Promise, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(require.resolve('../world-environment.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context.window.NaotocchiEnvironment).sort(),
    ['createTracker', 'municipalityFromResponse', 'simulatedWeather', 'timeOfDay', 'weatherFromResponse']);
});

test('simulated weather is deterministic per 3-hour block and region', () => {
  const a = env.simulatedWeather('forest', 'spring', new Date(2026, 8, 10, 13, 5));
  const b = env.simulatedWeather('forest', 'spring', new Date(2026, 8, 10, 14, 50));
  assert.deepEqual(a, b);
  assert.equal(a.simulated, true);
  assert.match(a.label, /^(はれ|くもり|あめ|ゆき)$/);
  const modes = new Set();
  for (let day = 1; day <= 28; day++) for (let h = 0; h < 24; h += 3) modes.add(env.simulatedWeather('home', 'spring', new Date(2026, 3, day, h)).mode);
  assert.ok(modes.size >= 3, 'a month of home weather covers several modes: ' + [...modes]);
});

test('simulated weather follows the region climate and the season', () => {
  const count = (region, season) => {
    const c = { sunny: 0, cloudy: 0, rain: 0, snow: 0 };
    for (let day = 1; day <= 28; day++) for (let h = 0; h < 24; h += 3) c[env.simulatedWeather(region, season, new Date(2026, 0, day, h)).mode]++;
    return c;
  };
  const desert = count('desert', 'summer');
  assert.ok(desert.sunny > desert.rain + desert.cloudy, 'desert is mostly sunny: ' + JSON.stringify(desert));
  assert.equal(desert.snow, 0);
  const snowWinter = count('snow', 'winter');
  assert.ok(snowWinter.snow >= snowWinter.sunny, 'snow country in winter snows a lot: ' + JSON.stringify(snowWinter));
  const seaSummer = count('sea', 'summer');
  assert.equal(seaSummer.snow, 0);
  const homeWinter = count('home', 'winter');
  assert.ok(homeWinter.snow > 0, 'home can snow in winter');
});

function response(body, ok = true) {
  return { ok, json: async () => body };
}

function geoSuccess(latitude = 35.681236, longitude = 139.767125) {
  return {
    getCurrentPosition(success) {
      queueMicrotask(() => success({ coords: { latitude, longitude } }));
    }
  };
}

function providers(city = true, weather = true) {
  return async (url) => {
    const parsed = new URL(url);
    if (parsed.hostname === 'geoapi.heartrails.com') {
      if (!city) throw new Error('city down');
      return response({ response: { location: [
        { city: '遠い市', 'city-kana': 'とおいし', town: '秘密町', postal: '0000000', x: '1', y: '2', distance: 26000 },
        { city: '千代田区', 'city-kana': 'ちよだく', town: '丸の内', postal: '1000005', x: '139.7', y: '35.6', distance: 123 },
        { city: '中央区', city_kana: 'チュウオウク', distance: 500 }
      ] } });
    }
    if (!weather) throw new Error('weather down');
    return response({ current: { weather_code: 61, time: NOW.getTime() / 1000 } });
  };
}

test('timeOfDay honors manual modes and uses the local hour for auto/invalid modes', () => {
  assert.equal(env.timeOfDay('evening', new Date(2026, 0, 1, 8)), 'evening');
  assert.equal(env.timeOfDay('auto', new Date(2026, 0, 1, 5)), 'morning');
  assert.equal(env.timeOfDay('invalid', new Date(2026, 0, 1, 11)), 'day');
  assert.equal(env.timeOfDay('auto', new Date(2026, 0, 1, 16)), 'evening');
  assert.equal(env.timeOfDay('auto', new Date(2026, 0, 1, 19)), 'night');
});

test('weatherFromResponse maps official codes and rejects unknown or stale readings', () => {
  assert.deepEqual(env.weatherFromResponse({ current: { weather_code: 0, time: NOW.getTime() / 1000 } }, NOW),
    { mode: 'sunny', label: 'はれ', measuredAt: NOW.toISOString() });
  assert.equal(env.weatherFromResponse({ current: { weather_code: 20, time: NOW.getTime() / 1000 } }, NOW), null);
  assert.equal(env.weatherFromResponse({ current: { weather_code: 71, time: (NOW.getTime() - 7200001) / 1000 } }, NOW), null);
  assert.equal(env.weatherFromResponse({ current: { weather_code: 3, time: (NOW.getTime() + 900001) / 1000 } }, NOW), null);
});

test('municipalityFromResponse selects only the nearest municipality within 25km', () => {
  const data = { response: { location: [
    { city: '外れ市', 'city-kana': 'はずれし', distance: 25001 },
    { city: '二番市', city_kana: 'ニバンシ', distance: 20, town: '秘密町', postal: '1111111' },
    { city: '一番市', 'city-kana': 'いちばんし', distance: 10, x: '139', y: '35' }
  ] } };
  assert.deepEqual(env.municipalityFromResponse(data), { name: '一番市', kana: 'いちばんし', display: 'いちばんし' });
  assert.deepEqual(Object.keys(env.municipalityFromResponse(data)).sort(), ['display', 'kana', 'name']);
  assert.equal(env.municipalityFromResponse({ response: { location: [{ city: '町', distance: '10' }] } }), null);
});

test('tracker preserves municipality precision, rounds only weather, and exposes no coordinates', async () => {
  const changes = [];
  const urls = [];
  const latitude = 35.684999;
  const longitude = 139.764999;
  const tracker = env.createTracker({
    geolocation: geoSuccess(latitude, longitude),
    fetcher: async (url, options) => { urls.push([url, options]); return providers()(url); },
    now: () => NOW,
    onChange: snapshot => changes.push(snapshot)
  });
  assert.equal(tracker.snapshot().status, 'idle');
  const result = await tracker.request();
  assert.equal(changes[0].status, 'loading');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.municipality, { name: '千代田区', kana: 'ちよだく', display: 'ちよだく' });
  assert.equal(result.weather.mode, 'rain');
  assert.equal(JSON.stringify(result).includes('latitude'), false);
  assert.equal(JSON.stringify(result).includes('longitude'), false);
  const cityURL = new URL(urls[0][0]);
  const weatherURL = new URL(urls[1][0]);
  assert.equal(cityURL.searchParams.get('x'), String(longitude));
  assert.equal(cityURL.searchParams.get('y'), String(latitude));
  assert.equal(weatherURL.searchParams.get('latitude'), '35.68');
  assert.equal(weatherURL.searchParams.get('longitude'), '139.76');
  assert.match(urls[1][0], /current=weather_code/);
  assert.match(urls[1][0], /timeformat=unixtime/);
  assert.ok(urls.every(([, options]) => options.signal && options.cache === 'no-store'));
});

test('tracker tolerates independent provider failure and identifies the missing result', async () => {
  const tracker = env.createTracker({ geolocation: geoSuccess(), fetcher: providers(false, true), now: () => NOW });
  const result = await tracker.request();
  assert.equal(result.status, 'partial');
  assert.equal(result.municipality, null);
  assert.equal(result.weather.mode, 'rain');
  assert.match(result.error, /市区町村/);
  assert.doesNotMatch(result.error, /天気/);
});

test('tracker coalesces overlap and permits a retry after a provider failure', async () => {
  let geoCalls = 0;
  const releases = [];
  let fail = true;
  const geolocation = { getCurrentPosition(success) { geoCalls++; queueMicrotask(() => success({ coords: { latitude: 35, longitude: 139 } })); } };
  const tracker = env.createTracker({
    geolocation,
    now: () => NOW,
    fetcher: async url => {
      if (fail) return new Promise(resolve => { releases.push(() => resolve(response({}, false))); });
      return providers()(url);
    }
  });
  const first = tracker.request();
  const overlap = tracker.request();
  assert.strictEqual(first, overlap);
  await new Promise(resolve => setImmediate(resolve));
  releases.forEach(release => release());
  assert.equal((await first).status, 'error');
  fail = false;
  assert.equal((await tracker.request()).status, 'ready');
  assert.equal(geoCalls, 2);
});

test('location failures are distinct, clear stale results, and malformed coordinates never fetch', async () => {
  let mode = 'ok';
  let fetchCalls = 0;
  const geolocation = { getCurrentPosition(success, failure) {
    queueMicrotask(() => mode === 'ok'
      ? success({ coords: { latitude: 35, longitude: 139 } })
      : mode === 'malformed' ? success({ coords: { latitude: NaN, longitude: 139 } })
      : failure({ code: mode === 'denied' ? 1 : 3 }));
  } };
  const tracker = env.createTracker({ geolocation, fetcher: async url => { fetchCalls++; return providers()(url); }, now: () => NOW });
  assert.equal((await tracker.request()).status, 'ready');
  mode = 'denied';
  let result = await tracker.request();
  assert.equal(result.status, 'error');
  assert.equal(result.municipality, null);
  assert.equal(result.weather, null);
  assert.match(result.error, /許可されていません/);
  mode = 'timeout';
  assert.match((await tracker.request()).error, /時間がかかりすぎ/);
  mode = 'malformed';
  assert.match((await tracker.request()).error, /利用できません/);
  assert.equal(fetchCalls, 2);
});

test('missing geolocation returns an error without prompting or throwing', async () => {
  const tracker = env.createTracker({ geolocation: null, fetcher: providers(), now: () => NOW });
  assert.equal(tracker.snapshot().status, 'idle');
  const result = await tracker.request();
  assert.equal(result.status, 'error');
  assert.match(result.error, /利用できません/);
});

test('missing fetch support reports municipality and weather unavailable separately', async () => {
  const tracker = env.createTracker({ geolocation: geoSuccess(), fetcher: null, now: () => NOW });
  const result = await tracker.request();
  assert.equal(result.status, 'error');
  assert.match(result.error, /市区町村を調べられません/);
  assert.match(result.error, /天気を調べられません/);
  assert.doesNotMatch(result.error, /環境情報/);
});
