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

// ──────────────────────────────── CP3: Water v2(F10)— 水は いみ ごとに べつの geometry。池の ならびで 川 / 海を 見せない

test('v2-10. 帯(strip)の geometry は 1 まいに つながる: frame × lane の 頂点を 共有し、となりの frame と 面で つながる(池の ならび では ない)', async () => {
  const { polylineFrames, stripGeometryData, discFanData, distToPolyline } = await mod3d();
  const pts = [[0, 0], [0, 400], [120, 800], [120, 1200]];
  const fr = polylineFrames(pts);
  assert.equal(fr.length, 4);
  for (const f of fr) assert.ok(Math.abs(Math.hypot(f.nx, f.nz) - 1) < 1e-9, '法線は 単位');
  assert.ok(fr[3].s > fr[2].s && fr[2].s > fr[1].s, '道のりは ふえる');
  const d = stripGeometryData(fr, [{ o: -100, y: 2, c: [0, 0, 1] }, { o: 0, y: 2, c: [0, 0, 0.5] }, { o: 100, y: 2, c: [0, 0, 1] }]);
  assert.equal(d.positions.length / 3, 4 * 3, '頂点 = frame × lane(共有)');
  assert.equal(d.index.length, (4 - 1) * (3 - 1) * 6, '面 = (frame − 1) × (lane − 1) × 2 三角形');
  // となりの frame の 面は 同じ 頂点を つかう(つぎめ なし)
  const tri = (i) => d.index.slice(i * 3, i * 3 + 3);
  const firstQuad = new Set([...tri(0), ...tri(1)]), secondQuad = new Set([...tri(4), ...tri(5)]);
  assert.ok([...firstQuad].some((v) => secondQuad.has(v)), 'つぎの frame の 面と 頂点を 共有');
  // 法線方向に 固定の 向き(うみ: 岸から 沖へ)
  const sea = stripGeometryData(fr, [{ o: 0, y: 2, c: [0, 0, 1] }, { o: 9000, y: 2, c: [0, 0, 1] }], { along: [-1, 0] });
  assert.equal(sea.positions[3], -9000, '沖の 頂点は x − 9000');
  // 池: でこぼこの 閉じた かたち(seed で きまる)・中心 ふかく / ふち あさく
  const fan = discFanData([{ x: 0, z: 0, y: 2, rx: 100, rz: 80, seed: 'a', amp: 0.12, deep: [0, 0, 1], edge: [0.5, 0.8, 1] }], 16);
  assert.equal(fan.positions.length / 3, 17); assert.equal(fan.index.length, 16 * 3);
  const radii = []; for (let k = 1; k <= 16; k++) radii.push(Math.hypot(fan.positions[k * 3], fan.positions[k * 3 + 2]));
  assert.ok(Math.max(...radii) - Math.min(...radii) > 8, 'まる では なく でこぼこ');
  assert.deepEqual([...fan.colors.slice(0, 3)], [0, 0, 1]); assert.ok(Math.abs(fan.colors[3] - 0.5) < 1e-6 && Math.abs(fan.colors[4] - 0.8) < 1e-6 && fan.colors[5] === 1, 'ふちの いろ');
  assert.equal(distToPolyline(pts, 60, 200), 60); assert.ok(Math.abs(distToPolyline(pts, 0, 1500) - 300 - 0) < 130);
});

test('v2-11. 川(river_lake)= terrain.pts からの 1 本の 帯(岸つき)。帯に かくれる 池は おかない。しんかいの 谷も 1 本の 帯', async () => {
  const { pondCovered } = await mod3d();
  const reg = M.buildRegistry();
  const w = M.buildWorld('river_lake', reg, { world3d: true });
  assert.equal(w.terrain.kind, 'river'); assert.ok(w.terrain.pts.length >= 10 && w.terrain.half >= 150);
  const ponds = w.spots.filter((q) => q.kind === 'water');
  const covered = ponds.filter((q) => pondCovered(w, q, M.shoreX)), kept = ponds.filter((q) => !pondCovered(w, q, M.shoreX));
  assert.ok(covered.some((q) => q.id === 'river1') && covered.some((q) => q.id === 'rapids'), '川の 上の 池は 帯に かくれる: ' + covered.map((q) => q.id));
  assert.ok(kept.some((q) => q.id === 'lake'), '湖は のこる: ' + kept.map((q) => q.id));
  assert.ok(kept.every((q) => q.r >= 100), 'のこる 池は 川から はなれて いる');
  const d = M.buildWorld('deepsea', reg, { world3d: true });
  assert.equal(d.terrain.kind, 'chasm'); assert.ok(d.spots.filter((q) => q.kind === 'water').some((q) => pondCovered(d, q, M.shoreX)));
  // レンダラー: 川 / 谷は stripGeometryData の 帯(bank + water)。旧「うみ = shore / pool の 帯を ならべる」は のこって いない
  // 2026-10-02 Geometry pass(Creek / River v3): 川は 小川と おなじ ながれ(streams3d)の 谷の 断面(water:bank)+ 水面(water:river)。谷(chasm)は いままでの 帯
  assert.match(SRC, /T\.kind === 'chasm' \|\| \(T\.kind === 'river' && !terr\)/, '谷の 帯(地形の ない とき は 川も)');
  assert.match(SRC, /'water:' \+ T\.kind/, '谷の mesh');
  assert.match(SRC, /river \? 'water:bank' : 'water:creekbed'/, '川の 岸 / 谷の 断面');
  assert.match(SRC, /river \? waterMat : streamMat, river \? 'water:river' : 'water:creek'/, '川の 水面');
  assert.ok(!/if \(prof\.sea && world\.terrain && world\.terrain\.kind === 'coast'\)/.test(SRC), 'うみの 帯ならべ(pond chain)が のこって いない');
  assert.ok(!/for \(const q of ponds\) \{ push\('shore'/.test(SRC), '池の instanced disc ならべが のこって いない');
});

test('v2-12. 海(sea)/ 湖(memory_lake)= 岸線から 水平線まで 1 まいの 面(ぬれた 砂 → 浅瀬 → 沖)+ 岸の あわ。岸の むこうの 池は おかない', async () => {
  const { pondCovered } = await mod3d();
  const reg = M.buildRegistry();
  for (const [rid, kind] of [['sea', 'sea'], ['memory_lake', 'lake']]) {
    const w = M.buildWorld(rid, reg, { world3d: true });
    assert.equal(w.terrain.kind, 'coast'); assert.ok(w.terrain.pts.length >= 8);
    const prof = M.REGION3D[rid];
    assert.ok(prof.water && prof.water.deep && prof.water.shallow, rid + ' の 水の いろ');
    if (kind === 'lake') assert.ok(prof.lake, 'memory_lake は 湖');
    // 岸線の 水の がわに ある 池は 面に かくれる、陸の がわは のこる
    const side = w.terrain.side || -1, sx = M.shoreX(w, 1000);
    assert.ok(pondCovered(w, { x: sx + side * 400, z: 1000, r: 120 }, M.shoreX), rid + ' 水の がわは かくれる');
    assert.ok(!pondCovered(w, { x: sx - side * 400, z: 1000, r: 120 }, M.shoreX), rid + ' 陸の がわは のこる');
  }
  assert.match(SRC, /T\.kind === 'coast' && T\.pts && T\.pts\.length >= 2/, '岸線からの 面');
  assert.match(SRC, /\{ o: 0, y: 2\.2, c: shallowC \}, \{ o: 150, y: 2\.2, c: shallowC \}, \{ o: 520, y: 2\.2, c: midC \}, \{ o: 1400, y: 2\.2, c: deepC \}, \{ o: 9000, y: 2\.2, c: deepC \}/, '浅瀬 → 沖 → 水平線 の lane');
  assert.match(SRC, /'water:wetsand'/, 'ぬれた 砂'); assert.match(SRC, /'water:foam'/, '岸の あわ');
  assert.match(SRC, /water\.kind = prof\.lake \? 'lake' : 'sea'/, '湖 / 海の 区別');
  assert.match(SRC, /PerspectiveCamera\(50, 1, 20, 12000\)/, 'カメラの 遠は 水平線まで');
  // 波: 頂点の simulation では なく material の アニメ(map.offset / あわの 明滅)
  assert.match(SRC, /for \(const a of built\.waterAnim\) \{ if \(a\.map\) \{ a\.map\.offset\.x = \(s \* a\.dx\) % 1; a\.map\.offset\.y = \(s \* a\.dy\) % 1; \} if \(a\.foam\) a\.foam\.opacity/, '波の アニメ');
});

test('v2-13. 水の 見た目は あたり(walkability)を かえない: 岸の clamp・池の あたり・橋は 2D と 同じ。水の 面は あたりを もたない', () => {
  const reg = M.buildRegistry();
  for (const rid of ['sea', 'river_lake', 'memory_lake', 'deepsea']) {
    const a = M.buildWorld(rid, reg, {}), b = M.buildWorld(rid, reg, { world3d: true });
    assert.deepEqual(a.terrain, b.terrain, rid + ' terrain は 2D と 同じ');
    assert.equal(a.minX, b.minX); assert.equal(a.maxX, b.maxX);
    const roles = (w) => w.obstacles.filter((o) => o.role === 'water').length;
    assert.equal(roles(a), roles(b), rid + ' 水の あたり(role water)の 数は 同じ');
    // 岸の むこうへは 出られない(clampToWorld は shoreX を 見る)
    if (b.terrain.kind === 'coast') { const sx = M.shoreX(b, 2000), side = b.terrain.side || -1; const p = M.clampToWorld({ x: sx + side * 800, z: 2000 }, b); assert.ok(side < 0 ? p.x >= sx + 30 - 0.01 : p.x <= sx - 30 + 0.01, rid + ' 岸で とまる'); }
  }
  // レンダラーの 水の mesh は あたりの ある 物(occluders)に 入らない: 水の 面は すかしの 対象では ない
  assert.match(SRC, /const stripMesh = \(data, mat, name\) => \{/, '水は stripMesh(instanced の occluder とは べつ)');
});

// ──────────────────────────────── CP4 / CP5: Environment Kit v2 と Region Profile v2(F7 / F8 / F9 / F11)

test('v2-14. Kit v2 の 原型: 昆布は 曲がった は(木 / 柱では ない)、遺跡は くずれた かべ、はしは いみ ごと、たてものは body + 屋根 + 入口 + まど', () => {
  const reg = M.buildRegistry();
  const objsOf = (rid) => M.worldObjects3d(M.buildWorld(rid, reg, { world3d: true })).objects;
  // 昆布(deepsea)
  const deep = objsOf('deepsea'), kelp = deep.filter((o) => o.type === 'kelp' || o.type === 'kelprow');
  assert.ok(kelp.length >= 20, 'kelp ' + kelp.length);
  for (const o of kelp) { assert.ok(o.parts.length >= 3 && o.parts.every((pt) => pt.shape === 'kelp'), o.kind + ' は kelp の は だけ'); assert.ok(new Set(o.parts.map((pt) => Math.round(pt.h))).size >= 2, '高さ ばらばら'); }
  for (const o of deep) assert.ok(!(o.type === 'kelp' || o.type === 'kelprow') || !o.parts.some((pt) => pt.shape === 'trunk' || pt.shape === 'wblade' || pt.shape === 'wpost'), '昆布に 木 / 柱の かたち');
  // 遺跡(desert / jungle)
  const ruins = [...objsOf('desert'), ...objsOf('jungle')].filter((o) => o.kind === 'ruinwall');
  assert.ok(ruins.length >= 10, 'ruinwall ' + ruins.length);
  for (const o of ruins) {
    assert.equal(o.type, 'ruin'); assert.ok(o.solid, 'くずれた かべも かたい');
    const walls = o.parts.filter((pt) => pt.shape === 'box');
    assert.ok(walls.length >= 2 && new Set(walls.map((pt) => Math.round(pt.h))).size >= 2, '高さの ちがう かべ 2 まい いじょう');
    assert.ok(o.parts.some((pt) => pt.shape === 'wpost') && o.parts.some((pt) => pt.shape === 'pebble'), '柱 と 倒れた 石');
  }
  const pillars = [...objsOf('desert'), ...objsOf('jungle')].filter((o) => o.kind === 'ruinpillar');
  assert.ok(pillars.some((o) => o.parts.some((pt) => pt.shape === 'box')) && pillars.some((o) => o.parts.some((pt) => pt.shape === 'pebble')), '柱頭の ある 柱 と 折れた 柱');
  // はし(forest: まるた / いし、jungle / star_stop: ロープ / 光)
  const f = objsOf('forest'), log = f.find((o) => o.kind === '🌉' && o.spot === 'bridge1'), stone = f.find((o) => o.kind === '🌉' && o.spot === 'bridge2');
  assert.ok(log && log.parts.filter((pt) => pt.shape === 'log').length === 3 && log.parts.filter((pt) => pt.shape === 'wpost').length >= 4, 'まるたの はし = 丸太 3 本 + 支柱');
  // 2026-10-01 Art Direction v1(Bridge v3): 床は 水面より 上・両はしの だん(ramp)・橋脚 が ふえた
  // 2026-10-02 Geometry pass(Bridge v4): いしの はし = あつい 石の 床(slab)+ 両側の欄干(土台 + 笠石の高さ16、端柱24)+ アーチ 2 つ + 橋台 + だん。床の 上面は 小川の 水面(−9)より 上
  assert.ok(stone, 'いしの はし');
  require('./helpers/stone-parapet.cjs')(stone);
  assert.ok(stone.parts.filter((pt) => pt.shape === 'arch').length === 2 && stone.parts.find((pt) => pt.shape === 'slab').y + 10 > -9 && stone.parts.filter((pt) => pt.shape === 'box' && pt.solidBox && pt.rz <= 20).length >= 4, 'いしの はし: アーチ・床は 水面より 上・橋台 と だん');
  const rope = [...objsOf('jungle'), ...objsOf('mountain')].find((o) => o.kind === 'ropebridge'), light = objsOf('star_stop').find((o) => o.kind === 'lightbridge');
  if (rope) assert.ok(rope.parts.some((pt) => pt.shape === 'plank') && rope.parts.filter((pt) => pt.shape === 'rail').length === 2 && rope.parts.filter((pt) => pt.shape === 'wpost').length >= 6, 'ロープの はし');
  if (light) assert.ok(light.parts.some((pt) => pt.shape === 'wslab') && light.parts.some((pt) => pt.shape === 'glowdisc'), '光の はし');
  // たてもの(home / countryside / city)
  for (const rid of ['home', 'countryside']) for (const o of objsOf(rid).filter((q) => q.type === 'house')) {
    assert.ok(o.parts.some((pt) => pt.shape === 'roof' || (pt.shape === 'box' && pt.y > 0)), rid + ' ' + o.kind + ' 屋根');
    // 2026-10-01 Art Direction v1(Building v3): とびらの いろ / まどの わく は 家ごとに かわる ので、入口 = door、まど = win の しるしで 見る(いろ 固定 では なく)
    const fronts = o.parts.filter((pt) => pt.shape === 'box' && pt.dx != null);
    assert.ok(fronts.some((pt) => pt.door) && fronts.some((pt) => pt.win && pt.color === '#cfe6f2'), rid + ' ' + o.kind + ' 入口 と まど');
    assert.ok(o.parts.some((pt) => pt.shape === 'crown' && pt.small) && o.parts.filter((pt) => pt.shape === 'flower').length >= 2, rid + ' ' + o.kind + ' 家の まわりの しげみ と 花');   // AD v1: 家の まわりの 植物
  }
  const towers = objsOf('city').filter((o) => o.type === 'tower');
  for (const o of towers) assert.ok(o.parts.filter((pt) => pt.shape === 'box' && pt.dx != null && pt.win).length >= 2 && o.parts.some((pt) => pt.door && pt.color === '#3c4048'), 'ビルに まど と 入口 ' + o.kind);
  // 木: えだはりは かたまり 2 つ いじょう・幹は ほそる
  const trees = f.filter((o) => o.type === 'broadleaf');
  assert.ok(trees.every((o) => o.parts.filter((pt) => pt.shape === 'crown').length >= 2 && o.parts[0].shape === 'trunk' && o.parts[0].taper < 0.8), '木 = ほそる 幹 + かたまり 2 つ いじょう');
  assert.ok(new Set(trees.map((o) => o.parts.filter((pt) => pt.shape === 'crown').length)).size >= 2, 'かたまりの 数は 木ごと');
  const palms = objsOf('sea').filter((o) => o.type === 'palm');
  assert.ok(palms.length && palms.every((o) => o.parts.filter((pt) => pt.shape === 'frond' && pt.dir != null).length >= 5), 'ヤシの は は 放射状の 平らな は 5〜8 まい(2026-10-01 AD v1: frond)');
});

test('v2-15. Region Profile v2: 13 地域 ぜんぶに family(terrain / veg / arch / water / density / landmark / sky)。まちは palette で ビルの いろ と 階数が ばらつき、電柱が ある', () => {
  for (const rid of Object.keys(M.WORLDS)) {
    const p = M.REGION3D[rid];
    assert.ok(p && p.fog && p.water && p.terrain && p.veg && p.arch && p.arch.kind && p.density != null && p.landmark && p.sky, rid + ' の profile v2: ' + JSON.stringify(p));
  }
  const reg = M.buildRegistry();
  const city = M.worldObjects3d(M.buildWorld('city', reg, { world3d: true })).objects;
  const towers = city.filter((o) => o.type === 'tower' && o.kind === '🏢');
  const colors = new Set(towers.map((o) => o.parts[0].color)), heights = new Set(towers.map((o) => Math.round(o.parts[0].h / 20)));
  assert.ok(colors.size >= 4, 'ビルの いろ ' + colors.size); assert.ok(heights.size >= 3, 'ビルの 高さ ' + heights.size);
  assert.ok(towers.some((o) => o.parts.some((pt) => pt.shape === 'wstem' && pt.y > 100)), '屋上の タンク');
  const poles = city.filter((o) => o.type === 'lamp' && o.parts.some((pt) => pt.shape === 'wslab'));
  assert.ok(poles.length >= 10, '電柱 ' + poles.length);
  const forest = M.worldObjects3d(M.buildWorld('forest', reg, { world3d: true })).objects;
  assert.ok(!forest.some((o) => o.type === 'lamp' && o.parts.some((pt) => pt.shape === 'wslab')), 'もりに 電柱は ない');
  // jungle は 半分の 木を 20 三角形の かんむりに
  const jungle = M.worldObjects3d(M.buildWorld('jungle', reg, { world3d: true })).objects.filter((o) => o.type === 'broadleaf');
  // 2026-10-02 Geometry pass(Tree v4): 根もとの はり + 幹 2 だん が さきに 入る ので、主の かんむり = はじめの crown
  const smallMain = jungle.filter((o) => o.parts.find((pt) => pt.shape === 'crown').small).length;
  assert.ok(smallMain > jungle.length * 0.3 && smallMain < jungle.length * 0.7, 'jungle の かるい かんむり ' + smallMain + ' / ' + jungle.length);
  // 地面の 起伏は renderer が areas から つくる(あたり なし)
  assert.match(SRC, /const BUMP = \{ dunefield: 22, snowfield: 14, seabed: 12/, '起伏の 表');
});
