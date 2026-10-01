// めぐる 3D Foundation v2(Human QA v1 の failure を 契約に。docs/qa/meguru-3d-foundation-v2-human-qa-v1.md)
//
// CP1(P0): player が 消えない・persistent ghost が ない
//   ・キャラの 立て看板に きりを かけない / きりの 遠端は player の むこう / frustum culling なし / scale は 有限
//   ・すかしの 判定は 見た目の 半径(えだはり まで)・低い 物は すかさない
//   ・ghost pool の 契約: 使った ものだけ visible、1 frame 使わなければ scene から はずす、地域 / corridor / fallback の 切りかえで 0
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { harness } = require('./helpers/runtime-harness.cjs');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'meguru-3d.mjs'), 'utf8');
function setup() {
  const h = harness({ deterministic: true, fullDisplay: true });
  const M = h.api.meguruMod, s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80, regionId: 'forest' });
  h.api.render();
  return { h, M, s };
}
const { M } = setup();
const mod3d = () => import(path.join(ROOT, 'meguru-3d.mjs'));

test('v2-1. player の 絵は きりで 消えない: キャラの material は fog なし・frustum culling なし・きりの 遠端は player + 900 より 遠く', () => {
  assert.match(SRC, /MeshBasicMaterial\(\{ alphaTest: 0\.5, side: THREE\.DoubleSide, fog: false \}\)/, 'キャラの material に fog: false');
  assert.match(SRC, /m\.frustumCulled = false; m\.userData\.tex = null; b\.actors\.set\(a, m\)/, 'キャラの 立て看板は frustum culling しない');
  assert.match(SRC, /fog\.far = Math\.max\([^;]*playerDist \+ 900\)/, 'きりの 遠端 >= player までの きょり + 900');
  assert.match(SRC, /fog\.near = Math\.max\(fr\[0\] \* fogK, playerDist \* 0\.9\)/, 'きりの 近端 >= player の 手前');
  assert.match(SRC, /Number\.isFinite\(tx\.aspect\) && tx\.aspect > 0 \? tx\.aspect : 1/, 'texture の aspect が 有限で なければ 1(scale NaN で 消えない)');
  // remove-it: 旧 code(fog を かける material / 遠端 = profile だけ)に もどすと 上の どれかが 赤
  assert.ok(!/MeshBasicMaterial\(\{ alphaTest: 0\.5, side: THREE\.DoubleSide \}\)/.test(SRC), 'fog つきの キャラ material が のこって いない');
});

test('v2-2. billboardVisible: 座標に いる のに 描かれない 状態(hidden / scale NaN / texture なし / きりの むこう)を 1 つの 判定で 見つける', async () => {
  const { billboardVisible } = await mod3d();
  const mk = (over) => Object.assign({ visible: true, scale: { x: 100, y: 110 }, material: { map: {}, fog: false } }, over);
  assert.equal(billboardVisible(mk({}), 1000, 600).ok, true);
  assert.equal(billboardVisible(mk({ visible: false }), 1000, 600).why, 'hidden');
  assert.equal(billboardVisible(mk({ scale: { x: NaN, y: 110 } }), 1000, 600).why, 'scale');
  assert.equal(billboardVisible(mk({ scale: { x: 0, y: 0 } }), 1000, 600).why, 'scale');
  assert.equal(billboardVisible(mk({ material: { map: null, fog: false } }), 1000, 600).why, 'texture');
  assert.equal(billboardVisible(mk({ material: { map: {}, fog: true } }), 500, 600).why, 'fog', 'fog つきの material で きりの むこう = 見えない');
  assert.equal(billboardVisible(mk({ material: { map: {}, fog: false } }), 500, 600).ok, true, 'fog なしの material なら きりの むこうでも 見える');
  assert.equal(billboardVisible(null).why, 'hidden');
});

test('v2-3. すかしは 見た目の 半径(えだはり)で 判定し、線分より 低い 物は すかさない。あたりの 半径 だけの 旧 判定も そのまま 通る', async () => {
  const { pickOccluders } = await mod3d();
  const player = { x: 0, z: 1000 }, ex = 0, ez = 0, S = M.ACTOR_SIZE;
  // 幹(あたり r 30)は 線分から 150 はなれて いるが、えだはり(vr 200)が 線分に かかる 木 → すける
  const tree = { ob: { collision: { x: 150, z: 500 } }, r: 30, vr: 200, top: 300 };
  const stump = { ob: { collision: { x: 0, z: 200 } }, r: 30, vr: 36, top: 30 };     // 線分の 上だが カメラの 近く(線分の 高さ 400)で 低い → すかさない
  const lowNear = { ob: { collision: { x: 0, z: 950 } }, r: 20, vr: 20, top: 30 };   // player の 足もと(線分の 高さ 25)の 低い 物 → すける
  const camH = 500;
  const want = pickOccluders([tree, stump, lowNear], ex, ez, player, S, camH);
  assert.ok(want.has(tree), 'えだはりが かかる 木は すける');
  assert.ok(!want.has(stump), '低い 切り株は すかさない');
  assert.ok(want.has(lowNear), 'player の すぐ 手前の 低い 物は すける');
  // camH なし(旧 呼びかた)なら 高さを 見ない(3d テストの 契約 そのまま)
  assert.ok(pickOccluders([stump], ex, ez, player, S).has(stump));
  const legacy = { ob: { collision: { x: 0, z: 500 } }, r: 40 };
  assert.ok(pickOccluders([legacy], ex, ez, player, S, camH).has(legacy), 'vr / top の ない 物は あたりの 半径で');
  assert.equal(pickOccluders([tree], ex, ez, null, S, camH).size, 0, 'player が いなければ 何も すかさない');
  // レンダラーは 物ごとに vr / top を parts から ためる
  assert.match(SRC, /cur\.vr = Math\.max\(cur\.vr, Math\.hypot\(/, 'parts から 見た目の 半径');
  assert.match(SRC, /cur\.top = Math\.max\(cur\.top, /, 'parts から 高さ');
  assert.match(SRC, /pickOccluders\(b\.occluders, ex, ez, player, M\.ACTOR_SIZE, camH\)/, 'レンダラーは camH を わたす');
});

test('v2-4. ghost pool の 契約: 使った ものだけ visible、使わなかった ものは その frame で hidden、1 frame 使わなければ scene から はずす、pool は つかいまわす', async () => {
  const { ghostPoolStep, GHOST_POOL_MAX } = await mod3d();
  const pool = [], log = [];
  const hooks = { attach: (g) => log.push('attach:' + g.key), detach: (g) => log.push('detach:' + g.key), dispose: (g) => log.push('dispose:' + g.key), place: () => {} };
  let st = ghostPoolStep(pool, ['a', 'b'], 1, hooks);
  assert.deepEqual(st, { visible: 2, attached: 2, total: 2 });
  assert.deepEqual(pool.map((g) => [g.key, g.visible, g.attached]), [['a', true, true], ['b', true, true]]);
  st = ghostPoolStep(pool, ['a'], 2, hooks);                 // b は 使わない → hidden + はずす
  assert.deepEqual(st, { visible: 1, attached: 1, total: 2 });
  const b = pool.find((g) => g.key === 'b');
  assert.equal(b.visible, false); assert.equal(b.attached, false); assert.ok(log.includes('detach:b'));
  st = ghostPoolStep(pool, ['a', 'c'], 3, hooks);            // c は b の 入れ物を つかいまわす(pool は ふえない)
  assert.deepEqual(st, { visible: 2, attached: 2, total: 2 });
  assert.ok(pool.some((g) => g.key === 'c' && g.attached && g.visible) && !pool.some((g) => g.key === 'b'));
  st = ghostPoolStep(pool, [], 4, hooks);                    // なにも すかさない frame → 全部 hidden・はずす
  assert.deepEqual(st, { visible: 0, attached: 0, total: 2 });
  assert.ok(pool.every((g) => !g.visible && !g.attached));
  st = ghostPoolStep(pool, [], 5, hooks);
  assert.deepEqual(st, { visible: 0, attached: 0, total: 2 }, 'persistent ghost = 0');
  // 上限: こえた ぶんは dispose(ずっと ふえつづけない)
  const keys = Array.from({ length: GHOST_POOL_MAX + 6 }, (_, i) => 'k' + i);
  st = ghostPoolStep(pool, keys, 6, hooks);
  assert.equal(st.visible, keys.length, 'ほしい ものは その frame は ぜんぶ 出す');
  st = ghostPoolStep(pool, keys.slice(0, 2), 7, hooks);
  assert.ok(pool.length <= GHOST_POOL_MAX, 'pool は 上限 まで ' + pool.length);
  assert.ok(log.some((l) => l.startsWith('dispose:')));
  // createdFrame / lastUsed が ある(perf 表示 と stats の ため)
  for (const g of pool) { assert.equal(typeof g.createdFrame, 'number'); assert.equal(typeof g.lastUsed, 'number'); }
});

test('v2-5. レンダラーの 切りかえで ghost が のこらない: scene の 捨て(地域 / corridor)・3D → 2D(fallback / 2D の 地域)で clear、stats に ghost と player', () => {
  assert.match(SRC, /for \(const g of b\.ghostPool\) if \(g\.mesh\) b\.sc\.remove\(g\.mesh\);\s*b\.ghostPool\.length = 0; b\.hidden\.clear\(\);/, 'disposeScene が ghost を 全部 捨てる');
  assert.match(SRC, /renderer\.renderLists\.dispose\(\); built = buildWorldScene\(world\)/, 'scene の 切りかえで renderLists を 捨てる');
  assert.match(SRC, /show\(on\) \{ if \(!on && !lost\) \{ try \{ renderer\.clear\(true, true, true\); \}/, '隠す まえに 全面を けす');
  assert.match(SRC, /b\.ghostStat = ghostPoolStep\(b\.ghostPool, wanted, frame, \{/, 'レンダラーは ghostPoolStep を つかう');
  assert.match(SRC, /ghosts: built \? Object\.assign\(\{ hiddenObjects: built\.hidden\.size/, 'stats3d().ghosts');
  assert.match(SRC, /player: Object\.assign\(\{ missFrames: playerMiss \}, playerVis\)/, 'stats3d().player');
  assert.match(SRC, /lines\.push\('ghost ' \+ st\.ghosts\.visible/, 'perf 表示に ghost と player');
  // 旧 code(ghosts 配列を visible だけ 入れかえて scene に 置きっぱなし)が のこって いない
  assert.ok(!/for \(const g of b\.ghosts\) g\.visible = false/.test(SRC), '旧 ghost 配列 なし');
});

// ──────────────────────────────── CP2: corridor も 3D・しらせ と ちずの 整理(F3〜F6)

test('v2-6. corridor(地域の あいだの 道)は 3D で 描く: 10 本 × 2 方向 ぜんぶ 3D の 対象。飾りは ぜんぶ 意味の 表で 解決し(unresolved 0)、はしの いし だけ かたい', () => {
  const specs = M.walkCorridorSpecs();
  assert.ok(specs.length >= 10, 'corridor ' + specs.length);
  for (const spec of specs) for (const from of [spec.a, spec.b]) {
    const w = M.createCorridorWalk(spec, from, { firstVisit: true, party: [] }).world;
    assert.ok(w.corridor && w.chartFrom === from && w.corridorTo === (from === spec.a ? spec.b : spec.a), 'from / to の しるし');
    assert.ok(M.WORLD3D_REGIONS.has(w.chartFrom) && M.WORLD3D_REGIONS.has(w.corridorTo));
    const r = M.worldObjects3d(w);
    assert.equal(r.unresolved.length, 0, spec.connectionId + '/' + from + ' unresolved: ' + [...new Set(r.unresolved)].join(','));
    const blockers = w.props.filter((p) => p.blocker).length, solid = r.objects.filter((o) => o.solid);
    assert.equal(solid.length, blockers, 'かたいのは はしの いし だけ');
    for (const o of solid) { assert.equal(o.type, 'rock'); assert.equal(o.collision.hw, 24, 'あたりは corridorBody の まる(r 24)と 同じ'); }
    for (const o of r.objects) if (!o.solid) assert.equal(o.collision, null, '飾りは あたりを もたない');
    // 木は 木の まま(2D の あたり なしで ひざ丈に する SOFT3D は corridor では つかわない)
    for (const o of r.objects) assert.ok(o.type !== 'bush' || !['🌳', '🌲'].includes(o.kind), '木が ひざ丈に なって いる: ' + o.kind);
    assert.ok(r.objects.some((o) => o.type === 'conifer' || o.type === 'broadleaf' || o.type === 'house' || o.type === 'palm' || o.type === 'cactus' || o.type === 'tower'), spec.connectionId + ': 大きな 飾りが 3D に なる');
    // すすみぐあい(きりの まぜかた)は setProgress が 出す
    w.setProgress(0.3); assert.equal(w.progress, 0.3); w.setProgress(2); assert.equal(w.progress, 1);
  }
  // hybrid レンダラーは corridor の world を 3D の 対象に する(source の 契約)
  assert.match(SRC, /if \(w\.corridor\) return !!w\.chartFrom && !!w\.corridorTo && M\.WORLD3D_REGIONS\.has\(w\.chartFrom\) && M\.WORLD3D_REGIONS\.has\(w\.corridorTo\);/, 'want() が corridor を 3D に');
  assert.match(SRC, /if \(world\.corridor\) \{\s*built\.refreshGround\(\);/, '地面の いろは すすみぐあいで かわる');
  assert.ok(!/!w\.corridor && !!w\.world3d/.test(SRC), '旧「corridor は 2D」の 条件が のこって いない');
});

test('v2-7. corridor の gameplay は かわらない: 帯の 左右と はしの いし の あたり、着く / もどる、party の 受けわたし、セーブ なし', () => {
  const spec = M.walkCorridorSpec('home|forest');
  const party = [{ x: 0, z: 0, heading: 0 }];
  const w = M.createCorridorWalk(spec, 'home', { firstVisit: true, party });
  const L = spec.walkLength;
  // 帯の はし: よこへ 押しつづけても uMax を こえない
  for (let i = 0; i < 600; i++) w.step(1 / 60, { x: 1, y: 0 });
  const st = w.stage();
  assert.ok(Math.abs(w.state.u) <= spec.stages[st.index].uMax + 0.01, 'u ' + w.state.u + ' <= ' + spec.stages[st.index].uMax);
  // はしの いし: いしの まんなかへ 行こうと しても 24 + からだの 半径 より ちかづけない
  const b = w.world.blockers[0];
  w.state.s = b.s - 200; w.state.u = b.u;
  for (let i = 0; i < 400; i++) w.step(1 / 60, { x: 0, y: -1 });
  assert.ok(Math.hypot(w.state.s - b.s, w.state.u - b.u) >= b.r + M.RULES.bodyRadius - 1 || w.state.s > b.s + b.r, 'いしは すり抜けない');
  // 着く / もどる
  w.state.s = L - 1; w.state.u = 0; let ev = null; for (let i = 0; i < 120 && !ev; i++) ev = w.step(1 / 60, { x: 0, y: -1 });
  assert.equal(ev && ev.type, 'arrive');
  w.state.s = 1; ev = null; for (let i = 0; i < 120 && !ev; i++) ev = w.step(1 / 60, { x: 0, y: 1 });
  assert.equal(ev && ev.type, 'back');
  assert.equal(w.party.length, 1, 'なかまは いっしょ');
  for (const k of M.CORRIDOR_STATE_KEYS) assert.ok(k in w.state, 'state の かたちは 4E-1 の まま: ' + k);
  assert.ok(!Object.keys(w.state).some((k) => /3d|save|ghost/i.test(k)), '3D の ための state は たさない(セーブ なし)');
});

test('v2-8. しらせ: ふつうの spot と 地区は toast なし、ランドマークは quiet(左上の 静かな 強調)、ひみつ だけ toast。きろくは かわらない', () => {
  const reg = M.buildRegistry();
  let toast = 0, quiet = 0, none = 0;
  for (const rid of Object.keys(M.WORLDS)) for (const s of M.buildWorld(rid, reg, {}).spots) {
    const n = M.discoveryNotice(s);
    if (!n) { none++; assert.ok(!s.secret, rid + ' ひみつは toast: ' + s.id); }
    else if (n.quiet) { quiet++; assert.ok(s.landmark && !s.secret, rid + ' quiet は ランドマーク: ' + s.id); }
    else { toast++; assert.ok(s.secret, rid + ' toast は ひみつ だけ: ' + s.id); assert.equal(n.kind, 'secret'); }
  }
  assert.ok(toast >= 40 && quiet >= 13 && none >= 300, `toast ${toast} quiet ${quiet} none ${none}`);
  // レベル(ちず / 監査)は かわらない
  const lv = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const rid of Object.keys(M.WORLDS)) for (const s of M.WORLDS[rid].spots) lv[M.spotDiscoveryLevel(s)]++;
  assert.deepEqual(lv, { 0: 184, 1: 17, 2: 199, 3: 71 });
  // 地区の toast は なくなった(きろくは のこる): source の 契約
  const src = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
  assert.match(src, /function noteZoneFound\(zn\) \{\s*saveMapBits\('zones', zn\.id\); mapAdded = true;\s*\}/, '地区は きろく だけ');
  assert.match(src, /if \(dn && dn\.quiet\) quietSpotMark\(s\);/, 'ランドマークは quietSpotMark');
  assert.ok(!/kind: 'zone', region: rid, icon: '🗺'/.test(src), '地区の toast が のこって いない');
});

test('v2-9. ちずの 表示 filter: ふつうの 池・休憩所・小さな 橋・通過点は 出さず、現在地・つながり・gate・ランドマーク・ひみつ・hub / ひろば は 出す。きろくと 分母は かわらない', () => {
  const reg = M.buildRegistry();
  const w = M.buildWorld('forest', reg, {});
  const sp = (id) => w.spots.find((q) => q.id === id);
  for (const id of ['great', 'falls', 'mush1']) assert.ok(M.mapSpotShown(w, sp(id), null), id + ' ランドマークは 出す');
  for (const id of ['hiddenpond', 'nook', 'hearthidden']) assert.ok(M.mapSpotShown(w, sp(id), null), id + ' ひみつは 出す');
  for (const id of ['entry', 'bright1', 'bright2', 'anc2', 'stonelook']) assert.ok(M.mapSpotShown(w, sp(id), null), id + ' hub / ひろば / つながり は 出す');
  for (const id of ['thicket1', 'creek2', 'rest', 'bridge1', 'deep2', 'fallslook', 'shallow']) assert.ok(!M.mapSpotShown(w, sp(id), null), id + ' は 出さない');
  assert.ok(M.mapSpotShown(w, sp('thicket1'), { hereSpot: 'thicket1' }), '現在地は どこでも 出す');
  // 全地域: 出す spot は 2〜5 わり。gate / つながり の spot は かならず 出す
  let tot = 0, shown = 0;
  for (const rid of Object.keys(M.WORLDS)) {
    const ww = M.buildWorld(rid, reg, {}), sh = ww.spots.filter((q) => M.mapSpotShown(ww, q, null));
    tot += ww.spots.length; shown += sh.length;
    for (const c of M.WORLD_GEOGRAPHY.connections) if (c.mouths && c.mouths[rid]) assert.ok(sh.some((q) => q.id === c.mouths[rid]), rid + ' つながり ' + c.id);
    for (const g of M.regionGates(rid, ww)) if (g.spot) assert.ok(sh.some((q) => q.id === g.spot.id), rid + ' gate ' + g.id);
  }
  assert.ok(shown / tot >= 0.2 && shown / tot <= 0.5, `ちずに 出す ${shown} / ${tot}`);
  // mapData: 出す + かくす = 見つけた。分母(progress)は かわらない
  const sim = M.createSimulation({ regionId: 'forest', discovered: [] });
  for (const id of ['entry', 'bright1', 'thicket1', 'creek2', 'great']) sim.discovered.add(id);
  const md = sim.mapData();
  assert.equal(md.spots.length + md.spotsHidden, 5);
  assert.ok(md.spots.some((q) => q.id === 'great') && !md.spots.some((q) => q.id === 'thicket1'));
  const openN = w.spots.filter((q) => !q.secret).length;
  assert.equal(md.progress.percent, Math.round(5 / openN * 100), '探索率は 見つけた 5 の まま(かくした ぶんも かぞえる)');
  // remove-it: filter を 外すと(ぜんぶ 出す)上の「出さない」が 赤に なる(mapSpotShown を つかって いる こと)
  const src = fs.readFileSync(path.join(ROOT, 'meguru.js'), 'utf8');
  assert.match(src, /const spots = found\.filter\(\(q\) => mapSpotShown\(world, q, rec\)\)/, 'computeMapData は filter を 通す');
});
