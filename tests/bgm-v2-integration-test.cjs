const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

// BGM VERSION 2 の 統合: 配置表（PR #534 の 50行）どおりに 場面 → 曲 が 決まるか、
// 音源が 読めない ときに 以前の 合成BGM へ もどるか、サブアプリの 判定が 画面に あうかを 確かめる。
// 実際の 音の 聞こえ方・iPhone の 自動再生制限は この テストの 範囲外（ブラウザで 確認）。
const CAT = (() => { const s = {}; vm.runInNewContext(fs.readFileSync('assets/bgm/catalog.js', 'utf8'), s); return s.NAOTOCCHI_BGM_CATALOG; })();
const PLACE = (() => { const s = {}; vm.runInNewContext(fs.readFileSync('assets/bgm/placement.js', 'utf8'), s); return s.NAOTOCCHI_BGM_PLACEMENT; })();

function harness(o = {}) {
  const ids = {}; const visible = new Set(o.visible || []);
  const elem = (id) => ids[id] || (ids[id] = {id, dataset: {kind: o.movieKind}, classList: {contains: (c) => c === 'hidden' ? !visible.has(id) : false}});
  const param = () => ({value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}});
  const node = () => ({connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), detune: param(), Q: param(), type: 'sine'});
  class AudioContext { constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; } createGain() { return node(); } createBuffer(c, n) { return {getChannelData: () => new Float32Array(n)}; } createBufferSource() { return node(); } createBiquadFilter() { return node(); } createOscillator() { return node(); } }
  const handlers = new Map();
  const document = {hidden: false, getElementById: elem, addEventListener: (t, f) => handlers.set(t, f), removeEventListener() {}};
  const sandbox = {window: {AudioContext}, document, performance: {now: () => 0}, Math, Float32Array, Date, setTimeout: () => 0, clearTimeout() {}, fetch: () => new Promise(() => {}),
    NAOTOCCHI_BGM_CATALOG: o.noCatalog ? undefined : CAT, NAOTOCCHI_BGM_PLACEMENT: PLACE, NaotocchiEnvironment: {timeOfDay: () => o.time || 'day'}};
  sandbox.globalThis = sandbox; sandbox.AudioContext = AudioContext;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('bgm-v2.js', 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync('audio.js', 'utf8'), sandbox);
  const state = {stage: o.stage || 'growing', isSleeping: !!o.sleeping, lifetime: {soundBgm: o.bgm !== false, timeMode: 'auto'}};
  const el = {lifeCardOverlay: elem('lifeCardOverlay'), gameClearOverlay: elem('gameClearOverlay')};
  const api = sandbox.installNaotocchiAudio({nativeSetTimeout: () => 0, getState: () => state, STAGE: {DEAD: 'dead', FAREWELL: 'farewell'}, el,
    isGameActive: () => !!o.game, getActiveMinigame: () => o.game || null, minigameGenreId: () => o.genre || 'action', isDateOpen: () => !!o.dateOpen,
    getMinigameCategory: () => o.category || null});
  return {api, handlers, sandbox};
}

test('配置表の 場面ごとに 採用曲が 選ばれる', () => {
  const cases = [
    [{time: 'morning'}, 'home-morning'], [{time: 'day'}, 'home-day'], [{time: 'evening'}, 'home-evening'], [{time: 'night'}, 'home-night'],
    [{sleeping: true}, 'lullaby-a'], [{dateOpen: true}, 'event-2'], [{visible: ['dateMovie'], movieKind: 'anniversary'}, 'event-2'],
    [{visible: ['dateMovie'], movieKind: 'legend'}, 'kisetsu'], [{stage: 'dead'}, 'bgm-farewell'], [{visible: ['lifeCardOverlay']}, 'bgm-farewell'],
    [{visible: ['gameClearOverlay']}, 'event-1'],
    [{game: {id: 'quick-run'}}, 'bgm-game'], [{game: {id: 'reversi-6'}, genre: 'board'}, 'board-b'], [{game: {id: 'real-fishing'}}, 'fishing-a'],
    [{game: {id: 'fp-dungeon'}}, 'explore-1'], [{game: {id: 'ring-flight-3d'}}, 'var-flight'], [{game: {id: 'race-3d'}}, 'bgm-race'],
    [{game: {id: 'bowling-3d'}}, 'game-2'], [{game: {id: 'chain-puzzle'}}, 'poyo-2'], [{game: {id: 'tower-defense'}}, 'game-1'],
    [{game: {id: 'region:sea:unknown'}, genre: 'puzzle'}, 'poyo-2'], [{game: {id: 'x'}, category: 'submarine'}, 'var-flight'],
  ];
  for (const [o, want] of cases) assert.equal(harness(o).api.currentSong(), want, JSON.stringify(o));
});

test('配置表の 曲は すべて 音源が ある（100本の ミニゲームID を 含む）', () => {
  assert.equal(PLACE.ROWS.length, 50);
  assert.equal(Object.keys(PLACE.GAME_SONG).length, 100);
  for (const r of PLACE.ROWS) for (const s of r.songs) assert.ok(CAT[s], s);
  for (const s of Object.values(PLACE.GAME_SONG)) assert.ok(CAT[s], s);
  for (const [id, c] of Object.entries(CAT)) { assert.ok(fs.existsSync('assets/bgm/' + c.file), id); assert.ok(c.duration > 5, id); }
});

test('音源の 曲目が ないときは 以前の 合成BGM に もどる', () => {
  const h = harness({noCatalog: true});
  h.handlers.get('pointerdown')();
  assert.equal(h.api._debug().fileFailed, true);
  assert.equal(h.api._debug().track, 'home');
});

test('音源BGM の ときは 合成BGM を 鳴らさない（二重に 鳴らない）', () => {
  const h = harness({});
  h.handlers.get('pointerdown')();
  assert.equal(h.api._debug().fileFailed, false);
  assert.equal(h.api._debug().track, null);
});

test('BGM オフ設定では 曲を 選ばない（ジングルも 鳴らさない）', () => {
  const h = harness({bgm: false});
  h.handlers.get('pointerdown')();
  assert.equal(h.api.bgmJingle('var-ohayo-hatch2'), false);
  assert.equal((h.sandbox.NAOTOCCHI_BGM2_INSTANCES || [])[0].wanted, null);
});

test('サブアプリ3つと 本体が BGM の 部品を 読みこむ', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const f of ['assets/bgm/catalog.js', 'assets/bgm/placement.js', 'bgm-v2.js']) assert.ok(html.indexOf(f) > 0 && html.indexOf(f) < html.indexOf('audio.js?v='), f);
  for (const [p, app] of [['prototypes/naopoyo-time-hand-chapter1/index.html', 'naopoyo'], ['prototypes/card-game/index.html', 'card'], ['prototypes/life-sugoroku/index.html', 'naokoro']])
    assert.match(fs.readFileSync(p, 'utf8'), new RegExp(`bgm-subapps\\.js" data-app="${app}"`));
});
