const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

// めぐる 疑似3D v1 の しあげ: ①しゃへいの フェード ②パララックス ③かるい カメラえんしゅつ ④地域ごとの かんきょうアニメ。
// ここで しらべるのは え(canvas)では なく、その 4つを きめて いる「データ」:
//   ・どの 地域にも かぜ(つよさ・はやさ)と うごきの しゅるいが あり、地区ごとに かわる
//   ・worldLayers() だけで 3D の レンダラーが せかい・くうき・カメラを 組みなおせる
//   ・カメラの えんしゅつは りぐ(camera.dist / height / yaw)に たいして「数%」で おさまる
//   ・しゃへいの フェードは かくれた ぶんを はかり、うすく しすぎない
const REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
const ANIM_KINDS = ['leaves', 'snow', 'sand', 'mist', 'water', 'glow', 'motes', 'neon'];

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'salmon:5'];
  h.api.render();
  const M = h.api.meguruMod;
  return { h, M, reg: M.buildRegistry() };
}

test('every region has its own wind, and every district says what moves there', () => {
  const { M, reg } = setup();
  for (const id of REGIONS) {
    const w = M.buildWorld(id, reg);
    assert.ok(Array.isArray(w.wind) && w.wind.length === 2, `${id}: wind`);
    const [amp, hz] = w.wind;
    assert.ok(amp > 0 && amp <= 1.6 && hz > 0 && hz <= 2, `${id}: wind ${amp}/${hz} stays gentle`);
    assert.ok(w.motion.length >= 1 && w.motion.every((k) => ANIM_KINDS.includes(k)), `${id}: motion ${w.motion}`);
    const L = M.worldLayers(w);
    // 地区は ぜんぶ「なにが うごくか」と「どれだけ ひろいか」を もつ
    for (const z of L.zone) {
      assert.ok(ANIM_KINDS.includes(z.anim), `${id}/${z.id}: anim ${z.anim}`);
      assert.ok(z.open >= 0.85 && z.open <= 1.15, `${id}/${z.id}: open ${z.open}`);
    }
    // おなじ 地域でも 地区で うごきの 量が かわる(しゅるい か ひろさ の どちらかは ちがう)
    if (L.zone.length > 1) {
      const kinds = new Set(L.zone.map((z) => z.anim)), opens = new Set(L.zone.map((z) => z.open));
      assert.ok(kinds.size > 1 || opens.size > 1, `${id}: districts differ`);
    }
  }
  // 地域の こせい: さばくは すな、ゆきぐには ゆき、とかいは ネオン、ほしぞらは つぶ
  const first = (id) => M.buildWorld(id, reg).motion[0];
  assert.equal(first('desert'), 'sand'); assert.equal(first('snow'), 'snow');
  assert.equal(first('city'), 'neon'); assert.equal(first('star_stop'), 'motes');
  assert.equal(first('sea'), 'water'); assert.equal(first('memory_lake'), 'mist');
});

test('worldLayers hands a 3D renderer the air, the districts and the camera, without reading any drawing code', () => {
  const { M, reg } = setup();
  for (const id of REGIONS) {
    const L = M.worldLayers(M.buildWorld(id, reg));
    // くうき
    for (const k of ['region', 'ground', 'backdrop', 'wind', 'motion', 'view', 'density']) assert.ok(L.env[k] != null, `${id}: env.${k}`);
    // 地区
    assert.ok(L.zone.length >= 3, `${id}: zones ${L.zone.length}`);
    for (const z of L.zone) assert.ok(Number.isFinite(z.x) && Number.isFinite(z.z), `${id}: zone in world coordinates`);
    assert.equal(L.zoneReach, 'nearest', `${id}: how a district's edge is decided`);
    // カメラ: ばしょごとの りぐ と、えんしゅつの つよさ
    assert.ok(L.camera.profiles.default.dist > 0 && L.camera.motion.bob > 0, `${id}: camera rig`);
    for (const sp of L.camera.spots) assert.ok(L.camera.profiles[sp.cam], `${id}: spot ${sp.id} camera profile ${sp.cam}`);
  }
});

test('the camera keeps the rig and only adds a few percent: bob, pull back with speed, open districts, a glance at landmarks', () => {
  const { M } = setM();
  const m = M.RULES.motion;
  // 「ごく かるい」: どれも 数% 。おおきな ゆれ・きゅうな ズームは 出せない すうじに なって いる
  assert.ok(m.bob > 0 && m.bob <= 0.03, `bob ${m.bob}`);
  assert.ok(m.speed > 0 && m.speed <= 0.1, `speed ${m.speed}`);
  assert.ok(m.open > 0 && m.open <= 1.2, `open ${m.open}`);
  assert.ok(m.look > 0 && m.look <= 0.15, `look ${m.look}`);
  assert.ok(m.bobHz > 0 && m.bobHz <= 4 && m.ease > 0 && m.ease <= 6, 'the easing is slow enough not to snap');

  const sim = M.createSimulation({ regionId: 'countryside', discovered: [] });
  const still = sim.view();
  assert.equal(Math.round(still.camera.dist), Math.round(still.rig.dist), 'standing still, the camera is the rig');
  for (let i = 0; i < 90; i++) sim.step(1 / 60, { x: 0, y: -1 });
  const v = sim.view();
  const grow = v.camera.dist / v.rig.dist, lift = v.camera.height / v.rig.height;
  assert.ok(grow > 1.001 && grow < 1.2, `walking pulls the camera back a little: ${grow.toFixed(3)}`);
  assert.ok(lift > 0.95 && lift < 1.05, `the walk bob stays tiny: ${lift.toFixed(3)}`);
  assert.ok(Math.abs(v.camFx.yaw) <= m.look + 1e-6, `the glance never fights the player: ${v.camFx.yaw}`);
  // りぐ(せかいの がわ)は えんしゅつで かきかえられない
  assert.equal(v.rig, sim.camera);
  // よいやすい ひとの ための スイッチ: せかいは かわらず、えんしゅつ だけ とまる
  sim.setCameraMotion(false);
  const off = sim.view();
  assert.equal(off.camera.dist, off.rig.dist); assert.equal(off.camera.yaw, off.rig.yaw);
  assert.equal(off.player.x, v.player.x, 'the world does not move when the effect is off');
  sim.setCameraMotion(true);
  assert.equal(sim.cameraMotion, true);

  function setM() { return setup(); }
});

test('parallax is a canvas-only layer trick: sky moves least, the foreground most, and no world coordinate changes', () => {
  const { M } = setup();
  const P = M.RENDER_TUNING.parallax;
  // そら < えんけい < てまえ。むきでも、よこに あるいた ぶん でも
  assert.ok(P.sky[0] < P.far[0] && P.far[0] < P.near[0], `yaw: ${P.sky[0]} < ${P.far[0]} < ${P.near[0]}`);
  assert.ok(P.sky[1] < P.far[1] && P.far[1] < P.near[1], `walk: ${P.sky[1]} < ${P.far[1]} < ${P.near[1]}`);
  // 「はっきり ちがう」: となりの そうと 1.5ばい いじょう ちがう
  assert.ok(P.far[0] / P.sky[0] >= 1.5 && P.near[0] / P.far[0] >= 1.5, 'the bands are clearly apart');
  assert.ok(P.far[1] / P.sky[1] >= 1.5 && P.near[1] / P.far[1] >= 1.5, 'the bands are clearly apart when walking');
  // そらは ほとんど よこに ながれない(とても とおい)
  assert.ok(P.sky[1] < 0.05, 'the sky barely slides when you walk');
  // パララックスは え だけの はなし: せかいの ざひょうには 出て こない
  const L = M.worldLayers(M.buildWorld('sea', M.buildRegistry()));
  assert.equal(L.env.parallax, undefined);
});

test('only what actually covers you goes see-through, and never too far', () => {
  const { M } = setup();
  const O = M.RENDER_TUNING.occlusion;
  assert.ok(O.min >= 0.45, `it stays solid enough to keep its weight in the world: ${O.min}`);
  assert.ok(O.cover > 0.1, `brushing past does not fade anything: ${O.cover}`);
  assert.ok(O.inSpeed < 12 && O.outSpeed < O.inSpeed, 'fading in and back is smooth, and coming back is slower');
  // あたりの おおきさ: ほそい みき は ほそく、よこに ながい かこみ は ひろい
  const B = M.OCCLUDER_BOX;
  assert.ok(B.bigtrunk[0] < B.building[0] && B.building[0] < B.dunewall[0], 'trunk < building < dune in width');
  assert.ok(B.sandcrest[1] < B.glyph[1] && B.glyph[1] < B.building[1], 'a low crest is not treated as a wall');
  for (const k of Object.keys(B)) assert.ok(B[k][0] > 0 && B[k][0] <= 1 && B[k][1] > 0 && B[k][1] <= 3, `${k}: ${B[k]}`);
  // すけるのは じぶんを かくしうる そう だけ(じめんの もよう や ひかりの たまは はいらない)
  assert.ok(!M.OCCLUDER_LAYERS.has('glow') && !M.OCCLUDER_LAYERS.has('field') && !M.OCCLUDER_LAYERS.has('lane'));
  assert.ok(M.OCCLUDER_LAYERS.has('frame') && M.OCCLUDER_LAYERS.has('landmark'));
});

test('the environment animation never adds creatures, and it thins out instead of stopping on a slow phone', () => {
  const { h, M, reg } = setup();
  const A = M.RENDER_TUNING.anim;
  // かず: おもい たんまつ ほど すくない。でも 0 には しない
  assert.equal(A.counts.length, 3);
  assert.ok(A.counts[0] > 0, 'the lightest tier still moves');
  assert.ok(A.counts[0] < A.counts[1] && A.counts[1] < A.counts[2], `counts ${A.counts}`);
  assert.ok(A.counts[2] <= 40, 'even the richest tier stays a handful of dots');
  assert.ok(A.sway > 0 && A.sway <= 0.12, `plants bend a little, not a lot: ${A.sway}`);
  // ゆれるのは くさきだけ。たてもの や いわ は ゆれない
  for (const k of Object.keys(M.SWAY_AMOUNT)) assert.equal(M.STRUCT_ROLE[k], 'vegetation', `${k} is a plant`);
  assert.ok(M.SWAY_AMOUNT.bigtrunk < M.SWAY_AMOUNT.reed, 'a trunk barely moves, a reed sways');
  // PR #277: けしきに いきものは 出さない。うごきを 足しても かわらない
  assert.equal(M.auditSceneryFauna().length, 0);
  assert.equal(M.auditSceneryCharacters(h.api.displayCatalog.resolve).issues.length, 0);
  for (const id of REGIONS) for (const p of M.buildWorld(id, reg).props) if (p.emoji) assert.equal(M.isFaunaEmoji(p.emoji), false, `${id}: ${p.emoji}`);
});
