// Comparison-only driver: the production renderer (A) beside the proposal in its two modes (B, C).
import * as nowWorld from './baseline/home-production-world.mjs';
import * as nowDay from './baseline/home-dayparts.mjs';
import * as nowLeaf from './baseline/home-autumn-leaves.mjs';
import * as nextWorld from './proposal/home-production-world.mjs';
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
  ['うみ・雨・夕','sea','summer','rain','evening'],['うみ・晴れ・朝','sea','summer','sunny','morning'],
  ['もり・夏・昼','forest','summer','sunny','day'],['もり・夏・夜','forest','summer','sunny','night'],
  ['もり・秋・昼','forest','autumn','sunny','day'],['かわ・春・夕','river_lake','spring','sunny','evening'],
  ['かわ・雨・昼','river_lake','summer','rain','day'],['いなか・秋・夜','countryside','autumn','sunny','night'],
  ['とかい・雨・夜','city','summer','rain','night'],['ゆきぐに・雪・夜','snow','winter','snow','night'],
  ['やま・夏・朝','mountain','summer','sunny','morning'],['ジャングル・雨・昼','jungle','summer','rain','day'],
  ['さばく・晴れ・昼','desert','summer','sunny','day'],['おうち・雨・夕','home','summer','rain','evening'],
  ['しんかい','deepsea','summer','sunny','day'],['ほしぞら・夜','star_stop','summer','sunny','night'],
  ['きおくのみずうみ・夕','memory_lake','summer','sunny','evening']
];
// What the living layer adds in each region (painters reused from #567/#568).
const LIVING = {
  home:'窓の外の木の揺れ、床に落ちる光のゆらぎ、雨の日は窓ガラスを伝うしずく。',
  forest:'枝葉と手前の草が風の波で揺れ、木漏れ日と光の筋が動きます。夏の夕・夜はほたる。',
  river_lake:'川面の流れとゆらぎ、瀬の白波、きらめき、岸の木の揺れ。',
  city:'街灯と窓の灯りの呼吸、路面の映り込み（雨の日は長く）、植え込みの揺れ。',
  countryside:'稲と畦の草が風の帯で揺れ、木の葉がそよぎ、地面の光が動きます。',
  mountain:'雲と霧がゆっくり流れ、足もとの草花が揺れます。',
  snow:'雪を載せた枝の揺れ、窓からこぼれる灯り、風に舞う粉雪。',
  sea:'沖から寄せる波、波打ち際の満ち引き、浅瀬の光の網、太陽・月の光の道。',
  jungle:'葉の揺れ、差しこむ光の筋のゆらぎ、池の水面、夏の夜の光。',
  desert:'砂の上を流れる風、稜線の砂けむり、昼のかげろう。',
  deepsea:'差しこむ光の柱のゆらぎと、ただよう浮遊物・小さな光。',
  star_stop:'銀河の光の脈動、星のまたたき、ときどき流れ星。',
  memory_lake:'湖面のゆるやかな流れと映り込み、岸の枝の揺れ、ただよう光。'
};
// The final candidate: C's strength, with cut-out deformation and regular motion replaced.
const FINAL = {
  home:'窓辺の光とランプのゆらぎ。鉢植えの葉が静かに揺れます。',
  forest:'葉の茂みと草むらだけが、継ぎ目なく静かに揺れます。幹は動きません。木漏れ日。夏の夕・夜は1匹ずつ別々に飛ぶほたる、夜は星のまたたき。',
  river_lake:'川面のゆらぎに、下流へすべる控えめな流れときらめき。岸の葉と草の揺れ。夏のほたる、夜の星。',
  city:'街灯と窓の灯り、路面の映り込み。植え込みの葉の揺れ。',
  countryside:'木の葉・稲・道ばたの草が静かに揺れます。夏のほたる、夜の星。',
  mountain:'霧の流れと足もとの草花の揺れ。雲は動かしません。夜の星。',
  snow:'窓からこぼれる灯りと粉雪。雪を載せた枝は動かしません。夜の星。',
  sea:'寄せて返す波と波打ち際、浅瀬の光。海面の控えめなきらめき。夜の星。',
  jungle:'葉とシダの揺れ、光の筋、池のきらめき。夏は1匹ずつ別々のほたる。',
  desert:'砂の上を流れる風。かげろうの歪みはなし。夜の星。',
  deepsea:'光の柱と浮遊物（C案と同じ）。',
  star_stop:'銀河と星のまたたき、流れ星（C案と同じ）。',
  memory_lake:'湖面のゆらぎと映り込み、柳の葉の揺れ。ただよう光は1つずつ別の道を動きます。夜の星。'
};
// What the maximum version adds on top of C.
const MAXIMUM = {
  home:'C案の動きを最大強度に。',
  forest:'枝葉・草の揺れを最大強度に。目に見える風の筋、草原を渡る風の波、夏はほたるが1匹ずつ別の道を飛び、夜は星がまたたき流れ星。',
  river_lake:'川面いっぱいに下流へ走る流れの筋ときらめき。岸を渡る風、夏の夕・夜のほたる、夜空のまたたき。',
  city:'灯りと映り込みを最大強度に。通りを抜ける風の筋。',
  countryside:'田畑と道を渡る風の波、風の筋、夏のほたる、夜空のまたたきと流れ星。',
  mountain:'尾根を越える強い風の筋、草地の風の波、夜空のまたたき。',
  snow:'雪原を走る風、枝の揺れを最大に、夜空のまたたき。',
  sea:'沖から寄せるうねりが11本、海面いっぱいのきらめき（太陽・月の道は特に強く）、波打ち際を最大に、潮風の筋。',
  jungle:'葉の揺れと光の筋を最大に、池のきらめき、夏のほたる。',
  desert:'砂丘を走る風の筋と砂の波、夜空のまたたきと流れ星。',
  deepsea:'光の柱と浮遊物を最大強度に。',
  star_stop:'銀河・星・流れ星を最大強度に。',
  memory_lake:'ただよう光が1つずつ別の道を動き、夜は星がまたたく。湖面のゆらぎを最大に。'
};
const state = {region:'forest', season:'summer', weather:'sunny', time:'night', tier:'1'};
const order = ['region','season','weather','time','tier'];
function readHash() {
  const m = location.hash.match(/^#v(\d+)-(\d)-(\d)-(\d)-(\d)$/);
  if (m) order.forEach((key, i) => { const hit = AXES[key][Number(m[i + 1])]; if (hit) state[key] = hit[0]; });
}
function writeHash() {
  const next = '#v' + order.map(key => AXES[key].findIndex(([id]) => id === state[key])).join('-');
  if (location.hash !== next) history.replaceState(null, '', next);
}

function mount(scene, mod, environmentFx) {
  const stage = scene.querySelector('.stage');
  const body = {dataset:{homeViewportVersion:'12', homeTinyOverview:'true', homeDisplayVersion:'18'}, style:{setProperty() {}}};
  const doc = {body, createElement:tag => document.createElement(tag), getElementById:() => stage, querySelector:() => null};
  return mod.createHomeWorld({container:scene, document:doc, window, environmentFx});
}
const scenes = ['sceneA','sceneB','sceneC','sceneD','sceneE'].map(id => document.getElementById(id));
const worlds = [mount(scenes[0], nowWorld), mount(scenes[1], nextWorld, 'falling'), mount(scenes[2], nextWorld, 'living'), mount(scenes[3], nextWorld, 'maximum'), mount(scenes[4], nextWorld, 'final')];

const OLD = [16,9,5];
function falling(env, proposal) {
  const mood = nowDay.atmosphere(env), old = OLD[Number(state.tier)];
  if ((proposal ? nextLeaf : nowLeaf).usesAutumnLeaves(env.region, env.time, env))
    return proposal ? '落ち葉B案。夜は月明かりの色、毎秒30コマ。' : '落ち葉B案（承認済み）。毎秒約8コマ。';
  if (mood.particle === 'leaf') return `旧い落ち葉（画像${old}枚が斜めに直進）。`;
  if (mood.particle === 'petal') return proposal ? '花びら：ゆれ・傾き・裏返りが1枚ずつ別の周期。' : `旧い花びら（画像${old}枚が斜めに直進）。`;
  if (mood.particle === 'rain') return proposal ? '雨：ほぼ真下へ3層。水面いっぱいに雨の輪（うみ・かわ・ジャングル）。' : `旧い雨（1px線${old}本・斜め約7度）。`;
  if (mood.particle === 'snow') return proposal ? '雪：3層でふわっと左右にゆれ、ゆるく横へ。' : `旧い雪（点${old}個が斜めに直進）。`;
  if (mood.particle === 'plankton' || mood.particle === 'spark') return 'ただよう光の点。';
  return mood.cloud ? '曇りの薄いベール。' : '落下物なし。';
}
function apply() {
  const env = {region:state.region, season:state.season, weather:state.weather, time:state.time};
  worlds.forEach(world => world.setEnvironment(env));
  document.getElementById('noteA').textContent = falling(env, false);
  document.getElementById('noteB').textContent = falling(env, true);
  document.getElementById('noteC').textContent = LIVING[env.region] + ' ＋ ' + falling(env, true).replace('ただよう光の点。', '');
  document.getElementById('noteD').textContent = MAXIMUM[env.region];
  document.getElementById('noteE').textContent = FINAL[env.region] + ' ＋ ' + falling(env, true).replace('ただよう光の点。', '');
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
// The left pane shows one of A to D; the final candidate stays beside it. A phone shows one at a time.
const SIDES = ['a','b','c','d','e'], narrow = matchMedia('(max-width: 700px)');
// Side by side, both the chosen left version and E are lit; on a phone only the one on screen.
function markSides() {
  for (const side of SIDES) document.getElementById('show' + side.toUpperCase()).setAttribute('aria-pressed',
    String(narrow.matches ? side === panes.dataset.show : side === 'e' || side === panes.dataset.left));
}
for (const side of SIDES) document.getElementById('show' + side.toUpperCase()).onclick = () => {
  if (side !== 'e') panes.dataset.left = side;
  panes.dataset.show = side;
  markSides();
};
narrow.addEventListener('change', markSides);
markSides();
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
    worlds.forEach((world, i) => { if (scenes[i].clientWidth) world.draw(Math.min(.1, gap / 1000), {tier:Number(state.tier), reducedMotion:reduced.matches}); });
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
