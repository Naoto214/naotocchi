// Comparison-only driver: the final candidate twice, differing only in how trees and grass move.
import * as world from './proposal/home-production-world.mjs';
import * as current from './baseline/home-production-world.mjs';
import {FOLIAGE_B2} from './proposal/living/final.mjs';
import {WIND_LEVELS, DENSITY_LEVELS, levelName} from './proposal/home-climate.mjs';
import {seasonalPainting, TINT_CHOICES, SEASON_PLANTS, SUBTLE_PLANTS} from './proposal/living/seasons.mjs';
import {DAYPARTS} from './proposal/home-dayparts.mjs';
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
const WINDS = [['auto','自動で変化'],['calm','無風に近い'],['light','弱い'],['normal','普通'],['strong','強い']];
const AMOUNTS = [['auto','自動で変化'],['small','小'],['medium','中（承認済みの量）'],['large','大']];
const TINTS = [['none','原画の色'],['wide','A 現在のD案'],['full','B 遠景まで強化＋春の花・冬の霜']];
// Faces of the one two-layer sky. Each pins {cover, bright, thick, size}; 'auto' lets them drift.
const LOOKS = [['auto','自動（自然に変化）'],
  ['clear','快晴',{cover:.03, bright:1, thick:.6, size:1}],
  ['few','白い雲が少し',{cover:.2, bright:1, thick:.75, size:.9}],
  ['cumulus','大きな綿雲',{cover:.44, bright:1, thick:1, size:1.35}],
  ['thin','薄く広がる雲',{cover:.62, bright:1, thick:.25, size:1.25}],
  ['high','明るい高曇り',{cover:.92, bright:.95, thick:.55, size:1.25}],
  ['broken','青空の残る雲',{cover:.6, bright:.8, thick:.9, size:1}],
  ['white','厚い白灰色の雲',{cover:1, bright:.62, thick:1, size:1.05}],
  ['bluegrey','青灰色の雲',{cover:.9, bright:.38, thick:.9, size:1.1}],
  ['dark','厚く暗い雲',{cover:1, bright:.05, thick:1, size:1.2}],
  ['break','雲間から光',{cover:.8, bright:.7, thick:.9, size:1.1, light:1}]];
const CLOUDS = LOOKS.map(([key, name]) => [key, name]);
const SUBTLES = [['off','変えない（原画のまま）'],['on','ごく控えめに変える']];
const SPEEDS = [['1','ふつう'],['12','12倍速（変化を早く見る）']];
// Example measurements, as the weather service would report them (mm/h, cm/h, m/s).
const MEASURED = [
  ['none','連携なし（ゲーム内で変化）',null],
  ['still','晴れ・ほぼ無風（風0.5m/s）',{windSpeed:.5, windGusts:1}],
  ['drizzle','小雨・そよ風（0.4mm/h・風1.5m/s）',{precipitation:.4, windSpeed:1.5, windGusts:3}],
  ['downpour','大雨・強風（8mm/h・風9m/s）',{precipitation:8, windSpeed:9, windGusts:16}],
  ['flurry','小雪（0.3cm/h・風2m/s）',{snowfall:.3, windSpeed:2, windGusts:4}],
  ['blizzard','大雪・強風（3cm/h・風7m/s）',{snowfall:3, windSpeed:7, windGusts:13}]
];
const WIND_NAMES = {calm:'無風に近い', light:'弱い', normal:'普通', strong:'強い'}, AMOUNT_NAMES = {small:'小', medium:'中', large:'大'};
const KIND_NAMES = {rain:'雨', snow:'雪', petal:'花びら', leaf:'落ち葉'};
const PRESETS_OLD = [
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・朝','forest','summer','sunny','morning'],
  ['もり・夏・夕','forest','summer','sunny','evening'],['もり・夏・夜','forest','summer','sunny','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・夏・昼','river_lake','summer','sunny','day'],
  ['いなか・夏・昼','countryside','summer','sunny','day'],['ジャングル・昼','jungle','summer','sunny','day'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening'],['やま・夏・朝','mountain','summer','sunny','morning'],
  ['とかい・夜','city','summer','sunny','night'],['おうち・昼','home','summer','sunny','day']
];
const PRESETS = [
  ['晴れ・快晴','countryside','summer','sunny','day','clear'],['晴れ・大きな綿雲','countryside','summer','sunny','day','cumulus'],
  ['晴れ・薄雲','sea','summer','sunny','day','thin'],['明るい高曇り','countryside','summer','cloudy','day','high'],
  ['暗めの曇り','river_lake','summer','cloudy','day','dark'],['雲間から光','countryside','summer','cloudy','day','break'],
  ['明るい雨（通り雨）','countryside','summer','rain','day','broken'],['白っぽい雨雲','sea','summer','rain','day','white'],
  ['青灰色の雨','river_lake','summer','rain','day','bluegrey'],['強い雨の暗い雲','sea','summer','rain','day','dark'],
  ['明るい雪雲','countryside','winter','snow','day','high'],['青空の残る雪','mountain','winter','snow','day','broken'],
  ['静かな雪空','city','winter','snow','day','bluegrey'],['夜の雪雲','countryside','winter','snow','night','white'],
  ['朝の雲','sea','summer','sunny','morning','cumulus'],['夕焼けの雲','sea','summer','sunny','evening','broken'],
  ['夕方・いなか','countryside','autumn','cloudy','evening','broken'],['夜・雲間の星','desert','summer','cloudy','night','broken'],
  ['おうちの窓','home','summer','cloudy','day','broken'],['森（葉の間の空）','forest','summer','cloudy','day','white'],
  ['都会','city','summer','cloudy','day','broken'],['きおくのみずうみ','memory_lake','summer','sunny','day','cumulus'],
  ['おまかせ（12倍速で変化）','countryside','summer','cloudy','day','auto','12']
];
void PRESETS_OLD;
const state = {region:'countryside', season:'summer', weather:'sunny', time:'day', tier:'1', left:'now', right:'tips2', zoom:'', wind:'auto', amount:'auto', speed:'1', measured:'none', tint:'full', subtle:'on', cloud:'auto'};
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
  const override = () => {
    const measured = MEASURED.find(([key]) => key === state.measured)[2];
    return {speed:Number(state.speed), ...(measured ? {measured} : {}),
      ...(state.wind === 'auto' ? {} : {wind:WIND_LEVELS[state.wind]}), ...(state.amount === 'auto' ? {} : {density:DENSITY_LEVELS[state.amount]}), ...(state.cloud === 'auto' ? {} : {sky:LOOKS.find(([key]) => key === state.cloud)[2]})};
  };
  const make = mod => mod.createHomeWorld({container:scene, document:doc, window, environmentFx:'final',
    treeSway:() => state[side] === 'still' ? 'still' : 'tips2', climate:override, seasonTint:() => ({...TINT_CHOICES[state.tint], subtle:state.subtle === 'on'}), onClimate:air => { latest[side] = air; }});
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
const latest = {}, pictures = new Map();
let seasonsJob = 0;
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
  chips(document.getElementById('tint'), TINTS, () => state.tint, value => { state.tint = value; });
  chips(document.getElementById('cloud'), CLOUDS, () => state.cloud, value => { state.cloud = value; });
  chips(document.getElementById('subtle'), SUBTLES, () => state.subtle, value => { state.subtle = value; });
  drawSeasons();
  chips(document.getElementById('amount'), AMOUNTS, () => state.amount, value => { state.amount = value; });
  chips(document.getElementById('speed'), SPEEDS, () => state.speed, value => { state.speed = value; });
  chips(document.getElementById('measured'), MEASURED.map(([key, label]) => [key, label]), () => state.measured, value => { state.measured = value; if (value !== 'none') { state.wind = 'auto'; state.amount = 'auto'; } });
  panes.dataset.zoom = state.zoom;
  for (const key of order) chips(document.getElementById(key), AXES[key], () => state[key], value => { state[key] = value; });
  const presets = document.getElementById('presets');
  presets.textContent = '';
  for (const [label, ...values] of PRESETS) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    const [look = 'auto', speed = '1'] = values.splice(4);
    button.setAttribute('aria-pressed', String(values.every((v, i) => state[order[i]] === v) && state.cloud === look && state.speed === speed));
    button.onclick = () => { values.forEach((v, i) => { state[order[i]] = v; }); state.cloud = look; state.speed = speed; state.measured = 'none'; if (state.right === 'now') state.right = 'tips2'; apply(); };
    presets.append(button);
  }
  writeHash();
}
readHash();
addEventListener('hashchange', () => { readHash(); apply(); });
apply();
// The same painting in the four seasons, side by side, at the chosen colour strength.
function picture(src) {
  if (!pictures.has(src)) pictures.set(src, new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }));
  return pictures.get(src);
}
async function drawSeasons() {
  const job = ++seasonsJob, {region, time} = state, choice = TINT_CHOICES[state.tint], strength = choice.strength, subtle = state.subtle === 'on';
  const note = document.getElementById('seasonsNote');
  note.textContent = SEASON_PLANTS[region] ? (strength ? '' : '「A 原画の色」では4つとも原画のままです。') : SUBTLE_PLANTS[region] ? (subtle && strength ? 'この地域は紅葉させず、緑の明るさ・深さだけをごくわずかに変えています。' : 'この地域は原画のままです。「変えない地域」を「ごく控えめに変える」にすると、わずかな差がつきます。') : 'この地域は季節で色を変えません（原画のまま）。';
  const [image, day] = await Promise.all([picture(DAYPARTS[region][time]), picture(DAYPARTS[region].day)]).catch(() => []);
  if (!image || job !== seasonsJob) return;
  for (const season of ['spring','summer','autumn','winter']) {
    const canvas = document.getElementById('season-' + season), c = canvas.getContext('2d');
    const reference = region === 'forest' && time === 'night' ? image : day;
    c.drawImage(seasonalPainting(image, {region, time, season, strength, far:!!choice.far, rich:!!choice.rich, subtle, reference, doc:document}), 0, 0, canvas.width, canvas.height);
  }
}
// What the final version is doing right now, refreshed twice a second.
function readout() {
  const side = state.right === 'now' ? (state.left === 'now' ? null : 'left') : 'right', air = side && latest[side];
  const el = document.getElementById('readout');
  if (!air) { el.textContent = '現行の本番には、風と量の変化はありません。'; return; }
  const parts = [`風：${WIND_NAMES[levelName(air.wind, WIND_LEVELS)]}（${air.wind.toFixed(2)}）`], l = air.layers;
  const amount = (kind, share) => parts.push(`${KIND_NAMES[kind]}：${AMOUNT_NAMES[levelName(air[kind], DENSITY_LEVELS)]}（${(air[kind] * share).toFixed(2)}）`);
  if (l.precipitation) amount(l.precipitation, 1);
  if (l.petals > 0) amount('petal', l.petals);
  if (l.leaves > 0) amount('leaf', l.leaves);
  if (l.rings) parts.push('水面の波紋');
  if (air.sky && air.cloud > .02) parts.push(`雲：${Math.round(air.cloud * 100)}%・${air.sky.bright > .75 ? '明るい' : air.sky.bright > .4 ? '白灰' : '暗め'}・${air.sky.thick > .65 ? '厚い' : '薄い'}`);
  if (air.sky) parts.push(`地上の光：${Math.round(air.sky.light * 100)}%`);
  if (l.twinkle > 0) parts.push(l.twinkle < 1 ? '星のまたたき（薄雲ごし）' : '星のまたたき');
  if (l.meteors > 0) parts.push(l.meteors < 1 ? '流れ星（まれ）' : '流れ星（ときどき）');
  if (l.fireflies) parts.push('ほたる・ただよう光');
  el.textContent = 'いま：' + parts.join('　／　');
}
setInterval(readout, 500);
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
