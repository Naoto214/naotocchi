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
const CLOUD_STYLES = [['none','A 雲なし'],['flat','B 前回の雲'],['single','C 形と濃淡のある雲'],['layered','D 奥行きのある2層の雲']];
const CLOUDS = [['auto','天気に合わせて自動'],['0','雲なし'],['0.25','少ない'],['0.6','多い'],['1','空を覆う']];
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
  ['いなか・晴れの雲','countryside','summer','sunny','day'],['いなか・曇り','countryside','summer','cloudy','day'],
  ['うみ・雨雲','sea','summer','rain','day'],['うみ・夕方の雲','sea','summer','cloudy','evening'],
  ['さばく・夜の雲と星','desert','summer','cloudy','night'],['おうち・曇り（窓の外）','home','summer','cloudy','day'],
  ['いなか・冬の雪雲','countryside','winter','snow','day'],['きおくのみずうみ・曇り','memory_lake','summer','cloudy','day'],
  ['秋のいなか（遠くの山）','countryside','autumn','sunny','day'],['秋のかわ','river_lake','autumn','sunny','day'],
  ['春のいなか（花）','countryside','spring','sunny','day'],['冬のいなか（霜）','countryside','winter','sunny','morning'],
  ['秋の森','forest','autumn','sunny','day'],['冬の森','forest','winter','sunny','day'],
  ['おうち・秋','home','autumn','sunny','day'],['ほしぞら（秋）','star_stop','autumn','sunny','day']
];
void PRESETS_OLD;
const state = {region:'countryside', season:'summer', weather:'sunny', time:'day', tier:'1', left:'now', right:'tips2', zoom:'', wind:'auto', amount:'auto', speed:'1', measured:'none', tint:'full', subtle:'on', cloud:'auto', cloudStyle:'layered'};
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
      ...(state.wind === 'auto' ? {} : {wind:WIND_LEVELS[state.wind]}), ...(state.amount === 'auto' ? {} : {density:DENSITY_LEVELS[state.amount]}), ...(state.cloud === 'auto' ? {} : {cloud:Number(state.cloud)})};
  };
  const make = mod => mod.createHomeWorld({container:scene, document:doc, window, environmentFx:'final',
    treeSway:() => state[side] === 'still' ? 'still' : 'tips2', climate:override, cloudStyle:() => state.cloudStyle, seasonTint:() => ({...TINT_CHOICES[state.tint], subtle:state.subtle === 'on'}), onClimate:air => { latest[side] = air; }});
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
  chips(document.getElementById('cloudStyle'), CLOUD_STYLES, () => state.cloudStyle, value => { state.cloudStyle = value; });
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
    button.setAttribute('aria-pressed', String(values.every((v, i) => state[order[i]] === v)));
    button.onclick = () => { values.forEach((v, i) => { state[order[i]] = v; }); apply(); };
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
  if (air.cloud > .02) parts.push(`雲：${Math.round(air.cloud * 100)}%`);
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
