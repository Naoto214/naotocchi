// Character 3D Pilot の 専用テスト(docs/character-3d/architecture.md・docs/qa/character-3d-pilot-2026-10-01.md)。
// 番号は 指示書の「dedicated tests」1〜34 と おなじ。ブラウザが いる もの(WebGL の 実描画)は tests/character-3d-browser.cjs。
// ここは Node の THREE(描画なし)で、spec・rig・表情・presenter(片づけ / fallback / cache)を しばる。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SPEC = require('../character-3d/spec.js');
const MASTER = (() => { const src = fs.readFileSync(path.join(ROOT, 'character-world-master.v1.js'), 'utf8'); const w = {}; new Function('window', src)(w); return w.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1; })();
let MODS = null;
async function mods() {
  if (MODS) return MODS;
  const imp = (f) => import(path.join(ROOT, 'character-3d', f));
  const [geo, rig, arch, anim, rt] = await Promise.all([imp('geometry.mjs'), imp('rig.mjs'), imp('archetypes.mjs'), imp('animate.mjs'), imp('runtime.mjs')]);
  MODS = { THREE: geo.THREE, geo, rig, arch, anim, rt };
  return MODS;
}
const PILOT_IDS = Object.keys(SPEC.PILOT);
const masterLines = () => [...MASTER.playerSpecies.normal, ...MASTER.playerSpecies.rare, ...MASTER.playerSpecies.secret];
function actor(over = {}) { return Object.assign({ key: 'form:dog:3', kind: 'form', line: 'dog', stage: 3, x: 0, z: 0, heading: 0, emotion: 'normal' }, over); }
async function presenter(opts = {}) {
  const { THREE, rt } = await mods();
  const scene = new THREE.Scene();
  const p = rt.createCharacterPresenter(Object.assign({ scene, actorSize: 110, buildBudget: 99 }, opts));
  return { p, scene, THREE, rt };
}
const holders = (scene) => { let n = 0; scene.traverse((o) => { if (o.name && o.name.startsWith('c3d-actor:')) n++; }); return n; };
function frame(p, list, now) { p.beginFrame(now); const r = list.map(([a, info]) => p.present(a, Object.assign({ dt: 0.016 }, info))); p.endFrame(); return r; }
const info = (id, stage, extra = {}) => Object.assign({ specKey: { id, stage }, emotion: 'normal' }, extra);
async function inst(id, stage, mode = 'C') { const { rt } = await mods(); const t = rt.getTemplate(id, stage, mode); assert.equal(t.status, 'ok', t.error); return rt.instantiate(t); }
function sample(i, emotion, frames = 60, opts = {}) {
  return (async () => {
    const { anim } = await mods();
    anim.setEmotion(i, emotion);
    const ys = [], xs = [], head = [];
    for (let k = 0; k < frames; k++) { anim.animate(i, Object.assign({ moving: false, dt: 1 / 30, animLv: 2 }, opts)); ys.push(i.root.position.y); xs.push(i.root.position.x); const h = i.bones.head || i.bones.cap || i.bones.body; head.push({ rx: h.rotation.x, ry: h.rotation.y }); }
    const range = (a) => Math.max(...a) - Math.min(...a);
    return { yRange: range(ys), xRange: range(xs), headRx: head.reduce((s, h) => s + h.rx, 0) / frames, headRy: head.reduce((s, h) => s + h.ry, 0) / frames };
  })();
}

// ---------------------------------------------------------------- 1〜6: master / inventory / archetype / spec / stage
test('1. pilot species は master 由来(id・8 段の 画像が ある)。archetype 再利用の なかまも master 由来', () => {
  const lines = new Set(masterLines().map((l) => l.id));
  assert.ok(PILOT_IDS.length >= 6 && PILOT_IDS.length <= 8, 'pilot は 6〜8 系統: ' + PILOT_IDS.length);
  for (const id of PILOT_IDS) {
    assert.ok(lines.has(id), id + ' は master の playerSpecies');
    for (const s of SPEC.STAGE_KEYS[id]) assert.ok(fs.existsSync(path.join(ROOT, SPEC.referenceAsset(id, s))), `${id} 0${s} の 2D 正本`);
  }
  const comps = new Set([...MASTER.companions.normal, ...MASTER.companions.rare].map((c) => c.id));
  for (const id of Object.keys(SPEC.ARCHETYPE_REUSE)) assert.ok(comps.has(id), id + ' は master の なかま');
});

test('2. 全 species inventory: master の 全 player line × 8 段・なかま・こいびと・作者 が ぜんぶ ある(画像も ある)', () => {
  const rows = SPEC.inventory();
  const want = masterLines().length * 8 + MASTER.companions.normal.length + MASTER.companions.rare.length + MASTER.partners.length + 1;
  assert.equal(rows.length, want);
  for (const l of masterLines()) assert.ok(SPEC.PLAYER_LINES[l.id] && SPEC.PLAYER_LINES[l.id].stages.length === 8, l.id);
  for (const c of [...MASTER.companions.normal, ...MASTER.companions.rare]) assert.ok(SPEC.COMPANIONS[c.id], c.id);
  for (const p of MASTER.partners) assert.ok(SPEC.PARTNERS[p.id], p.id);
  for (const r of rows) assert.ok(fs.existsSync(path.join(ROOT, r.asset)), r.asset);
});

test('3. species → archetype の coverage: つかう archetype は 定義ずみ。pilot の archetype には builder が ある', async () => {
  const { arch } = await mods();
  const cov = SPEC.archetypeCoverage();
  for (const a of Object.keys(cov)) assert.ok(SPEC.ARCHETYPES[a], 'archetype ' + a);
  for (const [a, d] of Object.entries(SPEC.ARCHETYPES)) if (d.pilot) assert.equal(typeof arch.BUILDERS[a], 'function', 'builder ' + a);
  const pilotArch = new Set(PILOT_IDS.flatMap((id) => Object.values(SPEC.PILOT[id].stages).map((s) => s.archetype)));
  for (const a of pilotArch) assert.ok(SPEC.ARCHETYPES[a].pilot, a + ' は pilot で つくった');
  assert.ok(pilotArch.size >= 10, 'pilot が おおう archetype ' + pilotArch.size);
  const total = Object.values(cov).reduce((s, v) => s + v.count, 0), covered = Object.entries(cov).filter(([a]) => SPEC.ARCHETYPES[a].pilot).reduce((s, [, v]) => s + v.count, 0);
  assert.ok(covered / total > 0.7, `pilot の archetype で 全体の ${(covered / total * 100).toFixed(0)}% を おおう`);
});

test('4. pilot の 全 species / 全 stage に 正しい 3D spec(組める・顔が ある・予算の なか)', async () => {
  const { rt } = await mods();
  for (const id of [...PILOT_IDS, ...Object.keys(SPEC.ARCHETYPE_REUSE)]) for (const s of SPEC.STAGE_KEYS[id] || [0]) {
    const t = rt.getTemplate(id, s, 'C');
    assert.equal(t.status, 'ok', `${id}:${s} ${t.error || ''}`);
    assert.ok(t.rig.faces.length >= 1 && t.rig.faces.every((f) => f.decal || f.eyes.length === 2), `${id}:${s} 顔`);
    assert.ok(t.tris > 300 && t.tris < 6500, `${id}:${s} 三角形 ${t.tris}`);
    assert.ok(t.meshes <= 14, `${id}:${s} draw call(mesh) ${t.meshes}`);
    assert.ok(t.size.y > 0.2 && t.size.y < 3, `${id}:${s} 大きさ`);
    assert.ok(SPEC.ARCHETYPES[t.rig.archetype], `${id}:${s} archetype`);
  }
});

test('5. stage 01 / 04 / 08 が 解決できる。めぐるの 0 はじまり の 段も おなじ', () => {
  for (const id of PILOT_IDS) {
    for (const s of [1, 4, 8]) assert.ok(SPEC.STAGE_KEYS[id].includes(s), `${id} 0${s}`);
    assert.deepEqual(SPEC.specKeyFor({ line: id, stage: 3 }), { id, stage: 4, exact: true });   // form:dog:3 = 04
    assert.deepEqual(SPEC.specKeyFor({ line: id, stage: 0 }), { id, stage: 1, exact: true });
    assert.deepEqual(SPEC.specKeyFor({ line: id, stage: 7 }), { id, stage: 8, exact: true });
    for (let i = 0; i < 8; i++) { const k = SPEC.specKeyFor({ line: id, stage: i }); if (k) assert.equal(SPEC.stageSpec(id, k.stage).archetype, SPEC.PLAYER_LINES[id].stages[i], `${id} 0${i + 1} → 0${k.stage} は おなじ archetype`); }
  }
  assert.equal(SPEC.specKeyFor({ line: 'cat', stage: 3 }), null, 'pilot に ない species は null(2D のまま)');
  assert.equal(SPEC.specKeyFor({ line: 'dog', stage: 9 }), null);
});

test('6. 段の ちがいは 一様な 拡大縮小 だけでは ない(体の 比率・部品・archetype が かわる)', async () => {
  const { rt } = await mods();
  for (const id of PILOT_IDS) {
    const ks = SPEC.STAGE_KEYS[id], a = rt.getTemplate(id, ks[0], 'C'), b = rt.getTemplate(id, ks[ks.length - 1], 'C');
    if (a.rig.archetype !== b.rig.archetype) continue;   // トポロジーが かわる(いもむし → ちょう など)
    const na = a.size.clone().divideScalar(a.size.y), nb = b.size.clone().divideScalar(b.size.y);
    const ratio = Math.max(Math.abs(na.x - nb.x) / nb.x, Math.abs(na.z - nb.z) / nb.z);
    // bone の 休みの 位置の 比率も くらべる(足の ながさ・頭の 位置)
    const bonesA = Object.entries(a.rig.bones).filter(([n]) => b.rig.bones[n] && n !== 'root');
    let boneDiff = 0;
    for (const [n, bo] of bonesA) { const pa = bo.position.clone().divideScalar(a.size.y), pb = b.rig.bones[n].position.clone().divideScalar(b.size.y); boneDiff = Math.max(boneDiff, pa.distanceTo(pb)); }
    assert.ok(ratio > 0.06 || boneDiff > 0.06, `${id}: 01 と 08 の 形の 比率が ちがう(比 ${ratio.toFixed(3)} / bone ${boneDiff.toFixed(3)})`);
  }
});

// ---------------------------------------------------------------- 7〜12: 表情
async function faceState(i) {
  const f = i.face;
  return { eye: f.eyes.map((e) => e.userData.shape), decal: f.decal ? f.decal.material.name : null };
}
test('7. normal: まるい 目(または 2D の おだやかな とじ目)・にこり・しるし なし・はねない', async () => {
  const i = await inst('dog', 4);
  const s = await sample(i, 'normal');
  const f = await faceState(i);
  assert.deepEqual(f.eye, ['round', 'round']); assert.equal(f.decal, 'c3d:face:normal');
  assert.ok(s.yRange < 0.01, 'normal は はねない');
  assert.equal(SPEC.expressionParams('normal').accent, null);
  const old = await inst('man', 8); await sample(old, 'normal', 2);
  assert.deepEqual((await faceState(old)).eye, ['content', 'content'], 'man 08 は 2D の とじ目');
});
test('8. positive: ^ ^ の 目・ひらいた 口・ほお・はねる・きらきら', async () => {
  const i = await inst('dog', 4), base = await sample(await inst('dog', 4), 'normal');
  const s = await sample(i, 'positive');
  assert.deepEqual((await faceState(i)).eye, ['happy', 'happy']);
  assert.equal(i.face.decal.material.name, 'c3d:face:positive');
  assert.equal(SPEC.expressionParams('positive').mouth, 'open'); assert.equal(SPEC.expressionParams('positive').accent, 'sparkle');
  assert.ok(s.yRange > base.yRange + 0.03, 'はねる ' + s.yRange.toFixed(3));
});
test('9. dislike: まゆ(内がわ が さがる)・とがった 口・そっぽ・くも', async () => {
  const i = await inst('dog', 4), base = await sample(await inst('dog', 4), 'normal');
  const s = await sample(i, 'dislike');
  const e = SPEC.expressionParams('dislike');
  assert.ok(e.brow.show && e.brow.angle > 0); assert.equal(e.mouth, 'pout'); assert.equal(e.accent, 'cloud');
  assert.ok(Math.abs(s.headRy - base.headRy) > 0.2, 'そっぽを むく');
  assert.equal(i.face.decal.material.name, 'c3d:face:dislike');
  const b = await inst('dog', 4, 'B'); await sample(b, 'dislike', 1);
  assert.ok(b.face.feats.brows.every((m) => m.visible) && b.face.feats.mouths.pout.visible && !b.face.feats.mouths.smile.visible, 'B 方式でも まゆ・口');
});
test('10. tired: 半目・あたまが さがる・ゆっくり・ねむい しるし', async () => {
  const i = await inst('dog', 4), base = await sample(await inst('dog', 4), 'normal');
  const s = await sample(i, 'tired');
  assert.deepEqual((await faceState(i)).eye, ['droop', 'droop']);
  assert.ok(s.headRx > base.headRx + 0.15, 'あたまが さがる'); assert.ok(SPEC.expressionParams('tired').body.tempo < 1);
  assert.equal(SPEC.expressionParams('tired').accent, 'sleepy');
});
test('11. sick: > < の 目・なみの 口・青い たて線・ふるえ・つめたい しるし', async () => {
  const i = await inst('dog', 4), base = await sample(await inst('dog', 4), 'normal');
  const s = await sample(i, 'sick');
  assert.deepEqual((await faceState(i)).eye, ['squeeze', 'squeeze']);
  const e = SPEC.expressionParams('sick'); assert.equal(e.mouth, 'wavy'); assert.ok(e.marks.includes('gloom')); assert.equal(e.accent, 'cool');
  assert.ok(s.xRange > base.xRange + 0.005, 'ふるえる');
});
test('12. canonical emotion と 意味が 一致(#368 の 語彙・Home の Expression PNG の 対応)', () => {
  // #368(feat/meguru-resident-expression)の resident-expression.js の 写し。#368 が merge されたら その module と くらべる
  const R368_EMOTIONS = ['normal', 'positive', 'dislike', 'tired', 'sleeping', 'strained', 'wantsPlay', 'sick'];
  const R368_STAGE = { normal: 'normal', positive: 'happy', dislike: 'sulky', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', sick: 'sick' };
  const R368_LIFE = { normal: 'normal', happy: 'positive', unhappy: 'dislike', tired: 'tired', sleeping: 'sleeping', strained: 'strained', wantsPlay: 'wantsPlay', positive: 'positive', dislike: 'dislike', sick: 'sick' };
  assert.deepEqual([...SPEC.CANONICAL_EMOTIONS], R368_EMOTIONS);
  assert.deepEqual({ ...SPEC.REFERENCE_EXPRESSION }, R368_STAGE);
  for (const [k, v] of Object.entries(R368_LIFE)) assert.equal(SPEC.canonicalEmotion(k), v, k);
  assert.equal(SPEC.canonicalEmotion('zzz'), 'normal');
  assert.equal(SPEC.canonicalEmotion('x', { canonicalEmotion: () => 'tired' }), 'tired', '#368 が あれば それに まかせる(複製しない)');
  for (const e of SPEC.CANONICAL_EMOTIONS) assert.ok(SPEC.EXPRESSION_3D[e], '3D の 数字: ' + e);
  // Home の 表情 PNG(正本)が pilot の 全 stage × 5 表情 ぶん ある
  for (const id of PILOT_IDS) for (const s of SPEC.STAGE_KEYS[id]) for (const e of SPEC.PILOT_EMOTIONS) assert.ok(fs.existsSync(path.join(ROOT, SPEC.referenceAsset(id, s, e))), SPEC.referenceAsset(id, s, e));
  // pet-expression の 意味(sulky = unhappy, happy = 遊び)と おなじ むき
  const PET = require('../pet-expression.js');
  assert.equal(PET.reactionFor('play_with'), SPEC.REFERENCE_EXPRESSION.positive);
  assert.equal(PET.reactionFor('play_with_annoyed'), SPEC.REFERENCE_EXPRESSION.dislike);
  assert.equal(PET.resolve({ state: 'tired' }), SPEC.REFERENCE_EXPRESSION.tired);
  assert.equal(PET.resolve({ state: 'sick' }), SPEC.REFERENCE_EXPRESSION.sick);
});

// ---------------------------------------------------------------- 13〜19: めぐる runtime の 境界
const M3D = () => fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
const SCRIPT = () => fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
test('13. flag なし: 2D billboard の まま(character module を よまない・立て看板の 経路は そのまま)', () => {
  const src = M3D();
  assert.ok(!/^import .*character-3d/m.test(src), 'static import しない');
  assert.match(src, /function loadChar3d\(\) \{\n\s+if \(charMod \|\| charLoading \|\| !C3\.on\) return;/);
  assert.match(src, /if \(C3\.on\) loadChar3d\(\);/);
  assert.match(src, /if \(!C3\.on \|\| !charMod\) \{ if \(charPresenter\) charPresenter\.reset\(\); return null; \}/);
  assert.match(src, /if \(cp && ci && cp\.present\(a, ci\)\) \{/, '3D が えがけた ときだけ 立て看板を かくす');
  assert.ok(!/character-3d/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'index.html は よまない');
});
test('14. 3D presentation の flag: ?meguru3d=1&char3d=1(URL だけ)→ createMeguru3D へ', () => {
  const s = SCRIPT();
  assert.match(s, /char3d: \/\[\?&\]char3d=1\(\?:&\|\$\)\/\.test\(q\)/);
  assert.match(s, /playerKey: \(\) => meguruBridge\.currentPetKey\(\)/);
  assert.match(M3D(), /const char3dOpts = \{ on: !!opts\.char3d,/);
});
test('15. flag・QA の 状態は セーブしない(schema も そのまま)', async () => {
  const s = SCRIPT();
  assert.ok(!/localStorage\.setItem\([^)]*c(?:har)?3d/i.test(s) && !/state\.(char3d|c3d)/.test(s), 'save に かかない');
  const { harness } = require('./helpers/runtime-harness.cjs');
  const h = harness({ deterministic: true });
  const saved = JSON.stringify(h.api.state());
  assert.ok(!/char3d|c3d|character3d/i.test(saved), 'state に Character 3D の キーが ない');
});
test('16. actor の 状態は 2D / 3D で 共通(presenter は actor を かきかえない)', async () => {
  const { p } = await presenter();
  const a = actor({ x: 120, z: -40, heading: 0.7, behavior: 'walk', emotion: 'happy', say: 'こんにちは', sayFor: 2 });
  const before = JSON.stringify(a);
  for (let k = 0; k < 120; k++) { a.x += 3; frame(p, [[a, info('dog', 4, { emotion: k % 2 ? 'positive' : 'sick' })]], k * 16); }
  a.x -= 360;
  assert.equal(JSON.stringify(a), before, 'x / z / heading / behavior / emotion / say は そのまま');
});
test('17. movement logic(めぐるの シミュレーション)は かえない: meguru.js は main と 同一', () => {
  const fx = require('./fixtures/character-3d-protected-hashes.json');
  const sha = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'meguru.js'))).digest('hex');
  assert.equal(sha, fx.groups['meguru.js'].sha1);
  assert.ok(!/actor\.(x|z|heading) =|a\.(x|z|heading) =/.test(fs.readFileSync(path.join(ROOT, 'character-3d/runtime.mjs'), 'utf8')), 'runtime は 位置を かかない');
});
test('18. actor 単位の 2D fallback: 1 体だけ こわれても その 1 体だけ 2D', async () => {
  const bad = actor({ key: 'companion:shiba', kind: 'companion', id: 'shiba' });
  const { p } = await presenter({ hooks: { failUpdate: (a) => a === bad } });
  const good = actor(), player = actor({ key: 'player' });
  const r = frame(p, [[good, info('dog', 4)], [bad, info('shiba', 0)], [player, info('man', 4, { isPlayer: true })]], 0);
  assert.deepEqual(r, [true, false, true]);
  assert.ok(p.isBroken(bad) && !p.has(bad) && p.has(good) && p.has(player));
  assert.deepEqual(frame(p, [[good, info('dog', 4)], [bad, info('shiba', 0)]], 16), [true, false], 'ずっと 2D(ちらつかない)');
  // template が 組めない species も その actor だけ 2D(例外は 外へ 出さない)
  const { p: p2, rt } = await presenter({ hooks: { failBuild: (id) => id === 'penguin' } });
  rt.clearTemplates();   // 前の テストで 組んだ template を つかわない(組む ところで こわす)
  assert.deepEqual(frame(p2, [[actor({ line: 'penguin' }), info('penguin', 4)], [good, info('dog', 4)]], 0), [false, true]);
  rt.clearTemplates();   // こわした template を あとの テストに のこさない
});
test('19. 1 体の 失敗で world renderer 全体を 2D に おとさない(present は throw しない・hybrid の fail へ つながない)', async () => {
  const { p } = await presenter({ hooks: { failUpdate: () => true } });
  assert.doesNotThrow(() => frame(p, [[actor(), info('dog', 4)]], 0));
  const src = M3D();
  assert.match(src, /const ci = \(a, isP\) => \{ if \(!cp\) return null; try \{ return charInfo\(a, isP, dt\); \} catch \(_\) \{ return null; \} \};/);
  // present の 例外は runtime の なかで actor 単位に とめる
  assert.match(fs.readFileSync(path.join(ROOT, 'character-3d/runtime.mjs'), 'utf8'), /broken\.add\(actor\); counters\.fallbacks\+\+;/);
});

// ---------------------------------------------------------------- 20〜28: cache・片づけ・player・party・住人・reduced motion
test('20. geometry / material / template を 共有(おなじ species の actor を ふやしても ふえない)', async () => {
  const { p, rt } = await presenter();
  const list = Array.from({ length: 12 }, (_, i) => [actor({ key: 'k' + i, x: i * 30 }), info('dog', 4)]);
  frame(p, list, 0);
  const t = p.stats().templates, mats = p.stats().materials;
  const a = p.instanceOf(list[0][0]), b = p.instanceOf(list[5][0]);
  const meshes = (x) => { const o = []; x.root.traverse((m) => { if (m.isMesh) o.push(m); }); return o; };
  meshes(a).forEach((m, k) => { assert.equal(m.geometry, meshes(b)[k].geometry); assert.equal(m.material, meshes(b)[k].material); });
  frame(p, list.concat(Array.from({ length: 12 }, (_, i) => [actor({ key: 'm' + i }), info('dog', 4)])), 16);
  assert.equal(p.stats().templates, t); assert.equal(p.stats().materials, mats);
  assert.ok(rt.templateCount() >= 1);
});
test('21. 表情の きりかえで texture / material を つくりなおさない', async () => {
  const { p, rig } = await (async () => ({ ...(await presenter()), rig: (await mods()).rig }))();
  const a = actor();
  frame(p, [[a, info('dog', 4)]], 0);
  const atl = rig.atlasCount(), mats = rig.materialCount(), eyeGeo = rig.stats.eyeGeos;
  const decalMats = new Set();
  for (let k = 0; k < 200; k++) { frame(p, [[a, info('dog', 4, { emotion: SPEC.PILOT_EMOTIONS[k % 5] })]], k * 16); decalMats.add(p.instanceOf(a).face.decal.material); }
  assert.equal(rig.atlasCount(), atl); assert.equal(rig.materialCount(), mats);
  assert.ok(rig.stats.eyeGeos <= eyeGeo + 6, '目の 形は 形ごとに 1 つ');
  assert.equal(decalMats.size, 5, '表情 5 つ = 共有 material 5 つ(毎回 つくらない)');
});
test('22. actor が いなくなったら 3D を 片づける(住人の despawn・パーティ離脱)', async () => {
  const { p, scene } = await presenter();
  const a = actor({ key: 'a' }), b = actor({ key: 'b' });
  frame(p, [[a, info('dog', 4)], [b, info('penguin', 4)]], 0);
  assert.equal(holders(scene), 2);
  frame(p, [[a, info('dog', 4)]], 16);
  assert.equal(holders(scene), 1); assert.ok(!p.has(b)); assert.equal(p.stats().live, 1);
  // 段が かわった / 表情が かわった: おなじ actor の 古い model を のこさない
  frame(p, [[a, info('dog', 8, { emotion: 'tired' })]], 32);
  assert.equal(holders(scene), 1); assert.equal(p.instanceOf(a).tpl.stage, 8);
});
test('23. 地域の きりかえ(scene の つくりなおし)で 3D を のこさない', async () => {
  const { p, scene, THREE } = await presenter();
  const list = [[actor({ key: 'a' }), info('dog', 4)], [actor({ key: 'b' }), info('mushroom', 8)]];
  frame(p, list, 0);
  const next = new THREE.Scene();
  p.setScene(next);
  assert.equal(holders(scene), 0, '前の 地域に のこらない'); assert.equal(p.stats().live, 0);
  frame(p, list, 16);
  assert.equal(holders(next), 2); assert.equal(holders(scene), 0);
  const src = M3D();
  assert.match(src, /function disposeScene\(b\) \{\n\s+if \(charPresenter\) charPresenter\.reset\(\);/);
});
test('24. 2D → 3D → 2D: 古い model / 顔 / かげ を のこさない', async () => {
  const { p, scene } = await presenter();
  const list = [[actor({ key: 'a' }), info('dog', 4)], [actor({ key: 'b' }), info('clownfish', 4)]];
  for (let k = 0; k < 3; k++) {
    frame(p, list, k * 100);
    assert.equal(holders(scene), 2);
    p.reset();   // = setChar3D(false)
    assert.equal(holders(scene), 0); assert.equal(p.stats().live, 0);
  }
  assert.match(M3D(), /char3dChanged\(\) \{ if \(charPresenter\) \{ charPresenter\.reset\(\);/);
  // 3D で えがいた frame は 立て看板を かくす / 出なかった actor の 立て看板は 片づける
  assert.match(M3D(), /m\.visible = false;\n\s+const fp = cp\.footprint\(a\);/);
  assert.match(M3D(), /if \(m\.userData\.seen !== actorFrame\) \{ built\.sc\.remove\(m\);/);
});
test('25. player は いつも えがく(frustum culling で きえない・表情 / 段が かわっても 1 つ)', async () => {
  const { p, scene } = await presenter();
  const pl = actor({ key: 'player' });
  for (let k = 0; k < 300; k++) {
    frame(p, [[pl, info(k < 150 ? 'dog' : 'man', k < 150 ? 4 : 8, { isPlayer: true, emotion: SPEC.PILOT_EMOTIONS[k % 5] })]], k * 16);
    const i = p.instanceOf(pl);
    assert.ok(i && i.holder.visible && i.holder.parent === scene, 'frame ' + k);
    assert.equal(holders(scene), 1);
  }
  let culled = 0; p.instanceOf(pl).holder.traverse((o) => { if (o.isMesh && o.frustumCulled) culled++; });
  assert.equal(culled, 0, 'player の mesh は frustum culling しない');
  // player は 遠さの LOD に かからない・住人 の あと に えがく(near3d は 住人 だけ)
  assert.match(M3D(), /placeActor\(built, actorMesh\(built, player\), player, 0, c\.yaw, charLight, glyphTexture\(pg, o\.wrapCtx \|\| null, 'p'\), cp, ci\(player, true\)\);/);
});
test('26. party の actor も 3D(archetype 再利用: しば・ねこ)。model の ない なかまは 2D', async () => {
  assert.deepEqual(SPEC.specKeyFor({ kind: 'companion', id: 'shiba' }), { id: 'shiba', stage: 0, exact: true });
  assert.deepEqual(SPEC.specKeyFor({ kind: 'companion', id: 'cat_friend' }), { id: 'cat_friend', stage: 0, exact: true });
  assert.equal(SPEC.specKeyFor({ kind: 'companion', id: 'tanuki' }), null);
  assert.equal(SPEC.specKeyFor({ kind: 'partner', id: 'forest_bear' }), null);
  const { p } = await presenter();
  const party = ['shiba', 'cat_friend'].map((id) => [actor({ key: 'companion:' + id, kind: 'companion', id }), { specKey: SPEC.specKeyFor({ kind: 'companion', id }), emotion: 'normal' }]);
  assert.deepEqual(frame(p, [[actor({ key: 'player' }), info('dog', 4, { isPlayer: true })], ...party], 0), [true, true, true]);
  assert.equal(p.instanceOf(party[0][0]).tpl.rig.archetype, 'quadruped');
});
test('27. 住人の presentation 境界: 住人の 生活の きもち → canonical → 3D。#368 の expr が あれば それを 優先', () => {
  const src = M3D();
  assert.match(src, /const emotion = C3\.emotion \|\| \(a\.expr && a\.expr\.emotion\) \|\| \(isPlayer \? 'normal' : S\.canonicalEmotion\(a\.emotion, R368\)\);/);
  assert.match(src, /ref = a\.kind === 'form' \? \{ line: a\.line, stage: a\.stage \} : \{ kind: a\.kind, id: a\.id \};/);
  // 住人の 生活の きもち(meguru.js の RESIDENT_EMOTIONS)は ぜんぶ canonical へ
  for (const e of ['normal', 'happy', 'tired', 'sleeping', 'unhappy', 'wantsPlay', 'strained']) assert.ok(SPEC.CANONICAL_EMOTIONS.includes(SPEC.canonicalEmotion(e)), e);
  assert.ok(!/resident-expression\.js/.test(src) && !fs.existsSync(path.join(ROOT, 'resident-expression.js')), '#368 の runtime を 複製 / 取りこみ しない');
});
test('28. reduced motion: はねる・ゆれる・reaction を とめる。あるく 足は のこす(半分)', async () => {
  const { anim } = await mods();
  const i = await inst('dog', 4);
  const red = await sample(i, 'positive', 60, { animLv: 0 });
  assert.ok(red.yRange < 0.005, 'positive でも はねない ' + red.yRange);
  anim.react(i, 'hop'); const y0 = []; for (let k = 0; k < 20; k++) { anim.animate(i, { moving: false, dt: 1 / 30, animLv: 0 }); y0.push(i.root.position.y); }
  assert.ok(Math.max(...y0) - Math.min(...y0) < 0.005, 'reaction も うごかない');
  const legs = (lv) => { const j = []; for (let k = 0; k < 90; k++) { anim.animate(i, { moving: true, dt: 1 / 30, animLv: lv }); j.push(i.bones.legFL.rotation.x); } return Math.max(...j) - Math.min(...j); };
  const full = legs(2), reduced = legs(0);
  assert.ok(reduced > full * 0.3 && reduced < full * 0.75, `足は のこす ${reduced.toFixed(2)} / ${full.toFixed(2)}`);
  assert.match(M3D(), /setAnimLevel\(v\) \{ animLv = v; if \(charPresenter\) charPresenter\.setAnimLevel\(v\); \}/);
});

// ---------------------------------------------------------------- 29〜34: asset・既存の 保護・回帰
test('29. asset integrity: 3D は コードで 組む(外部 3D asset なし)。module は そろって いる', () => {
  const dir = path.join(ROOT, 'character-3d');
  const files = fs.readdirSync(dir);
  for (const f of files) assert.ok(/\.(m?js|html)$/.test(f), 'character-3d に 置くのは コード だけ: ' + f);
  for (const f of ['spec.js', 'spec-esm.mjs', 'geometry.mjs', 'rig.mjs', 'archetypes.mjs', 'animate.mjs', 'runtime.mjs', 'gallery.html']) assert.ok(files.includes(f), f);
  const all = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  assert.ok(!/\.(glb|gltf|fbx|obj)['"]/.test(all) && !/https?:\/\//.test(all.replace(/\/\/ .*$/gm, '')), '外部 model / URL を よまない');
  assert.match(all, /from '\.\.\/vendor\/three-0\.170\.0\/three\.module\.min\.js'/, 'three は repo の 固定 version');
});
test('30. 既存の 2D キャラ PNG・Expression PNG・表情 / 感情 runtime は 1 バイトも かわらない', () => {
  const fx = require('./fixtures/character-3d-protected-hashes.json');
  const { current } = require('../tools/character-3d/protected-hashes.cjs');
  const now = current();
  for (const [k, v] of Object.entries(fx.groups)) assert.deepEqual(now[k], v, k);
});
test('31. save / schema は そのまま(schemaVersion 5・3D の ための キーなし)', () => {
  const s = SCRIPT();
  assert.match(s, /schemaVersion: 5,/);
  const { harness } = require('./helpers/runtime-harness.cjs');
  const st = harness({ deterministic: true }).api.state();
  assert.equal(st.schemaVersion, 5);
  // script.js の 変更は 3D の よみこみ口 だけ
  const lines = s.split('\n').filter((l) => /char3d|c3dface/.test(l));
  assert.ok(lines.length >= 1 && lines.length <= 3, 'char3d は loader の 1 か所 だけ: ' + lines.length);
});
test('32. 既存の World 3D は かわらない(forest だけ・hybrid の fallback は そのまま)', () => {
  const src = M3D();
  assert.match(src, /return !opts\.force2d && !failed && !!w && !w\.corridor && !!w\.world3d && M\.WORLD3D_REGIONS\.has\(w\.regionId\);/);
  assert.match(src, /function fail\(err\) \{\n\s+failed = true;/);
  assert.match(src, /sc\.fog = new THREE\.Fog\('#dff0ff', 700, 3200\);/, 'World の ひかり・きりは かえない');
  // World 3D の 回帰は tests/meguru-3d-prototype-test.cjs(npm test に ふくまれる)
  assert.match(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'), /tests\/meguru-3d-prototype-test\.cjs/);
});
test('33. Home Expression の 回帰: pet-expression.js の 解決は そのまま(3D adapter は Home を よまない)', () => {
  const PET = require('../pet-expression.js');
  assert.equal(PET.assetFor('assets/characters/dog/04.png', 'happy'), 'assets/characters/expressions/dog/04-happy.png');
  assert.equal(PET.resolve({ state: 'unhappy' }), 'sulky');
  for (const f of ['rig.mjs', 'runtime.mjs', 'animate.mjs', 'archetypes.mjs']) assert.ok(!/pet-expression|NaotocchiPetExpression/.test(fs.readFileSync(path.join(ROOT, 'character-3d', f), 'utf8')), f + ' は Home の runtime に さわらない');
  assert.match(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'), /tests\/pet-expression-test\.cjs/);
});
test('34. Relationship Expression の 回帰: relationship-expression.js は そのまま', () => {
  const REL = require('../relationship-expression.js');
  assert.equal(REL.resolve({ kind: 'companion', id: 'shiba', positive: true, normal: 'x.png' }).expression, 'positive');
  assert.equal(REL.resolve({ kind: 'companion', id: 'shiba', value: 10, normal: 'x.png' }).expression, 'lonely');
  assert.match(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'), /tests\/relationship-expression-test\.cjs/);
});
