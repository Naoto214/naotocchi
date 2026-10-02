// めぐる 3D 静的 geometry 監査(2026-10-02・Geometry pass の 続き。Human QA を またない 範囲)
//   - 接地(浮き / 埋まり)・小川 / 川 / 橋の 交わり・池の 円盤・家の シルエット・小物の 読みやすさ・季節(2D の 正本)
//   - 監査の 中身は tools/meguru-3d-qa/geometry-audit.cjs と おなじ(auditRegion)。3D だけ・あたり / 道 / spot / save は かえない
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./helpers/runtime-harness.cjs');
const { auditRegion, FLOAT_TOL } = require('../tools/meguru-3d-qa/geometry-audit.cjs');

const ROOT = path.join(__dirname, '..');
const SRC3D = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
const h = harness({ deterministic: true, fullDisplay: true });
const M = h.api.meguruMod, st = h.api.state();
Object.assign(st, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'home' });
h.api.render();
const reg = M.buildRegistry();
const REGIONS = Object.keys(M.REGION3D);
let reports = null;
const all = async () => {
  if (reports) return reports;
  const m3 = await import(path.join(ROOT, 'meguru-3d.mjs'));
  reports = {}; for (const rid of REGIONS) reports[rid] = auditRegion(M, m3, reg, rid);
  return reports;
};

test('GA-1. 接地: 地面に つく parts は 足もとの いちばん ひくい 地面まで(斜面で 岩 / 盛り土 / 根 / 岸の 花が 浮かない)。13 地域', async () => {
  const R = await all();
  for (const rid of REGIONS) {
    const g = R[rid].ground;
    assert.ok(g.parts > 0 || rid === 'deepsea', rid + ' 監査の 対象');
    // 以前(物の 中心の 高さ だけ): 山 411・ジャングル 305・砂漠 231 浮き → いまは 地域ごと 2 いか(のこりは 谷の 大岩 = 斜面に うまった 岩)
    assert.ok(g.float <= 2, `${rid}: 浮き ${g.float}(> ${FLOAT_TOL})`);
  }
  // 構造物は 物ごと(屋根と からだが ずれない)・それ以外は parts ごと・がれきは parts ごと
  assert.match(SRC3D, /export function objectGround\(terr, ob\)/);
  assert.match(SRC3D, /const gr = objectGround\(terr, ob\);/);
  assert.match(SRC3D, /if \(gr\.part\) curOy = gr\.part\(pt\);/);
  // 立て看板 / ねかせた 物 も 地形の 高さに(以前は y = 0 で 丘に うまった)
  assert.match(SRC3D, /list\.push\(\{ x: px, y: curOy, z: pz, w: pt\.w, h: pt\.h/);
  assert.match(SRC3D, /tmp\.position\.set\(it\.x, \(it\.y \|\| 0\) - 0\.02 \* it\.h, it\.z\)/);
  // 建物の 敷地は 根の 起伏 / 土手 / 浜 / がけの 足もと でも 平ら
  for (const term of ['R.root \\*', 'R.bank \\*', 'R.cliffFoot \\*', 'R.beach \\? 12 : 0\\)']) assert.match(SRC3D, new RegExp(term + '[^;]*plot'), term);
});

test('GA-2. 小川 / 川 の 交わり: 橋の 交わり には 橋(床 > 水面・ながさ ≥ 水の はば)、そのほかは 飛び石。ランドマークの 橋は 交わりの 上に ある とき だけ うけもつ', async () => {
  const R = await all();
  let n = 0;
  for (const rid of REGIONS) for (const c of R[rid].crossings) { n++; assert.ok(c.ok, `${rid} ${c.stream} ${c.kind}: ${JSON.stringify(c)}`); }
  assert.ok(n >= 15, '交わりの 数 ' + n);
  // river_lake の bridge2(0, 2250): 以前は 395 はなれた ランドマークの 橋が うけもち、道が 川を わたる ところに 橋が なかった
  assert.ok(R.river_lake.crossings.every((c) => c.kind !== 'bridge' || c.has === 'bridge'));
  assert.match(SRC, /near\[1\] < Math\.max\(160, near\[0\]\.w \+ 80\)/);
});

test('GA-3. 小川と 池を わける: ながれの 帯の 中に 池の 円盤(水の 小物)を おかない', async () => {
  const R = await all();
  for (const rid of REGIONS) assert.equal(R[rid].ponds.length, 0, rid + ' ' + JSON.stringify(R[rid].ponds));
});

test('GA-4. Building v4: 塔の ような 家 なし(シルエット 高さ / いちばん ひろい はば ≤ 1.6、看板 / 屋根の はりだし を ふくむ)', async () => {
  const R = await all();
  let n = 0;
  for (const rid of REGIONS) for (const b of R[rid].buildings) { if (b.landmark) continue; n++; assert.ok(b.sil <= 1.6, `${rid} ${b.id} ${b.sil}`); }
  assert.ok(n >= 150, '家の 数 ' + n);
});

test('GA-5. 小物の 読みやすさ(props gate): 車 = 車輪・望遠鏡 = 3 本 足 + かたむいた 筒・像 = だい + からだ + あたま・かまくら = いりぐち・箱の 小物 = ひさし + 窓。絵文字の 立て看板 は のこって いない', async () => {
  const src = (name) => { const i = SRC.indexOf("case '" + name + "':"); assert.ok(i > 0, name); return SRC.slice(i, i + 900); };
  assert.match(src('car'), /shape: 'log', len: W \+ 5/, '車輪');
  assert.match(src('telescope'), /tilt: 0\.3[\s\S]*tilt: 1\.05/, '3 本 足 + 筒');
  assert.match(src('statue'), /rx: 18, rz: 18, h: 22[\s\S]*rx: 9, rz: 7, h: 34[\s\S]*shape: 'nut', r: 9/, 'だい + からだ + あたま');
  assert.match(src('dome'), /r: r \* 0\.36, sy: 1\.1/, 'いりぐち');
  // 2026-10-02 VQ: decorative shop/cafe props also need canopy + window, even without a collider.
  assert.match(src('boxprop'), /if \(!sm\.vend && \(o \|\| ctx\.kind === '🏪' \|\| ctx\.kind === '☕'\)\)[\s\S]{0,200}shape: 'wslab'/, 'ひさし + 窓');
  // 絵文字の 立て看板(2D の 記号を 3D に 立てた 物)は 13 地域 で 0
  for (const rid of REGIONS) {
    const w = M.buildWorld(rid, reg, { world3d: true });
    const bb = M.worldObjects3d(w).objects.filter((o) => (o.parts || []).some((p) => p.shape === 'billboard'));
    assert.equal(bb.length, 0, rid + ' billboard ' + bb.slice(0, 3).map((o) => o.emoji || o.kind).join(' '));
  }
});

test('GA-6. 季節 / 天気 は 2D の 正本に あわせる: 針葉樹の 雪 = ゆき の 地域 か 冬、山の 頂の 雪 = それ + 雪の 日、deepsea / star_stop は 地表の 季節 なし', () => {
  // 2D(meguru.js): pinewall の snowy = region snow || winter、peak の snowy = region snow || winter || weather snow
  assert.match(SRC, /case 'pinewall': \{ const snowy = o\.region === 'snow' \|\| curEnv\.season === 'winter';/);
  assert.match(SRC, /const snowy = world\.regionId === 'snow' \|\| curEnv\.season === 'winter' \|\| curEnv\.weather === 'snow';/);
  // 3D: おなじ 条件
  assert.match(SRC3D, /const coneSnow = rid === 'snow' \|\| sk === 'winter', peakSnow = coneSnow \|\| env\.weather === 'snow';/);
  assert.match(SRC3D, /built\.meshes\.snowcone\.visible = coneSnow/);
  assert.match(SRC3D, /built\.meshes\.snowcap\.visible = peakSnow/);
  assert.match(SRC3D, /surf = rid !== 'deepsea' && rid !== 'star_stop'/, '2D の hasSurfaceSeasons と おなじ');
  // 針葉樹の 段 そのものは みどりの まま(白い 木に しない)・頂の 雪は 季節で 出し入れ
  assert.ok(!/cone\.material\.color\.set\(snowy \?/.test(SRC3D));
  assert.match(SRC3D, /push\('snowcone', \{ x: px, y: pt\.y \+ pt\.h \* 0\.45/);
  assert.match(SRC, /color: '#f4f8fc', snow: true \}\]; return out; \}/);
  assert.match(SRC3D, /case 'dome': push\(pt\.snow \? 'snowcap' : 'wdome'/);
  // 季節の はっぱ / はなびら: 2D の ambLayer('leaves')と おなじ いろ・かず(3D には なかった)
  assert.match(SRC, /const col = curEnv\.season === 'autumn' \? 'rgba\(226,150,70,1\)' : curEnv\.season === 'spring' \? 'rgba\(255,200,215,1\)'/);
  assert.match(SRC3D, /sk === 'autumn' \? 'rgba\(226,150,70,1\)' : sk === 'spring' \? 'rgba\(255,200,215,1\)' : sk === 'winter' \? 'rgba\(198,202,180,1\)' : 'rgba\(150,196,110,1\)'/);
  assert.match(SRC, /anim: \{ counts: \[7, 13, 21\]/); assert.match(SRC3D, /const LEAF_N = \[7, 13, 21\]/);
  // こな雪(ゆき の 地区の 2D の ambLayer 'snow')も 3D に
  assert.match(SRC, /\} else if \(kind === 'snow'\) \{ \/\/ こな雪/);
  assert.match(SRC3D, /if \(!under && amb === 'snow'\) \{/);
  // 秋の かんむり: 2D の 大木 / leafyTree / bigtrunk(ジャングル のぞく)の 秋の いろ。ジャングル / 色つきの 木は そのまま
  assert.match(SRC, /const c0 = sh\(autumn \? '#c8843a' : '#3f7a3a'\), c1 = sh\(autumn \? '#9a5f28'/);
  assert.match(SRC, /sh\(autumn && !jungle \? '#c8843a'/);
  assert.match(SRC3D, /leafy: !pt\.color && !jungle3d && \(ob\.type === 'broadleaf' \|\| ob\.type === 'bigtree'\)/);
  // 2D の hasSurfaceSeasons(script.js)
  const script = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
  assert.match(script, /function hasSurfaceSeasons\(regionId\) \{\s*return regionId !== 'deepsea' && regionId !== 'star_stop';/);
});

test('GA-7. 地域の 識別性(数で): いえ ≠ いなか(いなかは ひらけ +0.1 いじょう・構成の cosine < 0.75)、もり ≠ ジャングル(ジャングルは 見とおし せまく・高い 層・cosine < 0.6)', () => {
  const { fingerprint, cosine } = require('../tools/meguru-3d-qa/geometry-audit.cjs');
  const F = {}; for (const rid of ['home', 'countryside', 'forest', 'jungle']) F[rid] = fingerprint(M, reg, rid);
  // 2026-10-02 監査: home 0.524 / countryside 0.713、forest 0.658 / jungle 0.582、medianTop forest 127 / jungle 193、cosine 0.66 / 0.50
  assert.ok(F.countryside.openness > F.home.openness + 0.1, JSON.stringify([F.home.openness, F.countryside.openness]));
  assert.ok(F.jungle.openness < F.forest.openness, JSON.stringify([F.forest.openness, F.jungle.openness]));
  assert.ok(F.jungle.medianTop > F.forest.medianTop * 1.2, JSON.stringify([F.forest.medianTop, F.jungle.medianTop]));
  assert.ok(cosine(F.home.comp, F.countryside.comp) < 0.75);
  assert.ok(cosine(F.forest.comp, F.jungle.comp) < 0.6);
  // 種類: もり だけ 針葉樹、ジャングル だけ ヤシ / 大きな は
  assert.ok(F.forest.comp.conifer > 0 && !F.jungle.comp.conifer && F.jungle.comp.palm > 0 && !F.forest.comp.palm);
});
