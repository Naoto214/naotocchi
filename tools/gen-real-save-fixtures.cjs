#!/usr/bin/env node
// RH-8: 本物の 古い save の fixture を つくる(tests/fixtures/saves/real/)。
// 古い commit の コードを repo には おかない。git の worktree に その commit を 一時的に 出して、
// その commit の index.html の <script> の 順で vm に よみこみ、しばらく 時間を すすめて、
// その commit の コード 自身が 書いた localStorage の save を JSON に する。
//
//   node tools/gen-real-save-fixtures.cjs            つくる(tests/fixtures/saves/real/*.json)
//   node tools/gen-real-save-fixtures.cjs --rollback いまの コードで 読んで 書いた save を、古い コードで 読みなおして 落ちないか しらべる
//
// DOM は なんでも うけとる にせもの(描画・音・ネットは しない)。Math.random と 時計は 固定。
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'tests', 'fixtures', 'saves', 'real');
const SAVE_KEY = 'naotocchi-save-v1';
const START = Date.parse('2026-09-16T03:00:00Z');

// 時代ごとの commit と、その 時代の コードで 遊んだ ことに する 手順(state は その コードの 形の まま)
const ERAS = [
  { name: 'pre-v3', commit: '2c38b42d', note: 'schemaVersion 3 より まえ(旧 age / 旧 stage)', play: (s) => { s.lifetime.money = (s.lifetime.money || 0) + 321; } },
  { name: 'v3', commit: 'dc137f1e', note: 'schemaVersion 3(1さい=54秒 の ころ)', play: (s) => { s.lifetime.money = (s.lifetime.money || 0) + 321; } },
  { name: 'v4-pre-master', commit: 'dcc9eaec', note: 'master 導入より まえ(旧しゅぞく bird / rabbit・旧 図鑑 キー)', play: (s) => {
    s.lifetime.money = (s.lifetime.money || 0) + 321;
    s.speciesLine = 'bird';
    for (const k of ['bird:0', 'bird:1', 'rabbit:0', 'mermaid:2']) if (!s.discoveredStages.includes(k)) s.discoveredStages.push(k);
    s.lifetime.pastLives = (s.lifetime.pastLives || []).concat([{ species: 'うさぎ', line: 'rabbit', age: 7, sodachi: 40, emoji: '🐰', log: [{ age: 3, icon: '🐰', text: 'うさぎに なった' }] }]);
  } },
  { name: 'v5-pre-items-v2', commit: 'e91dab20^', note: 'items-v2 より まえ(退役した アイテム・かう しきの「なおとの〜」)', play: (s) => { s.lifetime.money = (s.lifetime.money || 0) + 321; } },
  { name: 'sticker-points-meguru-p1', commit: '619fc900', note: 'シールの ポイント・4 ページ制(#304 より まえ)+ めぐる Phase 1', play: (s, fn) => {
    s.lifetime.money = (s.lifetime.money || 0) + 321;
    for (let i = 0; i < 6 && fn.grantRandomSticker; i++) fn.grantRandomSticker();
    meguruPlay(fn, 'forest');
  } },
  { name: 'meguru-p2', commit: 'e4254e4c', note: 'めぐる Phase 2 の はじめ(links・zones の 初期の 形)', play: (s, fn) => {
    s.lifetime.money = (s.lifetime.money || 0) + 321;
    for (let i = 0; i < 4 && fn.grantRandomSticker; i++) fn.grantRandomSticker();
    meguruPlay(fn, 'home');
  } },
];

// 古い コードに あれば つかう 関数(なければ null)
const FNS = ['hatchEgg', 'grantRandomSticker', 'placeSticker', 'meguruStats', 'recordDiscovery', 'addItemMemory', 'pushLifeLog'];
// その時代の コードで 生きつづける ように メーターを もどす(せわを した ことに する)
function keepAlive(s) { for (const k of ['hunger', 'happiness', 'energy', 'health', 'hygiene', 'fun']) if (typeof s[k] === 'number') s[k] = Math.max(s[k], 90); s.isSick = false; s.isSleeping = false; if ('poops' in s && Array.isArray(s.poops)) s.poops.length = 0; }
// めぐるで あるいた ことに する(その 時代の meguruStats の 形に、その 時代の いれものが あれば だけ 書く)
function meguruPlay(fn, regionId) {
  if (!fn.meguruStats) return;
  const m = fn.meguruStats(); m.visits = (m.visits || 0) + 2;
  if (m.met) m.met['companion:shiba'] = 1;
  if (m.talks) { m.talks['companion:shiba'] = 2; m.talkCount = (m.talkCount || 0) + 2; }
  if (m.spots) m.spots[regionId] = ['old_spot_a', 'old_spot_b'];
  for (const k of ['zones', 'paths', 'marks']) if (m[k] && typeof m[k] === 'object') m[k][regionId] = [`old_${k}_1`];
  if (m.world && Array.isArray(m.world.regions)) { if (!m.world.regions.includes(regionId)) m.world.regions.push(regionId); }
  if (m.world && Array.isArray(m.world.links)) m.world.links.push('home|forest');
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// なんでも うけとる 要素。しらない メソッドは 何も しない 関数、しらない 値は undefined
function makeDom() {
  const byId = new Map();
  const noopFn = () => {};
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? (s) => ({ width: String(s).length * 8 }) : k === 'getImageData' ? () => ({ data: new Uint8ClampedArray(4) }) : typeof k === 'string' && k.startsWith('create') ? () => ({ addColorStop: noopFn }) : noopFn), set: (t, k, v) => { t[k] = v; return true; } });
  const METHODS = /^(addEventListener|removeEventListener|focus|blur|click|scrollIntoView|scrollTo|scrollBy|setAttribute|removeAttribute|toggleAttribute|append|appendChild|prepend|insertBefore|insertAdjacentHTML|insertAdjacentElement|replaceChildren|replaceWith|remove|removeChild|setPointerCapture|releasePointerCapture|hasPointerCapture|showModal|show|close|dispatchEvent|requestFullscreen|play|pause|load|select|setSelectionRange|reset|submit|after|before)$/;
  function node(tag = 'div') {
    const cls = new Set();
    const t = {
      tagName: String(tag).toUpperCase(), nodeName: String(tag).toUpperCase(), style: new Proxy({}, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && /^(setProperty|removeProperty)$/.test(k) ? noopFn : k === 'getPropertyValue' ? () => '' : ''), set: (o, k, v) => { o[k] = v; return true; } }),
      dataset: {}, children: [], childNodes: [], value: '', textContent: '', innerHTML: '', innerText: '', checked: false, disabled: false, hidden: false, isConnected: true,
      width: 390, height: 844, clientWidth: 390, clientHeight: 844, offsetWidth: 390, offsetHeight: 844, scrollTop: 0, scrollLeft: 0, scrollHeight: 844,
      classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), toggle: (c, f) => { const on = f === undefined ? !cls.has(c) : !!f; if (on) cls.add(c); else cls.delete(c); return on; }, contains: (c) => cls.has(c), replace: (a, b) => { cls.delete(a); cls.add(b); } },
      getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, x: 0, y: 0, width: 390, height: 844, right: 390, bottom: 844 }),
      querySelector: () => node(), querySelectorAll: () => [], getElementsByClassName: () => [], getElementsByTagName: () => [], closest: () => null, matches: () => false, contains: () => false,
      getAttribute: () => null, hasAttribute: () => false, cloneNode: () => node(tag), toDataURL: () => 'data:,', toBlob: (cb) => cb && cb(null), animate: () => ({ finished: Promise.resolve(), cancel: noopFn, onfinish: null }),
      getClientRects: () => [], parentNode: null, parentElement: null, firstChild: null, lastChild: null, firstElementChild: null, nextSibling: null, content: null, options: [], files: [],
    };
    return new Proxy(t, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' && METHODS.test(k) ? noopFn : undefined), set: (o, k, v) => { o[k] = v; return true; } });
  }
  const document = node('document');
  Object.assign(document, {
    getElementById: (id) => { if (!byId.has(id)) byId.set(id, node()); return byId.get(id); },
    createElement: (tag) => node(tag), createElementNS: (_, tag) => node(tag), createTextNode: () => node('#text'), createDocumentFragment: () => node('fragment'),
    body: node('body'), documentElement: node('html'), head: node('head'), visibilityState: 'visible', hidden: false, activeElement: null, fonts: { ready: Promise.resolve(), load: () => Promise.resolve() },
  });
  return document;
}

function scriptsOf(dir) {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  return [...html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]).filter((f) => fs.existsSync(path.join(dir, f)));
}

// dir の コードを うごかす。seedRaw が あれば それを save として 読ませる。play(state) は 読みこみ後に その コードの state を さわる
function runCode(dir, { seedRaw = null, play = null, minutes = 8, seed = 20260928 } = {}) {
  let now = START;
  const store = new Map(seedRaw ? [[SAVE_KEY, seedRaw]] : []);
  const timers = new Map(); let serial = 0;
  const errors = [];
  const schedule = (repeat) => (fn, delay = 0, ...args) => { const id = ++serial; timers.set(id, { at: now + Math.max(1, delay), every: repeat ? Math.max(1, delay) : 0, fn: () => fn(...args) }); return id; };
  const RealDate = Date;
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
  const listeners = {};
  const document = makeDom();
  const sandbox = {
    console: { log() {}, info() {}, warn() {}, error: (...a) => errors.push(a.map(String).join(' ')), debug() {} },
    document, TextEncoder, TextDecoder, btoa, atob, Date: FakeDate, URL, URLSearchParams, Promise, Intl,
    navigator: { userAgent: 'rh8-fixture', maxTouchPoints: 1, language: 'ja', languages: ['ja'], vibrate: () => false, clipboard: { writeText: () => Promise.resolve() } },
    fetch: () => Promise.reject(new Error('offline')),
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), key: (i) => [...store.keys()][i] ?? null, get length() { return store.size; } },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { href: 'https://naoto214.github.io/naotocchi/', search: '', hash: '', reload() {} }, history: { replaceState() {}, pushState() {}, back() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    getComputedStyle: () => new Proxy({}, { get: (o, k) => (k === 'getPropertyValue' ? () => '' : '') }),
    performance: { now: () => now - START }, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, screen: { width: 390, height: 844 },
    visualViewport: { width: 390, height: 844, scale: 1, addEventListener() {}, removeEventListener() {} },
    crypto: { getRandomValues: (a) => a, randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    setTimeout: schedule(false), setInterval: schedule(true), clearTimeout: (id) => timers.delete(id), clearInterval: (id) => timers.delete(id),
    requestAnimationFrame: (fn) => schedule(false)(() => fn(now - START), 16), cancelAnimationFrame: (id) => timers.delete(id),
    queueMicrotask: (fn) => Promise.resolve().then(fn),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); }, removeEventListener() {}, dispatchEvent() { return true; },
    Image: class { constructor() { this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; } set src(v) { this._s = v; } get src() { return this._s; } decode() { return Promise.resolve(); } },
    Event: function (type) { this.type = type; }, CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    HTMLElement: class {}, HTMLImageElement: class {}, HTMLCanvasElement: class {}, Node: class {},
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} }, IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} }, MutationObserver: class { observe() {} disconnect() {} },
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  sandbox.__rand = rng(seed);
  vm.runInContext('Math.random = __rand;', sandbox);
  for (const file of scriptsOf(dir)) {
    let src = fs.readFileSync(path.join(dir, file), 'utf8');
    if (file === 'script.js') src = src.replace(/\}\)\(\);\s*$/, '\nglobalThis.__rh8 = { save: () => saveState(), state: () => state, fn: { ' + FNS.map((n) => `${n}: typeof ${n} === 'function' ? ${n} : null`).join(', ') + ' } };\n})();');
    try { vm.runInContext(src, sandbox, { filename: file }); } catch (e) { if (file === 'script.js') throw e; errors.push(`${file}: ${e.message}`); }
  }
  const api = sandbox.__rh8;
  if (!api) throw new Error('script.js did not expose state');
  const advance = (ms) => {
    const until = now + ms;
    for (let guard = 0; guard < 200000; guard++) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= until && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) break;
      const [id, t] = next; now = t.at;
      if (t.every) t.at = now + t.every; else timers.delete(id);
      try { t.fn(); } catch (e) { errors.push(`timer: ${e.message}`); }
    }
    now = until;
  };
  advance(1000);
  const st = api.state();
  if (!seedRaw && st.stage === 'egg' && api.fn.hatchEgg) { try { api.fn.hatchEgg(); } catch (e) { errors.push(`hatch: ${e.message}`); } advance(3000); }
  if (play) play(api.state(), api.fn);
  for (let m = 0; m < minutes; m++) { if (!seedRaw) keepAlive(api.state()); advance(60 * 1000); }
  api.save();
  return { raw: store.get(SAVE_KEY), errors, state: api.state() };
}

function withWorktree(commit, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rh8-'));
  execFileSync('git', ['worktree', 'add', '--detach', dir, commit], { cwd: ROOT, stdio: 'ignore' });
  try { return fn(dir); } finally { execFileSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'ignore' }); }
}

function main() {
  const rollback = process.argv.includes('--rollback');
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const era of ERAS) {
    const sha = execFileSync('git', ['rev-parse', '--short=8', era.commit], { cwd: ROOT }).toString().trim();
    if (!rollback) {
      const r = withWorktree(sha, (dir) => runCode(dir, { play: era.play }));
      if (!r.raw) throw new Error(`${era.name}: no save written`);
      const parsed = JSON.parse(r.raw);
      delete parsed.lifetime?.currentLocation; // 位置情報は のこさない
      fs.writeFileSync(path.join(OUT, `${era.name}.json`), JSON.stringify(parsed, null, 1) + '\n');
      manifest.push({ file: `${era.name}.json`, commit: sha, schemaVersion: parsed.schemaVersion ?? null, note: era.note });
      console.log(`${era.name} @ ${sha}: schemaVersion=${parsed.schemaVersion ?? '-'} bytes=${r.raw.length} errors=${r.errors.length}`);
    } else {
      // 旧 → 新 → 旧: いまの コードで 読んで 書いた save を、その 時代の コードで 読みなおす
      const fixture = fs.readFileSync(path.join(OUT, `${era.name}.json`), 'utf8');
      const now = runCode(ROOT, { seedRaw: JSON.stringify(JSON.parse(fixture)), minutes: 1 });
      const back = withWorktree(sha, (dir) => runCode(dir, { seedRaw: now.raw, minutes: 1 }));
      const s = back.state;
      console.log(`${era.name} @ ${sha}: new→old ok stage=${s.stage} money=${s.lifetime?.money ?? s.money} errors=${back.errors.length}${back.errors.length ? ' ' + back.errors.slice(0, 2).join(' | ') : ''}`);
    }
  }
  if (!rollback) fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
}

if (require.main === module) main();
module.exports = { runCode, ERAS };
