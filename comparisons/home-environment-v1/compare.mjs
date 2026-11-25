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
  ['bump','A 現在のE','原画そのものを、縁でゼロになるずらしで動かします。幹や空も一緒に引っぱられます。'],
  ['tips','B 葉先だけ','葉を原画から分離し、枝は動かさずに葉先だけを細かく揺らします。幹・空・地面は一切動きません。'],
  ['branch','C 枝葉を分離','葉を原画から分離し、枝の付け根を軸にしならせます。葉は枝に追従し、葉先は細かく揺れます。幹・空・地面は一切動きません。'],
  ['still','D 木は静止','木は動かしません。風が通ると葉が光を受けて明るくなり、それが木から木へ伝わります。']
];
const ZOOMS = [['','全体'],['top','木の上部を拡大'],['edge','枝先と空の境目'],['grass','手前の草を拡大']];
const PRESETS = [
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・朝','forest','summer','sunny','morning'],
  ['もり・夏・夕','forest','summer','sunny','evening'],['もり・夏・夜','forest','summer','sunny','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・夏・昼','river_lake','summer','sunny','day'],
  ['いなか・夏・昼','countryside','summer','sunny','day'],['ジャングル・昼','jungle','summer','sunny','day'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening'],['やま・夏・朝','mountain','summer','sunny','morning'],
  ['とかい・夜','city','summer','sunny','night'],['おうち・昼','home','summer','sunny','day']
];
const state = {region:'forest', season:'summer', weather:'sunny', time:'day', tier:'1', left:'bump', right:'branch', zoom:''};
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
  return world.createHomeWorld({container:scene, document:doc, window, environmentFx:'final', treeSway:() => state[side]});
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
