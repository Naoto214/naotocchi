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
  let r3d = null, failed = false, active = false, fadeOn = true, diagWant = false, failReason = null;
  let ctx = o.ctx, W = o.W, H = o.H;
  const want = (view) => {
    const w = view && view.world;
    return !opts.force2d && !failed && !!w && !w.corridor && !!w.world3d && M.WORLD3D_REGIONS.has(w.regionId);
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
    ctx.save(); ctx.font = '11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((t, i) => { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(4, 40 + i * 14, ctx.measureText(t).width + 6, 14); ctx.fillStyle = '#fff'; ctx.fillText(t, 7, 41 + i * 14); });
    ctx.restore();
  }
  function fail(err) {
    failed = true; failReason = String((err && err.message) || err || 'unknown');
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
          if (!r3d) { r3d = create3DRenderer(M, Object.assign({}, o, { ctx, W, H }), () => fail(new Error('webgl context lost'))); r3d.setOccluderFade(fadeOn); r3d.setAnimLevel(animLv); r3d.setDiag(diagWant); }
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
    loseContext() { if (r3d) r3d.loseContext(); },   // QA: context lost の ためし
    setOccluderFade(on) { fadeOn = !!on; if (r3d) r3d.setOccluderFade(fadeOn); },   // QA: すかし あり / なし の くらべ
    // QA: 3D の キャラの しらべ もの(表情 QA が つかう)。ふだんは off
    setDiag3d(on) { diagWant = !!on; if (r3d) r3d.setDiag(diagWant); },
    diag3d() { return { active, failed, failReason, webgl2: webgl2Available(), detail: r3d && active ? r3d.diag() : null }; },
  };
  return api;
}

// ---------------------------------------------------------------- 3D レンダラー
function hash01(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
const LITTER = new Set(['🍂', '🍃', '🍁', '🌰', '🌱']);
const SEASON_CROWN = { spring: '#6fae55', summer: '#3f8a3c', autumn: '#c7843a', winter: '#8aa39a' };
const SEASON_CONIFER = { spring: '#2f6b3f', summer: '#27603a', autumn: '#2f5e3c', winter: '#3d5f52' };

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
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2));
  let ctx = o.ctx, W = o.W, H = o.H;
  renderer.setSize(W, H, false);
  place();

  const camera = new THREE.PerspectiveCamera(50, 1, 20, 5200);
  camera.rotation.order = 'YXZ';
  const texCache = new Map();
  let sceneOf = null, scene = null, built = null;
  const tmp = new THREE.Object3D(), col = new THREE.Color();

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
    // player は wrapCtx が Home の character illustration を canvas へ描く。
    // iOS Safari ではその canvas を WebGL texture にすると mesh/map/upload が成功扱いでも透明になることがある。
    // player だけは native glyph の origin-clean canvas を正本にする。住民は pngTexture(ImageBitmap)なので影響しない。
    const player = ns === 'p';
    const c = M.glyphSprite(emoji, 128, player ? null : wrap, player ? 'pn' : ns);
    const t = c ? { tex: canvasTexture(c), aspect: c.width / c.height, pad: 2 / c.height, src: c, emoji, wrap: player ? null : wrap, ns: player ? 'pn' : ns, playerNative: player } : null;
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
  // キャラの PNG(読みこみ前は 絵文字で まつ。読めたら さしかえる)。
  // 表情(sprite.asset)は 2D と おなじ spriteFor から くる(きもちの 名まえは ここに ない)。表情の えが まだ よめない あいだは base(ふつう)の
  // texture。texture は asset ごとに 1 まい だけ つくって つかいまわす(表情が かわっても decode しなおさず、map を さしかえる だけ)
  //
  // Safari(WebKit)対策: decoding='async' の <img> を そのまま texImage2D に わたすと、decode 前は 透明な 画素が
  // GPU に あがる ことが ある(alphaTest で ぜんぶ すてられ、キャラだけ きえる。Chromium は upload で 同期 decode する ので おきない)。
  // そこで img.decode() の あとで canvas に うつし、画素が 入って いる ことを たしかめてから CanvasTexture に する。
  // それまでは base → 絵文字 → 色の まる の 順で、かならず なにかを 出す
  function actorTexture(a) {
    const s = M.spriteFor(a, 'front');
    for (const asset of [s && s.asset, s && s.base]) {
      if (!asset) continue;
      const key = 'a:' + asset;
      if (texCache.has(key)) return texCache.get(key);
      const t = pngTexture(asset);
      if (t) { texCache.set(key, t); return t; }
    }
    return glyphTexture(a.emoji || '🐾', o.wrapCtx || null, 'c') || solidTexture();
  }
  // asset → { state: 'wait' | 'fetching' | 'ready' | 'error', px, t }
  // iOS Safari の CDN preview では <img> → canvas が origin-clean でない場合がある。
  // その状態を px=-1 のまま ready 扱いすると CanvasTexture の GPU upload が失敗しても mesh/map は存在し、
  // 「影だけ・住民本体なし」になる。actor PNG は fetch → Blob → ImageBitmap を正本経路にして canvas を通さない。
  const pngState = new Map();
  function pngTexture(asset) {
    let st = pngState.get(asset);
    if (!st) { st = { state: 'wait', tries: 0, px: null, t: null, err: null }; pngState.set(asset, st); }
    if (st.state === 'ready') return st.t;
    if (st.state !== 'wait') return null;
    st.state = 'fetching';
    const fail = (e) => { st.state = 'error'; st.err = String((e && e.message) || e); };
    const fromBlob = async () => {
      try {
        const res = await fetch(asset, { cache: 'force-cache', credentials: 'same-origin' });
        if (!res.ok) throw new Error('actor png HTTP ' + res.status);
        const blob = await res.blob();
        if (typeof createImageBitmap !== 'function') throw new Error('createImageBitmap unavailable');
        const bm = await createImageBitmap(blob, { imageOrientation: 'flipY' });
        if (!bm || !bm.width || !bm.height) throw new Error('empty ImageBitmap');
        const tex = new THREE.Texture(bm);
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 2; tex.needsUpdate = true;
        st.px = 'bitmap';
        st.t = { tex, aspect: bm.width / bm.height, pad: 0, src: bm, asset, bitmap: true };
        st.state = 'ready';
      } catch (e) { fail(e); }
    };
    fromBlob();
    return null;
  }
  // さいごの 手: 絵文字も つくれない ときの 色の まる(きえる より まし)
  let solidTex = null;
  function solidTexture() {
    if (solidTex) return solidTex;
    const c = doc.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#f4a261'; g.beginPath(); g.arc(32, 36, 26, 0, TAU); g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a4a1f'; g.stroke();
    solidTex = { tex: canvasTexture(c), aspect: 1, pad: 0, src: c, solid: true };
    return solidTex;
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
    const g = new THREE.BoxGeometry(2, 1, 2, 6, 5, 2), pos = g.attributes.position, uv = g.attributes.uv;
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
    const lo = world.minX != null ? world.minX : -world.halfW, hi = world.maxX != null ? world.maxX : world.halfW;
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    // 地面: ground の 2 色で まだらに(のっぺり しない。1 まいの 小さな texture を くりかえす)
    const gc = doc.createElement('canvas'); gc.width = gc.height = 128;
    const gg = gc.getContext('2d'); gg.fillStyle = world.ground[0]; gg.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) { gg.fillStyle = i % 3 ? world.ground[1] : world.ground[0]; gg.globalAlpha = 0.18; gg.beginPath(); gg.arc(hash01('gx' + i) * 128, hash01('gz' + i) * 128, 6 + hash01('gr' + i) * 14, 0, TAU); gg.fill(); }
    const gt = keep(canvasTexture(gc)); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set((hi - lo + 4000) / 420, (world.len + 4000) / 420);
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(hi - lo + 4000, world.len + 4000)), keep(new THREE.MeshLambertMaterial({ map: gt })));
    ground.rotation.x = -Math.PI / 2; ground.position.set((lo + hi) / 2, 0, -world.len / 2);
    sc.add(ground);
    // みち と スポット(道の 面)
    const pathMat = keep(new THREE.MeshLambertMaterial({ color: world.path }));
    const segs = world.segments || [];
    const road = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), pathMat, Math.max(1, segs.length));
    segs.forEach((sg, i) => {
      const dx = sg.b.x - sg.a.x, dz = sg.b.z - sg.a.z, L = Math.hypot(dx, dz) || 1;
      // 箱の ながさ(ローカル z)を 道の むき(three では (dx, -dz))へ
      tmp.position.set((sg.a.x + sg.b.x) / 2, 0.6, -(sg.a.z + sg.b.z) / 2); tmp.rotation.set(0, Math.atan2(dx, -dz), 0);
      tmp.scale.set(sg.half * 2, 1.2, L); tmp.updateMatrix(); road.setMatrixAt(i, tmp.matrix);
    });
    road.count = segs.length; sc.add(road);
    // スポット: 2D の worldLayers と おなじ わけかた(water の spot は 池、ほかは 道の 面)
    const disc = keep(new THREE.CylinderGeometry(1, 1, 1, 28));
    // たき(ランドマーク)が たきつぼ を もつ spot は、spot の 池の かわりに その たきつぼ を つかう
    const ownPool = new Set(objects.filter((ob) => ob.spot && ob.parts.some((pt) => pt.shape === 'pool')).map((ob) => ob.spot));
    const land = (world.spots || []).filter((q) => q.kind !== 'water'), ponds = (world.spots || []).filter((q) => q.kind === 'water' && !ownPool.has(q.id));
    const pads = new THREE.InstancedMesh(disc, pathMat, Math.max(1, land.length));
    land.forEach((q, i) => { tmp.position.set(q.x, 0.7, -q.z); tmp.rotation.set(0, 0, 0); tmp.scale.set(q.r * 0.85, 1.4, q.r * 0.85); tmp.updateMatrix(); pads.setMatrixAt(i, tmp.matrix); });
    pads.count = land.length; sc.add(pads);
    // 地面の まだら(areas: したくさ など)と 草の たば(marks)。2D と おなじ データ
    const areas = world.areas || [];
    const patch = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), keep(new THREE.MeshLambertMaterial({ color: world.ground[1], transparent: true, opacity: 0.55, depthWrite: false })), Math.max(1, areas.length));
    areas.forEach((a, i) => { tmp.position.set(a.x, 0.3, -a.z); tmp.rotation.set(0, a.ang || 0, 0); tmp.scale.set(a.w / 2, 1, a.h / 2); tmp.updateMatrix(); patch.setMatrixAt(i, tmp.matrix); });
    patch.count = areas.length; sc.add(patch);
    const marks = world.marks || [];
    const tuft = new THREE.InstancedMesh(keep(new THREE.ConeGeometry(1, 1, 3).translate(0, 0.5, 0)), keep(new THREE.MeshLambertMaterial({ color: (world.markStyle && world.markStyle.color) || world.ground[1], flatShading: true })), Math.max(1, marks.length));
    marks.forEach((mk, i) => { const r = mk.size * 0.45; tmp.position.set(mk.x, 0, -mk.z); tmp.rotation.set(0, hash01('m' + i) * TAU, 0); tmp.scale.set(r, mk.size * 1.4, r); tmp.updateMatrix(); tuft.setMatrixAt(i, tmp.matrix); });
    tuft.count = marks.length; sc.add(tuft);

    // かたい 物・草花: かたち ごとに InstancedMesh(draw call を ふやさない)
    const up = (g) => { g.translate(0, 0.5, 0); return keep(g); };
    const GEO = {
      trunk: up(new THREE.CylinderGeometry(0.72, 1, 1, 7)), cone: up(new THREE.ConeGeometry(1, 1, 8)), crown: keep(new THREE.IcosahedronGeometry(1, 1)),
      cap: keep(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2)), rock: (() => { const g = new THREE.DodecahedronGeometry(1, 0); g.scale(1, 1, 1); g.translate(0, 0.35, 0); return keep(g); })(),
      log: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 8); g.rotateZ(Math.PI / 2); g.translate(0, 1, 0); return keep(g); })(), stump: up(new THREE.CylinderGeometry(0.9, 1, 1, 9)),
      pool: (() => { const g = new THREE.CircleGeometry(1, 24); g.rotateX(-Math.PI / 2); g.translate(0, 2.4, 0); return keep(g); })(), plank: up(new THREE.BoxGeometry(1, 1, 1)), fall: up(new THREE.PlaneGeometry(1, 1)),
      cliff: up(ruggedBox()), moss: keep(new THREE.IcosahedronGeometry(1, 1)), shore: keep(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).translate(0, 1.8, 0)),
      foam: keep(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2).translate(0, 3.2, 0)), wet: keep(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).translate(0, 1.0, 0)), mist: keep(new THREE.IcosahedronGeometry(1, 1)), litter: keep(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 1.6, 0)),
    };
    const flat = (color) => keep(new THREE.MeshLambertMaterial({ color, flatShading: true }));
    const MAT = { trunk: flat('#6b4b32'), cone: flat('#2f6b3f'), crown: flat('#4f9a47'), cap: flat('#d8a6d8'), rock: flat('#8c8f8a'), log: flat('#7a5436'), stump: flat('#8a6440'),
      pool: keep(new THREE.MeshPhongMaterial({ map: keep(waterTexture()), transparent: true, opacity: 0.92, shininess: 70, specular: '#d8ecff' })), shore: keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(world.ground[1]).multiplyScalar(0.62) })),
      cliff: keep(new THREE.MeshLambertMaterial({ map: keep(cliffTexture()), color: '#a9a8a0' })), moss: flat('#5f8c46'), plank: flat('#9a7550'),
      fall: keep(new THREE.MeshLambertMaterial({ map: keep(fallTexture()), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })),
      foam: keep(new THREE.MeshBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.66, depthWrite: false })),
      wet: keep(new THREE.MeshLambertMaterial({ map: keep(wetTexture(world.ground[1])), transparent: true, depthWrite: false })), mist: keep(new THREE.MeshBasicMaterial({ color: '#f2f8fb', transparent: true, opacity: 0.24, depthWrite: false })) };
    const inst = {};   // shape → [{ x, y, z, sx, sy, sz, ry, tint }]
    const board = new Map();   // emoji → [{ x, z, w, h }]
    const occluders = [];   // かたい 物(カメラと player の あいだに 入ったら すかす)
    let cur = null;
    // 水・あわ・しぶき・ひらたい 石は すかさない(かたい 物では ない)
    const NO_FADE = new Set(['pool', 'shore', 'foam', 'mist', 'fall', 'wet']);
    const push = (shape, it) => { const l = inst[shape] || (inst[shape] = []); if (cur && !NO_FADE.has(shape)) cur.refs.push({ shape, i: l.length, it }); l.push(it); };
    let count = 0;
    for (const ob of objects) {
      count++;
      cur = ob.collision && ob.solid ? { ob, r: Math.max(ob.collision.hw, ob.collision.hd), refs: [] } : null;
      if (cur) occluders.push(cur);
      // あたりの 箱の hw 軸(せかい (sin a, cos a))を ローカル x へ: three では θ = π/2 − a
      const t = hash01(ob.id), ry = Math.PI / 2 - (ob.rot || 0);
      for (const pt of ob.parts) {
        const px = ob.x + (pt.dx || 0), pz = -(ob.z + (pt.dz || 0));
        switch (pt.shape) {
          case 'trunk': push('trunk', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'cone': push('cone', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'crown': push(ob.type === 'bigtree' ? 'crownBig' : 'crown', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'cap': push('cap', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r, ry: 0, tint: t }); break;
          case 'rock': push('rock', { x: px, y: 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: ry + t, tint: t }); break;
          case 'log': push('log', { x: px, y: 0, z: pz, sx: pt.len, sy: pt.r, sz: pt.r, ry, tint: t }); break;
          case 'stump': push('stump', { x: px, y: 0, z: pz, sx: pt.r, sy: pt.h, sz: pt.r, ry: t * TAU, tint: t }); break;
          case 'pool': {
            const rx = pt.rx || pt.r, rz = pt.rz || pt.r, pr = pt.ang != null ? Math.PI / 2 - pt.ang : 0, py = pt.y || 0;
            if (!pt.bare) push('shore', { x: px, y: py, z: pz, sx: rx * 1.07 + 10, sy: 1, sz: rz * 1.07 + 10, ry: pr, tint: 0.5 });
            push('pool', { x: px, y: py, z: pz, sx: rx, sy: 1, sz: rz, ry: pr, tint: 0.5 }); break;
          }
          case 'deep': push('shore', { x: px, y: 0.4, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;   // たきつぼの 下の くらい まる(水を とおして ふかく 見える)
          case 'wet': push('wet', { x: px, y: 0, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;
          case 'plank': push('plank', { x: px, y: 0, z: pz, sx: pt.len, sy: 8, sz: pt.w, ry, tint: t }); break;
          // 面の むき f(せかい)→ three の y 回転 θ = atan2(fx, −fz)
          case 'fall': push('fall', { x: px, y: 0, z: pz, sx: pt.w, sy: pt.h, sz: 1, ry: pt.fx != null ? Math.atan2(pt.fx, -pt.fz) : 0, tint: 0.5 }); break;
          case 'cliff': push('cliff', { x: px, y: pt.y || 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: pt.ang != null ? Math.PI / 2 - pt.ang : 0, tint: t }); break;
          case 'moss': push('moss', { x: px, y: pt.y, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: t }); break;   // こけの もりあがり(半分 うまる)
          case 'foam': push('foam', { x: px, y: 0, z: pz, sx: pt.rx, sy: 1, sz: pt.rz, ry: Math.PI / 2 - pt.ang, tint: 0.5 }); break;
          case 'mist': push('mist', { x: px, y: pt.y, z: pz, sx: pt.r, sy: pt.r * pt.sy, sz: pt.r * 0.6, ry: Math.atan2(pt.fx, -pt.fz), tint: 0.5 }); break;
          case 'stone': push('rock', { x: px, y: 0, z: pz, sx: pt.rx, sy: pt.h, sz: pt.rz, ry: t * TAU, tint: t }); break;
          case 'billboard': {
            // 地面に おちて いる もの(はっぱ・どんぐり・め)は 地面に ねかせる。草花・きのこ・かんばんは 立てる
            const flatKey = LITTER.has(ob.emoji) ? 'flat:' + ob.emoji : ob.emoji;
            const list = board.get(flatKey) || []; list.push({ x: px, z: pz, w: pt.w, h: pt.h, ry: t * TAU }); board.set(flatKey, list); break;
          }
          default: break;
        }
      }
    }
    cur = null;
    for (const q of ponds) { push('shore', { x: q.x, y: 0, z: -q.z, sx: q.r * 1.02 + 10, sy: 1, sz: q.r * 0.86 + 10, ry: 0, tint: 0.5 }); push('pool', { x: q.x, y: 0, z: -q.z, sx: q.r * 0.95, sy: 1, sz: q.r * 0.8, ry: 0, tint: 0.5 }); }
    const meshes = {};
    MAT.crownBig = flat('#3f7f3c');
    for (const shape of Object.keys(inst)) {
      const list = inst[shape], geo = GEO[shape === 'crownBig' ? 'crown' : shape];
      const m = new THREE.InstancedMesh(geo, MAT[shape], list.length);
      list.forEach((it, i) => {
        tmp.position.set(it.x, it.y, it.z); tmp.rotation.set(0, it.ry, 0); tmp.scale.set(it.sx, it.sy, it.sz); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix);
        m.setColorAt(i, col.setScalar(0.86 + it.tint * 0.28));
      });
      m.computeBoundingSphere();
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
        list.forEach((it, i) => { tmp.position.set(it.x, 0, it.z); tmp.rotation.set(0, it.ry, 0); tmp.scale.set(it.w * 0.55, 1, it.w * 0.55); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); });
        m.computeBoundingSphere(); sc.add(m); meshes['litter:' + emoji] = m;
        continue;
      }
      const m = new THREE.InstancedMesh(GEO.fall, mat, list.length);
      m.userData.list = list; m.userData.aspect = tx.aspect;
      boards.push(m); sc.add(m);
    }
    // ひかり・そら・きり(env と mood で まいフレーム かえる)
    const hemi = new THREE.HemisphereLight('#dff0ff', world.ground[1], 1.2), sun = new THREE.DirectionalLight('#ffffff', 1.4);
    sun.position.set(-0.5, 1, 0.35); sc.add(hemi); sc.add(sun);
    sc.fog = new THREE.Fog('#dff0ff', 700, 3200);
    // キャラ(player・なかま・住人)と かげ
    const actorGeo = up(new THREE.PlaneGeometry(1, 1));
    const shadows = new THREE.InstancedMesh(keep(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2).translate(0, 1.5, 0)), keep(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false })), 256);
    shadows.count = 0; sc.add(shadows);
    // すかす ための ghost(半透明の おなじ かたち)。いちどに 8 つ まで
    const ghostMat = {}; for (const k of Object.keys(MAT)) { ghostMat[k] = keep(MAT[k].clone()); ghostMat[k].transparent = true; ghostMat[k].opacity = 0.28; ghostMat[k].depthWrite = false; }
    const ghostGeo = (shape) => GEO[shape === 'crownBig' ? 'crown' : shape];
    return { sc, hemi, sun, meshes, boards, actorGeo, shadows, actors: new Map(), disposables, objects: count, lastYaw: null, seasonKey: null,
      occluders, hidden: new Set(), ghosts: [], ghostMat, ghostGeo, inst, anim: { fall: MAT.fall.map, foam: MAT.foam, mist: MAT.mist } };
  }

  function actorMesh(b, a) {
    let m = b.actors.get(a);
    if (!m) { m = new THREE.Mesh(b.actorGeo, new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide })); m.userData.tex = null; b.actors.set(a, m); b.sc.add(m); }
    return m;
  }
  function placeActor(b, m, a, t, yaw, light, glyph) {
    const tx = glyph || actorTexture(a);
    if (tx && m.userData.tex !== tx) { m.material.map = tx.tex; m.material.needsUpdate = true; m.userData.tex = tx; }
    const size = M.ACTOR_SIZE, facing = M.facingOf(a.heading || 0, yaw);
    const lift = a.moving || a.behavior === 'walk' ? Math.abs(Math.sin((a.bob || 0) * 5)) * size * 0.08 : 0;
    const w = size * (tx ? tx.aspect : 1);
    m.position.set(a.x, lift - (tx ? tx.pad * size : 0), -a.z); m.rotation.set(0, -yaw, 0);
    m.scale.set(facing === 'left' ? -w : w, size * (facing === 'back' ? 0.95 : 1), 1);
    m.material.color.setScalar(light); m.visible = true;
    tmp.position.set(a.x, 0, -a.z); tmp.rotation.set(0, 0, 0); tmp.scale.set(size * 0.32, 1, size * 0.14); tmp.updateMatrix();
    if (b.shadows.count < 256) b.shadows.setMatrixAt(b.shadows.count++, tmp.matrix);
    return t;
  }

  // ---------------- まいフレーム
  const frameMs = [];
  function draw(view, now) {
    if (lost) throw new Error('webgl context lost');
    const world = view.world;
    if (sceneOf !== world) { if (built) disposeScene(built); built = buildWorldScene(world); scene = built.sc; sceneOf = world; }
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
    camera.position.set(c.x - sinY * c.dist, camH, -(c.z - cosY * c.dist)); camera.rotation.set(0, -c.yaw, 0);
    camera.updateProjectionMatrix();
    // ひかり(時間・天気・場所の きぶん)。2D の TIME_LIGHT / WEATHER_LIGHT を そのまま つかう
    const TL = M.TIME_LIGHT[env.time] || M.TIME_LIGHT.day, wl = M.WEATHER_LIGHT[env.weather] || 1;
    const light = Math.max(0.35, TL.light * wl * (mood.light || 1));
    built.hemi.intensity = 1.25 * light; built.sun.intensity = 1.5 * light * (env.weather === 'sunny' ? 1 : 0.55);
    built.hemi.color.set(TL.sky[1]); built.sun.color.set(TL.tint);
    // そら: 2D と おなじ 2 色の たてグラデーション。きり: 地平の いろに 場所の きぶんの いろ(mood.tint)を まぜる
    const skyKey = TL.sky[0] + TL.sky[1];
    if (built.skyKey !== skyKey) { built.skyKey = skyKey; if (built.skyTex) built.skyTex.dispose(); built.skyTex = skyTexture(TL.sky[0], TL.sky[1]); built.sc.background = built.skyTex; }
    const fogC = new THREE.Color(TL.sky[1]);
    if (mood.tint) fogC.lerp(new THREE.Color(mood.tint[0] / 255, mood.tint[1] / 255, mood.tint[2] / 255), 0.35 + (mood.tintAmt || 0));
    fogC.multiplyScalar(Math.min(1, 0.6 + light * 0.4));
    built.sc.fog.color.copy(fogC);
    const fogK = env.weather === 'rain' || env.weather === 'snow' ? 0.6 : 1;
    built.sc.fog.near = 500 * fogK; built.sc.fog.far = (2600 + 1400 * (world.view || 1)) * fogK / (1 + (mood.fog || 0) * 4);
    // 季節: 広葉樹の 葉の いろ
    const sk = env.season || 'summer';
    if (built.seasonKey !== sk) { built.seasonKey = sk; if (built.meshes.crown) built.meshes.crown.material.color.set(SEASON_CROWN[sk] || SEASON_CROWN.summer); if (built.meshes.cone) built.meshes.cone.material.color.set(SEASON_CONIFER[sk] || SEASON_CONIFER.summer); }
    // 立て看板は カメラの むきが かわった ときだけ むきなおす
    if (built.lastYaw === null || Math.abs(built.lastYaw - c.yaw) > 0.004) {
      built.lastYaw = c.yaw;
      for (const m of built.boards) {
        m.userData.list.forEach((it, i) => { tmp.position.set(it.x, -0.02 * it.h, it.z); tmp.rotation.set(0, -c.yaw, 0); tmp.scale.set(it.w * m.userData.aspect / 1.04, it.h, 1); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); });
        m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
      }
    }
    // たきの 水: ながれ・あわ・しぶき(うごきを へらす 設定では とめる)
    if (animLv > 0) { const s = (now || 0) / 1000; built.anim.fall.offset.y = (s * 0.9) % 1; built.anim.foam.opacity = 0.6 + 0.1 * Math.sin(s * 3.1); built.anim.mist.opacity = 0.22 + 0.06 * Math.sin(s * 1.7); }
    // キャラ
    for (const m of built.actors.values()) m.visible = false;
    built.shadows.count = 0;
    const charLight = Math.min(1, 0.45 + light * 0.6);
    const player = view.player;
    const farCull = 2600;
    for (const a of view.party || []) placeActor(built, actorMesh(built, a), a, 0, c.yaw, charLight);
    for (const a of view.residents || []) { if (Math.hypot(a.x - player.x, a.z - player.z) < farCull) placeActor(built, actorMesh(built, a), a, 0, c.yaw, charLight); }
    const pg = typeof o.playerGlyph === 'function' ? o.playerGlyph() : '🐣';
    // Home の現在の子の原画を住民と同じ origin-clean ImageBitmap 経路へ。canvas 専用 U+E000 を WebGL に描かない。
    const pa = typeof M.playerAsset === 'function' ? M.playerAsset() : null;
    const ptx = pa ? pngTexture(pa) : null;
    placeActor(built, actorMesh(built, player), player, 0, c.yaw, charLight, ptx || glyphTexture(pg === '\uE000' ? '🐣' : pg, null, 'p'));
    built.shadows.instanceMatrix.needsUpdate = true;
    fadeOccluders(built, camera.position.x, -camera.position.z, fade ? player : null);
    renderer.render(scene, camera);
    if (diagOn) collectDiag(view);
    drawOverlay(view, camera);
    if (t0) { frameMs.push(performance.now() - t0); if (frameMs.length > 240) frameMs.shift(); }
  }

  // ---- 実機の しらべ もの(表情 QA などが setDiag(true) した ときだけ。ふだんは なにも しない) ----
  // 住民 1 体ごとに: どの え を たのんで いるか / decode / texture が GPU に あがったか / どの fallback か / material と visible / 視錐台の なかか
  let diagOn = false, lastDiag = null;
  const frustum = new THREE.Frustum(), pmat = new THREE.Matrix4();
  let glInfo = null;
  function glInfoOf() {
    if (glInfo) return glInfo;
    let gpu = '';
    try { const g = renderer.getContext(), ext = g.getExtension('WEBGL_debug_renderer_info'); gpu = ext ? String(g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(g.getParameter(g.RENDERER)); } catch (_) { /* しらべられない */ }
    glInfo = { webgl2: !!renderer.capabilities.isWebGL2, maxTex: renderer.capabilities.maxTextureSize, gpu: gpu.slice(0, 60), dpr: renderer.getPixelRatio() };
    return glInfo;
  }
  function collectDiag(view) {
    pmat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pmat);
    const rows = []; let visible = 0, inFrustum = 0, ready = 0;
    for (const a of view.residents || []) {
      const m = built.actors.get(a), s = M.spriteFor(a, 'front') || {}, tx = m ? m.userData.tex : null;
      const using = !tx ? 'none' : tx.solid ? 'solid' : tx.emoji ? 'glyph' : tx.asset === s.asset ? 'asset' : tx.asset === s.base ? 'base' : 'other';
      const sa = pngState.get(s.asset), sb = pngState.get(s.base);
      const up = !!(tx && tx.tex && renderer.properties.get(tx.tex).__webglTexture);
      const vis = !!(m && m.visible), fr = vis && frustum.intersectsObject(m);
      if (vis) visible++; if (fr) inFrustum++; if (up) ready++;
      rows.push({ key: a.key, asset: s.asset || null, base: s.base || null, using, assetState: sa ? sa.state : 'none', baseState: sb ? sb.state : 'none', px: sa ? sa.px : null,
        err: (sa && sa.err) || (sb && sb.err) || null, textureReady: up, map: !!(m && m.material.map), visible: vis, inFrustum: fr,
        dist: m ? Math.round(m.position.distanceTo(camera.position)) : null });
    }
    const pm = built.actors.get(view.player), ptx = pm ? pm.userData.tex : null;
    const pup = !!(ptx && ptx.tex && renderer.properties.get(ptx.tex).__webglTexture);
    const pvis = !!(pm && pm.visible), pfr = pvis && frustum.intersectsObject(pm);
    const playerAsset = typeof M.playerAsset === 'function' ? M.playerAsset() : null;
    const playerState = playerAsset ? pngState.get(playerAsset) : null;
    const playerDiag = { using: !ptx ? 'none' : ptx.solid ? 'solid' : ptx.asset ? 'asset' : ptx.emoji ? 'glyph' : 'other',
      asset: playerAsset, assetState: playerState ? playerState.state : (playerAsset ? 'none' : 'no-asset'),
      assetErr: playerState && playerState.err ? playerState.err : null,
      textureReady: pup, map: !!(pm && pm.material.map), visible: pvis, inFrustum: pfr,
      dist: pm ? Math.round(pm.position.distanceTo(camera.position)) : null };
    const rect = (el) => { try { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)]; } catch (_) { return null; } };
    lastDiag = { residents: rows.length, meshes: built.actors.size, visible, inFrustum, textureReady: ready, rows, player: playerDiag, gl: glInfoOf(),
      fog: [Math.round(built.sc.fog.near), Math.round(built.sc.fog.far)], textures: renderer.info.memory.textures, layout: { gl: rect(gl), c2d: rect(canvas2d) }, glDisplay: gl.style.display || '' };
  }

  // カメラと player の あいだの かたい 物は すかす(2D の「てまえの 物は すける」と おなじ やくわり)。
  // InstancedMesh の その 物だけ 大きさ 0 に して、半透明の ghost を かわりに おく
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let fade = true, animLv = 2;
  function fadeOccluders(b, ex, ez, player) {
    const vx = player ? player.x - ex : 0, vz = player ? player.z - ez : 0, L2 = vx * vx + vz * vz || 1, want = new Set();
    if (player) for (const oc of b.occluders) {
      const c = oc.ob.collision, t = ((c.x - ex) * vx + (c.z - ez) * vz) / L2;
      if (t < 0 || t > 1) continue;
      const d = Math.hypot(c.x - ex - vx * t, c.z - ez - vz * t);
      if (d < oc.r + M.ACTOR_SIZE * 0.45) want.add(oc);
      if (want.size >= 8) break;
    }
    let dirty = new Set();
    for (const oc of b.hidden) if (!want.has(oc)) { for (const rf of oc.refs) { const m = b.meshes[rf.shape]; tmp.position.set(rf.it.x, rf.it.y, rf.it.z); tmp.rotation.set(0, rf.it.ry, 0); tmp.scale.set(rf.it.sx, rf.it.sy, rf.it.sz); tmp.updateMatrix(); m.setMatrixAt(rf.i, tmp.matrix); dirty.add(m); } b.hidden.delete(oc); }
    for (const oc of want) if (!b.hidden.has(oc)) { for (const rf of oc.refs) { const m = b.meshes[rf.shape]; m.setMatrixAt(rf.i, ZERO); dirty.add(m); } b.hidden.add(oc); }
    for (const m of dirty) m.instanceMatrix.needsUpdate = true;
    // ghost
    for (const g of b.ghosts) g.visible = false;
    let gi = 0;
    for (const oc of b.hidden) for (const rf of oc.refs) {
      let g = b.ghosts[gi];
      if (!g) { g = new THREE.Mesh(b.ghostGeo(rf.shape), b.ghostMat[rf.shape]); b.ghosts.push(g); b.sc.add(g); }
      g.geometry = b.ghostGeo(rf.shape); g.material = b.ghostMat[rf.shape];
      g.position.set(rf.it.x, rf.it.y, rf.it.z); g.rotation.set(0, rf.it.ry, 0); g.scale.set(rf.it.sx, rf.it.sy, rf.it.sz); g.renderOrder = 2; g.visible = true; gi++;
    }
  }

  // うえの 2D canvas: 名まえ と ふきだし だけ(3D の いちを 画面に うつして えがく)
  const v3 = new THREE.Vector3();
  function toScreen(x, y, z) { v3.set(x, y, -z).project(camera); return v3.z > 1 ? null : { sx: (v3.x + 1) / 2 * W, sy: (1 - v3.y) / 2 * H }; }
  function drawOverlay(view) {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
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
    for (const m of b.actors.values()) m.material.dispose();
    for (const m of Object.values(b.meshes)) m.dispose();
    for (const m of b.boards) m.dispose();
    b.shadows.dispose();
    if (b.skyTex) b.skyTex.dispose();
    for (const x of b.disposables) if (x && x.dispose) x.dispose();
  }
  return {
    draw,
    show(on) { gl.style.display = on ? '' : 'none'; if (on) place(); },
    resize(n) { ctx = n.ctx || ctx; W = n.W || W; H = n.H || H; renderer.setSize(W, H, false); place(); },
    stats() {
      const info = renderer.info, xs = frameMs.slice().sort((a, b) => a - b), pick = (q) => (xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * q))] : 0);
      return { calls: info.render.calls, triangles: info.render.triangles, textures: info.memory.textures, geometries: info.memory.geometries,
        objects: built ? built.objects : 0, actors: built ? built.actors.size : 0, drawMsAvg: xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0, drawMsP95: pick(0.95), pixelRatio: renderer.getPixelRatio() };
    },
    loseContext() { const ext = renderer.getContext().getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); },
    setOccluderFade(on) { fade = !!on; },
    setAnimLevel(v) { animLv = v; },
    setDiag(on) { diagOn = !!on; if (!diagOn) lastDiag = null; },
    diag() { return lastDiag; },
    destroy() {
      if (built) disposeScene(built);
      for (const t of texCache.values()) if (t && t.tex) t.tex.dispose();
      for (const st of pngState.values()) if (st.t && st.t.tex) st.t.tex.dispose();
      pngState.clear(); if (solidTex) { solidTex.tex.dispose(); solidTex = null; }
      texCache.clear(); renderer.dispose();
      if (gl.parentNode) gl.parentNode.removeChild(gl);
      canvas2d.style.zIndex = ''; canvas2d.style.position = '';
    },
  };
}
