// Comparison-only driver: the same production renderer, built from main and from this branch.
import * as nowWorld from './baseline/home-production-world.mjs';
import * as nowDay from './baseline/home-dayparts.mjs';
import * as nowLeaf from './baseline/home-autumn-leaves.mjs';
import * as nextWorld from './proposal/home-production-world.mjs';
import * as nextDay from './proposal/home-dayparts.mjs';
import * as nextLeaf from './proposal/home-autumn-leaves.mjs';

const AXES = {
  region:[['home','おうち'],['forest','もり'],['river_lake','かわ'],['city','とかい'],['countryside','いなか'],['mountain','やま'],
    ['snow','ゆきぐに'],['sea','うみ'],['jungle','ジャングル'],['desert','さばく'],['deepsea','しんかい'],['star_stop','ほしぞら'],['memory_lake','きおくのみずうみ']],
  season:[['spring','はる'],['summer','なつ'],['autumn','あき'],['winter','ふゆ']],
  weather:[['sunny','晴れ'],['cloudy','曇り'],['rain','雨'],['snow','雪']],
  time:[['morning','朝'],['day','昼'],['evening','夕'],['night','夜']],
  tier:[['0','多い'],['1','ふつう'],['2','少ない']]
};
const PRESETS = [
  ['かわ・秋・昼','river_lake','autumn','sunny','day'],['いなか・秋・夜','countryside','autumn','sunny','night'],
  ['もり・秋・夜','forest','autumn','sunny','night'],['やま・秋・夕','mountain','autumn','sunny','evening'],
  ['もり・春・昼','forest','spring','sunny','day'],['かわ・春・夕','river_lake','spring','sunny','evening'],
  ['うみ・雨・昼','sea','summer','rain','day'],['とかい・雨・夜','city','summer','rain','night'],
  ['もり・雨・朝','forest','summer','rain','morning'],['ゆきぐに・雪・夜','snow','winter','snow','night'],
  ['いなか・雪・昼','countryside','winter','snow','day'],['おうち・雨・夕','home','summer','rain','evening']
];
const state = {region:'river_lake', season:'autumn', weather:'sunny', time:'day', tier:'0'};
const order = ['region','season','weather','time','tier'];
function readHash() {
  const m = location.hash.match(/^#v(\d+)-(\d)-(\d)-(\d)-(\d)$/);
  if (m) order.forEach((key, i) => { const hit = AXES[key][Number(m[i + 1])]; if (hit) state[key] = hit[0]; });
}
function writeHash() {
  const next = '#v' + order.map(key => AXES[key].findIndex(([id]) => id === state[key])).join('-');
  if (location.hash !== next) history.replaceState(null, '', next);
}

function mount(scene, mod) {
  const stage = scene.querySelector('.stage');
  const body = {dataset:{homeViewportVersion:'12', homeTinyOverview:'true', homeDisplayVersion:'18'}, style:{setProperty() {}}};
  const doc = {body, createElement:tag => document.createElement(tag), getElementById:() => stage, querySelector:() => null};
  return mod.createHomeWorld({container:scene, document:doc, window});
}
const scenes = [document.getElementById('sceneNow'), document.getElementById('sceneNext')];
const worlds = [mount(scenes[0], nowWorld), mount(scenes[1], nextWorld)];

const COUNT = {old:[16,9,5]};
function describe(env, day, leaf, proposal) {
  const mood = day.atmosphere(env), tier = Number(state.tier);
  if (leaf.usesAutumnLeaves(env.region, env.time, env))
    return proposal ? '落ち葉B案（承認済みの葉・表裏・風）。夜は月明かりの色、毎秒30コマで描画。' : '落ち葉B案（承認済み）。毎秒約8コマで描画。';
  const old = COUNT.old[tier];
  if (mood.particle === 'leaf') return `旧い落ち葉（葉の画像${old}枚が斜めに直進）。B案は未適用。`;
  if (mood.particle === 'petal') return proposal ? '花びら：ゆれ・傾き・裏返りを個別の周期で。時間帯で色が変わります。' : `旧い花びら（花の画像${old}枚が斜めに直進・一定回転）。`;
  if (mood.particle === 'rain') return proposal ? '雨：ほぼ真下へ、遠・中・近の3層。雨雲の色かぶせ、水面には雨の輪。' : `旧い雨（1px線${old}本・斜め約7度・不透明度0.36）。`;
  if (mood.particle === 'snow') return proposal ? '雪：遠・中・近の3層。ふわっと左右にゆれて、ゆるく横へ流れます。' : `旧い雪（点${old}個が斜めに直進）。`;
  if (mood.particle === 'plankton' || mood.particle === 'spark') return 'ただよう光（現状維持）。';
  return mood.cloud ? '曇りの薄いベール（現状維持）。' : '粒子なし。原画の光と影のみ（現状維持）。';
}
function apply() {
  const env = {region:state.region, season:state.season, weather:state.weather, time:state.time};
  worlds.forEach(world => world.setEnvironment(env));
  document.getElementById('noteNow').textContent = describe(env, nowDay, nowLeaf, false);
  document.getElementById('noteNext').textContent = describe(env, nextDay, nextLeaf, true);
  for (const key of order) for (const button of document.getElementById(key).children)
    button.setAttribute('aria-pressed', String(button.dataset.value === state[key]));
  for (const button of document.getElementById('presets').children) {
    const [, ...values] = PRESETS[button.dataset.index];
    button.setAttribute('aria-pressed', String(values.every((v, i) => state[order[i]] === v)));
  }
  writeHash();
}
for (const key of order) {
  const host = document.getElementById(key);
  for (const [value, label] of AXES[key]) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.value = value; button.textContent = label;
    button.onclick = () => { state[key] = value; apply(); };
    host.append(button);
  }
}
PRESETS.forEach(([label, ...values], index) => {
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.index = index; button.textContent = label;
  button.onclick = () => { values.forEach((v, i) => { state[order[i]] = v; }); apply(); };
  document.getElementById('presets').append(button);
});
const panes = document.getElementById('panes');
for (const [id, side] of [['showNow','now'],['showNext','next']]) document.getElementById(id).onclick = () => {
  panes.dataset.show = side;
  document.getElementById('showNow').setAttribute('aria-pressed', String(side === 'now'));
  document.getElementById('showNext').setAttribute('aria-pressed', String(side === 'next'));
};
readHash();
addEventListener('hashchange', () => { readHash(); apply(); });
apply();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let last = performance.now();
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  // A pane hidden by the phone layout has no size to paint into.
  worlds.forEach((world, i) => { if (scenes[i].clientWidth) world.draw(dt, {tier:Number(state.tier), reducedMotion:reduced.matches}); });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
