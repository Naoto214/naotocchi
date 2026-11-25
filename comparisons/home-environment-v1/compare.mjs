// Comparison-only driver: the final candidate twice, differing only in how trees and grass move.
import * as world from './proposal/home-production-world.mjs';
import {atmosphere} from './proposal/home-dayparts.mjs';

const AXES = {
  region:[['home','おうち'],['forest','もり'],['river_lake','かわ'],['city','とかい'],['countryside','いなか'],['mountain','やま'],
    ['snow','ゆきぐに'],['sea','うみ'],['jungle','ジャングル'],['desert','さばく'],['deepsea','しんかい'],['star_stop','ほしぞら'],['memory_lake','きおくのみずうみ']],
  season:[['spring','はる'],['summer','なつ'],['autumn','あき'],['winter','ふゆ']],
  weather:[['sunny','晴れ'],['cloudy','曇り'],['rain','雨'],['snow','雪']],
  time:[['morning','朝'],['day','昼'],['evening','夕'],['night','夜']],
  tier:[['0','多い'],['1','ふつう'],['2','少ない']]
};
const SWAYS = [
  ['tips','B 葉先（従来）','葉先だけを細かく揺らします。葉のレイヤーを四角いタイルごとに別々に動かすため、境目や隙間が見えることがあります。16か所。'],
  ['tips2','B2 継ぎ目を改善','Bと同じ速さ・揺れ幅・16か所のまま、継ぎ目の出ない方式に作り直しました。枝は動きません。'],
  ['tips3','B3 範囲を拡張','B2を、樹冠の上部・中景と遠景の木・下草・手前の草まで30か所に広げました。枝は動きません。'],
  ['rigid','B4 枝の形を保って回転','B3に加えて、細い小枝を葉と一緒に分離し、付け根を軸に枝ごとわずかに回します。枝の長さ・太さ・曲がりは変わりません。幹と太い枝は固定です。'],
  ['wide','C2 しなり（前回の候補）','枝の付け根から先へ向かって曲がりが大きくなる「しなり」です。30か所。']
];
const ZOOMS = [['','全体'],['top','木の上部'],['edge','枝先と空の境目'],['mid','中景・遠景の木'],['grass','手前の草']];
const WINDS = [['0','ふつうの風'],['1','強い風']];
const PRESETS = [
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・朝','forest','summer','sunny','morning'],
  ['もり・夏・夕','forest','summer','sunny','evening'],['もり・夏・夜','forest','summer','sunny','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・夏・昼','river_lake','summer','sunny','day'],
  ['いなか・夏・昼','countryside','summer','sunny','day'],['ジャングル・昼','jungle','summer','sunny','day'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening'],['やま・夏・朝','mountain','summer','sunny','morning'],
  ['とかい・夜','city','summer','sunny','night'],['おうち・昼','home','summer','sunny','day']
];
const state = {region:'forest', season:'summer', weather:'sunny', time:'day', tier:'1', left:'wide', right:'rigid', zoom:'', wind:'0'};
const order = ['region','season','weather','time','tier'];
function readHash() {
  const m = location.hash.match(/^#t(\d+)-(\d)-(\d)-(\d)-(\d)-(\d)-(\d)$/);
  if (!m) return;
  order.forEach((key, i) => { const hit = AXES[key][Number(m[i + 1])]; if (hit) state[key] = hit[0]; });
  state.left = SWAYS[Number(m[6])]?.[0] || state.left; state.right = SWAYS[Number(m[7])]?.[0] || state.right;
}
function writeHash() {
  const sway = id => SWAYS.findIndex(([key]) => key === id);
  const next = '#t' + [...order.map(key => AXES[key].findIndex(([id]) => id === state[key])), sway(state.left), sway(state.right)].join('-');
  if (location.hash !== next) history.replaceState(null, '', next);
}

function mount(scene, side) {
  const stage = scene.querySelector('.stage');
  const body = {dataset:{homeViewportVersion:'12', homeTinyOverview:'true', homeDisplayVersion:'18'}, style:{setProperty() {}}};
  const doc = {body, createElement:tag => document.createElement(tag), getElementById:() => stage, querySelector:() => null};
  return world.createHomeWorld({container:scene, document:doc, window, environmentFx:'final', treeSway:() => state[side], wind:() => state.wind === '1' ? .95 : 0});
}
const scenes = [document.getElementById('sceneLeft'), document.getElementById('sceneRight')];
const worlds = [mount(scenes[0], 'left'), mount(scenes[1], 'right')];
const panes = document.getElementById('panes');

function chips(host, items, current, pick) {
  host.textContent = '';
  for (const [value, label] of items) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label; button.setAttribute('aria-pressed', String(value === current()));
    button.onclick = () => { pick(value); apply(); };
    host.append(button);
  }
}
function apply() {
  const env = {region:state.region, season:state.season, weather:state.weather, time:state.time};
  worlds.forEach(w => w.setEnvironment(env));
  void atmosphere;
  for (const side of ['left','right']) {
    const name = side === 'left' ? 'Left' : 'Right';
    chips(document.getElementById('sway' + name), SWAYS, () => state[side], value => { state[side] = value; });
    document.getElementById('note' + name).textContent = SWAYS.find(([key]) => key === state[side])[2];
  }
  chips(document.getElementById('zoom'), ZOOMS, () => state.zoom, value => { state.zoom = value; });
  chips(document.getElementById('wind'), WINDS, () => state.wind, value => { state.wind = value; });
  panes.dataset.zoom = state.zoom;
  for (const key of order) chips(document.getElementById(key), AXES[key], () => state[key], value => { state[key] = value; });
  const presets = document.getElementById('presets');
  presets.textContent = '';
  for (const [label, ...values] of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    button.setAttribute('aria-pressed', String(values.every((v, i) => state[order[i]] === v)));
    button.onclick = () => { values.forEach((v, i) => { state[order[i]] = v; }); apply(); };
    presets.append(button);
  }
  writeHash();
}
readHash();
addEventListener('hashchange', () => { readHash(); apply(); });
apply();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// The home itself steps at 30 fps; the comparison keeps the same cadence.
let last = performance.now();
function frame(now) {
  const gap = now - last;
  if (gap >= 32) {
    last = now;
    // A pane hidden by the phone layout has no size to paint into.
    worlds.forEach((w, i) => { if (scenes[i].clientWidth) w.draw(Math.min(.1, gap / 1000), {tier:Number(state.tier), reducedMotion:reduced.matches}); });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
