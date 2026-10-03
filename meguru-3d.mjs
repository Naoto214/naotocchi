// なおとっち — めぐる 3D prototype(forest だけ・?meguru3d=1 の ときだけ よみこむ)。
//
// ・せかい / シミュレーション(meguru.js)は そのまま。ここは sim.view() を うけとって えがく だけ(view は かきかえない)。
// ・hybrid: forest の world(3D モードで 組んだ もの)だけ 3D。corridor・transition・ほかの 地域は いまの 2D レンダラー。
// ・キャラは いまの 2D の 絵(PNG / 絵文字イラスト)の 立て看板(y 軸だけ まわる)。3D モデルは つくらない。
// ・かたい 物の 見た目は あたり(world.obstacles)から つくる(meguru.js の worldObjects3d)。見えない かべ も、とおれる 木 も つくらない。
// ・WebGL が つかえない / context lost のときは すぐ 2D に もどる(その あとは この あそびの あいだ ずっと 2D)。
// ・座標: せかいの (x, z) → three の (x, y, -z)。カメラは 2D と おなじ ピンホール(焦点 0.95W・地平線 30%・水平)。
import * as THREE from './vendor/three-0.170.0/three.module.min.js';

export const THREE_REVISION = THREE.REVISION;
const TAU = Math.PI * 2;
const HOR_BASE = 0.30, FEET_FRAC = 0.80;   // 2D の createCanvasRenderer と おなじ

// Visual Quality pass (2026-10-02): static ambient contact, not a new sun /
// weather system. Only world silhouettes contribute. Reused by ground, paths
// and banks; no shadow meshes, transparent layers or per-frame instance writes.
export function contactFootprints(objects) {
  const out = [], eligible = /^(broadleaf|bigtree|conifer|palm|buttress|house|tower|wall|temple|dome|rock|rockwall|ledge|ruin|pillar|statue|lm_)/;
  for (const ob of objects) {
    if (!eligible.test(ob.type)) continue;
    let baseDone = false, crownDone = false;
    for (const p of ob.parts || []) {
      const crown = p.shape === 'crown' && !crownDone;
      const base = !baseDone && (p.y || 0) <= 2 && /^(trunk|box|rock|cliff|wpost|mound|dome)$/.test(p.shape);
      if (!crown && !base) continue;
      let rx = p.r || p.rx || 12, rz = p.r || p.rz || rx;
      if (base) { baseDone = true; rx = rx * 1.3 + 14; rz = rz * 1.3 + 14; }
      if (crown) { crownDone = true; rx *= 1.15; rz *= 1.15; }
      out.push({ x: ob.x + (p.dx || 0), z: ob.z + (p.dz || 0), rx: Math.min(240, rx), rz: Math.min(240, rz),
        angle: p.ang || 0, strength: crown ? 0.16 : 0.26 });
    }
  }
  return out;
}

// All receiving surfaces use world coordinates, including InstancedMesh roads.
// The field is baked once per scene, sampled once per fragment and disposed with
// the scene. Clamp accumulation so dense forests retain readable ground color.
function contactMaterial(material, texture, bounds) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.worldContact = { value: texture };
    shader.uniforms.worldContactBounds = { value: bounds };
    shader.vertexShader = 'varying vec2 vWorldContact;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 contactPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        contactPosition = instanceMatrix * contactPosition;
      #endif
      vWorldContact = (modelMatrix * contactPosition).xz;
      #include <project_vertex>`);
    shader.fragmentShader = 'uniform sampler2D worldContact;\nuniform vec4 worldContactBounds;\nvarying vec2 vWorldContact;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 contactUV = (vec2(vWorldContact.x, -vWorldContact.y) - worldContactBounds.xy) / worldContactBounds.zw;
      diffuseColor.rgb *= max(0.64, texture2D(worldContact, contactUV).r);`);
  };
  material.customProgramCacheKey = () => 'world-contact-v1';
  return material;
}

export function webgl2Available(doc = typeof document !== 'undefined' ? document : null) {
  try { const c = doc && doc.createElement('canvas'); return !!(c && c.getContext && c.getContext('webgl2')); } catch (_) { return false; }
}

// script.js は <script type="module"> で よむ ので、ここで window に のせる(Node の テストは import で つかう)
if (typeof window !== 'undefined') window.NaotocchiMeguru3D = { createMeguru3D: (M, opts) => createMeguru3D(M, opts), webgl2Available, THREE_REVISION };

// start(container, { renderer }) に わたす factory
export function createMeguru3D(M, opts = {}) {
  return (o) => createHybridRenderer(M, o, opts);
}

function createHybridRenderer(M, o, opts) {
  const r2d = M.createCanvasRenderer(o);
  let r3d = null, failed = false, active = false, fadeOn = true, adaptiveOn = true;
  let ctx = o.ctx, W = o.W, H = o.H;
  // v2(F3): corridor(地域の あいだの 道)も 3D。3D の 地域 どうしを むすぶ 道は 3D 世界 → 3D の 道 → 3D 世界 と つづく
  const want = (view) => {
    const w = view && view.world;
    if (!w || opts.force2d || failed) return false;
    if (w.corridor) return !!w.chartFrom && !!w.corridorTo && M.WORLD3D_REGIONS.has(w.chartFrom) && M.WORLD3D_REGIONS.has(w.corridorTo);
    return !!w.world3d && M.WORLD3D_REGIONS.has(w.regionId);
  };
  // 実機の 計測(&perf=1): フレームの 間かく(avg / p95 / p99 / 60ms 超)と 3D の draw call・三角形を 画面の 左上に
  const gaps = []; let lastNow = 0, animLv = 2;
  function perfText(now) {
    if (lastNow) { gaps.push(now - lastNow); if (gaps.length > 600) gaps.shift(); }
    lastNow = now;
    if (!ctx || gaps.length < 10) return;
    const xs = gaps.slice().sort((a, b) => a - b), q = (k) => xs[Math.min(xs.length - 1, Math.floor(xs.length * k))];
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length, st = r3d && active ? r3d.stats() : null;
    const lines = [(active ? '3D' : '2D') + ' avg ' + avg.toFixed(1) + ' p95 ' + q(0.95).toFixed(0) + ' p99 ' + q(0.99).toFixed(0) + ' >60 ' + xs.filter((v) => v > 60).length + '/' + xs.length];
    if (st) lines.push('calls ' + st.calls + ' tris ' + (st.triangles / 1000).toFixed(0) + 'k tex ' + st.textures + ' js ' + st.drawMsAvg.toFixed(1) + 'ms dpr ' + st.pixelRatio);
    // v2(F1 / F2): ghost の pool(visible / attached / pool)と すかして いる 物の 数、player の 絵が 見えて いるか(見えない frame の 数)
    if (st && st.ghosts) lines.push('ghost ' + st.ghosts.visible + '/' + st.ghosts.attached + '/' + st.ghosts.total + ' hid ' + st.ghosts.hiddenObjects + ' player ' + (st.player.ok ? 'ok' : 'NG:' + st.player.why) + ' miss ' + st.player.missFrames);
    // Geometry pass(HQ-1〜3): ray で 見える 本数(足 / むね / あたま)・3 本とも かくれた 回数・さえぎった 形・長い frame(> 50ms)・instance 送り・解像度の 段
    if (st && st.diag && st.diag.on) lines.push('ray ' + st.diag.ray.seen + '/' + st.diag.ray.of + ' occl ' + st.diag.occlFrames + '/' + st.diag.rayChecks + (st.diag.ray.blk ? ' blk ' + st.diag.ray.blk : '') + ' long ' + st.diag.longFrames + ' up ' + st.diag.uploads + (st.diag.dprSteps.length ? ' dpr→' + st.diag.dprSteps.join('→') : ''));
    ctx.save(); ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((t, i) => { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(4, 40 + i * 14, ctx.measureText(t).width + 6, 14); ctx.fillStyle = '#fff'; ctx.fillText(t, 7, 41 + i * 14); });
    ctx.restore();
  }
  function fail(err) {
    failed = true;
    if (r3d) { try { r3d.destroy(); } catch (_) { /* もう こわれて いる */ } r3d = null; }
    setActive(false);
    if (opts.onFallback) opts.onFallback(err);
  }
  function setActive(on) {
    if (on === active) return;
    active = on;
    if (r3d) r3d.show(on);
    if (o.canvas && o.canvas.style) o.canvas.style.background = on ? 'transparent' : '';
  }
  const api = {
    draw(view, now) {
      if (want(view)) {
        try {
          if (!r3d) { r3d = create3DRenderer(M, Object.assign({}, o, { ctx, W, H }), () => fail(new Error('webgl context lost'))); r3d.setOccluderFade(fadeOn); r3d.setAnimLevel(animLv); r3d.setDiag(!!opts.perf); r3d.setAdaptiveDpr(adaptiveOn); }
          setActive(true);
          r3d.draw(view, now);
          if (opts.perf) perfText(now);
          return;
        } catch (err) { fail(err); }
      }
      setActive(false);
      r2d.draw(view, now);
      if (opts.perf) perfText(now);
    },
    resize(n) { ctx = n.ctx || ctx; W = n.W || W; H = n.H || H; r2d.resize(n); if (r3d) r3d.resize({ ctx, W, H }); },
    destroy() { if (r3d) r3d.destroy(); r3d = null; r2d.destroy(); },
    setAnimLevel(v) { animLv = v; if (r2d.setAnimLevel) r2d.setAnimLevel(v); if (r3d) r3d.setAnimLevel(v); },
    setDistant(v) { if (r2d.setDistant) r2d.setDistant(v); },
    project: (x, z) => (r2d.project ? r2d.project(x, z) : null),
    get spriteStats() { return r2d.spriteStats; },
    get is3D() { return active; },
    get failed() { return failed; },
    stats3d() { return r3d ? r3d.stats() : null; },
    probeNow() { return r3d && active ? r3d.probeNow() : null; },   // QA(Geometry pass HQ-2)
    frames3d() { return r3d ? r3d.frames() : 0; },
    triBreakdown() { return r3d ? r3d.triBreakdown() : null; },
    loseContext() { if (r3d) r3d.loseContext(); },   // QA: context lost の ためし
    setOccluderFade(on) { fadeOn = !!on; if (r3d) r3d.setOccluderFade(fadeOn); },   // QA: すかし あり / なし の くらべ
    setAdaptiveDpr(on) { adaptiveOn = !!on; if (r3d) r3d.setAdaptiveDpr(adaptiveOn); },   // QA: headless の しゃしんは 解像度を 固定
    get playerVisible() { const st = r3d && active ? r3d.stats() : null; return st ? st.player : { ok: true, why: '2d', missFrames: 0 }; },   // QA(v2 F1)
  };
  return api;
}

// すかす 物を えらぶ: カメラ (ex, ez) → player の 線分に、あたりの まる(+ キャラの はば)が かかる かたい 物 だけ(8 つ まで)。
// きょり・むき・大きさ では えらばない(とおい から すける こと は ない)。線分から はずれたら すぐ もとに もどる
// v2(Human QA v1 F1): 判定の 半径は あたり(幹)では なく **見た目の 半径**(oc.vr: えだはり・ひさし まで)。幹が 線分から 外れて いても
// えだはりが player を 隠す ことが ある。高さ(oc.top)が 線分の その 位置の 高さ(camH → 0)に とどかない 低い 物は すかさない
// Geometry pass(2026-10-02・Human QA AD v1 HQ-2): 候補を ぜんぶ あつめて「線分に ふかく かかる 順」(d − 半径 が 小さい 順)に 12 まで。
// 以前は 配列の 順で 8 つで 打ち切り → 密な 森 / ジャングルで ほんとうに 隠して いる 物が もれて player が 見えなく なった。
// 中心は あたりの まる(oc.ob.collision)か、あたりの ない 高い 物(ヤシ・電柱・サボテン …)は oc.c
export const OCCLUDER_MAX = 16;
export function pickOccluders(occluders, ex, ez, player, actorSize, camH) {
  const want = new Set();
  if (!player) return want;
  const vx = player.x - ex, vz = player.z - ez, L2 = vx * vx + vz * vz || 1, cand = [];
  for (const oc of occluders) {
    // 線分(カメラ → player)までの きょり。カメラの まわりの 大きな 物(がけの 中 / うしろに カメラが ある)も 入る(HQ-2: ジャングルの どうくつ)
    const c = oc.c || oc.ob.collision, t0 = ((c.x - ex) * vx + (c.z - ez) * vz) / L2, t = Math.max(0, Math.min(1, t0));
    const d = Math.hypot(c.x - ex - vx * t, c.z - ez - vz * t), R = Math.max(oc.r, oc.vr || 0) + actorSize * 0.45;
    if (d >= R) continue;
    if (camH > 0 && oc.top != null && oc.top < camH * (1 - t) * 0.5) continue;   // 線分より ずっと 低い 物(小石・切り株)は player を 隠さない
    cand.push([d - R, oc]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < cand.length && i < OCCLUDER_MAX; i++) want.add(cand[i][1]);
  return want;
}
// ghost(すかしの 半透明の かたち)の pool の 契約(v2・Human QA v1 F2)。pure: three に よらない ので Node の テストで しばる。
//   wanted: この frame に ほしい ghost の 鍵(owner:ref)の 配列。make(key) で 新しい ghost を つくる。
//   ・使う ものだけ visible。使わなかった ものは その frame で hidden。
//   ・1 frame 使われなければ scene から はずす(detach)。pool には のこして つかいまわす(上限 GHOST_POOL_MAX、こえた ぶんは dispose)
//   ・ghost ごとに owner / createdFrame / lastUsed を もつ(perf 表示 と stats3d().ghosts)
export const GHOST_POOL_MAX = 16;
export function ghostPoolStep(pool, wanted, frame, hooks) {
  const byKey = new Map(); for (const g of pool) byKey.set(g.key, g);
  const used = new Set();
  for (const key of wanted) {
    let g = byKey.get(key);
    if (!g) { g = pool.find((q) => !used.has(q) && !wanted.includes(q.key)) || null; if (g) { byKey.delete(g.key); g.key = key; byKey.set(key, g); } }
    if (!g) { g = { key, createdFrame: frame, lastUsed: frame, visible: false, attached: false }; pool.push(g); byKey.set(key, g); }
    g.lastUsed = frame; g.visible = true; used.add(g);
    if (!g.attached) { g.attached = true; if (hooks && hooks.attach) hooks.attach(g); }
    if (hooks && hooks.place) hooks.place(g, key);
  }
  for (const g of pool) {
    if (used.has(g)) continue;
    g.visible = false;
    if (g.attached && frame - g.lastUsed >= 1) { g.attached = false; if (hooks && hooks.detach) hooks.detach(g); }
  }
  while (pool.length > GHOST_POOL_MAX) { const i = pool.findIndex((q) => !used.has(q)); if (i < 0) break; const [g] = pool.splice(i, 1); if (g.attached && hooks && hooks.detach) hooks.detach(g); if (hooks && hooks.dispose) hooks.dispose(g); }
  return { visible: used.size, attached: pool.filter((g) => g.attached).length, total: pool.length };
}
// すかしの ghost の 濃さ と、線分から はずれた あと すかした まま に する frame 数(Geometry pass・HQ-1)
const LEAF_N = [7, 13, 21];
const CROWN_SHAPES = new Set(['crown', 'crownBig', 'crownSmall']);
const AUT_DARK = new THREE.Color('#9a5f28'), AUT_MID = new THREE.Color('#c8843a'), AUT_LITE = new THREE.Color('#e8a85a');   // 2D の 大木 / 公園 / 川の 木の 秋   // 2D の RENDER_TUNING.anim.counts(animLv 0 / 1 / 2。2D は どの 段でも えがく)
export const GHOST_OPACITY = 0.34, GHOST_OPACITY_BIG = 0.16, FADE_HOLD = 6;
// ray 診断の 格子(pure・three に よらない): instance の リスト(shape → [{ x, y, z, sx, sy, sz }]、three 座標)を xz の ます目に。
// rayCandidates はカメラ → player の 線分が とおる ます目の instance(shape, index)を かえす。ray で「ほんとうに 見えて いるか」を しらべる 候補
export const RAY_CELL = 160;
export function buildRayGrid(inst, skip) {
  const grid = new Map();
  for (const shape of Object.keys(inst)) {
    if (skip && skip.has(shape)) continue;
    inst[shape].forEach((it, i) => {
      const r = Math.min(400, Math.max(Math.abs(it.sx), Math.abs(it.sz)) * (shape === 'wbox' || shape === 'box' || shape === 'wslab' || shape === 'plank' ? 1.5 : 1.15) + 4);
      const x0 = Math.floor((it.x - r) / RAY_CELL), x1 = Math.floor((it.x + r) / RAY_CELL), z0 = Math.floor((it.z - r) / RAY_CELL), z1 = Math.floor((it.z + r) / RAY_CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const k = gx + ',' + gz; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push([shape, i]); }
    });
  }
  return grid;
}
export function rayCandidates(grid, ax, az, bx, bz) {
  const out = [], seen = new Set(), cells = new Set(), L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / (RAY_CELL / 2)));
  for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; cells.add(Math.floor(x / RAY_CELL) + ',' + Math.floor(z / RAY_CELL)); }
  for (const c of cells) for (const e of grid.get(c) || []) { const key = e[0] + ':' + e[1]; if (!seen.has(key)) { seen.add(key); out.push(e); } }
  return out;
}
// player の 絵が この frame で ほんとうに 見えるか(v2・F1)。座標に いる のに 描かれない 状態を 1 つの 判定に まとめる
export function billboardVisible(m, fogFar, dist) {
  if (!m || !m.visible) return { ok: false, why: 'hidden' };
  const s = m.scale; if (!(Number.isFinite(s.x) && Number.isFinite(s.y) && Math.abs(s.x) > 1 && s.y > 1)) return { ok: false, why: 'scale' };
  if (!m.material || !m.material.map) return { ok: false, why: 'texture' };
  if (m.material.fog && fogFar != null && dist != null && dist >= fogFar) return { ok: false, why: 'fog' };
  return { ok: true, why: '' };
}
// ---------------------------------------------------------------- Water v2(Human QA v1 F10): 水は いみ ごとに べつの geometry。池を ならべて 川や 海に 見せない

// ---------------------------------------------------------------- Geometry pass(2026-10-02・Human QA AD v1 HQ-5 / HQ-6): Terrain v1 と 小川 / 川 v3
// 地形は 見た目 だけ(あたり・道・spot は 2D の まま)。意味の ある 起伏: 道 / spot = 平ら、建物の 敷地 = 平ら、ひらけた ところ = ゆるい 丘 / くぼみ、
// 森 = 根の こまかい 起伏、砂丘 = 尾根、雪 = 道ばたの 土手、がけ = 足もとの もりあがり、海 / 湖 = 水へ むかって ひくく、池 = 浅い くぼ地、
// 小川 / 川 = 谷(川底 + 岸)。ランダムな こぶを 全面に まかない(hill は ひらけた ところ だけ・道から 30〜340 で 0 → 1)
export const TERRAIN_CELL = 80;
export const STREAM_WATER_Y = { creek: -9, river: -11, ditch: -5 }, BRIDGE_DECK_Y = 6;   // 橋の 床の 上面(meguru.js の BRIDGE_DECK と おなじ)
function vnoise(seed) {
  const hh = (ix, iz) => { let n = (ix * 374761393 + iz * 668265263 + seed * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295 * 2 - 1; };
  return (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz), a = hh(ix, iz), b = hh(ix + 1, iz), c = hh(ix, iz + 1), d = hh(ix + 1, iz + 1); return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz; };
}
const smoothT = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 小川 / 川の 断面(中心からの きょり d、はば w): 岸の 上(地面)→ 岸の ふち → 土の 斜面 → 砂利 → 川底。null = 帯の そと
export const STREAM_BED = [[1, 75, 'g'], [1, 35, 0.6], [1, 8, -6], [0.6, 0, -13], [0, 0, -17]];
export function streamBedY(d, w, river, ditch) {
  const k = river ? 1.35 : ditch ? 0.55 : 1, pts = STREAM_BED.map(([a, b, y]) => [a * w + b, y === 'g' ? 0.3 : y * k]);
  if (d >= pts[0][0]) return null;
  for (let i = 0; i < pts.length - 1; i++) { const [d0, y0] = pts[i], [d1, y1] = pts[i + 1]; if (d <= d0 && d >= d1) return y1 + (y0 - y1) * (d - d1) / ((d0 - d1) || 1); }
  return pts[pts.length - 1][1];
}
// 帯の データ(はばが 点ごとに かわる): pts = [{ x, z, w }]、lanes = [{ a, b, y | 'g', c }](左 −、右 +。o = s × (a × w + b))。groundAt(x, z) で 'g' の 高さ
export function streamStripData(pts, lanes, groundAt) {
  const fr = polylineFrames(pts.map((p) => [p.x, p.z])), pos = [], col = [], uv = [], idx = [], Ln = lanes.length;
  fr.forEach((f, i) => {
    const w = pts[i].w;
    lanes.forEach((ln, j) => { const edge = (ln.edgeVariation || 0) * (Math.sin(f.x * 0.018 + f.z * 0.013 + ln.s) * 0.6 + Math.sin(f.s * 0.039 + ln.s * 2) * 0.4); const o = ln.s * (ln.a * w + ln.b + edge), x = f.x + f.nx * o, z = f.z + f.nz * o, y = ln.y === 'g' ? (groundAt ? groundAt(x, z) : 0) + 0.4 : ln.y; pos.push(x, y, -z); col.push(ln.c[0], ln.c[1], ln.c[2]); uv.push(j / Math.max(1, Ln - 1), f.s / 400); });
  });
  for (let i = 0; i < fr.length - 1; i++) for (let j = 0; j < Ln - 1; j++) { const a = i * Ln + j, b = a + 1, c = a + Ln, d = c + 1; idx.push(a, c, b, b, c, d); }
  return { positions: new Float32Array(pos), colors: new Float32Array(col), uvs: new Float32Array(uv), index: idx };
}
// 地形の 格子(world 座標・TERRAIN_CELL ごと)。h = 高さ、shade = 頂点の いろの 明暗、sample(x, z) = 双線形、surfaceY = 物を おく 高さ(小川の 帯では 断面)
export function terrainGrid(world, M, objects) {
  const prof = (M.REGION3D && M.REGION3D[world.regionId]) || {}, R = prof.relief || {};
  const lo = world.minX != null ? world.minX : -world.halfW, hi = world.maxX != null ? world.maxX : world.halfW, pad = 400, cell = TERRAIN_CELL;
  const x0 = lo - pad, z0 = -pad, nx = Math.ceil((hi + pad - x0) / cell), nz = Math.ceil((world.len + 2 * pad) / cell);
  const H = new Float32Array((nx + 1) * (nz + 1)), S = new Float32Array((nx + 1) * (nz + 1)), wet = new Float32Array((nx + 1) * (nz + 1)), AR = new Float32Array((nx + 1) * (nz + 1));
  const areas = world.areas || [];   // 地面の まだら(したくさ・砂利 など)= 頂点の いろ(平らな 円盤を 地形の 上に うかべない)
  let seed = 0; for (const ch of String(world.regionId)) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const n1 = vnoise(seed), n2 = vnoise(seed + 7);
  const segs = world.segments || [], spots = world.spots || [], T = world.terrain;
  const streams = M.streams3d ? M.streams3d(world) : [], gullies = world._gullies3d || [];
  const crossings = []; for (const st of streams) for (const c of st.crossings) crossings.push(c);
  const anchorIds = new Set(); for (const st of streams) for (const nd of st.nodes || []) if (nd.spot) anchorIds.add(nd.spot.id);
  const ownPool = new Set((objects || []).filter((ob) => ob.spot && ob.parts && ob.parts.some((pt) => pt.shape === 'pool')).map((ob) => ob.spot));   // たきつぼ を もつ spot は たきの 物が 水を もつ
  const ponds = spots.filter((q) => q.kind === 'water' && !anchorIds.has(q.id) && !ownPool.has(q.id) && !pondCovered(world, q, (w, z) => (M.shoreX ? M.shoreX(w, z) : null)));
  const flat = (objects || []).filter((o) => /^(house|tower|temple|wall|dome|tent|lm_)/.test(o.type)).map((o) => ({ x: o.x, z: o.z, r: o.collision ? Math.max(o.collision.hw, o.collision.hd) : o.halfW * 0.5 }));
  const cliffs = R.cliffFoot ? (objects || []).filter((o) => o.type === 'rockwall' || o.type === 'ledge').map((o) => ({ x: o.x, z: o.z, r: o.collision ? Math.max(o.collision.hw, o.collision.hd) : 60 })) : [];
  const segD = (x, z) => { let best = Infinity; for (const s of segs) { const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / L2)), d = Math.hypot(x - s.a.x - dx * t, z - s.a.z - dz * t) - s.half; if (d < best) best = d; } return best; };
  const sDist = (x, z) => { let best = { d: Infinity, w: 0, river: false, ditch: false }; for (const st of streams) for (let i = 0; i < st.pts.length - 1; i++) { const a = st.pts[i], b = st.pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)), d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t); if (d < best.d) best = { d, w: a.w + (b.w - a.w) * t, river: st.kind === 'river', ditch: st.kind === 'ditch' }; } return best; };
  // 水の spot(小川 / 川の 上の よどみ・浅瀬)と 交わりの まわりは 道の 上でも 掘る(道は 水へ 入る / 橋・飛び石が わたす)
  const wetSpots = spots.filter((q) => q.kind === 'water' && sDist(q.x, q.z).d < q.r);
  const nearCross = (x, z) => crossings.some((c) => Math.hypot(c.x - x, c.z - z) < c.w * 2 + 120) || wetSpots.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 40);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * cell, z = z0 + j * cell, k = j * (nx + 1) + i;
    const dp = segD(x, z); let ds = Infinity; for (const q of spots) if (q.kind !== 'water') ds = Math.min(ds, Math.hypot(q.x - x, q.z - z) - q.r);
    const walk = Math.min(dp, ds), edge = smoothT(-200, 300, Math.min(x - lo, hi - x, z, world.len - z));
    let plot = 1;   // 建物の 敷地は 平ら(丘 だけで なく 根の 起伏・土手・浜の もりあがり・がけの 足もと も。2026-10-02 監査: 浜の 家の はしが 18 浮いた)
    for (const f of flat) { const d = Math.hypot(f.x - x, f.z - z); if (d < f.r + 220) plot *= smoothT(f.r + 30, f.r + 200, d); }
    const open = smoothT(30, 340, walk) * edge * plot;
    let h = 0;
    if (R.hill) h += R.hill * (n1(x / (R.wave || 900), z / (R.wave || 900)) * 0.75 + n2(x / ((R.wave || 900) * 0.45), z / ((R.wave || 900) * 0.45)) * 0.25) * open;
    if (R.root) h += R.root * n2(x / 110, z / 110) * smoothT(20, 120, walk) * edge * plot;
    if (R.dune) { const r = Math.abs(Math.sin((x * 0.8 + z * 0.6) / 420 + n1(x / 900, z / 900) * 2)); h += R.dune * (r * r - 0.3) * open; }
    if (R.bank && dp > 0) h += R.bank * Math.exp(-((dp - 140) ** 2) / (2 * 50 * 50)) * edge * plot;   // 道ばたの 土手(道の へりから すこし はなれて)
    for (const c of cliffs) { const d = Math.hypot(c.x - x, c.z - z) - c.r; if (d < 260) h += R.cliffFoot * Math.exp(-((d - 30) ** 2) / (2 * 70 * 70)) * smoothT(0, 60, walk) * plot; }
    if (T && T.kind === 'coast' && M.shoreX) { const sx = M.shoreX(world, z); if (sx != null) { const di = (T.side || -1) < 0 ? x - sx : sx - x; h = di < 0 ? -30 * Math.min(1, -di / 250) : h * smoothT(80, 600, di) + (R.beach ? 12 : 0) * smoothT(150, 900, di) * (0.7 + 0.3 * n1(x / 500, z / 500)) * edge * plot; } }
    let wv = 0;
    for (const q of ponds) { const d = Math.hypot(q.x - x, q.z - z) / q.r; if (d < 1.4) { h = Math.min(h * smoothT(0.9, 1.4, d), -14 * (1 - smoothT(0.5, 1.15, d))); wv = Math.max(wv, 1 - smoothT(0.9, 1.5, d)); } }
    const sd = sDist(x, z);
    if (sd.d < sd.w + 95) {
      const depth = sd.river ? 32 : sd.ditch ? 13 : 24, kk = (1 - smoothT(sd.w + 20, sd.w + 95, sd.d)) * (nearCross(x, z) ? 1 : smoothT(-10, 40, dp));
      h = h * (1 - kk) - depth * kk;
    }
    if (sd.d < sd.w + 160) wv = Math.max(wv, 1 - smoothT(sd.w + 40, sd.w + 160, sd.d));
    for (const g of gullies) { const ux = Math.sin(g.streamAng), uz = Math.cos(g.streamAng), t = Math.max(-210, Math.min(210, (x - g.x) * ux + (z - g.z) * uz)), d = Math.hypot(x - g.x - ux * t, z - g.z - uz * t); if (d < 130) h = Math.min(h, -16 * (1 - smoothT(30, 130, d)) * (1 - smoothT(150, 210, Math.abs(t)))); }
    if (T && T.kind === 'chasm' && T.pts) { const d = distToPolyline(T.pts, x, z), half = T.half || 230; if (d < half + 60) h = Math.min(h, -40 * (1 - smoothT(half - 40, half + 60, d))); }
    if (h > 0 && walk < 130) h *= smoothT(40, 130, walk);   // 格子(80)の 三角形が 道の へりを こえない はば   // 道 / spot の ふちでは 地面を 道の 面より 上げない(道の へりが ぎざぎざに うまらない)
    let ar = 0; for (const a of areas) { const ca = Math.cos(a.ang || 0), sa = Math.sin(a.ang || 0), lx = (x - a.x) * ca - (z - a.z) * sa, lz = (x - a.x) * sa + (z - a.z) * ca, e = (lx / (a.w / 2)) ** 2 + (lz / (a.h / 2)) ** 2; if (e < 1.3) ar = Math.max(ar, 1 - smoothT(0.6, 1.3, e)); }
    H[k] = h; wet[k] = wv; AR[k] = ar;
    S[k] = 1 + Math.max(-0.22, Math.min(0.12, h / 70)) + n2(x / 60, z / 60) * 0.04;
  }
  const sample = (x, z) => { const fx = Math.max(0, Math.min(nx - 1e-6, (x - x0) / cell)), fz = Math.max(0, Math.min(nz - 1e-6, (z - z0) / cell)), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * (nx + 1) + i; return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + nx + 1] * (1 - u) * v + H[k + nx + 2] * u * v; };
  const surfaceY = (x, z) => { const g = sample(x, z), sd = sDist(x, z), b = sd.d < sd.w + 75 ? streamBedY(sd.d, sd.w, sd.river, sd.ditch) : null; return b == null ? g : Math.max(g, b); };
  // キャラの 足もと: 道 / spot の 上は 0(橋の 上は 床の 高さ)、そと は 地形(池 / 小川の 中では 水面 ちかく まで)
  const decks = crossings.filter((c) => c.kind === 'bridge').concat(gullies);
  const walkY = (x, z) => {
    if (segD(x, z) < 6 || spots.some((q) => q.kind !== 'water' && Math.hypot(q.x - x, q.z - z) < q.r)) {
      for (const c of decks) if (Math.hypot(c.x - x, c.z - z) < (c.w + 30) / Math.max(0.45, Math.abs(Math.sin(c.pathAng - c.streamAng))) + 20) return BRIDGE_DECK_Y;
      const sd = sDist(x, z); if (sd.d < sd.w * 0.9) return STREAM_WATER_Y[sd.river ? 'river' : sd.ditch ? 'ditch' : 'creek'] + 3;   // 水の 中の 道: 水面 ちかく(あさせを あるく)
      for (const q of ponds) if (Math.hypot(q.x - x, q.z - z) < q.r * 0.85) return -2;   // 池の 中(2D で 水の spot へ 入る): 水面(−4)ちかく
      return 0;
    }
    return Math.max(surfaceY(x, z), -5);
  };
  return { x0, z0, cell, nx, nz, H, S, wet, AR, sample, surfaceY, walkY, segD, sDist, crossings, ponds, anchorIds, streams, wetSpots };
}
// 接地(2026-10-02・Geometry 監査): 物の 中心の 高さ だけで すわらせると、斜面で 岩 / 盛り土 / 大木の 根 / 岸の 花の はしが 浮く(山 95・砂漠 35)。
//   構造物(家・遺跡・柵 …)= 足もとの いちばん ひくい 所まで 物ごと しずめる(30 まで。屋根と からだが ずれない)。
//   それ以外 = 地面に つく parts(y ≤ 2)ごとに その 足もとの いちばん ひくい 所へ(厚みの 0.6 まで しずめる。坂の 上がわは 地面に うまる = 地面から 生えて 見える)。
//   y > 2 の parts(かんむり・屋根)は 物の 高さの まま。橋 / 飛び石は 水面 と 道の 高さ が 基準(ここでは あつかわない)
export const GROUND_SHAPES = new Set(['trunk', 'rock', 'stone', 'stump', 'box', 'mound', 'post', 'wpost', 'wstem', 'stem', 'blade', 'flower', 'pebble', 'cliff', 'log', 'wcone', 'wslab', 'slab', 'plank', 'dome', 'leaf', 'decal', 'nut', 'billboard', 'moss', 'wblade']);
export const STRUCT_RE = /^(house|tower|temple|wall|dome|tent|lm_|hull|pier|ruin|bench|gate|torii|fountain|statue|obelisk|pillar|signal|lamp|signpost|ferris|wheel|slide|parasol|telescope|orrery|boat|car|bike|hotspring|fence|vent|neon|pot|boxprop)/;
export const STRUCT_SINK_MAX = 30, PART_SINK_K = 0.6;
export const LOOSE_SHAPES = new Set(['pebble', 'mound', 'flower', 'blade', 'stone', 'leaf', 'decal', 'nut', 'billboard', 'wblade']);
export function partFootprint(pt) { return Math.min(120, Math.max(pt.r || 0, pt.rx || 0, pt.rz || 0, (pt.len || 0) / 2) * 0.8); }
export function footprintMin(surfaceY, x, z, rr) {
  let lo = surfaceY(x, z);
  if (rr > 12) for (const [sx, sz] of [[rr, 0], [-rr, 0], [0, rr], [0, -rr]]) lo = Math.min(lo, surfaceY(x + sx, z + sz));
  return lo;
}
export function objectGround(terr, ob) {
  if (!terr || ob.type === 'bridge' || ob.type === 'ford') return { base: 0, part: null };
  const sy = terr.surfaceY, base = sy(ob.x, ob.z), parts = ob.parts || [];
  const grounded = (pt) => GROUND_SHAPES.has(pt.shape) && (pt.y || 0) <= 2;
  const own = (pt) => {
    const x = ob.x + (pt.dx || 0), z = ob.z + (pt.dz || 0), c = (pt.dx || pt.dz) ? sy(x, z) : base, thick = pt.h || (pt.r ? pt.r * 2 : 10);
    return Math.max(c - thick * PART_SINK_K, footprintMin(sy, x, z, partFootprint(pt)));
  };
  if (STRUCT_RE.test(ob.type)) {
    // 構造物の まわりの 石 / 盛り土 / 花(つみ上げない 物)は parts ごと(遺跡の がれきが 坂の 上で うまらない)
    let lo = base;
    for (const pt of parts) if (grounded(pt) && !LOOSE_SHAPES.has(pt.shape)) lo = Math.min(lo, footprintMin(sy, ob.x + (pt.dx || 0), ob.z + (pt.dz || 0), partFootprint(pt)));
    const sb = Math.max(base - STRUCT_SINK_MAX, lo);
    return { base: sb, part: (pt) => (grounded(pt) && LOOSE_SHAPES.has(pt.shape) ? own(pt) : sb) };
  }
  return { base, part: (pt) => {
    if (!grounded(pt)) return base;
    return own(pt);
  } };
}
// 折れ線の frame: 点ごとの いち と 単位 法線(せかいの x/z。法線は 進行方向の 右)
export function polylineFrames(pts, ks) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    out.push({ x: pts[i][0], z: pts[i][1], nx: tz, nz: -tx, s: i ? out[i - 1].s + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : 0, k: ks ? ks[i] : 1 });
  }
  return out;
}
// Art Direction v1(水の 統合): 川の 折れ線を なめらかに(Catmull-Rom を 直線と まぜる・区間 sub 分割)し、はばの ゆらぎ k(0.62〜0.9)を つける(pure)。
// あたり(2D の 岸の clamp)は 元の 直線の 帯(half)の まま。見た目の 水は つねに その 内がわ(k ≤ 0.9・曲線の ふくらみは 直線 40% まぜで 小さい)なので 水の 上を あるかない
export function riverCurve(pts, opts = {}) {
  const sub = opts.sub || 3, mix = opts.mix != null ? opts.mix : 0.6, n = pts.length, out = [], k = [];
  const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < sub; j++) {
      const t = j / sub, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const sx = p1[0] + (p2[0] - p1[0]) * t, sz = p1[1] + (p2[1] - p1[1]) * t;
      out.push([sx + (cr(p0[0], p1[0], p2[0], p3[0]) - sx) * mix, sz + (cr(p0[1], p1[1], p2[1], p3[1]) - sz) * mix]);
      const u = i + t; k.push(Math.max(0.62, Math.min(0.9, 0.76 + 0.11 * Math.sin(u * 2.1 + 0.7) + 0.05 * Math.sin(u * 5.3 + 1.9))));
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]); k.push(0.78);
  return { pts: out, k };
}
// 帯(strip)の データ: frame × lane の 頂点を 1 まいに。lane = { o: 法線方向の ずれ, y: 高さ, c: [r,g,b], a?: alpha }。
// となりの frame / lane と 頂点を 共有する ので「途切れない 1 まいの 面」に なる(池の ならび では ない)。
// uv: u = lane の わりあい、v = 道のり / 400(ながれの アニメ 用)。せかい (x, z) → three (x, y, -z)
export function stripGeometryData(frames, lanes, opts = {}) {
  const F = frames.length, Ln = lanes.length, pos = [], col = [], uv = [], idx = [];
  const along = opts.along || null;   // lane の ずれを 法線 では なく 固定の 向き(うみ: 岸から 沖へ x 方向)に する
  for (let i = 0; i < F; i++) {
    const f = frames[i];
    for (let j = 0; j < Ln; j++) {
      const kk = opts.vary ? (f.k || 1) : 1, ln = lanes[j], ox = along ? along[0] * ln.o : f.nx * ln.o * kk, oz = along ? along[1] * ln.o : f.nz * ln.o * kk;   // vary: frame ごとの はばの ゆらぎ(川)
      pos.push(f.x + ox, ln.y, -(f.z + oz)); col.push(ln.c[0], ln.c[1], ln.c[2]); uv.push(j / Math.max(1, Ln - 1), f.s / 400);
    }
  }
  for (let i = 0; i < F - 1; i++) for (let j = 0; j < Ln - 1; j++) {
    const a = i * Ln + j, b = a + 1, c = a + Ln, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col), uvs: new Float32Array(uv), index: idx, frames: F, lanes: Ln };
}
// 池 / 湖: でこぼこの 閉じた かたち(seed で きまる)。中心 = ふかい いろ、ふち = あさい いろ(vertex color)。まとめて 1 まいに
export function discFanData(discs, segs = 28) {
  const pos = [], col = [], idx = [];
  for (const d of discs) {
    const base = pos.length / 3, amp = d.amp == null ? 0.12 : d.amp;
    pos.push(d.x, d.y, -d.z); col.push(d.deep[0], d.deep[1], d.deep[2]);
    for (let k = 0; k < segs; k++) {
      const a = k / segs * TAU + (d.rot || 0), w = 1 + amp * (hash01(d.seed + ':' + k) - 0.5) * 2 + amp * 0.5 * (hash01(d.seed + ':w' + (k >> 1)) - 0.5);
      pos.push(d.x + Math.cos(a) * d.rx * w, d.y, -(d.z + Math.sin(a) * d.rz * w)); col.push(d.edge[0], d.edge[1], d.edge[2]);
    }
    for (let k = 0; k < segs; k++) idx.push(base, base + 1 + ((k + 1) % segs), base + 1 + k);
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col), index: idx, count: discs.length };
}
// 点から 折れ線 までの きょり(川の 帯に かくれる 池を おかない)
export function distToPolyline(pts, x, z) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// この 池(water の spot)は 大きな 水(川の 帯 / 海・湖の 面)に かくれるか。かくれる 池は おかない(池の ならび 禁止)
export function pondCovered(world, q, shoreXAt) {
  const t = world.terrain; if (!t) return false;
  if (q.r >= 280) return false;   // 湖(大きな 水)は 川が そそいで いても じぶんの 面を もつ(川の 帯の 上に のる)
  if ((t.kind === 'river' || t.kind === 'chasm') && t.pts) return distToPolyline(t.pts, q.x, q.z) < (t.half || 200) + q.r * 0.6;
  if (t.kind === 'coast' && shoreXAt) { const sx = shoreXAt(world, q.z); if (sx == null) return false; return (t.side || -1) < 0 ? q.x - q.r * 0.3 < sx : q.x + q.r * 0.3 > sx; }
  return false;
}
const WATER_DEFAULT = { deep: '#2f6f98', shallow: '#79bcd6', bank: null, foam: '#f4fbff' };
function rgbOf(hex) { const c = hex instanceof THREE.Color ? hex : new THREE.Color(hex); return [c.r, c.g, c.b]; }
// ---------------------------------------------------------------- 3D レンダラー
function hash01(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
const LITTER = new Set(['🍂', '🍃', '🍁', '🌰', '🌱']);
// Art Direction v1: 葉の いろ = 地域の palette(instance color・明 / 中 / 暗 の 3 段)× 季節の tint(material。夏 = そのまま)
const SEASON_CROWN = { spring: '#e6ffd6', summer: '#ffffff', autumn: '#f6c47c', winter: '#cfdcd2' };
const SEASON_CONIFER = { spring: '#dcf2e0', summer: '#ffffff', autumn: '#e6f0e2', winter: '#d2dedb' };
const FOLIAGE_DEFAULT = { crown: ['#4a9a44', '#5fb353', '#82cc62'], conifer: ['#2f6b3f', '#3b7f4a', '#4f9a5a'] };
const shadeOf = (list, k) => list[Math.max(0, Math.min(list.length - 1, k == null ? 1 : k))];

function create3DRenderer(M, o, onLost) {
  const canvas2d = o.canvas;
  const doc = canvas2d.ownerDocument || document;
  const gl = doc.createElement('canvas');
  gl.className = 'meguru-3d-canvas';
  const parent = canvas2d.parentNode;
  parent.insertBefore(gl, canvas2d);
  const place = () => {
    // 2D の canvas と ぴったり かさねる(2D は うえで 名まえ・ふきだし だけ えがく)
    Object.assign(gl.style, { position: 'absolute', left: canvas2d.offsetLeft + 'px', top: canvas2d.offsetTop + 'px', width: canvas2d.offsetWidth + 'px', height: canvas2d.offsetHeight + 'px', pointerEvents: 'none' });
    if (parent.style && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    canvas2d.style.position = 'relative'; canvas2d.style.zIndex = '1';
  };
  let lost = false;
  gl.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; onLost(); }, false);
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  // 残像(まえの frame が のこる)を ふせぐ きまり: canvas は 不透明(alpha: false)・drawing buffer は のこさない・まい frame いろ と depth を けす。
  // すかしの ghost は frame ごとに visible を 入れなおし、hidden の 物は 線分から はずれた frame で もとに もどす(fadeOccluders)
  renderer.autoClear = true; renderer.autoClearColor = true; renderer.autoClearDepth = true; renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2));
  let ctx = o.ctx, W = o.W, H = o.H;
  renderer.setSize(W, H, false);
  place();

  const camera = new THREE.PerspectiveCamera(50, 1, 20, 12000);   // 遠 12000: 海の 面は 水平線(きりの むこう)まで。きりが 遠い 地域でも 面の はしが 見えない
  camera.rotation.order = 'YXZ';
  const texCache = new Map();
  let sceneOf = null, scene = null, built = null;
  const tmp = new THREE.Object3D(), col = new THREE.Color(), FOGC = new THREE.Color(), TMPC = new THREE.Color();   // まい frame の いろは つかいまわす(GC で カクつかない)

  function canvasTexture(c) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
    return t;
  }
  // 絵文字(けしき / キャラの 絵文字イラスト)→ texture。いちど つくって つかいまわす
  // 絵(イラスト / アトラス)が あとから よみこまれると glyphSprite は ちがう canvas を かえす。そのときは 絵を さしかえる
  const glyphs = [];
  function glyphTexture(emoji, wrap, ns) {
    const key = 'g:' + ns + ':' + emoji;
    if (texCache.has(key)) return texCache.get(key);
    const c = M.glyphSprite(emoji, 128, wrap, ns);
    const t = c ? { tex: canvasTexture(c), aspect: c.width / c.height, pad: 2 / c.height, src: c, emoji, wrap, ns } : null;
    texCache.set(key, t);
    if (t) glyphs.push(t);
    return t;
  }
  function refreshGlyphs() {
    for (const t of glyphs) {
      const c = M.glyphSprite(t.emoji, 128, t.wrap, t.ns);
      if (c && c !== t.src) { t.src = c; t.tex.image = c; t.tex.needsUpdate = true; }
    }
  }
  // キャラの PNG(読みこみ前は 絵文字で まつ。読めたら さしかえる)
  function actorTexture(a) {
    const s = M.spriteFor(a, 'front');
    const asset = s && s.asset;
    if (asset) {
      const key = 'a:' + asset;
      if (texCache.has(key)) return texCache.get(key);
      const im = M.imageFor(asset);
      if (im) { const t = { tex: new THREE.Texture(im), aspect: im.naturalWidth / im.naturalHeight, pad: 0 }; t.tex.colorSpace = THREE.SRGBColorSpace; t.tex.needsUpdate = true; texCache.set(key, t); return t; }
    }
    return glyphTexture(a.emoji || '🐾', o.wrapCtx || null, 'c');
  }

  function skyTexture(top, bottom) {
    const c = doc.createElement('canvas'); c.width = 2; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, top); gr.addColorStop(0.62, bottom); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 128);
    return canvasTexture(c);
  }
  // 水の 面: まんなか ふかく(こい)・ふち あさく(うすい)+ うすい 波の すじ。池・たきつぼ で 1 まい
  function waterTexture() {
    const c = doc.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, '#2f6f98'); gr.addColorStop(0.6, '#4a93bb'); gr.addColorStop(0.9, '#79bcd6'); gr.addColorStop(1, '#a9d8e4');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { const r = 14 + hash01('wr' + i) * 40, a0 = hash01('wa' + i) * TAU; g.beginPath(); g.arc(64, 64, r, a0, a0 + 0.5 + hash01('wl' + i) * 0.7); g.stroke(); }
    return canvasTexture(c);
  }
  // 昆布の は(Kit v2): たて 6 だんの 帯。横に ゆれる sine の 曲がり・先ほそり(幹 や 柱に 見えない)。両面。1 まいを 高さ h・幅 w に scale する
  function kelpBladeGeometry() {
    const N = 6, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const t = i / N, w = 0.5 * (1 - t * 0.55), sx = Math.sin(t * Math.PI * 1.6) * 0.35; pos.push(sx - w, t, 0, sx + w, t, 0); uv.push(0, t, 1, t); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.translate(0, -0.5, 0);
    return g;
  }
  // ヤシ / シダの は(Art Direction v1): 根もとから 先へ のびる 平らな は。先へ ほそり、たれる(y が さがる)。両面。x 方向に 長さ 1・幅 1 を scale する
  function frondGeometry() {
    const N = 4, pos = [], idx = [];   // Geometry pass(予算): 6 → 4 だん(12 → 8 三角形)。シダ / ヤシの は は 数千まい
    for (let i = 0; i <= N; i++) { const t = i / N, w = 0.5 * Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.9 + 0.05, y = -t * t; pos.push(t, y, -w, t, y, w); }
    for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // 波の すじ(Water v2): 白地に うすい すじ。vertex color(あさい / ふかい)に かける。くりかえし・ずらして ながす
  function waveTexture() {
    const c = doc.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#f4f8fb'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 18; i++) { const y = hash01('wy' + i) * 128, x = hash01('wx' + i) * 128, L = 20 + hash01('wl' + i) * 50; g.strokeStyle = i % 3 ? 'rgba(255,255,255,0.9)' : 'rgba(120,160,190,0.35)'; g.lineWidth = 1.5 + hash01('ww' + i) * 2; g.beginPath(); g.moveTo(x - L / 2, y); g.quadraticCurveTo(x, y - 6 + hash01('wc' + i) * 12, x + L / 2, y); g.stroke(); }
    const t = canvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  // キノコの かさ: 地の いろ + 白い てん
  function capTexture(base) {
    const c = doc.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(hash01('mx' + i) * 64, hash01('my' + i) * 40 + 2, 3 + hash01('mr' + i) * 4, 0, TAU); g.fill(); }
    return canvasTexture(c);
  }
  // 岩の かたまり(mound): 半分 うまった だ円。頂点を 内がわへ すこし ずらして ごつごつ(あたりの まる の そとへ 出ない)
  function ruggedMound() {
    const g0 = new THREE.IcosahedronGeometry(1, 1), pos = g0.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), k = 1 - 0.12 * hash01(Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000)); pos.setXYZ(i, x * k, y * k, z * k); }
    // Geometry pass(予算): 地面の 下に うまる 三角形(3 頂点とも y < −0.15)は つくらない(80 → 約 45)
    const keepTri = []; for (let f = 0; f < pos.count; f += 3) if (!(pos.getY(f) < -0.15 && pos.getY(f + 1) < -0.15 && pos.getY(f + 2) < -0.15)) for (let k = 0; k < 3; k++) keepTri.push(pos.getX(f + k), pos.getY(f + k), pos.getZ(f + k));
    g0.dispose();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(keepTri, 3)); g.computeVertexNormals();
    return g;
  }
  // ぬれた 地面: まんなか くらく、ふちへ すける(たきつぼ の まわり・ながれ の まわり)
  function wetTexture(ground) {
    const c = doc.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 8, 64, 64, 64), col = new THREE.Color(ground).multiplyScalar(0.55);
    const rgb = Math.round(col.r * 255) + ',' + Math.round(col.g * 255) + ',' + Math.round(col.b * 255);
    gr.addColorStop(0, 'rgba(' + rgb + ',0.7)'); gr.addColorStop(0.55, 'rgba(' + rgb + ',0.45)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return canvasTexture(c);
  }
  // おちる 水: たての すじ(うすい / こい)。v を ずらして ながれて 見せる
  function fallTexture() {
    const c = doc.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = 'rgba(214,236,248,0.78)'; g.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 26; i++) { const x = hash01('fx' + i) * 64, y = hash01('fy' + i) * 128; g.fillStyle = i % 3 ? 'rgba(255,255,255,0.75)' : 'rgba(150,196,222,0.55)'; g.fillRect(x, y, 1.5 + hash01('fw' + i) * 3, 20 + hash01('fh' + i) * 50); g.fillRect(x, y - 128, 1.5 + hash01('fw' + i) * 3, 20 + hash01('fh' + i) * 50); }
    const edge = g.createLinearGradient(0, 0, 64, 0); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(0.12, 'rgba(0,0,0,1)'); edge.addColorStop(0.88, 'rgba(0,0,0,1)'); edge.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = edge; g.fillRect(0, 0, 64, 128);
    const t = canvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 2);
    return t;
  }
  // がけの 面: よこの 地層(あかるい / くらい おび)と たての ひび。1 まいを くりかえす
  function cliffTexture() {
    const c = doc.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d'); g.fillStyle = '#b9b7ae'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 12; i++) { const y = hash01('cy' + i) * 128, hh = 4 + hash01('ch' + i) * 12; g.fillStyle = i % 2 ? 'rgba(80,82,76,0.16)' : 'rgba(225,222,212,0.22)'; g.fillRect(0, y, 128, hh); g.fillRect(0, y - 128, 128, hh); }
    g.strokeStyle = 'rgba(70,72,66,0.28)'; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const x = hash01('cx' + i) * 128, y = hash01('cyy' + i) * 128; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash01('cdx' + i) - 0.5) * 14, y + 18 + hash01('cl' + i) * 40); g.stroke(); }
    const t = canvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  // がけ: 箱の 頂点を 内がわへ だけ すこし ずらす(ごつごつ。あたりの 箱の そとへは 出ない)。上の ふちは すこし でこぼこ(下は 地面の まま)
  function ruggedBox() {
    const g = new THREE.BoxGeometry(2, 1, 2, 4, 3, 2), pos = g.attributes.position, uv = g.attributes.uv;   // Geometry pass(予算): 208 → 104 三角形
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), key = Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000);
      const k = 1 - 0.1 * hash01(key), dy = y > 0.49 ? -0.06 * hash01('t' + Math.round(x * 1000) + ',' + Math.round(z * 1000)) : 0;
      pos.setXYZ(i, x * k, y + dy, z * k);
      uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * 1.0);   // 地層は 高さ 1 ぶんで 1 まい
    }
    g.computeVertexNormals();
    return g;
  }
  // ---------------- せかい(1 world に 1 かい だけ 組む)
  function buildWorldScene(world) {
    const sc = new THREE.Scene();
    const { objects } = M.worldObjects3d(world);
    const prof0 = (M.REGION3D && M.REGION3D[world.corridor ? world.chartFrom : world.regionId]) || null;
    const lo = world.minX != null ? world.minX : -world.halfW, hi = world.maxX != null ? world.maxX : world.halfW;
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const contactCanvas = doc.createElement('canvas'); contactCanvas.width = contactCanvas.height = 1024;
    const contactCtx = contactCanvas.getContext('2d'), contactBounds = new THREE.Vector4(lo - 400, -400, hi - lo + 800, world.len + 800);
    contactCtx.fillStyle = '#ffffff'; contactCtx.fillRect(0, 0, 1024, 1024);
    contactCtx.scale(1024 / contactBounds.z, 1024 / contactBounds.w);
    for (const p of contactFootprints(objects)) {
      contactCtx.save(); contactCtx.translate(p.x - contactBounds.x, p.z - contactBounds.y);
      contactCtx.rotate(Math.PI / 2 - p.angle); contactCtx.scale(p.rx, p.rz);
      const fade = contactCtx.createRadialGradient(0, 0, 0.12, 0, 0, 1);
      fade.addColorStop(0, 'rgba(0,0,0,' + p.strength + ')');
      fade.addColorStop(0.4, 'rgba(0,0,0,' + p.strength * 0.65 + ')'); fade.addColorStop(1, 'rgba(0,0,0,0)');
      contactCtx.fillStyle = fade; contactCtx.fillRect(-1, -1, 2, 2); contactCtx.restore();
    }
    const contactTex = keep(new THREE.CanvasTexture(contactCanvas)); contactTex.flipY = false;
    contactTex.generateMipmaps = false; contactTex.minFilter = THREE.LinearFilter;
    const groundedMaterial = (mat) => contactMaterial(mat, contactTex, contactBounds);
    // 地面: ground の 2 色で まだらに(のっぺり しない。1 まいの 小さな texture を くりかえす)。
    // corridor では 地面の いろが すすみぐあいで かわる(world.setProgress)ので、いろの 鍵が かわった frame で 描きなおす(refreshGround)
    const gc = doc.createElement('canvas'); gc.width = gc.height = 128;
    let groundOverride = null;   // 季節の 地面の いろ(山: 夏は 高原の みどり、冬は 雪)
    const paintGround = () => {
      // Art Direction v1: 3D だけ 地面の いろを 地域の profile(ground3d)で さしかえられる(まちの アスファルトを 明るい 灰に。2D は かわらない)
      const g3 = groundOverride || (!world.corridor && prof0 && prof0.ground3d) || world.ground;
      const gg = gc.getContext('2d'); gg.globalAlpha = 1; gg.fillStyle = g3[0]; gg.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { gg.fillStyle = i % 3 ? g3[1] : g3[0]; gg.globalAlpha = 0.18; gg.beginPath(); gg.arc(hash01('gx' + i) * 128, hash01('gz' + i) * 128, 6 + hash01('gr' + i) * 14, 0, TAU); gg.fill(); }
    };
    paintGround();
    const gt = keep(canvasTexture(gc)); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set((hi - lo + 4000) / 420, (world.len + 4000) / 420);
    // Terrain v1(Geometry pass): 地域の なかは 起伏の ある 格子(頂点の いろ = 明暗・水辺の 土)。そとの ひろい 面は ひくく(−3)おいて 地平まで
    const terr = world.corridor ? null : terrainGrid(world, M, objects);
    const groundMat = keep(groundedMaterial(new THREE.MeshLambertMaterial({ map: gt })));
    if (!terr) {
      const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(hi - lo + 4000, world.len + 4000)), groundMat);
      ground.rotation.x = -Math.PI / 2; ground.position.set((lo + hi) / 2, 0, -world.len / 2);
      sc.add(ground);
    } else {
      // 地形の 格子の そとは 平らな わく(4 まい)。格子の 上には かさねない(掘った 谷 / 池 / 川を おおわない)
      const gx0 = terr.x0, gx1 = terr.x0 + terr.nx * terr.cell, gz0 = terr.z0, gz1 = terr.z0 + terr.nz * terr.cell, X0 = lo - 2000, X1 = hi + 2000, Z0 = -2000, Z1 = world.len + 2000;
      for (const [ax, bx, az, bz] of [[X0, X1, Z0, gz0], [X0, X1, gz1, Z1], [X0, gx0, gz0, gz1], [gx1, X1, gz0, gz1]]) {
        if (bx - ax < 1 || bz - az < 1) continue;
        const m = new THREE.Mesh(keep(new THREE.PlaneGeometry(bx - ax, bz - az)), groundMat); m.rotation.x = -Math.PI / 2; m.position.set((ax + bx) / 2, -0.2, -(az + bz) / 2); sc.add(m);
      }
    }
    let gt2 = null;
    if (terr) {
      gt2 = keep(canvasTexture(gc)); gt2.wrapS = gt2.wrapT = THREE.RepeatWrapping;
      const { x0, z0, cell, nx, nz, H, S, wet, AR } = terr, patchC = new THREE.Color(world.ground[1]).multiplyScalar(1.15), pos = new Float32Array((nx + 1) * (nz + 1) * 3), colA = new Float32Array((nx + 1) * (nz + 1) * 3), uvA = new Float32Array((nx + 1) * (nz + 1) * 2), idx = [];
      const soil = prof0 && prof0.water && prof0.water.bank ? new THREE.Color(prof0.water.bank) : new THREE.Color(world.ground[1]).multiplyScalar(0.8).lerp(new THREE.Color('#b59a72'), 0.55), base = new THREE.Color(1, 1, 1);
      for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
        const k = j * (nx + 1) + i, x = x0 + i * cell, z = z0 + j * cell;
        pos[k * 3] = x; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = -z; uvA[k * 2] = x / 420; uvA[k * 2 + 1] = z / 420;
        col.copy(base).lerp(patchC, AR[k] * 0.4).lerp(soil, wet[k] * 0.55).multiplyScalar(S[k]); colA[k * 3] = col.r; colA[k * 3 + 1] = col.g; colA[k * 3 + 2] = col.b;
      }
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const gg = keep(new THREE.BufferGeometry()); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.BufferAttribute(colA, 3)); gg.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); gg.setIndex(idx); gg.computeVertexNormals();
      const tm = new THREE.Mesh(gg, keep(groundedMaterial(new THREE.MeshLambertMaterial({ map: gt2, vertexColors: true })))); tm.name = 'terrain'; tm.frustumCulled = false; sc.add(tm);
    }
    // みち と スポット(道の 面)
    const pathMat = keep(groundedMaterial(new THREE.MeshLambertMaterial({ color: world.path })));
    let groundKey = world.ground[0] + world.ground[1] + world.path;
    const refreshGround = () => { const k = world.ground[0] + world.ground[1] + world.path; if (k === groundKey) return; groundKey = k; paintGround(); gt.needsUpdate = true; if (gt2) gt2.needsUpdate = true; pathMat.color.set(world.path); };
    const segs = world.segments || [];
    // Geometry pass: 小川 / 川 / 谷を 横切る ところは 道の 面を きる(橋 / 飛び石が かわりに 渡す。道の 板が 水の 上に のらない)
    const gaps = terr ? terr.crossings.concat(world._gullies3d || [], terr.wetSpots.concat(terr.ponds).map((q) => ({ x: q.x, z: q.z, w: q.r * 0.8, pathAng: 0, streamAng: Math.PI / 2 }))) : [];   // 池の くぼ地の 上にも 道の 板を のせない
    const pieces = [];
    for (const sg of segs) {
      const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L = Math.hypot(dx, dz) || 1, cut = [];
      for (const c of gaps) { const t = ((c.x - sg.a.x) * dx + (c.z - sg.a.z) * dz) / L, off = Math.abs((c.x - sg.a.x) * dz - (c.z - sg.a.z) * dx) / L; if (t < -60 || t > L + 60 || off > sg.half + 30) continue; const g = (c.w + 36) / Math.max(0.45, Math.abs(Math.sin(c.pathAng - c.streamAng))); cut.push([t - g, t + g]); }
      // 道が 水の 帯の 中を とおる ところ(2D で 川の 中を あるく 道)も 道の 面を おかない(水の 上に 板を のせない)
      if (terr) for (let t = 0; t <= L; t += 15) { const sd = terr.sDist(sg.a.x + dx * t / L, sg.a.z + dz * t / L); if (sd.d < sd.w * 0.9) cut.push([t - 10, t + 10]); }
      cut.sort((a, b) => a[0] - b[0]);
      let t0 = 0; for (const [a, b] of cut) { if (a > t0) pieces.push([sg, t0, Math.min(a, L)]); t0 = Math.max(t0, b); } if (t0 < L) pieces.push([sg, t0, L]);
    }
    const road = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), pathMat, Math.max(1, pieces.length));
    pieces.forEach(([sg, ta, tb], i) => {
      const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L = Math.hypot(dx, dz) || 1, tm = (ta + tb) / 2;
      // 箱の ながさ(ローカル z)を 道の むき(three では (dx, -dz))へ
      tmp.position.set(sg.a.x + dx * tm / L, 0.6, -(sg.a.z + dz * tm / L)); tmp.rotation.set(0, Math.atan2(dx, -dz), 0);
      tmp.scale.set(sg.half * 2, 1.2, Math.max(1, tb - ta)); tmp.updateMatrix(); road.setMatrixAt(i, tmp.matrix);
    });
    road.count = pieces.length; sc.add(road);
    // スポット: 2D の worldLayers と おなじ わけかた(water の spot は 池、ほかは 道の 面)
    const disc = keep(new THREE.CylinderGeometry(1, 1, 1, 28));
    // たき(ランドマーク)が たきつぼ を もつ spot は、spot の 池の かわりに その たきつぼ を つかう
    const ownPool = new Set(objects.filter((ob) => ob.spot && ob.parts.some((pt) => pt.shape === 'pool')).map((ob) => ob.spot));
    const land = (world.spots || []).filter((q) => q.kind !== 'water' && !gaps.some((c) => Math.hypot(c.x - q.x, c.z - q.z) < q.r + c.w)), ponds = (world.spots || []).filter((q) => q.kind === 'water' && !ownPool.has(q.id) && !(terr && terr.anchorIds.has(q.id)));
    const pads = new THREE.InstancedMesh(disc, pathMat, Math.max(1, land.length));
    land.forEach((q, i) => { tmp.position.set(q.x, 0.7, -q.z); tmp.rotation.set(0, 0, 0); tmp.scale.set(q.r * 0.85, 1.4, q.r * 0.85); tmp.updateMatrix(); pads.setMatrixAt(i, tmp.matrix); });
    pads.count = land.length; sc.add(pads);
    // 地面の まだら(areas: したくさ など)と 草の たば(marks)。2D と おなじ データ
    const areas = world.areas || [];
    const patch = terr ? null : new THREE.InstancedMesh(keep(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), keep(new THREE.MeshLambertMaterial({ color: world.ground[1], transparent: true, opacity: 0.55, depthWrite: false })), Math.max(1, areas.length));
    if (patch) { areas.forEach((a, i) => { tmp.position.set(a.x, 0.3, -a.z); tmp.rotation.set(0, a.ang || 0, 0); tmp.scale.set(a.w / 2, 1, a.h / 2); tmp.updateMatrix(); patch.setMatrixAt(i, tmp.matrix); }); patch.count = areas.length; sc.add(patch); }
    // Region Profile v2(F7): 地面の 起伏。areas(砂丘・雪原・海底・砂利 など)の まんなかに ひくい 盛りあがり(mound)を おく。
    // あたりは かえない(areas に あたりは ない)。道を またいでも 高さ 6〜22 なので あるける 見た目の まま
    const BUMP = { dunefield: 22, snowfield: 14, seabed: 12, gravelbar: 8, mudflat: 6, rootmat: 8, snowwood: 10, wetstone: 8, reefflat: 10, wetgrass: 6, undergrowth: 5, fissure: 4 };
    const bumps = terr ? [] : areas.filter((a) => BUMP[a.kind]);   // Terrain v1 が ある とき は 地形の 格子が 起伏を もつ
    if (bumps.length) {
      const bm = new THREE.InstancedMesh(keep(ruggedMound()), keep(new THREE.MeshLambertMaterial({ color: world.ground[1] })), bumps.length);
      bumps.forEach((a, i) => { tmp.position.set(a.x, 0, -a.z); tmp.rotation.set(0, a.ang || 0, 0); tmp.scale.set(a.w * 0.48, BUMP[a.kind], a.h * 0.48); tmp.updateMatrix(); bm.setMatrixAt(i, tmp.matrix); });
      bm.count = bumps.length; sc.add(bm);
    }
    const marks = world.marks || [];
    const tuft = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(1, 1, 3).translate(0, 0.5, 0)), keep(new THREE.MeshLambertMaterial({ color: (world.markStyle && world.markStyle.color) || world.ground[1], flatShading: true })), Math.max(1, marks.length));
    marks.forEach((mk, i) => { const r = mk.size * 0.45; tmp.position.set(mk.x, terr ? terr.surfaceY(mk.x, mk.z) : 0, -mk.z); tmp.rotation.set(0, hash01('m' + i) * TAU, 0); tmp.scale.set(r, mk.size * 1.4, r); tmp.updateMatrix(); tuft.setMatrixAt(i, tmp.matrix); });
    tuft.count = marks.length; sc.add(tuft);

    // かたい 物・草花: かたち ごとに InstancedMesh(draw call を ふやさない)
    const up = (g) => { g.translate(0, 0.5, 0); return keep(g); };
    // 箱の 下の 面は 地面 / 下を むく(上から 見る カメラでは 見えない)= 三角形 12 → 10(2026-10-02 予算 監査: まち の 箱 3400 で 約 7k)
    const noBottom = (g) => { const ny = g.groups[3], idx = Array.from(g.index.array); idx.splice(ny.start, ny.count); g.setIndex(idx); g.clearGroups(); return g; };
    const GEO = {
      // Geometry pass(予算): 幹は ふたなし(上は かんむり、下は 地面 → 見えない面を つくらない。28 → 14 三角形)
      trunk: up(new THREE.CylinderGeometry(0.72, 1, 1, 7, 1, true)), cone: up(new THREE.ConeGeometry(1, 1, 8)), crown: keep(new THREE.IcosahedronGeometry(1, 1)),
      // Kit v2: ほそる 幹(taper 0.5)・えだはりの 小さな かたまり(20 三角形)・曲がった 昆布の は(帯)
      trunk2: up(new THREE.CylinderGeometry(0.5, 1, 1, 7, 1, true)), crownSmall: keep(new THREE.IcosahedronGeometry(1, 0)), kelpblade: up(kelpBladeGeometry()), frond: keep(frondGeometry()),
      cap: keep(new THREE.SphereGeometry(1, 6, 3, 0, TAU, 0, Math.PI / 2)), rock: (() => { const g = new THREE.DodecahedronGeometry(1, 0); g.scale(1, 1, 1); g.translate(0, 0.35, 0); return keep(g); })(),
      log: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.rotateZ(Math.PI / 2); g.translate(0, 1, 0); return keep(g); })(), stump: up(new THREE.CylinderGeometry(0.9, 1, 1, 9)),
      pool: (() => { const g = new THREE.CircleGeometry(1, 24); g.rotateX(-Math.PI / 2); g.translate(0, 2.4, 0); return keep(g); })(), plank: up(new THREE.BoxGeometry(1, 1, 1)), fall: up(new THREE.PlaneGeometry(1, 1)),
      cliff: up(ruggedBox()), moss: keep(new THREE.IcosahedronGeometry(1, 1)), shore: keep(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).translate(0, 1.8, 0)),
      // 小物は 三角形を けちる(そこ なし・かど すくなめ): くき 12・草 4・かさ 36・はしら 10
      stem: up(new THREE.CylinderGeometry(0.8, 1, 1, 6, 1, true)), blade: up(new THREE.ConeGeometry(1, 1, 4, 1, true)), petal: keep(new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2)),
      nut: keep(new THREE.IcosahedronGeometry(1, 0)), pebble: keep(new THREE.IcosahedronGeometry(1, 0).translate(0, 0.25, 0)), post: up(new THREE.CylinderGeometry(0.9, 1, 1, 5, 1, true)),
      board: up(new THREE.BoxGeometry(1, 1, 0.12)), mound: keep(ruggedMound()), box: up(noBottom(new THREE.BoxGeometry(2, 1, 2))), roof4: up(new THREE.ConeGeometry(1, 1, 4)), roof6: up(new THREE.ConeGeometry(1, 1, 6)), roof8: up(new THREE.ConeGeometry(1, 1, 8)),
      wcone4: up(new THREE.ConeGeometry(1, 1, 4, 1, true)), wcone6: up(new THREE.ConeGeometry(1, 1, 6, 1, true)), ring: keep(new THREE.TorusGeometry(1, 0.08, 4, 12)),
      // Geometry pass(予算): かべの 前の うすい 板(まど・わく・入口・看板の 面)は 正面 1 まい(2 三角形)。箱(12)の 見えない 5 面を つくらない。
      // 原型の parts は 箱(rx / h / rz)の まま。rz が うすい(≤ 2.6)ものだけ ここで 板に する。正面 = ローカル +z(箱の 前の 面と おなじ いち)
      wpanel: keep(new THREE.PlaneGeometry(2, 1).translate(0, 0.5, 1)), nut8: keep(new THREE.OctahedronGeometry(1, 0)),
      // Building v4: 切妻屋根(三角の 柱。棟は ローカル x = 正面に そう。正面 = +z の 斜面)
      gable: keep((() => { const v = [-1, 0, 1, 1, 0, 1, 1, 1, 0, -1, 0, 1, 1, 1, 0, -1, 1, 0, 1, 0, -1, -1, 0, -1, -1, 1, 0, 1, 0, -1, -1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, -1, 1, 1, 0, -1, 0, -1, -1, 0, 1, -1, 1, 0]; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g; })()), decal: keep(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2).translate(0, 1.4, 0)), glowdisc: keep(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2).translate(0, 0.9, 0)),
      foam: keep(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2).translate(0, 3.2, 0)), wet: keep(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).translate(0, 1.0, 0)), mist: keep(new THREE.IcosahedronGeometry(1, 1)), litter: keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 1.6, 0)),
    };
    const flat = (color) => keep(new THREE.MeshLambertMaterial({ color, flatShading: true }));
    const MAT = { trunk: flat('#7a5536'), cone: flat('#ffffff'), crown: flat('#ffffff'), rock: flat('#8c8f8a'), log: flat('#7a5436'), stump: flat('#8a6440'),
      pool: keep(new THREE.MeshPhongMaterial({ map: keep(waterTexture()), transparent: true, opacity: 0.92, shininess: 70, specular: '#d8ecff' })), shore: keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(world.ground[1]).multiplyScalar(0.62) })),
      cliff: keep(new THREE.MeshLambertMaterial({ map: keep(cliffTexture()), color: '#c4c1b8' })), moss: flat('#5f8c46'), plank: flat('#9a7550'),   // AD v1: 岩 / がけは くらく つぶさない(明るめ)
      fall: keep(new THREE.MeshLambertMaterial({ map: keep(fallTexture()), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })),
      foam: keep(new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.66, depthWrite: false })),
      wet: keep(new THREE.MeshLambertMaterial({ map: keep(wetTexture(world.ground[1])), transparent: true, depthWrite: false })),
      // キノコ・草花・小物(けしきの 小物は 3D の かたち。立て看板は つかわない)
      stem: flat('#e9dfc8'), cap: keep(new THREE.MeshLambertMaterial({ map: keep(capTexture('#c6473b')) })), glowcap: keep(new THREE.MeshLambertMaterial({ map: keep(capTexture('#7fe3d2')), emissive: '#3fcbb6', emissiveIntensity: 0.55 })),
      glowdisc: keep(new THREE.MeshBasicMaterial({ color: '#9ff3e4', transparent: true, opacity: 0.3, depthWrite: false })), blade: flat('#5aa34c'), petal: keep(new THREE.MeshBasicMaterial({ color: '#f3d14e', side: THREE.DoubleSide })),
      leaf: keep(new THREE.MeshLambertMaterial({ color: '#b8743c', side: THREE.DoubleSide })), nut: flat('#7a4f2a'), spark: keep(new THREE.MeshBasicMaterial({ color: '#fff3a6', transparent: true, opacity: 0.9 })),
      post: flat('#7a5a3a'), board: flat('#c9a46a'), wbox: flat('#ffffff'), wroof: flat('#ffffff'), wdome: flat('#ffffff'), wblade: flat('#ffffff'), wcone: flat('#ffffff'), wpost: flat('#ffffff'), wslab: flat('#ffffff'), wstem: flat('#ffffff'), wring: flat('#ffffff'),
      glowcone: keep(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.45 })), glowboard: keep(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6 })), decal: keep(new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false })), kelp: keep(new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide })), slab: flat('#9c9c94'), rail: flat('#8a6a44'), pebble: flat('#8d8a80'), mound: keep(new THREE.MeshLambertMaterial({ map: keep(cliffTexture()), color: '#c4c1b8' })), mist: keep(new THREE.MeshBasicMaterial({ color: '#f2f8fb', transparent: true, opacity: 0.24, depthWrite: false })) };
    const GEO_ALIAS = { wtrunk: 'trunk', wnut: 'nut', crownBig: 'crown', kelp: 'kelpblade', frond: 'frond', glowcap: 'cap', slab: 'plank', rail: 'log', leaf: 'litter', spark: 'nut', wbox: 'box', wdome: 'cap', wblade: 'blade', wcone: 'blade', wpost: 'post', wslab: 'plank', wstem: 'stem', wring: 'ring', glowcone: 'blade', glowboard: 'board', wroof: 'roof4', wcone4: 'wcone4', wcone6: 'wcone6', roof6: 'roof6', roof8: 'roof8' };
    // 季節(2026-10-02・2D の 正本に あわせる): 針葉樹の 段ごとの 雪の ぼうし(snowcone)と 山の 頂の 雪(snowcap)。ふだんは かくす
    GEO_ALIAS.snowcone = 'wcone6'; GEO_ALIAS.snowcap = 'cap'; MAT.snowcone = flat('#f2f6fa');
    // Neutral aliases reuse existing geometry/material; raw nuts, flower centers and trees retain their palette.
    const MAT_ALIAS = { wtrunk: 'wbox', wnut: 'wbox', snowcap: 'snowcone', trunk2: 'trunk', crownSmall: 'crown', frond: 'kelp', wpanel: 'wbox', nut8: 'nut', gable: 'wroof', wcone4: 'wcone', wcone6: 'wcone', roof6: 'wroof', roof8: 'wroof', roof4: 'wroof', glowcone6: 'glowcone', glowcone4: 'glowcone' };
    const inst = {};   // shape → [{ x, y, z, sx, sy, sz, ry, tint, color }]
    const board = new Map();   // emoji → [{ x, z, w, h }]
    const occluders = [];   // かたい 物(カメラと player の あいだに 入ったら すかす)
    let cur = null;
    const FOL = Object.assign({}, FOLIAGE_DEFAULT, (prof0 && prof0.foliage) || {});   // 地域の 葉の palette(Art Direction v1)
    // 水・あわ・しぶき・ひらたい 石は すかさない(かたい 物では ない)
    const NO_FADE = new Set(['pool', 'shore', 'foam', 'mist', 'fall', 'wet', 'glowdisc', 'spark', 'decal']);
    let curOy = 0;
    const jungle3d = world.regionId === 'jungle';   // 2D: ジャングルの 木は 秋でも みどり
    const push = (shape, it) => {
      if (curOy) it.y = (it.y || 0) + curOy;   // Terrain v1: 物は 地形の 高さに すわる
      const l = inst[shape] || (inst[shape] = []);
      if (cur && !NO_FADE.has(shape)) {
        cur.refs.push({ shape, i: l.length, it });
        // 見た目の 半径・高さ(すかしの 判定 用。v2 F1): parts の 中心の ずれ + 大きさ
        cur.vr = Math.max(cur.vr, Math.hypot(it.x - cur.ob.x, it.z + cur.ob.z) + Math.max(Math.abs(it.sx), Math.abs(it.sz)));
        cur.top = Math.max(cur.top, (it.y || 0) + Math.abs(it.sy));
      }
      l.push(it);
    };
    let count = 0;
    for (const ob of objects) {
      count++;
      // Geometry pass(HQ-2): かたい 物 + あたりの ない 高い 物(ヤシ・電柱・サボテン・鳥居 …・群生は のぞく)も すかしの 候補。
      // あたりの ない 物は parts を 見てから(高さ ≥ ACTOR_SIZE × 0.9 の ときだけ)候補に 入れる
      const solidOc = !!(ob.collision && ob.solid);
      cur = solidOc ? { ob, r: Math.max(ob.collision.hw, ob.collision.hd), vr: 0, top: 0, refs: [] } : (!ob.dressing ? { ob, c: { x: ob.x, z: ob.z }, r: 10, vr: 0, top: 0, refs: [], soft: true } : null);
      if (cur && solidOc) occluders.push(cur);
      const gr = objectGround(terr, ob);   // 接地(構造物は 物ごと、それ以外は 地面に つく parts ごと)。橋 / 飛び石は 水面 と 道の 高さ が 基準
      curOy = gr.base;
      // あたりの 箱の hw 軸(せかい (sin a, cos a))を ローカル x へ: three では θ = π/2 − a
      const t = hash01(ob.id), ry = Math.PI / 2 - (ob.rot || 0);
      for (const pt of ob.parts) {
        const px = ob.x + (pt.dx || 0), pz = -(ob.z + (pt.dz || 0));
        if (gr.part) curOy = gr.part(pt);
        switch (pt.shape) {
          // Tree v4: 幹 / 枝の かたむき(tilt)。toward = 枝が むかう せかいの ずれ(dx, dz)
          case 'trunk': push(pt.neutralColor ? 'wtrunk' : pt.taper != null && pt.taper < 0.65 ? 'trunk2' : 'trunk', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: pt.toward ? Math.atan2(-pt.toward[1], -pt.toward[0]) : t * TAU, rz: pt.tilt || 0, tint: t, color: pt.color }); break;
          case 'gable': push('gable', { x: px, y: pt.y || 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: Math.PI / 2 - (pt.ang || 0), tint: t, color: pt.color }); break;
          case 'cone': push('cone', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t, color: pt.color || shadeOf(FOL.conifer, pt.shade) });
            push('snowcone', { x: px, y: pt.y + pt.h * 0.45, z: pz, sx: pt.r * 0.6, sy: pt.h * 0.6, sz: pt.r * 0.6, ry: t * TAU, tint: 0.5 }); break;   // 段の 上 半分の 雪(2D の 雪の 針葉樹: みどりの 段 + 白い ぼうし)
          case 'crown': push(pt.small ? 'crownSmall' : ob.type === 'bigtree' ? 'crownBig' : 'crown', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r, ry: t * TAU + (pt.spin || 0), tint: t, color: pt.color || shadeOf(FOL.crown, pt.shade), leafy: !pt.color && !jungle3d && (ob.type === 'broadleaf' || ob.type === 'bigtree') }); break;
          case 'cap': push('cap', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r, ry: 0, tint: t }); break;
          case 'rock': push('rock', { x: px, y: 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: ry + t, tint: t }); break;
          case 'log': push('log', { x: px, y: pt.y || 0, z: pz, sx: pt.len, sy: pt.r, sz: pt.r, ry: pt.ang != null ? Math.PI / 2 - pt.ang : ry, tint: t, color: pt.color }); break;
          case 'stump': push('stump', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'pool': {
            const rx = pt.rx || pt.r, rz = pt.rz || pt.r, pr = pt.ang != null ? Math.PI / 2 - pt.ang : 0, py = pt.y || 0;
            if (!pt.bare) push('shore', { x: px, y: py, z: pz, sx: rx * 1.07 + 10, sy: 1, sz: rz * 1.07 + 10, ry: pr, tint: 0.5 });
            push('pool', { x: px, y: py, z: pz, sx: rx, sy: 1, sz: rz, ry: pr, tint: 0.5 }); break;
          }
          case 'deep': push('shore', { x: px, y: 0.4, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;   // たきつぼの 下の くらい まる(水を とおして ふかく 見える)
          case 'wet': push('wet', { x: px, y: 0, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;
          case 'plank': push('plank', { x: px, y: pt.y || 0, z: pz, sx: pt.len, sy: 8, sz: pt.w, ry: pt.ang != null ? Math.PI / 2 - pt.ang : ry, tint: t }); break;
          // 面の むき f(せかい)→ three の y 回転 θ = atan2(fx, −fz)
          case 'fall': push('fall', { x: px, y: 0, z: pz, sx: pt.w, sy: pt.h, sz: 1, ry: pt.fx != null ? Math.atan2(pt.fx, -pt.fz) : 0, tint: 0.5 }); break;
          case 'cliff': push('cliff', { x: px, y: pt.y || 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: pt.ang != null ? Math.PI / 2 - pt.ang : 0, tint: t, color: pt.color }); break;
          case 'moss': push('moss', { x: px, y: pt.y, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: t, color: pt.color }); break;   // こけの もりあがり(半分 うまる)
          case 'foam': push('foam', { x: px, y: 0, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;
          case 'mist': push('mist', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r * 0.6, ry: Math.atan2(pt.fx, -pt.fz), tint: 0.5 }); break;
          case 'stone': push('rock', { x: px, y: pt.y || 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: t * TAU, tint: t }); break;
          case 'stem': push('stem', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'glowcap': push('glowcap', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r, ry: t * TAU, tint: 0.5 }); break;
          case 'glowdisc': push('glowdisc', { x: px, y: 0, z: pz, sx: pt.r, sy: 1, sz: pt.r, ry: 0, tint: 0.5, color: pt.color }); break;
          case 'blade': push('blade', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t, color: pt.color }); break;
          case 'leaf': push('leaf', { x: px, y: 0, z: pz, sx: pt.w * 0.5, sy: 1, sz: pt.w * 0.3, ry: t * TAU, tint: t }); break;
          // VQ: elevated pieces (statue heads / nest eggs) must retain their part height and color.
          case 'nut': push(pt.color ? 'wnut' : 'nut', { x: px, y: (pt.y || 0) + pt.r * 0.5, z: pz, sx: pt.r, sy: pt.r * 0.8, sz: pt.r, ry: t * TAU, tint: t, color: pt.color }); break;
          case 'spark': push('spark', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r, sz: pt.r, ry: t * TAU, tint: 0.5, color: pt.color }); break;
          case 'flower': push('blade', { x: px, y: 0, z: pz, sx: 3, sy: pt.h, sz: 3, ry: 0, tint: t, color: '#5fae4c' }); push('petal', { x: px, y: pt.h, z: pz, sx: pt.r, sy: 1, sz: pt.r, ry: t * TAU, tint: 0.5, color: pt.color }); push('nut8', { x: px, y: pt.h + 1.5, z: pz, sx: pt.r * 0.28, sy: pt.r * 0.2, sz: pt.r * 0.28, ry: 0, tint: 0.5, color: '#ffe066' }); break;   // 花の まんなか: 8 三角形(20 → 8)
          case 'petal': push('petal', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: 1, sz: pt.r, ry: t * TAU, tint: 0.5, color: pt.color }); break;
          case 'post': push('post', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'board': push(pt.glow ? 'glowboard' : 'board', { x: px, y: pt.y, z: pz, sx: pt.w, sy: pt.h, sz: 1, ry: pt.spin != null ? pt.spin : Math.PI - pt.ang, tint: t, color: pt.color, rz: pt.spin != null ? pt.spin : 0 }); break;   // いたは 道の むきを 向く
          case 'slab': push('slab', { x: px, y: pt.y || 0, z: pz, sx: pt.len, sy: 10, sz: pt.w, ry: Math.PI / 2 - pt.ang, tint: t }); break;
          case 'rail': { const sdx = Math.cos(pt.ang) * pt.side, sdz = -Math.sin(pt.ang) * pt.side; push('rail', { x: px + sdx, y: pt.y, z: pz - sdz, sx: pt.len, sy: pt.r, sz: pt.r, ry: Math.PI / 2 - pt.ang, tint: t, color: pt.color }); break; }
          case 'pebble': push('pebble', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.r * 0.7, sz: pt.r * 0.85, ry: t * TAU, tint: t }); break;
          case 'mound': push('mound', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t, color: pt.color }); break;
          case 'box': push(pt.rz <= 2.6 && !pt.solidBox ? 'wpanel' : 'wbox', { x: px, y: pt.y || 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: Math.PI / 2 - (pt.ang || 0), tint: t, color: pt.color }); break;
          case 'roof': push(pt.seg === 6 ? 'roof6' : pt.seg === 8 ? 'roof8' : 'roof4', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: Math.PI / 4 - (pt.ang || 0), tint: t, color: pt.color }); break;
          case 'dome': push(pt.snow ? 'snowcap' : 'wdome', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.r * (pt.sy || 1), sz: pt.r, ry: t * TAU, tint: t, color: pt.color }); break;
          // lean: その 向き(せかいの 角度 a)へ たおす(ヤシの は)。three の y 回転 θ は cosθ = −sin a・sinθ = −cos a、傾きは z 回転
          case 'wblade': push('wblade', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: pt.lean != null ? Math.atan2(-Math.cos(pt.lean), -Math.sin(pt.lean)) : t * TAU, rz: pt.lean != null ? (pt.tilt || 0.95) : 0, tint: t, color: pt.color }); break;
          case 'kelp': push('kelp', { x: px, y: pt.y || 0, z: pz, sx: pt.w, sy: pt.h, sz: 1, ry: pt.spin != null ? pt.spin : t * TAU, rz: 0, tint: t, color: pt.color }); break;
          // frond: 根もと (px, pz) から せかいの 向き dir へ len だけ のびる は。y 回転 θ: x 軸を (sin dir, cos dir) へ → θ = atan2(-cos dir, sin dir)... three の z は −z なので θ = dir − π/2 を x 軸基準に
          case 'frond': push('frond', { x: px, y: pt.y || 0, z: pz, sx: pt.len, sy: pt.len * (pt.droop || 0.5), sz: pt.w, ry: Math.PI / 2 - pt.dir, rz: 0, tint: t, color: pt.color }); break;
          case 'wcone': push(pt.glow ? 'glowcone' : pt.seg === 4 ? 'wcone4' : pt.seg === 6 ? 'wcone6' : 'wcone', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t, color: pt.color }); break;
          case 'wpost': push('wpost', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: 0, tint: t, color: pt.color }); break;
          case 'wstem': push('wstem', { x: px, y: pt.y || 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: 0, tint: t, color: pt.color }); break;
          case 'wslab': push('wslab', { x: px, y: pt.y || 0, z: pz, sx: pt.len, sy: pt.h || 8, sz: pt.w, ry: Math.PI / 2 - (pt.ang || 0), tint: t, color: pt.color }); break;
          case 'arch': push('wring', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r, sz: pt.r, ry: Math.PI / 2 - (pt.ang || 0), rx: 0, tint: t, color: pt.color }); break;   // Bridge v4: 石の はしの アーチ(たての わ。下 半分は 川底の 下)
          case 'ring': push('wring', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r, sz: pt.r, ry: Math.PI / 2 - (pt.ang || 0), tint: t, color: pt.color, rx: Math.PI / 2 }); break;
          case 'decal': push('decal', { x: px, y: 0, z: pz, sx: pt.r, sy: 1, sz: pt.r, ry: t * TAU, tint: 0.5, color: pt.color }); break;
          case 'billboard': {
            // 地面に おちて いる もの(はっぱ・どんぐり・め)は 地面に ねかせる。草花・きのこ・かんばんは 立てる
            const flatKey = LITTER.has(ob.emoji) ? 'flat:' + ob.emoji : ob.emoji;
            const list = board.get(flatKey) || []; list.push({ x: px, y: curOy, z: pz, w: pt.w, h: pt.h, ry: t * TAU }); board.set(flatKey, list); break;
          }
          default: break;
        }
      }
      if (cur && cur.soft && cur.top >= M.ACTOR_SIZE * 0.9 && cur.refs.length) occluders.push(cur);
    }
    cur = null; curOy = 0;
    const prof = (M.REGION3D && M.REGION3D[world.regionId]) || {};
    if (prof.stars) for (let i = 0; i < 90; i++) push('spark', { x: lo - 1500 + hash01('sx' + i) * (hi - lo + 3000), y: 900 + hash01('sy' + i) * 1600, z: -(hash01('sz' + i) * (world.len + 2000) - 1000), sx: 6 + hash01('sr' + i) * 10, sy: 6 + hash01('sr' + i) * 10, sz: 6 + hash01('sr' + i) * 10, ry: 0, tint: 0.5, color: i % 4 ? '#fff6c8' : '#bfe3ff' });
    // ---- Water v2(F10): 川 = 1 本の 帯(岸つき)、海 / 湖 = 岸 → ぬれた 砂 → 浅瀬 → 沖 → 水平線 まで 1 まいの 面、しんかいの 谷 = くらい 帯、
    //      池 / 湖(water の spot)= でこぼこの 閉じた かたち(中心 ふかく・ふち あさく)を まとめて 1 まい。川や 海に かくれる 池は おかない
    const WC = Object.assign({}, WATER_DEFAULT, prof.water || {});
    const deepC = rgbOf(WC.deep), shallowC = rgbOf(WC.shallow), bankC = WC.bank ? rgbOf(WC.bank) : rgbOf(new THREE.Color(world.ground[1]).multiplyScalar(0.62));
    const waterAnim = [];
    const stripMesh = (data, mat, name) => {
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.BufferAttribute(data.positions, 3)); g.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
      if (data.uvs) g.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2));
      g.setIndex(data.index); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.name = name; m.frustumCulled = false; sc.add(m); return m;
    };
    const waveTex = keep(waveTexture()); waveTex.repeat.set(3, 1);
    // 帯の 向き(折れ線の 進む 向き・岸の side)で 面の 表裏が かわる ので、水の material は 両面(DoubleSide)
    const waterMat = keep(new THREE.MeshPhongMaterial({ vertexColors: true, map: waveTex, transparent: true, opacity: 0.94, shininess: 60, specular: '#cfe6ff', depthWrite: false, side: THREE.DoubleSide }));
    const bankMat = keep(groundedMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    const foamMat = keep(new THREE.MeshBasicMaterial({ color: WC.foam, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
    const water = { kind: null, meshes: [] };
    const T = world.terrain;
    // Creek / River v3(Geometry pass・HQ-6 / HQ-7): 小川 / 川 = 谷の 断面(岸の 上 → 土 → 砂利 → 川底)+ 水面(中心 ふかく・ふち あさく・ながれの すじ)。
    // 水面は 地面より ひくい(小川 −9・川 −11)。池の 円盤を ならべない(小川の とちゅうの 水の spot は 小川の よどみ)
    if (terr && terr.streams.length) {
      const grassC = rgbOf(new THREE.Color(world.ground[0]).multiplyScalar(0.96)), soilCol = new THREE.Color(WC.bank || '#8a7458');
      const lipC = rgbOf(new THREE.Color(world.ground[0]).lerp(soilCol, 0.45)), soilC = rgbOf(soilCol.clone().multiplyScalar(0.92)), gravelC = rgbOf('#b4a78c'), bedC = rgbOf('#6a5d4c');
      const streamTex = keep(waveTexture()); streamTex.repeat.set(1.5, 1);
      const streamMat = keep(new THREE.MeshPhongMaterial({ vertexColors: true, map: streamTex, transparent: true, opacity: 0.86, shininess: 60, specular: '#cfe6ff', depthWrite: false, side: THREE.DoubleSide }));
      for (const st of terr.streams) {
        const river = st.kind === 'river', k = river ? 1.35 : st.kind === 'ditch' ? 0.55 : 1, wy = STREAM_WATER_Y[river ? 'river' : st.kind === 'ditch' ? 'ditch' : 'creek'];
        const L = (sgn, a, b, y, c) => ({ s: sgn, a, b, y, c });
        const bed = [L(-1, 1, 75, 'g', grassC), L(-1, 1, 35, 0.6, lipC), L(-1, 1, 8, -6 * k, soilC), L(-1, 0.6, 0, -13 * k, gravelC), L(1, 0, 0, -17 * k, bedC), L(1, 0.6, 0, -13 * k, gravelC), L(1, 1, 8, -6 * k, soilC), L(1, 1, 35, 0.6, lipC), L(1, 1, 75, 'g', grassC)];
        // VQ: only the dry outer bank changes contour. Water width, bed and crossing data stay canonical.
        if (st.kind !== 'ditch') for (const ln of bed) if (ln.b >= 35) ln.edgeVariation = ln.b >= 75 ? 14 : 7;
        water.meshes.push(stripMesh(streamStripData(st.pts, bed, terr.sample), bankMat, river ? 'water:bank' : 'water:creekbed'));
        const wl = [L(-1, 0.88, 0, wy, shallowC), L(-1, 0.4, 0, wy, deepC), L(1, 0.4, 0, wy, deepC), L(1, 0.88, 0, wy, shallowC)];
        water.meshes.push(stripMesh(streamStripData(st.pts, wl), river ? waterMat : streamMat, river ? 'water:river' : 'water:creek'));
        if (river) water.kind = 'river'; else if (!water.kind) water.kind = 'creek';
      }
      waterAnim.push({ map: streamTex, dx: 0, dy: 0.16 });
      if (water.kind === 'river') waterAnim.push({ map: waveTex, dx: 0, dy: 0.12 });
    }
    if (T && (T.kind === 'chasm' || (T.kind === 'river' && !terr)) && T.pts && T.pts.length >= 2) {
      const half = T.half || 200, chasm = T.kind === 'chasm', rc = chasm ? { pts: T.pts, k: null } : riverCurve(T.pts), fr = polylineFrames(rc.pts, rc.k), vary = !chasm;   // AD v1: 川は なめらかに 曲がり・はばが ゆれる(谷は そのまま)
      const dark = chasm ? rgbOf('#07182b') : deepC, mid = chasm ? rgbOf('#0e2a45') : shallowC, bk = chasm ? rgbOf(new THREE.Color(world.ground[1]).multiplyScalar(0.7)) : bankC;
      water.kind = T.kind;
      water.meshes.push(stripMesh(stripGeometryData(fr, [{ o: -half - 48, y: 1.2, c: bk }, { o: -half + 2, y: 1.2, c: bk }, { o: half - 2, y: 1.2, c: bk }, { o: half + 48, y: 1.2, c: bk }], { vary }), bankMat, 'water:bank'));
      water.meshes.push(stripMesh(stripGeometryData(fr, [{ o: -half, y: chasm ? 0.9 : 2.4, c: mid }, { o: -half * 0.45, y: chasm ? 0.9 : 2.4, c: dark }, { o: half * 0.45, y: chasm ? 0.9 : 2.4, c: dark }, { o: half, y: chasm ? 0.9 : 2.4, c: mid }], { vary }), chasm ? keep(new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide })) : waterMat, 'water:' + T.kind));
      if (!chasm) waterAnim.push({ map: waveTex, dx: 0, dy: 0.12 });
    } else if (T && T.kind === 'coast' && T.pts && T.pts.length >= 2) {
      const side = T.side || -1, pts = T.pts.slice();
      pts.unshift([pts[0][0], pts[0][1] - 2500]); pts.push([pts[pts.length - 1][0], pts[pts.length - 1][1] + 2500]);
      const fr = polylineFrames(pts), along = [side, 0], wet = rgbOf(new THREE.Color(world.ground[1]).multiplyScalar(0.78));
      const midC = [(deepC[0] + shallowC[0]) / 2, (deepC[1] + shallowC[1]) / 2, (deepC[2] + shallowC[2]) / 2];
      water.kind = prof.lake ? 'lake' : 'sea';
      water.meshes.push(stripMesh(stripGeometryData(fr, [{ o: -90, y: 1.0, c: wet }, { o: 4, y: 1.0, c: wet }], { along }), bankMat, 'water:wetsand'));
      water.meshes.push(stripMesh(stripGeometryData(fr, [{ o: 0, y: 2.2, c: shallowC }, { o: 150, y: 2.2, c: shallowC }, { o: 520, y: 2.2, c: midC }, { o: 1400, y: 2.2, c: deepC }, { o: 9000, y: 2.2, c: deepC }], { along }), waterMat, 'water:' + water.kind));
      water.meshes.push(stripMesh(stripGeometryData(fr, [{ o: -4, y: 3.0, c: [1, 1, 1] }, { o: 22, y: 3.0, c: [1, 1, 1] }], { along }), foamMat, 'water:foam'));
      waterAnim.push({ map: waveTex, dx: -side * 0.04, dy: 0 }, { foam: foamMat });
    }
    // 池 / 湖(water の spot)。川や 海に かくれる ものは おかない。r >= 280 は 湖(大きく・でこぼこ 大きめ・ふちに 浅瀬)
    const discs = [], rims = [], shoreXAt = (w, z) => M.shoreX(w, z);
    for (const q of ponds) {
      if (pondCovered(world, q, shoreXAt)) continue;
      const lake = q.r >= 280, seed = world.regionId + ':' + q.id, rot = hash01(seed) * TAU, amp = lake ? 0.16 : 0.11;
      // Terrain v1: 池は 浅い くぼ地(地形が −14 まで さがる)の 中の しずかな 水面(−4)。ふちの 土(rim)は 水面の 下。岸の 線は 地形 と 水面の 交わり
      rims.push({ x: q.x, z: q.z, y: terr ? -6 : 1.8, rx: q.r * 1.0 + 12, rz: q.r * 0.86 + 12, rot, amp, seed, deep: bankC, edge: bankC });
      discs.push({ x: q.x, z: q.z, y: terr ? (lake ? -3.6 : -4) : lake ? 2.7 : 2.4, rx: q.r * 0.95, rz: q.r * 0.8, rot, amp, seed, deep: deepC, edge: shallowC });   // 湖は 川の 帯(2.4)より 上
    }
    if (discs.length) {
      const rm = discFanData(rims, 28), dm = discFanData(discs, 28);
      water.meshes.push(stripMesh({ positions: rm.positions, colors: rm.colors, index: rm.index }, bankMat, 'water:rim'));
      water.meshes.push(stripMesh({ positions: dm.positions, colors: dm.colors, index: dm.index }, keep(new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.92, shininess: 70, specular: '#d8ecff', depthWrite: false, side: THREE.DoubleSide })), 'water:pond'));
      water.ponds = discs.length;
    }
    const meshes = {};
    MAT.crownBig = flat('#ffffff');
    for (const shape of Object.keys(inst)) {
      const list = inst[shape], geo = GEO[GEO_ALIAS[shape] || shape], matKey = MAT_ALIAS[shape] || shape;
      const m = new THREE.InstancedMesh(geo, MAT[matKey], list.length);
      list.forEach((it, i) => {
        tmp.position.set(it.x, it.y, it.z); tmp.rotation.set(it.rx || 0, it.ry, it.rz || 0); tmp.scale.set(it.sx, it.sy, it.sz); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
        if (it.color) m.setColorAt(i, col.set(it.color).multiplyScalar(0.94 + it.tint * 0.12)); else m.setColorAt(i, col.setScalar(0.9 + it.tint * 0.2));
      });
      m.computeBoundingSphere();
      // 秋(2026-10-02・2D の 正本): 葉の palette の かんむり は 2D の 秋の いろ(#9a5f28 / #c8843a / #e8a85a)へ。明るさの 順は もとの まま。
      // かけ算の tint では みどりが だいだいに ならない(オリーブ に なった)ので、instance の いろを 秋の 組と 入れかえる。ジャングル / 色つきの 木(青い 木・きりの 木)は そのまま
      if (CROWN_SHAPES.has(shape) && list.some((it) => it.leafy)) {
        const base = m.instanceColor.array.slice(), aut = m.instanceColor.array.slice(), c = new THREE.Color();
        list.forEach((it, i) => { if (!it.leafy) return; c.fromArray(base, i * 3); const L = Math.max(0, Math.min(1, (c.r * 0.3 + c.g * 0.59 + c.b * 0.11 - 0.2) / 0.5)); c.copy(L < 0.5 ? AUT_DARK : AUT_MID).lerp(L < 0.5 ? AUT_MID : AUT_LITE, L < 0.5 ? L * 2 : L * 2 - 1); c.toArray(aut, i * 3); });
        m.userData.colors = { base, autumn: aut };
      }
      sc.add(m); meshes[shape] = m;
    }
    // 立て看板(草花・小物): 絵文字 ごとに 1 つの InstancedMesh。y 軸だけ カメラへ むける(まいフレーム むきだけ そろえる)
    const boards = [];
    for (const [key, list] of board) {
      const isFlat = key.startsWith('flat:'), emoji = isFlat ? key.slice(5) : key;
      const tx = glyphTexture(emoji, o.wrapScenery || null, 's');
      if (!tx) continue;
      const mat = keep(new THREE.MeshLambertMaterial({ map: tx.tex, alphaTest: 0.5, side: THREE.DoubleSide }));
      if (isFlat) {
        // ねかせた もの は むきを かえない(1 かい だけ おく)。大きさは 2D の 見た目の はば くらい
        const m = new THREE.InstancedMesh(GEO.litter, mat, list.length);
        list.forEach((it, i) => { tmp.position.set(it.x, it.y || 0, it.z); tmp.rotation.set(0, it.ry, 0); tmp.scale.set(it.w * 0.55, 1, it.w * 0.55); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); });
        m.computeBoundingSphere(); sc.add(m); meshes['litter:' + emoji] = m;
        continue;
      }
      const m = new THREE.InstancedMesh(GEO.fall, mat, list.length);
      m.userData.list = list; m.userData.aspect = tx.aspect;
      boards.push(m); sc.add(m);
    }
    // ひかり・そら・きり(env と mood で まいフレーム かえる)
    // 2026-10-02 VQ: retain bright fill, but move part of the flat ambient budget
    // to the existing key light so roof slopes / trunks / cliff planes separate.
    // Same lights, same weather multipliers; no shadow-map pass or new state.
    const hemi = new THREE.HemisphereLight('#eaf4ff', new THREE.Color(world.ground[0]).lerp(new THREE.Color('#ffffff'), 0.35), 1.2), sun = new THREE.DirectionalLight('#fff6e8', 1.55), amb = new THREE.AmbientLight('#ffffff', 0.22);
    sun.position.set(-0.45, 1, 0.5); sc.add(hemi); sc.add(sun); sc.add(amb);
    sc.fog = new THREE.Fog('#dff0ff', 700, 3200);
    // キャラ(player・なかま・住人)と かげ
    const actorGeo = up(new THREE.PlaneGeometry(1, 1));
    const shadows = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2).translate(0, 1.5, 0)), keep(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false })), 256);
    shadows.count = 0; shadows.frustumCulled = false; sc.add(shadows);   // HQ: 1 frame めの bounding のまま 歩くと かげが きえて いた
    // すかす ための ghost(半透明の おなじ かたち)。いちどに 8 つ まで。pool の 契約は ghostPoolStep(使った ものだけ visible・使わなければ はずす)
    const ghostMat = {}; for (const k of Object.keys(MAT)) { ghostMat[k] = keep(MAT[k].clone()); ghostMat[k].transparent = true; ghostMat[k].opacity = GHOST_OPACITY; ghostMat[k].depthWrite = false; }
    const ghostGeo = (shape) => GEO[GEO_ALIAS[shape] || shape];
    for (const k of Object.keys(MAT_ALIAS)) ghostMat[k] = ghostMat[MAT_ALIAS[k]];
    return { rid: world.regionId, motion: world.motion || null, sc, hemi, sun, amb, meshes, boards, actorGeo, shadows, actors: new Map(), disposables, objects: count, lastYaw: null, seasonKey: null, refreshGround, water, waterAnim,
      setGroundColors: (cols) => { const k = cols ? cols.join(',') : ''; if ((groundOverride ? groundOverride.join(',') : '') === k) return; groundOverride = cols; paintGround(); gt.needsUpdate = true; if (gt2) gt2.needsUpdate = true; },
      occluders, hidden: new Set(), ghostPool: [], ghostTint: new Map(), rayGrid: buildRayGrid(inst, NO_FADE), inst, terr, camY: null, ghostStat: { visible: 0, attached: 0, total: 0 }, ghostMat, ghostGeo, inst, anim: { fall: MAT.fall.map, foam: MAT.foam, mist: MAT.mist, spark: MAT.spark }, prof };
  }

  // キャラの 立て看板(v2・F1): きりを かけない(fog: false。きりは けしきの 遠近感 であって、player を 消す ものでは ない)。
  // frustum culling も しない(scale で かわる plane の bounding が ずれて 消える ことが ない)
  function actorMesh(b, a) {
    let m = b.actors.get(a);
    if (!m) { m = new THREE.Mesh(b.actorGeo, new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, fog: false })); m.frustumCulled = false; m.userData.tex = null; b.actors.set(a, m); b.sc.add(m); }
    return m;
  }
  function placeActor(b, m, a, t, yaw, light, glyph) {
    const tx = glyph || actorTexture(a);
    if (tx && m.userData.tex !== tx) { m.material.map = tx.tex; m.material.needsUpdate = true; m.userData.tex = tx; }
    const size = M.ACTOR_SIZE, facing = M.facingOf(a.heading || 0, yaw);
    const lift = a.moving || a.behavior === 'walk' ? Math.abs(Math.sin((a.bob || 0) * 5)) * size * 0.08 : 0;
    const w = size * (tx && Number.isFinite(tx.aspect) && tx.aspect > 0 ? tx.aspect : 1);
    const wy = b.terr ? b.terr.walkY(a.x, a.z) : 0;   // Terrain v1: 地形 / 橋の 上に たつ
    m.position.set(a.x, wy + lift - (tx ? tx.pad * size : 0), -a.z); m.rotation.set(0, -yaw, 0);
    m.scale.set(facing === 'left' ? -w : w, size * (facing === 'back' ? 0.95 : 1), 1);
    m.material.color.setScalar(light); m.visible = true;
    tmp.position.set(a.x, wy, -a.z); tmp.rotation.set(0, 0, 0); tmp.scale.set(size * 0.32, 1, size * 0.14); tmp.updateMatrix();
    if (b.shadows.count < 256) b.shadows.setMatrixAt(b.shadows.count++, tmp.matrix);
    return t;
  }

  // ---------------- まいフレーム
  const frameMs = [];
  function draw(view, now) {
    if (lost) throw new Error('webgl context lost');
    const world = view.world;
    if (sceneOf !== world) { if (built) disposeScene(built); renderer.renderLists.dispose(); built = buildWorldScene(world); scene = built.sc; sceneOf = world; renderer.compile(scene, camera); gapsA.length = 0; lastNow3 = 0; }   // shader は 入る ときに ぜんぶ 組む(あるいて いる とちゅうで つまずかない)。古い scene の ghost・キャラも ここで すてる(v2 F2)
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    if ((view.frame || 0) % 30 === 0) refreshGlyphs();
    const c = view.camera, env = view.env || {}, mood = view.mood || {};
    // カメラ: 2D と おなじ ピンホール
    const F = W * 0.95, HOR = Math.round(H * (HOR_BASE + 0.07 * ((c.height || 1) - 1)));
    const camH = (FEET_FRAC - HOR / H) * H * c.dist / F;
    const Hv = 2 * Math.max(HOR, H - HOR);
    camera.fov = (2 * Math.atan((Hv / 2) / F)) * 180 / Math.PI; camera.aspect = W / Hv;
    camera.setViewOffset(W, Hv, 0, Hv / 2 - HOR, W, H);
    const sinY = Math.sin(c.yaw), cosY = Math.cos(c.yaw);
    // Terrain v1: カメラは player の 足もとの 高さに ついていく(ゆっくり。段で カメラが はねない)
    const pyT = built.terr ? built.terr.walkY(view.player.x, view.player.z) : 0;
    built.camY = built.camY == null ? pyT : built.camY + (pyT - built.camY) * 0.15;
    camera.position.set(c.x - sinY * c.dist, camH + built.camY, -(c.z - cosY * c.dist)); camera.rotation.set(0, -c.yaw, 0);
    camera.updateProjectionMatrix();
    // ひかり(時間・天気・場所の きぶん)。2D の TIME_LIGHT / WEATHER_LIGHT を そのまま つかう
    const TL = M.TIME_LIGHT[env.time] || M.TIME_LIGHT.day, wl = M.WEATHER_LIGHT[env.weather] || 1;
    const light = Math.max(0.35, TL.light * wl * (mood.light || 1));
    built.hemi.intensity = 1.2 * light; built.sun.intensity = 1.55 * light * (env.weather === 'sunny' ? 1 : 0.6); built.amb.intensity = 0.22 * light;
    built.hemi.color.set(TL.sky[1]); built.sun.color.set(TL.tint);
    // そら: 2D と おなじ 2 色の たてグラデーション。きり: 地平の いろに 場所の きぶんの いろ(mood.tint)を まぜる
    const skyKey = TL.sky[0] + TL.sky[1];
    if (built.skyKey !== skyKey && !(built.prof && built.prof.underwater)) { built.skyKey = skyKey; if (built.skyTex) built.skyTex.dispose(); built.skyTex = skyTexture(TL.sky[0], TL.sky[1]); built.sc.background = built.skyTex; }
    const fogC = FOGC.set(TL.sky[1]);
    if (mood.tint) fogC.lerp(TMPC.setRGB(mood.tint[0] / 255, mood.tint[1] / 255, mood.tint[2] / 255), 0.35 + (mood.tintAmt || 0));
    fogC.multiplyScalar(Math.min(1, 0.6 + light * 0.4));
    built.sc.fog.color.copy(fogC);
    const fogK = env.weather === 'rain' || env.weather === 'snow' ? 0.6 : 1;
    // きり = 遠近感(いろが 地平の いろに ちかづく)。ちかくは かけない(1400 まで)。かたい 物の 透明度は きょりで かえない
    // corridor(v2 F3): きりは 出発 → 到着 の profile を すすみぐあい(world.progress)で まぜる。地面の いろは world.setProgress の もの
    let pf = built.prof || {}, fr = pf.fog || [1400, 3800 + 1400 * (world.view || 1)];
    if (world.corridor) {
      built.refreshGround();
      const A = (M.REGION3D && M.REGION3D[world.chartFrom]) || {}, B = (M.REGION3D && M.REGION3D[world.corridorTo]) || {}, t = world.progress || 0;
      const fa = A.fog || fr, fb = B.fog || fr;
      fr = [fa[0] + (fb[0] - fa[0]) * t, fa[1] + (fb[1] - fa[1]) * t];
      pf = t < 0.5 ? A : B;
    }
    if (pf.fogColor) fogC.lerp(TMPC.set(pf.fogColor), pf.underwater ? 0.85 : 0.5);
    built.sc.fog.color.copy(fogC);
    // v2(F1): きりの 遠端は かならず player までの きょり + 900 より 遠く(雨 × 地区の mood.fog で 遠端が player の 手前に 来て、
    // player の まわりが きりの いろ 1 色に なって いた)。近端も player より 手前には しない
    const playerDist = Math.hypot(camera.position.x - view.player.x, camera.position.y, camera.position.z + view.player.z);
    built.sc.fog.near = Math.max(fr[0] * fogK, playerDist * 0.9); built.sc.fog.far = Math.max(fr[1] * fogK / (1 + (mood.fog || 0) * 3), playerDist + 900);
    if (pf.underwater) { if (!(built.sc.background && built.sc.background.isColor)) built.sc.background = new THREE.Color(); built.sc.background.copy(fogC); built.hemi.intensity *= 0.7; built.sun.intensity *= 0.4; built.amb.intensity *= 0.6; }
    // 季節: 広葉樹の 葉の いろ(大木の かんむり も)。Geometry pass(季節の 監査): 地域の seasons3d が ある ところ(山)は 季節で 地面の いろ を かえ、
    // 冬 / 雪の 日は 雪(地面・がけの 上・こけ・屋根・針葉樹 が 白く、花は かくす)
    // 2D の 正本(meguru.js の pinewall / peak): 針葉樹の 雪 = ゆき の 地域 か 冬、山の 頂の 雪 = ゆき の 地域 か 冬 か 雪の 日。
    // deepsea / star_stop は 地表の 季節 なし(2D の hasSurfaceSeasons)= 季節で かえない
    const rid = built.rid, surf = rid !== 'deepsea' && rid !== 'star_stop';
    const sk = surf ? env.season || 'summer' : 'summer', SS = built.prof && built.prof.seasons3d, snowy = !!(SS && (sk === 'winter' || env.weather === 'snow'));
    const coneSnow = rid === 'snow' || sk === 'winter', peakSnow = coneSnow || env.weather === 'snow';
    const skey = sk + (snowy ? ':snow' : '') + (coneSnow ? ':c' : '') + (peakSnow ? ':p' : '');
    if (built.seasonKey !== skey) {
      built.seasonKey = skey;
      if (built.meshes.snowcone) built.meshes.snowcone.visible = coneSnow;
      if (built.meshes.snowcap) built.meshes.snowcap.visible = peakSnow;
      for (const k of CROWN_SHAPES) {
        const m = built.meshes[k]; if (!m) continue;
        const cs = m.userData.colors, aut = sk === 'autumn' && cs;
        if (cs) { m.instanceColor.array.set(aut ? cs.autumn : cs.base); m.instanceColor.needsUpdate = true; }
        // 秋は instance の いろ(葉の palette の かんむり)= tint は かけない(ジャングル / 色つきの 木は 秋も もとの いろ)。春 / 冬は 葉の tint。小さな かんむりは tint なし
        m.material.color.set(sk === 'autumn' || k === 'crownSmall' ? SEASON_CROWN.summer : SEASON_CROWN[sk] || SEASON_CROWN.summer);
      }
      if (built.meshes.cone) built.meshes.cone.material.color.set(SEASON_CONIFER[sk] || SEASON_CONIFER.summer);   // 雪は 段の ぼうし(snowcone)で。段 そのものは みどりの まま(2D と おなじ)
      if (SS) {
        built.setGroundColors(snowy ? SS.winter : SS[sk] || null);
        for (const k of ['cliff', 'mound']) if (built.meshes[k]) built.meshes[k].material.color.set(snowy ? '#eef2f6' : '#c4c1b8');
        if (built.meshes.moss) built.meshes.moss.material.color.set(snowy ? '#f6f9fc' : '#5f8c46');
        for (const k of ['roof4', 'roof6', 'gable']) if (built.meshes[k]) built.meshes[k].material.color.set(snowy ? '#f4f7fa' : '#ffffff');
        for (const k of ['petal', 'nut8', 'blade']) if (built.meshes[k]) built.meshes[k].visible = !snowy;   // 雪の 上の 花 / 草の ほ は かくす
      }
    }
    // 立て看板は カメラの むきが かわった ときだけ むきなおす
    if (built.lastYaw === null || Math.abs(built.lastYaw - c.yaw) > 0.004) {
      built.lastYaw = c.yaw;
      for (const m of built.boards) {
        m.userData.list.forEach((it, i) => { tmp.position.set(it.x, (it.y || 0) - 0.02 * it.h, it.z); tmp.rotation.set(0, -c.yaw, 0); tmp.scale.set(it.w * m.userData.aspect / 1.04, it.h, 1); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); });
        m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
      }
    }
    // たきの 水: ながれ・あわ・しぶき(うごきを へらす 設定では とめる)
    if (animLv > 0) {
      const s = (now || 0) / 1000; built.anim.fall.offset.y = (s * 0.9) % 1; built.anim.foam.opacity = 0.6 + 0.1 * Math.sin(s * 3.1); built.anim.mist.opacity = 0.22 + 0.06 * Math.sin(s * 1.7); built.anim.spark.opacity = 0.7 + 0.25 * Math.sin(s * 2.6);
      // Water v2: 川は ながれ(v を ずらす)、海は 岸へ よせる 波(u を ずらす)+ 岸の あわの 明滅。頂点の simulation は しない(かるい material の アニメ だけ)
      for (const a of built.waterAnim) { if (a.map) { a.map.offset.x = (s * a.dx) % 1; a.map.offset.y = (s * a.dy) % 1; } if (a.foam) a.foam.opacity = 0.42 + 0.2 * Math.sin(s * 1.9); }
    }
    // キャラ
    for (const m of built.actors.values()) m.visible = false;
    built.shadows.count = 0;
    const charLight = Math.min(1, 0.45 + light * 0.6);
    const player = view.player;
    const farCull = 2600;
    for (const a of view.party || []) placeActor(built, actorMesh(built, a), a, 0, c.yaw, charLight);
    for (const a of view.residents || []) { if (Math.hypot(a.x - player.x, a.z - player.z) < farCull) placeActor(built, actorMesh(built, a), a, 0, c.yaw, charLight); }
    const pg = typeof o.playerGlyph === 'function' ? o.playerGlyph() : '🐣';
    const pm = actorMesh(built, player);
    placeActor(built, pm, player, 0, c.yaw, charLight, glyphTexture(pg, o.wrapCtx || null, 'p'));
    built.shadows.instanceMatrix.needsUpdate = true;
    fadeOccluders(built, camera.position.x, -camera.position.z, fade ? player : null, camH, view.frame || 0);
    // player の 絵が この frame で 見えるか(F1)。座標に いる のに 描かれない なら perf 表示 と stats に 出る(frame ごとに 判定)
    playerVis = billboardVisible(pm, built.sc.fog.far, playerDist);
    if (!playerVis.ok) playerMiss++;
    if (diag.on && (view.frame || 0) % 4 === 0) { diag.ray = rayProbe(built, player); diag.rayChecks++; if (!diag.ray.seen) diag.occlFrames++; }
    adaptDpr(now || 0);
    diag.frames++; diag.lastPlayer = player;
    renderer.render(scene, camera);
    drawOverlay(view, now);
    if (t0) { frameMs.push(performance.now() - t0); if (frameMs.length > 240) frameMs.shift(); }
  }

  // カメラと player の あいだの かたい 物は すかす(2D の「てまえの 物は すける」と おなじ やくわり)。
  // InstancedMesh の その 物だけ 大きさ 0 に して、半透明の ghost を かわりに おく
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let fade = true, animLv = 2, playerVis = { ok: true, why: '' }, playerMiss = 0;
  // 実機 診断(&perf=1 の ときだけ。production の UI には 出さない): ray で player が ほんとうに 見えて いるか・長い frame・解像度
  const diag = { frames: 0, lastPlayer: null, on: false, ray: { seen: 3, of: 3, blk: '' }, occlFrames: 0, rayChecks: 0, uploads: 0, longFrames: 0, adaptive: true, dprSteps: [] };
  // Geometry pass(HQ-1 / HQ-3): ①かわった instance だけ GPU へ(addUpdateRange。以前は 形 ごとの instance 全部 = 数千 × 64 byte を
  // すかしが 出入り する たびに 送り なおして いた → iPhone で カクつき)②線分の ふちで 出たり 入ったり しない ように、
  // いちど すかした 物は 線分から はずれて FADE_HOLD frame(≒ 0.1 秒)は すかした まま(ちらつきが 残像に 見える の を ふせぐ)
  // Geometry pass(HQ-1): 候補(pickOccluders = 円の 判定)の うち、カメラ → player の ray(足 / むね / あたま × 左 / 中 / 右)に
  // ほんとうに あたる 物 だけ すかす。円の 判定 だけ では 道の 両がわの ビル ぜんぶ が すけて、画面が 半透明の 箱で おおわれて いた(city で 131 ghost)
  const fadeTargets = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function rayHitsOccluder(b, oc) {
    for (const rf of oc.refs) {
      const m = b.meshes[rf.shape]; if (!m) continue;
      tmp.position.set(rf.it.x, rf.it.y, rf.it.z); tmp.rotation.set(rf.it.rx || 0, rf.it.ry, rf.it.rz || 0); tmp.scale.set(rf.it.sx, rf.it.sy, rf.it.sz); tmp.updateMatrix();
      probe.geometry = m.geometry; probe.material = m.material; probe.matrixWorld.copy(tmp.matrix);
      for (const tg of fadeTargets) { rdir.subVectors(tg, camera.position); const dist = rdir.length(); rdir.divideScalar(dist); rc.set(camera.position, rdir); rc.near = 0; rc.far = Math.max(0, dist - M.ACTOR_SIZE * 0.3); rayHits.length = 0; probe.raycast(rc, rayHits); if (rayHits.length) return true; }
    }
    return false;
  }
  function fadeOccluders(b, ex, ez, player, camH, frame) {
    const cand = pickOccluders(b.occluders, ex, ez, player, M.ACTOR_SIZE, camH), want = new Set();
    if (player && cand.size) {
      const S = M.ACTOR_SIZE, rx = Math.cos(camera.rotation.y) * S * 0.3, rz = -Math.sin(camera.rotation.y) * S * 0.3;   // カメラの 右
      const gy = b.terr ? b.terr.walkY(player.x, player.z) : 0;
      fadeTargets[0].set(player.x, gy + S * 0.2, -player.z); fadeTargets[1].set(player.x, gy + S * 0.55, -player.z); fadeTargets[2].set(player.x, gy + S * 0.9, -player.z);
      fadeTargets[3].set(player.x - rx, gy + S * 0.55, -player.z - rz); fadeTargets[4].set(player.x + rx, gy + S * 0.55, -player.z + rz);
      for (const oc of cand) if (rayHitsOccluder(b, oc)) want.add(oc);
    }
    for (const oc of want) oc.lastWant = frame;
    if (player) for (const oc of b.hidden) if (!want.has(oc) && frame - (oc.lastWant || 0) <= FADE_HOLD) want.add(oc);
    const dirty = new Set();
    const mark = (m, i) => { m.instanceMatrix.addUpdateRange(i * 16, 16); dirty.add(m); };
    for (const oc of b.hidden) if (!want.has(oc)) { for (const rf of oc.refs) { const m = b.meshes[rf.shape]; tmp.position.set(rf.it.x, rf.it.y, rf.it.z); tmp.rotation.set(rf.it.rx || 0, rf.it.ry, rf.it.rz || 0); tmp.scale.set(rf.it.sx, rf.it.sy, rf.it.sz); tmp.updateMatrix(); m.setMatrixAt(rf.i, tmp.matrix); mark(m, rf.i); } b.hidden.delete(oc); }
    for (const oc of want) if (!b.hidden.has(oc)) { for (const rf of oc.refs) { const m = b.meshes[rf.shape]; m.setMatrixAt(rf.i, ZERO); mark(m, rf.i); } b.hidden.add(oc); }
    for (const m of dirty) m.instanceMatrix.needsUpdate = true;
    diag.uploads = dirty.size ? diag.uploads + 1 : diag.uploads;
    // ghost: pool の 契約は ghostPoolStep(使った ものだけ visible・1 frame 使わなければ scene から はずす)
    const wanted = [], refOf = new Map(), ocOf = new Map();
    for (const oc of b.hidden) for (const rf of oc.refs) { const key = oc.ob.id + ':' + rf.shape + ':' + rf.i; wanted.push(key); refOf.set(key, rf); ocOf.set(key, oc); }
    b.ghostStat = ghostPoolStep(b.ghostPool, wanted, frame, {
      attach: (g) => { if (!g.mesh) { g.mesh = new THREE.Mesh(b.ghostGeo('box'), b.ghostMat.wbox); g.mesh.renderOrder = 2; } b.sc.add(g.mesh); },
      detach: (g) => { if (g.mesh) b.sc.remove(g.mesh); },
      dispose: (g) => { g.mesh = null; },
      place: (g, key) => { const rf = refOf.get(key), oc = ocOf.get(key), m = g.mesh; m.geometry = b.ghostGeo(rf.shape); m.material = ghostMatFor(b, rf, oc && (oc.vr > 160 || oc.top > 380)); m.position.set(rf.it.x, rf.it.y, rf.it.z); m.rotation.set(rf.it.rx || 0, rf.it.ry, rf.it.rz || 0); m.scale.set(rf.it.sx, rf.it.sy, rf.it.sz); },
    });
    for (const g of b.ghostPool) if (g.mesh) g.mesh.visible = g.visible;
  }

  // Geometry pass(2026-10-02・Human QA AD v1 HQ-1「残像」): すかしの ghost は もとの 物と おなじ いろ(material の いろ × instance の いろ)。
  // AD v1 で 葉 / 家 / かべの material を 白 + instance color に した ため、ghost が 白い 半透明の かたち に なり 残像に 見えて いた
  // 大きな 物(家・がけ・遺跡 など)の ghost は うすく(大きな 半透明の 面が 画面を おおって 残像に 見えない ように)
  function ghostMatFor(b, rf, big) {
    const im = b.meshes[rf.shape], base = b.ghostMat[rf.shape];
    if (!im || !base) return base;
    if (im.instanceColor) im.getColorAt(rf.i, col); else col.setRGB(1, 1, 1);
    col.multiply(im.material.color);
    const key = rf.shape + ':' + col.getHexString() + (big ? ':b' : '');
    let m = b.ghostTint.get(key);
    if (!m) { m = base.clone(); m.color.copy(col); m.opacity = big ? GHOST_OPACITY_BIG : GHOST_OPACITY; b.ghostTint.set(key, m); }
    return m;
  }
  // ray 診断(&perf=1): カメラ → player の 足 / むね / あたま の 3 本。かたちの 三角形に あたれば その 本は 見えない。
  // stats の「player ok」(立て看板が 描かれる か)と ちがい、人の 目で 見える か を はかる(Human QA HQ-2: stats ok でも 見えない)
  const rc = new THREE.Raycaster(), probe = new THREE.Mesh(), rayHits = [], rv = new THREE.Vector3(), rdir = new THREE.Vector3();
  probe.matrixAutoUpdate = false;
  function rayProbe(b, player) {
    const S = M.ACTOR_SIZE, cp = camera.position, hidden = new Set();
    for (const oc of b.hidden) for (const rf of oc.refs) hidden.add(rf.shape + ':' + rf.i);
    let seen = 0, blk = '';
    const gy = b.terr ? b.terr.walkY(player.x, player.z) : 0;
    for (const k of [0.25, 0.55, 0.85]) {
      rv.set(player.x, gy + S * k, -player.z); rdir.subVectors(rv, cp); const dist = rdir.length(); rdir.divideScalar(dist);
      rc.set(cp, rdir); rc.near = 0; rc.far = Math.max(0, dist - S * 0.35);
      let hit = '';
      for (const [shape, i] of rayCandidates(b.rayGrid, cp.x, cp.z, rv.x, rv.z)) {
        if (hidden.has(shape + ':' + i)) continue;
        const m = b.meshes[shape], it = b.inst[shape] && b.inst[shape][i]; if (!m || !it) continue;
        tmp.position.set(it.x, it.y, it.z); tmp.rotation.set(it.rx || 0, it.ry, it.rz || 0); tmp.scale.set(it.sx, it.sy, it.sz); tmp.updateMatrix();
        probe.geometry = m.geometry; probe.material = m.material; probe.matrixWorld.copy(tmp.matrix);
        rayHits.length = 0; probe.raycast(rc, rayHits);
        if (rayHits.length) { hit = shape; break; }
      }
      if (hit) blk = hit; else seen++;
    }
    return { seen, of: 3, blk };
  }
  // 解像度の 自動調整(Human QA HQ-3 カクつき): 90 frame の 間かくの 中央値が 22ms を こえたら pixelRatio を 0.25 さげる(1.5 まで・上げなおさない)。
  // 透明 fade は つかわない。headless の しゃしんは setAdaptiveDpr(false) で 固定
  const gapsA = []; let lastNow3 = 0;
  function adaptDpr(now) {
    if (lastNow3) { const g = now - lastNow3; if (g > 50 && g < 1000) diag.longFrames++; if (g < 250) gapsA.push(g); }
    lastNow3 = now;
    if (!diag.adaptive || gapsA.length < 90) return;
    const xs = gapsA.splice(0).sort((a, b) => a - b), med = xs[xs.length >> 1], dpr = renderer.getPixelRatio();
    if (med > 22 && dpr > 1.5 + 1e-6) { const nd = Math.max(1.5, dpr - 0.25); renderer.setPixelRatio(nd); renderer.setSize(W, H, false); diag.dprSteps.push(nd); }
  }
  // うえの 2D canvas: 名まえ と ふきだし だけ(3D の いちを 画面に うつして えがく)
  const v3 = new THREE.Vector3();
  function toScreen(x, y, z) { v3.set(x, y, -z).project(camera); return v3.z > 1 ? null : { sx: (v3.x + 1) / 2 * W, sy: (1 - v3.y) / 2 * H }; }
  function drawOverlay(view, now) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    // Geometry pass(天気の 監査): 3D でも 雨 / 雪 の つぶ を 画面に(2D では 2D の canvas が えがく。3D では なかった)。うごきを へらす 設定では 出さない
    const wx = view.env && view.env.weather, under = built && built.prof && built.prof.underwater;
    if (animLv > 0 && !under && (wx === 'rain' || wx === 'snow')) {
      const t = (now || 0) / 1000, n = wx === 'rain' ? 70 : 55;
      ctx.save();
      if (wx === 'rain') { ctx.strokeStyle = 'rgba(210,225,245,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < n; i++) { const x = (hash01('rx' + i) * W + t * 60) % W, y = (hash01('ry' + i) * H + t * 900) % H; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14); } ctx.stroke(); }
      else { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < n; i++) { const x = (hash01('sx' + i) * W + Math.sin(t * 0.8 + i) * 14) % W, y = (hash01('sy' + i) * H + t * (40 + hash01('sv' + i) * 40)) % H, r = 1.4 + hash01('sr' + i) * 1.8; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
      ctx.restore();
    }
    // 季節の はっぱ / はなびら(2026-10-02・2D の 正本 ambLayer 'leaves' と おなじ いろ と かず: 春 = もも、夏 = みどり、秋 = だいだい、冬 = かれ色)。
    // 地区の mood.anim(なければ 地域の motion の 1 つめ)が leaves の とき だけ(2D と おなじ: 段で かず だけ かわる)
    const amb = (view.mood && view.mood.anim) || (built && built.motion && built.motion[0]) || null;
    if (!under && amb === 'leaves') {
      const sk = view.env && view.env.season, n = LEAF_N[animLv] || 0, t = (now || 0) * 0.001, nw = now || 0;
      ctx.save(); ctx.fillStyle = sk === 'autumn' ? 'rgba(226,150,70,1)' : sk === 'spring' ? 'rgba(255,200,215,1)' : sk === 'winter' ? 'rgba(198,202,180,1)' : 'rgba(150,196,110,1)';
      for (let i = 0; i < n; i++) {
        const y = ((i * 137 + nw * (0.10 + (i % 4) * 0.035) * 1.2) % (H + 60)) - 30, x = (((i * 211 + Math.sin(t * (0.7 + (i % 3) * 0.2) + i) * 34) % (W + 40)) + W + 40) % (W + 40) - 20, r = 3 + (i % 3);
        ctx.globalAlpha = 0.26 + 0.3 * ((i % 4) / 3); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, Math.sin(t * 2 + i) * 1.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // こな雪(2D の ambLayer 'snow': ゆき の 地区。かぜに ながされて よこへ すべる。かず = 2D の 2 倍の 組)
    if (!under && amb === 'snow') {
      const m2 = (LEAF_N[animLv] || 0) * 2, t = (now || 0) * 0.001, nw = now || 0, wrap = (v, sp) => ((v % sp) + sp) % sp;
      ctx.save(); ctx.fillStyle = '#ffffff';
      for (let i = 0; i < m2; i++) { const y = wrap(i * 89 + nw * (0.03 + (i % 5) * 0.012), H + 30) - 15, x = wrap(i * 173 + Math.sin(t * 0.6 + i) * 26 + nw * 0.012, W + 30) - 15; ctx.globalAlpha = 0.22 + 0.4 * ((i % 3) / 2); ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.7, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    const p0 = view.player;
    for (const a of [...(view.party || []), ...(view.residents || [])]) {
      const d = Math.hypot(a.x - p0.x, a.z - p0.z);
      if (d > 700) continue;
      const s = toScreen(a.x, M.ACTOR_SIZE * 1.05, a.z);
      if (!s) continue;
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      if (a.say && a.sayFor > 0) {
        const tw = Math.min(W * 0.7, ctx.measureText(a.say).width + 16);
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(s.sx - tw / 2, s.sy - 30, tw, 24, 10) : ctx.rect(s.sx - tw / 2, s.sy - 30, tw, 24); ctx.fill();
        ctx.fillStyle = '#333'; ctx.fillText(a.say, s.sx, s.sy - 11);
      } else if (a === view.nearest && a.label) {
        // 2D と おなじ:いちばん ちかい 住人に 名まえ・していること
        const text = a.label + (a.behavior && M.VERBS && M.VERBS[a.behavior] ? '・' + M.VERBS[a.behavior] : '');
        ctx.font = 'bold 13px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeText(text, s.sx, s.sy - 3);
        ctx.fillStyle = '#fff'; ctx.fillText(text, s.sx, s.sy - 3);
      }
    }
  }

  function disposeScene(b) {
    for (const m of b.actors.values()) { b.sc.remove(m); m.material.dispose(); }
    for (const g of b.ghostPool) if (g.mesh) b.sc.remove(g.mesh);
    b.ghostPool.length = 0; b.hidden.clear();
    for (const m of b.ghostTint.values()) m.dispose(); b.ghostTint.clear();
    for (const m of Object.values(b.meshes)) m.dispose();
    for (const m of b.boards) m.dispose();
    for (const m of b.water.meshes) b.sc.remove(m);
    b.shadows.dispose();
    if (b.skyTex) b.skyTex.dispose();
    for (const x of b.disposables) if (x && x.dispose) x.dispose();
  }
  return {
    draw,
    // 隠す まえに 1 かい 全面を けす(隠れた canvas に まえの frame を のこさない。v2 F2)
    show(on) { if (!on && !lost) { try { renderer.clear(true, true, true); } catch (_) { /* context が ない */ } } gl.style.display = on ? '' : 'none'; if (on) place(); },
    resize(n) { ctx = n.ctx || ctx; W = n.W || W; H = n.H || H; renderer.setSize(W, H, false); place(); },
    stats() {
      const info = renderer.info, xs = frameMs.slice().sort((a, b) => a - b), pick = (q) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * q))] : 0);
      return { calls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures, geometries: info.memory.geometries,
        objects: built ? built.objects : 0, actors: built ? built.actors.size : 0, drawMsAvg: xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0, drawMsP95: pick(0.95), pixelRatio: renderer.getPixelRatio(),
        ghosts: built ? Object.assign({ hiddenObjects: built.hidden.size, owners: [...built.hidden].map((oc) => oc.ob.id) }, built.ghostStat) : null,
        water: built ? { kind: built.water.kind, meshes: built.water.meshes.map((m) => m.name), ponds: built.water.ponds || 0 } : null,
        player: Object.assign({ missFrames: playerMiss }, playerVis),
        diag: { on: diag.on, ray: diag.ray, occlFrames: diag.occlFrames, rayChecks: diag.rayChecks, uploads: diag.uploads, longFrames: diag.longFrames, dprSteps: diag.dprSteps.slice() } };
    },
    loseContext() { const ext = renderer.getContext().getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
    setOccluderFade(on) { fade = !!on; },
    setAnimLevel(v) { animLv = v; },
    setDiag(on) { diag.on = !!on; },
    // QA: いまの カメラ と player で すぐ ray を しらべる(headless の walk audit 用)。frames = 描いた frame の 数
    probeNow() { return built && diag.lastPlayer ? Object.assign({ frames: diag.frames, ghosts: built.ghostStat.visible, hidden: built.hidden.size }, rayProbe(built, diag.lastPlayer)) : null; },
    frames() { return diag.frames; },
    triBreakdown() { if (!built) return null; const out = {}; for (const [k, m] of Object.entries(built.meshes)) { const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3; out[k] = { inst: m.count, tri: n, total: n * m.count }; } return out; },
    setAdaptiveDpr(on) { diag.adaptive = !!on; },
    destroy() {
      if (built) disposeScene(built);
      for (const t of texCache.values()) if (t && t.tex) t.tex.dispose();
      texCache.clear(); renderer.dispose();
      if (gl.parentNode) gl.parentNode.removeChild(gl);
      canvas2d.style.zIndex = ''; canvas2d.style.position = '';
    },
  };
}
