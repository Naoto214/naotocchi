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
