// なおとっち — Character 3D の presentation runtime(めぐる 3D の world と QA gallery の 両方が つかう)。
//
// ・actor の 状態(位置・むき・うごき・パーティ・住人の 生活・きもち・会話・セーブ)は もたない / かえない。
//   ここが もつのは 見た目だけの 状態(表示の むき・あるき の 位相・まばたき)。actor を key に WeakMap / Map
// ・template(species × stage × 顔方式)は はじめて いる ときに 1 つ だけ 組む(lazy)。1 frame に 組むのは buildBudget まで
//   → まだの actor は そのまま 2D billboard。geometry / material / 顔 atlas は template と actor で 共有
// ・actor ごとの fallback: template が 組めない / 更新で こけた actor だけ 2D に もどす(world renderer は 3D の まま)
// ・cleanup: その frame に present されなかった actor の 3D は 片づける(住人の despawn・パーティ離脱・地域の きりかえ)
import { THREE } from './geometry.mjs';
import { buildRig } from './archetypes.mjs';
import { attachFace, applyFaceExpression, material, materialCount, atlasCount, stats as rigStats } from './rig.mjs';
import { createAnimState, animate, setEmotion, react } from './animate.mjs';
import SPEC from './spec-esm.mjs';

export { SPEC };
const TAU = Math.PI * 2;

// ---------------- template(共有)
const TEMPLATES = new Map();
export const buildLog = [];
export function templateKey(id, stage, mode) { return `${id}:${stage}:${mode}`; }
export function getTemplate(id, stage, mode = 'C', hooks = {}) {
  const key = templateKey(id, stage, mode);
  if (TEMPLATES.has(key)) return TEMPLATES.get(key);
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let tpl;
  try {
    if (hooks.failBuild && hooks.failBuild(id, stage)) throw new Error('forced build failure (QA)');
    const rig = buildRig(id, stage);
    const specs = Array.isArray(rig.faceSpec) ? rig.faceSpec : [rig.faceSpec];
    rig.faces = specs.map((fs) => { const f = attachFace(rig, fs, fs.forceMode || mode); return f; });
    rig.face = rig.faces[0];
    // 大きさ: 休みの 形の 箱
    rig.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rig.root);
    const size = box.getSize(new THREE.Vector3());
    let tris = 0, meshes = 0;
    rig.root.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
    tpl = { status: 'ok', key, id, stage, mode, rig, box, size, tris, meshes, buildMs: 0 };
  } catch (err) {
    tpl = { status: 'failed', key, id, stage, mode, error: String(err && err.message || err) };
  }
  tpl.buildMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  buildLog.push({ key, status: tpl.status, ms: tpl.buildMs });
  TEMPLATES.set(key, tpl);
  return tpl;
}
export function templateCount() { return TEMPLATES.size; }
export function clearTemplates() { TEMPLATES.clear(); }

// template の 木を actor 用に 複製(geometry と material は 共有。userData は 参照の まま)
function cloneNode(src) {
  const dst = src.isMesh ? new THREE.Mesh(src.geometry, src.material) : new THREE.Group();
  dst.name = src.name; dst.position.copy(src.position); dst.rotation.copy(src.rotation); dst.scale.copy(src.scale);
  dst.renderOrder = src.renderOrder; dst.visible = src.visible; dst.userData = Object.assign({}, src.userData);
  for (const ch of src.children) dst.add(cloneNode(ch));
  return dst;
}
export function instantiate(tpl, seed = 0) {
  const root = cloneNode(tpl.rig.root);
  const bones = { root };
  const faceParts = [];
  root.traverse((o) => { if (!o.isMesh && o !== root && tpl.rig.bones[o.name]) bones[o.name] = o; if (o.name.startsWith('face:')) faceParts.push(o); });
  // 顔(複数 = cluster)を 複製側で むすびなおす
  const faces = tpl.rig.faces.map((f) => {
    const bone = bones[f.bone];
    const mine = bone.children.filter((o) => o.name.startsWith('face:'));
    const face = { mode: f.mode, normalEye: f.normalEye, eyes: mine.filter((o) => o.name.startsWith('face:eye')), decal: mine.find((o) => o.name === 'face:decal') || null, feats: null };
    if (f.feats) {
      const by = (n) => mine.find((o) => o.name === n) || null;
      face.feats = { mouths: Object.fromEntries(Object.keys(f.feats.mouths).map((k) => [k, by('face:mouth:' + k)])), brows: [by('face:brow:L'), by('face:brow:R')], cheeks: [by('face:cheek:L'), by('face:cheek:R')], gloom: by('face:gloom') };
    }
    return face;
  });
  const holder = new THREE.Group(); holder.name = 'c3d-actor:' + tpl.key; holder.add(root);
  const inst = { tpl, holder, root, bones, faces, face: { set: faces }, meta: tpl.rig.meta, archetype: tpl.rig.archetype, locomotion: tpl.rig.locomotion, anim: createAnimState(seed) };
  // 顔の あつかい(表情・まばたき)は 全部の 顔へ
  inst.face = faces.length === 1 ? faces[0] : multiFace(faces);
  setEmotion(inst, 'normal');
  return inst;
}
function multiFace(faces) {
  return { multi: faces, get eyes() { return faces.flatMap((f) => f.eyes); }, set emotion(v) { /* noop */ } };
}
export function disposeInstance(inst) {
  if (inst.holder.parent) inst.holder.parent.remove(inst.holder);
  // geometry / material は template の もの(共有)なので すてない。actor の 木だけ はなす
  inst.disposed = true;
}

// 2D の 絵(art box px)と おなじ 大きさへ。actorSize = めぐるの ACTOR_SIZE(128px の 絵 = この 高さ)
export function fitScale(tpl, art, actorSize) {
  const box = art || [8, 8, 120, 120];
  const artMax = Math.max(box[2] - box[0], box[3] - box[1]);
  const target = actorSize * artMax / 128;
  const s = tpl.size;
  return target / Math.max(s.y, s.z * 0.92, s.x * 0.92);
}

// ================= presenter =================
export function createCharacterPresenter(opts = {}) {
  let scene = opts.scene || null;
  const actorSize = opts.actorSize || 110;
  const bounds = opts.bounds || (typeof window !== 'undefined' && window.NaotocchiCastBounds) || {};
  let faceMode = opts.faceMode || 'C', animLv = opts.animLevel != null ? opts.animLevel : 2;
  const buildBudget = opts.buildBudget != null ? opts.buildBudget : 1;
  let hooks = opts.hooks || {};
  const live = new Map();           // actor → inst
  const broken = new WeakSet();     // この actor は 2D(更新で こけた)
  let frame = 0, built = 0, lastNow = null;
  const counters = { fallbacks: 0, removed: 0, created: 0, failedTemplates: 0, buildsThisFrame: 0 };
  const accentTex = makeAccentAtlas();

  function emotionFor(info) { return SPEC.CANONICAL_EMOTIONS.includes(info.emotion) ? info.emotion : 'normal'; }
  function artBox(id, stage) {
    const asset = SPEC.referenceAsset(id, stage);
    const b = bounds[asset];
    return b && b.box ? b.box : null;
  }
  // 1 actor を 3D で えがく。えがけたら true(よぶ がわは billboard を かくす)、だめなら false(billboard を つかう)
  // うごいて いるか: actor の 位置の かわりかた(見た目だけ。actor には かかない)
  const lastPos = new WeakMap();
  function movingOf(actor, info) {
    const lp = lastPos.get(actor), x = actor.x, z = actor.z;
    lastPos.set(actor, { x, z });
    if (info.moving != null) return !!info.moving;
    if (!lp) return false;
    return Math.hypot(x - lp.x, z - lp.z) / Math.max(0.008, info.dt || 0.016) > actorSize * 0.25;
  }
  const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let cpuFrame = 0; const cpuHist = [];
  function present(actor, info) {
    const t0 = clock();
    try { return presentInner(actor, info); } finally { cpuFrame += clock() - t0; }
  }
  function presentInner(actor, info) {
    if (!actor || !info || !info.specKey || broken.has(actor)) return false;
    info = Object.assign({}, info, { moving: movingOf(actor, info) });
    const { id, stage } = info.specKey;
    let inst = live.get(actor);
    try {
      if (inst && (inst.tpl.id !== id || inst.tpl.stage !== stage || inst.tpl.mode !== faceMode)) { drop(actor, inst); inst = null; }   // 段 / 顔方式が かわった
      if (!inst) {
        const key = templateKey(id, stage, faceMode);
        if (!TEMPLATES.has(key)) { if (counters.buildsThisFrame >= buildBudget) return false; counters.buildsThisFrame++; built++; }
        const tpl = getTemplate(id, stage, faceMode, hooks);
        if (tpl.status !== 'ok') { counters.failedTemplates++; return false; }
        inst = instantiate(tpl, (actor.key ? String(actor.key).length : 0) + live.size * 13);
        inst.scale = fitScale(tpl, artBox(id, stage), actorSize);
        inst.yaw = null; inst.isPlayer = !!info.isPlayer;
        inst.accent = makeAccentSprite(accentTex);
        inst.holder.add(inst.accent);
        if (inst.isPlayer) inst.holder.traverse((o) => { o.frustumCulled = false; });
        if (scene) scene.add(inst.holder);
        live.set(actor, inst); counters.created++;
      }
      if (hooks.failUpdate && hooks.failUpdate(actor, info)) throw new Error('forced update failure (QA)');
      inst.seen = frame;
      const em = emotionFor(info);
      if (setEmotion(inst, em)) { setAccent(inst.accent, em); if (info.reactOnChange !== false && inst.anim.expr.reaction) react(inst, inst.anim.expr.reaction); }
      // 位置・むき(actor の まま。表示の むき だけ なめらかに)
      const target = Math.PI - (actor.heading || 0);
      if (inst.yaw == null) inst.yaw = target;
      else { let d = ((target - inst.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI; inst.yaw += d * Math.min(1, (info.dt || 0.016) * 10); }
      const h = inst.holder;
      h.position.set(actor.x, 0, -actor.z); h.rotation.set(0, inst.yaw, 0); h.scale.setScalar(inst.scale);
      h.visible = true;
      animate(inst, { moving: info.moving, dt: info.dt, animLv });
      inst.accent.visible = !!inst.anim.expr.accent && info.accent !== false;
      inst.accent.position.set(0, inst.tpl.size.y * 1.08 + 0.12 + (inst.meta.hover || 0), 0);
      inst.accent.scale.setScalar(actorSize * 0.3 / inst.scale);   // しるしは species の 大きさに よらず ゲーム画面で 読める 大きさ
      return true;
    } catch (err) {
      // この actor だけ 2D へ(world renderer は そのまま)
      broken.add(actor); counters.fallbacks++;
      if (inst) drop(actor, inst);
      if (opts.onActorFallback) opts.onActorFallback(actor, err);
      return false;
    }
  }
  function drop(actor, inst) { disposeInstance(inst); live.delete(actor); counters.removed++; }
  // frame の はじめ / おわり: この frame に present されなかった actor は 片づける
  function beginFrame(now) { if (frame) { cpuHist.push(cpuFrame); if (cpuHist.length > 240) cpuHist.shift(); } cpuFrame = 0; frame++; counters.buildsThisFrame = 0; const dt = lastNow == null ? 0.016 : Math.min(0.1, Math.max(0, (now - lastNow) / 1000)); lastNow = now; return dt; }
  function endFrame() { for (const [a, inst] of live) if (inst.seen !== frame) drop(a, inst); }
  function reset() { for (const [a, inst] of live) drop(a, inst); }
  function footprint(actor) {
    const inst = live.get(actor);
    if (!inst) return null;
    const s = inst.tpl.size, k = inst.scale;
    return { w: s.x * k, d: s.z * k, h: s.y * k, hover: (inst.meta.hover || 0) * k };
  }
  return {
    present, beginFrame, endFrame, reset, footprint,
    // 地域が かわった(world の scene を つくりなおした)とき: 前の 3D を ぜんぶ 片づけて あたらしい scene へ
    setScene(sc) { if (sc !== scene) { reset(); scene = sc; } },
    get scene() { return scene; },
    react(actor, kind) { const inst = live.get(actor); return inst ? react(inst, kind) : false; },
    has: (actor) => live.has(actor),
    isBroken: (actor) => broken.has(actor),
    instanceOf: (actor) => live.get(actor) || null,
    setFaceMode(m) { if (m !== faceMode) { faceMode = m; reset(); } },
    get faceMode() { return faceMode; },
    setAnimLevel(v) { animLv = v; },
    setHooks(h) { hooks = h || {}; },
    get animLevel() { return animLv; },
    stats() {
      let tris = 0, meshes = 0, bones = 0;
      for (const inst of live.values()) { tris += inst.tpl.tris; meshes += inst.tpl.meshes + 1; bones += Object.keys(inst.bones).length; }
      const xs = cpuHist.slice().sort((a, b) => a - b);
      const cpuMsAvg = xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : 0, cpuMsP95 = xs.length ? +xs[Math.min(xs.length - 1, Math.floor(xs.length * 0.95))].toFixed(3) : 0;
      return { live: live.size, templates: TEMPLATES.size, built, tris, meshes, bones, materials: materialCount(), atlases: atlasCount(), eyeGeos: rigStats.eyeGeos, cpuMsAvg, cpuMsP95, buildMsTotal: +buildLog.reduce((a, b) => a + b.ms, 0).toFixed(1), buildMsMax: +Math.max(0, ...buildLog.map((b) => b.ms)).toFixed(1), ...counters };
    },
    dispose() { reset(); },
  };
}

// ---------------- あたまの うえの しるし(2D Home の accent と おなじ 意味)。1 まいの atlas を 共有
const ACCENTS = ['sparkle', 'cloud', 'sleepy', 'cool', 'zz', 'strain', 'call'];
function makeAccentAtlas() {
  let c = null;
  if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(64 * ACCENTS.length, 64);
  else if (typeof document !== 'undefined') { c = document.createElement('canvas'); c.width = 64 * ACCENTS.length; c.height = 64; }
  if (!c) return null;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  const out = (fn) => { g.save(); g.strokeStyle = '#ffffff'; g.lineWidth = 7; fn(true); g.restore(); g.save(); fn(false); g.restore(); };
  ACCENTS.forEach((k, i) => {
    g.save(); g.translate(i * 64 + 32, 32);
    switch (k) {
      case 'sparkle': for (const [x, y, r] of [[-6, -4, 14], [12, 12, 8]]) { g.fillStyle = '#ffd23a'; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4, rr = j % 2 ? r * 0.38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.stroke(); g.fill(); } break;
      case 'cloud': g.fillStyle = '#7d7f9a'; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(-8, 2, 10, 0, Math.PI * 2); g.arc(4, -4, 12, 0, Math.PI * 2); g.arc(14, 4, 9, 0, Math.PI * 2); g.stroke(); g.fill(); g.strokeStyle = '#d8dae8'; g.beginPath(); g.moveTo(-10, 4); g.quadraticCurveTo(-4, -6, 2, 4); g.quadraticCurveTo(8, 12, 14, 2); g.stroke(); break;
      case 'sleepy': g.fillStyle = 'rgba(160,200,255,0.92)'; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(6, -6, 13, 0, Math.PI * 2); g.stroke(); g.fill(); g.beginPath(); g.arc(-12, 12, 5, 0, Math.PI * 2); g.stroke(); g.fill(); break;
      case 'cool': out((o) => { g.strokeStyle = o ? '#fff' : '#4f79d8'; g.lineWidth = o ? 8 : 4; for (const x of [-12, -4, 4, 12]) { g.beginPath(); g.moveTo(x, -16); g.lineTo(x, 10); g.stroke(); } }); g.fillStyle = '#7ec0f8'; g.beginPath(); g.moveTo(18, 2); g.quadraticCurveTo(26, 16, 18, 20); g.quadraticCurveTo(10, 16, 18, 2); g.fill(); break;
      case 'zz': out((o) => { g.strokeStyle = o ? '#fff' : '#5a6ad8'; g.lineWidth = o ? 8 : 4; g.beginPath(); g.moveTo(-14, -8); g.lineTo(0, -8); g.lineTo(-14, 6); g.lineTo(0, 6); g.stroke(); g.beginPath(); g.moveTo(4, -18); g.lineTo(14, -18); g.lineTo(4, -8); g.lineTo(14, -8); g.stroke(); }); break;
      case 'strain': out((o) => { g.strokeStyle = o ? '#fff' : '#e0603a'; g.lineWidth = o ? 8 : 4; g.beginPath(); g.moveTo(-16, 4); g.lineTo(-6, -6); g.lineTo(2, 4); g.lineTo(12, -6); g.stroke(); }); break;
      case 'call': out((o) => { g.strokeStyle = o ? '#fff' : '#f0a020'; g.lineWidth = o ? 8 : 4; for (const [x1, y1, x2, y2] of [[-14, 4, -20, -6], [0, -2, 0, -16], [14, 4, 20, -6]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); } }); break;
      default: break;
    }
    g.restore();
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mats = {};
  ACCENTS.forEach((k, i) => { const t = tex.clone(); t.repeat.set(1 / ACCENTS.length, 1); t.offset.set(i / ACCENTS.length, 0); t.needsUpdate = true; mats[k] = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }); });
  return { tex, mats };
}
function makeAccentSprite(atlas) {
  const sp = new THREE.Sprite(atlas ? atlas.mats.sparkle : new THREE.SpriteMaterial({ color: '#ffffff' }));
  sp.name = 'accent'; sp.visible = false; sp.userData.atlas = atlas; sp.renderOrder = 4;
  return sp;
}
function setAccent(sp, emotion) {
  const a = SPEC.expressionParams(emotion).accent, atlas = sp.userData.atlas;
  if (a && atlas && atlas.mats[a]) sp.material = atlas.mats[a];
}
export { material, applyFaceExpression };
