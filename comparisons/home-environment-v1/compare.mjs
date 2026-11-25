// Comparison-only driver: the final candidate twice, differing only in how trees and grass move.
import * as world from './proposal/home-production-world.mjs';
import * as current from './baseline/home-production-world.mjs';
import {FOLIAGE_B2} from './proposal/living/final.mjs';
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
  ['now','現行の本番','いまの本番のホームです。'],
  ['tips2','最終統合版','環境演出Eと、承認済みの葉先の揺れ（B2）を全地域に適用した最終統合版です。'],
  ['still','最終統合版（木は静止）','植物の揺れだけを止めた状態です。揺れの有無を見比べるためのものです。']
];
// What moves in each region, for the note under the scene.
const PLANTS = {
  home:'窓の外の木と、室内の鉢植え（ごく弱く）', forest:'葉の茂みと下草・手前の草（承認時のまま）', river_lake:'岸の木、崖の上の木、川原の草',
  city:'街路樹、植え込み、テラスの緑', countryside:'木々、稲と苗、あぜと道ばたの草', mountain:'高山の草地と足もとの草花',
  snow:'なし（雪をかぶった木は動かしません）', sea:'なし（陸の植物が描かれていません）', jungle:'樹冠、ヤシ、シダ、下草',
  desert:'砂丘の草', deepsea:'なし', star_stop:'アーチのつた、植え込み、足もとの草花', memory_lake:'柳、岸の草、すすき'
};
const ZOOMS = [['','全体'],['top','上部'],['mid','中央'],['left','左がわ'],['right','右がわ'],['grass','手前']];
const WINDS = [['0','ふつうの風'],['1','強い風']];
const PRESETS_OLD = [
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・朝','forest','summer','sunny','morning'],
  ['もり・夏・夕','forest','summer','sunny','evening'],['もり・夏・夜','forest','summer','sunny','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・夏・昼','river_lake','summer','sunny','day'],
  ['いなか・夏・昼','countryside','summer','sunny','day'],['ジャングル・昼','jungle','summer','sunny','day'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening'],['やま・夏・朝','mountain','summer','sunny','morning'],
  ['とかい・夜','city','summer','sunny','night'],['おうち・昼','home','summer','sunny','day']
];
const PRESETS = [
  ['いなか・夏・昼','countryside','summer','sunny','day'],['かわ・夏・昼','river_lake','summer','sunny','day'],
  ['ジャングル・昼','jungle','summer','sunny','day'],['とかい・昼','city','summer','sunny','day'],
  ['とかい・夜','city','summer','sunny','night'],['やま・夏・朝','mountain','summer','sunny','morning'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening'],['さばく・昼','desert','summer','sunny','day'],
  ['ほしぞら・昼','star_stop','summer','sunny','day'],['おうち・昼','home','summer','sunny','day'],
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・夜','forest','summer','sunny','night'],
  ['うみ・雨・夕','sea','summer','rain','evening'],['ゆきぐに・雪・夜','snow','winter','snow','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・春・夕','river_lake','spring','sunny','evening']
];
void PRESETS_OLD;
const state = {region:'countryside', season:'summer', weather:'sunny', time:'day', tier:'1', left:'now', right:'tips2', zoom:'', wind:'0'};
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
  const doc = {body, defaultView:window, createElement:tag => document.createElement(tag), getElementById:() => stage, querySelector:() => null};
  const make = mod => mod.createHomeWorld({container:scene, document:doc, window, environmentFx:'final',
    treeSway:() => state[side] === 'still' ? 'still' : 'tips2', wind:() => state.wind === '1' ? .95 : 0});
  // Each pane holds the production renderer and the final one, and shows whichever is chosen.
  const pair = {now:make(current), next:make(world)};
  const canvases = [...scene.querySelectorAll('canvas.home-art-canvas')], layers = [...scene.querySelectorAll('.home-dayparts-fx')];
  return {
    setEnvironment(env) { pair.now.setEnvironment(env); pair.next.setEnvironment(env); },
    draw(dt, flags) {
      const now = state[side] === 'now';
      canvases[0].hidden = !now; canvases[1].hidden = now; layers[0].hidden = !now; layers[1].hidden = now;
      (now ? pair.now : pair.next).draw(dt, flags);
    }
  };
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
    const count = (FOLIAGE_B2[state.region] || []).length;
    document.getElementById('note' + name).textContent = SWAYS.find(([key]) => key === state[side])[2] +
      (state[side] === 'tips2' ? ` この地域で揺れる植物：${PLANTS[state.region]}（${count}か所）。` : '');
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
