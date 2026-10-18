// なおとっち — Character 3D の rig・material・顔。
//
// rig: bone は THREE.Group(skinning なし)。bone ごとに 部品を 1 つの mesh に まとめる(1 bone = 1 draw call)。
//      うごきは bone の 位置 / 回転 / 大きさ だけ(animate.mjs)。休みの 形は userData.rest
// material: 頂点色の Lambert を みんなで 共有(opaque / translucent / glow / face)。actor ごとに つくらない
// 顔: 3 方式を おなじ 道具で つくり、実物で くらべる(QA gallery の A / B / C)
//   A texture : 目・口・まゆ・ほお を 1 まいの 顔 atlas(canvas)に かき、頭の 面へ 投影した デカールに はる
//   B geometry: 目・口・まゆ・ほお を ぜんぶ 小さな 立体(atlas なし)
//   C hybrid  : 目は 立体(奥行き・光)、口・まゆ・ほお・しるし は atlas デカール   ← pilot の 第一候補(needs_human_review)
// 表情を かえる ときは material / geometry を 差しかえる だけ。texture を つくりなおさない(atlas は style ごとに 1 かい)
import { THREE, merge, paint, solid, ellipsoid, sweep, xform, projectPoint, projectGrid, faceFrame, blob, clamp } from './geometry.mjs';
import SPEC_DEFAULT from './spec-esm.mjs';

const SPEC = SPEC_DEFAULT;
export const FACE_MODES = ['A', 'B', 'C'];
export const stats = { materials: 0, atlases: 0, eyeGeos: 0 };

// ---------------- material(共有)
const MATS = new Map();
export function material(key) {
  if (MATS.has(key)) return MATS.get(key);
  let m;
  const [kind, a, b] = key.split(':');
  if (kind === 'opaque') m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  else if (kind === 'translucent') m = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: Number(a), depthWrite: false, side: THREE.DoubleSide });
  else if (kind === 'glow') m = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: Number(b) < 1, opacity: Number(b), depthWrite: Number(b) >= 1, emissive: new THREE.Color(a), emissiveIntensity: 0.55, side: THREE.DoubleSide });
  else if (kind === 'shadow') m = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false });
  else throw new Error('unknown material ' + key);
  // 2D の 絵は 光の 影響を うけない あかるい 色。3D でも 頂点色を すこし 自分で 光らせて「くすみ」を ふせぐ(soft / matte)
  if (m.isMeshLambertMaterial) {
    m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance += vColor.rgb * 0.3;\n#endif'); };
    m.customProgramCacheKey = () => 'c3d-selflit';
  }
  m.name = 'c3d:' + key;
  MATS.set(key, m); stats.materials = MATS.size;
  return m;
}
export function materialCount() { return MATS.size; }

// ---------------- rig
export class Rig {
  constructor(key, archetype, locomotion) {
    this.key = key; this.archetype = archetype; this.locomotion = locomotion;
    this.root = new THREE.Group(); this.root.name = 'c3d:' + key;
    this.bones = { root: this.root };
    this.root.userData.rest = { p: new THREE.Vector3(), r: new THREE.Euler(), s: new THREE.Vector3(1, 1, 1) };
    this.face = null; this.meta = { hover: 0, idlePose: 'stand' };
    this.parts = [];   // { bone, mesh }
  }
  add(name, parent, pos, geos, matKey = 'opaque', rot = [0, 0, 0]) {
    const g = new THREE.Group(); g.name = name;
    g.position.set(pos[0], pos[1], pos[2]); g.rotation.set(rot[0], rot[1], rot[2]);
    g.userData.rest = { p: g.position.clone(), r: g.rotation.clone(), s: g.scale.clone() };
    (this.bones[parent] || this.root).add(g);
    this.bones[name] = g;
    if (geos && geos.length) this.mesh(name, geos, matKey);
    return g;
  }
  mesh(boneName, geos, matKey = 'opaque') {
    const geo = merge(Array.isArray(geos) ? geos : [geos]);
    const m = new THREE.Mesh(geo, material(matKey)); m.name = boneName + ':' + matKey;
    this.bones[boneName].add(m); this.parts.push({ bone: boneName, mesh: m });
    return m;
  }
}

// ---------------- 目の 形(単位の 大きさ。顔の 面の むきに あわせて おく)。shape ごとに 1 つを 共有
const EYE = new Map();
const DARK = '#2a1610', SHINE = '#ffffff';
export function eyeGeometry(shape, side) {
  const key = shape + ':' + side;
  if (EYE.has(key)) return EYE.get(key);
  let g;
  const arc = (bend, w = 0.9, r = 0.16) => sweep([[-w, -bend * 0.3, 0], [0, bend * 0.55, 0], [w, -bend * 0.3, 0]], () => r, 6, { steps: 10 });
  switch (shape) {
    case 'round': {
      const ball = solid(ellipsoid(0.62, 0.86, 0.32, 12, 8), DARK);
      const hl = solid(xform(ellipsoid(0.22, 0.24, 0.1, 8, 6), { pos: [side * -0.18, 0.3, 0.3] }), SHINE);
      const hl2 = solid(xform(ellipsoid(0.1, 0.1, 0.06, 6, 4), { pos: [side * 0.2, -0.28, 0.3] }), SHINE);
      g = merge([ball, hl, hl2]); break;
    }
    case 'droop': {   // 半目: まるい 目の 上を まぶたで たいらに
      const ball = ellipsoid(0.62, 0.86, 0.32, 12, 8); const p = ball.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.05) p.setY(i, 0.05 + (p.getY(i) - 0.05) * 0.08);
      ball.computeVertexNormals(); solid(ball, DARK);
      const lid = solid(sweep([[-0.66, 0.08, 0.22], [0, 0.12, 0.3], [0.66, 0.08, 0.22]], () => 0.11, 6, { steps: 8 }), DARK);
      const hl = solid(xform(ellipsoid(0.14, 0.12, 0.06, 6, 4), { pos: [side * -0.18, -0.12, 0.3] }), SHINE);
      g = merge([ball, lid, hl]); break;
    }
    case 'happy': g = solid(arc(1.0), DARK); break;           // ^
    case 'content': g = solid(arc(-0.8), DARK); break;        // ︶(2D の おだやかな とじ目)
    case 'flat': g = solid(arc(-0.25, 0.8, 0.13), DARK); break;
    case 'squeeze': {                                          // > <
      const s = side;   // 左目は >、右目は <
      g = solid(sweep([[-0.7 * s, 0.55, 0], [0.55 * s, 0, 0], [-0.7 * s, -0.55, 0]], () => 0.15, 6, { steps: 10 }), DARK); break;
    }
    default: throw new Error('eye shape ' + shape);
  }
  g.computeBoundingSphere();
  EYE.set(key, g); stats.eyeGeos = EYE.size;
  return g;
}
export const EYE_SHAPES = ['round', 'droop', 'happy', 'content', 'flat', 'squeeze'];

// ---------------- 顔の atlas(canvas)。style(口の 色・ほおの 色・肌の 色)ごとに 1 まい。8 表情 × 1 行
const ATLAS = new Map();
const CELL = 128;
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return null;   // Node の テスト: 絵は かかない(形・つながり だけ しらべる)
}
// 口・まゆ・ほお・しるし(と A 方式の 目)を 1 コマに かく。座標は コマの なかの 0..128(顔の まんなか = 64,64)
function drawFace(g, ox, emotion, style, withEyes) {
  const e = SPEC.expressionParams(emotion);
  const L = style.layout;   // { eyeX, eyeY, mouthY, browY, cheekX, cheekY, mouthW } コマ座標
  g.save(); g.translate(ox, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // ほお
  if (e.blush > 0.05) { g.fillStyle = style.blush; g.globalAlpha = 0.55 * e.blush + 0.1; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * L.cheekX, L.cheekY, 11, 7, 0, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
  // しるし(sick の 青い たて線)
  if (e.marks.includes('gloom')) { g.strokeStyle = 'rgba(80,120,220,0.85)'; g.lineWidth = 3.2; for (const x of [-14, -5, 4, 13]) { g.beginPath(); g.moveTo(64 + x, L.browY - 22); g.lineTo(64 + x, L.browY - 6); g.stroke(); } }
  // まゆ
  if (e.brow.show) {
    g.strokeStyle = style.ink; g.lineWidth = 4.2;
    for (const s of [-1, 1]) { const cx = 64 + s * L.eyeX, a = e.brow.angle; g.beginPath(); g.moveTo(cx - 10 * s, L.browY + a * 7); g.lineTo(cx + 9 * s, L.browY - a * 7); g.stroke(); }
  }
  // 目(A 方式だけ)
  if (withEyes) {
    g.fillStyle = style.ink; g.strokeStyle = style.ink; g.lineWidth = 4.6;
    for (const s of [-1, 1]) {
      const cx = 64 + s * L.eyeX, cy = L.eyeY, sh = e.eye.shape === 'round' && style.normalEye && emotion === 'normal' ? style.normalEye : e.eye.shape;
      g.beginPath();
      if (sh === 'round') { g.ellipse(cx, cy, 7.5, 10.5, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx - s * 2.4, cy - 4, 2.8, 0, Math.PI * 2); g.fill(); g.fillStyle = style.ink; }
      else if (sh === 'droop') { g.ellipse(cx, cy + 2, 7.5, 6, 0, 0, Math.PI); g.fill(); g.beginPath(); g.moveTo(cx - 9, cy + 1); g.lineTo(cx + 9, cy + 1); g.stroke(); }
      else if (sh === 'happy') { g.arc(cx, cy + 4, 8, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (sh === 'content' || sh === 'flat') { g.arc(cx, cy - 4, 8, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
      else if (sh === 'squeeze') { g.moveTo(cx - 7 * s, cy - 7); g.lineTo(cx + 6 * s, cy); g.lineTo(cx - 7 * s, cy + 7); g.stroke(); }
    }
  }
  // 口
  const my = L.mouthY, mw = L.mouthW;
  g.strokeStyle = style.ink; g.fillStyle = style.mouth; g.lineWidth = 3.6;
  g.beginPath();
  switch (e.mouth) {
    case 'smile': g.moveTo(64 - mw, my - 2); g.quadraticCurveTo(64, my + mw * 0.7, 64 + mw, my - 2); g.stroke(); break;
    case 'open': g.moveTo(64 - mw * 1.1, my - 3); g.quadraticCurveTo(64, my + mw * 1.5, 64 + mw * 1.1, my - 3); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = style.tongue; g.beginPath(); g.ellipse(64, my + mw * 0.45, mw * 0.5, mw * 0.25, 0, 0, Math.PI * 2); g.fill(); break;
    case 'frown': g.moveTo(64 - mw, my + 4); g.quadraticCurveTo(64, my - mw * 0.6, 64 + mw, my + 4); g.stroke(); break;
    case 'pout': g.moveTo(64 - mw * 0.75, my + 2); g.quadraticCurveTo(64, my - mw * 0.35, 64 + mw * 0.75, my + 2); g.stroke(); break;
    case 'wavy': g.moveTo(64 - mw, my); for (let i = 1; i <= 4; i++) g.lineTo(64 - mw + i * mw / 2, my + (i % 2 ? -3.5 : 3.5)); g.stroke(); break;
    case 'small': g.ellipse(64, my + 1, mw * 0.28, mw * 0.32, 0, 0, Math.PI * 2); g.fill(); g.stroke(); break;
    case 'yawn': g.ellipse(64, my + 2, mw * 0.45, mw * 0.6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); break;
    default: break;
  }
  g.restore();
}
export const DEFAULT_LAYOUT = { eyeX: 22, eyeY: 58, mouthY: 82, browY: 38, cheekX: 34, cheekY: 76, mouthW: 10 };
export function atlasFor(style, withEyes) {
  const key = JSON.stringify([style, withEyes]);
  if (ATLAS.has(key)) return ATLAS.get(key);
  const em = SPEC.CANONICAL_EMOTIONS, c = makeCanvas(CELL * em.length, CELL);
  let tex = null;
  if (c) {
    const g = c.getContext('2d');
    em.forEach((e, i) => drawFace(g, i * CELL, e, style, withEyes));
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  }
  // 表情ごとの material(texture は clone = おなじ 画像を 共有。GPU へは 1 かい だけ)
  const mats = {};
  em.forEach((e, i) => {
    let map = null;
    if (tex) { map = tex.clone(); map.repeat.set(1 / em.length, 1); map.offset.set(i / em.length, 0); map.needsUpdate = true; }
    const m = new THREE.MeshLambertMaterial({ map, transparent: true, alphaTest: 0.08, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });
    m.name = 'c3d:face:' + e; mats[e] = m;
  });
  const out = { tex, mats, canvas: c, cells: em.length };
  ATLAS.set(key, out); stats.atlases = ATLAS.size;
  return out;
}
export function atlasCount() { return ATLAS.size; }

// ---------------- B 方式の 口・まゆ・ほお(立体)
const FEAT = new Map();
function featureGeo(kind) {
  if (FEAT.has(kind)) return FEAT.get(kind);
  const ink = DARK; let g;
  const arc = (pts, r = 0.11) => solid(sweep(pts, () => r, 5, { steps: 10 }), ink);
  switch (kind) {
    case 'smile': g = arc([[-0.8, 0.15, 0], [0, -0.45, 0], [0.8, 0.15, 0]]); break;
    case 'open': g = merge([solid(xform(blob((x, y, z) => [x * 0.75, y < 0 ? y * 0.6 : y * 0.12, z * 0.18], 10, 6), { pos: [0, 0, 0] }), '#c0392b'), solid(xform(ellipsoid(0.35, 0.16, 0.12, 8, 4), { pos: [0, -0.32, 0.08] }), '#f08080')]); break;
    case 'frown': g = arc([[-0.7, -0.25, 0], [0, 0.3, 0], [0.7, -0.25, 0]]); break;
    case 'pout': g = arc([[-0.5, -0.1, 0], [0, 0.18, 0], [0.5, -0.1, 0]]); break;
    case 'wavy': g = arc([[-0.8, 0, 0], [-0.4, 0.2, 0], [0, -0.2, 0], [0.4, 0.2, 0], [0.8, 0, 0]], 0.09); break;
    case 'small': case 'yawn': g = solid(ellipsoid(0.24, 0.28, 0.1, 8, 6), '#7a2a20'); break;
    case 'brow': g = arc([[-0.6, 0, 0], [0.6, 0, 0]], 0.1); break;
    case 'cheek': g = solid(ellipsoid(0.5, 0.32, 0.06, 10, 6), '#f39a9a'); break;
    case 'gloom': g = merge([-0.45, -0.15, 0.15, 0.45].map((x) => solid(xform(ellipsoid(0.05, 0.36, 0.03, 4, 4), { pos: [x, 0, 0] }), '#5078dc'))); break;
    default: throw new Error(kind);
  }
  FEAT.set(kind, g);
  return g;
}

// ---------------- 顔を rig に つける
// spec: { bone, target(投影する geometry。bone の 座標), center, fwd, up, half(顔の 大きさ), eyeSep, eyeY, eyeSize, mouthY, style }
const DEF_STYLE = { ink: '#2a1610', mouth: '#b2302a', tongue: '#f08a8a', blush: '#f49a9a' };
export function attachFace(rig, spec, mode = 'C') {
  const bone = rig.bones[spec.bone];
  const proj = new THREE.Mesh(spec.target, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  proj.updateMatrixWorld(true);
  const fr = faceFrame(spec.center, spec.fwd, spec.up || [0, 1, 0]);
  const half = spec.half, s = half / 64;   // コマ 1 px → 頭の 単位
  const layout = Object.assign({}, DEFAULT_LAYOUT, spec.layout || {});
  // layout(コマ座標)を 顔の 面の (u, v) へ: コマ 64,64 = 顔の まんなか
  const uv = (px, py) => [(px - 64) * s, (64 - py) * s];
  const style = Object.assign({}, DEF_STYLE, spec.style || {}, { layout, normalEye: spec.normalEye || null });
  const face = { mode, bone: spec.bone, eyes: [], decal: null, feats: null, normalEye: spec.normalEye || null, eyeRest: [], frame: fr, half };
  if (mode === 'A' || mode === 'C') {
    const geo = projectGrid(proj, fr, half, spec.grid || 10, half * 0.02);
    const atlas = atlasFor(style, mode === 'A');
    const decal = new THREE.Mesh(geo, atlas.mats.normal); decal.name = 'face:decal'; decal.renderOrder = 3;
    decal.userData.atlas = atlas;
    bone.add(decal); face.decal = decal;
  }
  if (mode === 'B' || mode === 'C') {
    for (const sd of [-1, 1]) {
      const [u, v] = uv(64 + sd * layout.eyeX, layout.eyeY);
      const hit = projectPoint(proj, fr, u, v, half * 0.015);
      if (!hit) continue;
      const m = new THREE.Mesh(eyeGeometry('round', sd), material('opaque')); m.name = 'face:eye' + (sd < 0 ? 'L' : 'R');
      m.position.copy(hit.p); m.lookAt(hit.p.clone().add(hit.n.clone().lerp(fr.f, 0.35)));
      const es = (spec.eyeSize || 0.2) * half; m.scale.setScalar(es);
      m.userData.side = sd; m.userData.baseScale = es; m.userData.shape = 'round';
      bone.add(m); face.eyes.push(m);
    }
  }
  if (mode === 'B') {
    const put = (kind, px, py, k, sd = 0, name = kind) => {
      const [u, v] = uv(px, py); const hit = projectPoint(proj, fr, u, v, half * 0.012);
      if (!hit) return null;
      const m = new THREE.Mesh(featureGeo(kind), material('opaque')); m.name = 'face:' + name; m.position.copy(hit.p); m.lookAt(hit.p.clone().add(hit.n));
      m.scale.setScalar(k * half); m.userData.side = sd; m.userData.kind = kind; bone.add(m); return m;
    };
    face.feats = {
      mouths: Object.fromEntries(['smile', 'open', 'frown', 'pout', 'wavy', 'small'].map((k) => [k, put(k, 64, layout.mouthY, 0.16, 0, 'mouth:' + k)])),
      brows: [put('brow', 64 - layout.eyeX, layout.browY, 0.14, -1, 'brow:L'), put('brow', 64 + layout.eyeX, layout.browY, 0.14, 1, 'brow:R')],
      cheeks: [put('cheek', 64 - layout.cheekX, layout.cheekY, 0.18, 0, 'cheek:L'), put('cheek', 64 + layout.cheekX, layout.cheekY, 0.18, 0, 'cheek:R')],
      gloom: put('gloom', 64, layout.browY - 14, 0.2, 0, 'gloom'),
    };
  }
  proj.material.dispose();
  rig.face = face;
  return face;
}
// 表情を 顔へ(表情が かわった ときだけ よぶ。毎 frame は まばたき だけ)
export function applyFaceExpression(face, emotion) {
  if (!face) return;
  if (face.multi) { for (const f of face.multi) applyFaceExpression(f, emotion); face.emotion = emotion; return; }
  const e = SPEC.expressionParams(emotion);
  if (face.decal) face.decal.material = face.decal.userData.atlas.mats[SPEC.CANONICAL_EMOTIONS.includes(emotion) ? emotion : 'normal'];
  const shape = emotion === 'normal' && face.normalEye ? face.normalEye : e.eye.shape;
  for (const m of face.eyes) {
    if (m.userData.shape !== shape) { m.geometry = eyeGeometry(shape, m.userData.side); m.userData.shape = shape; }
    const k = shape === 'round' ? Math.max(0.6, e.eye.open) : 1;
    m.userData.open = k;
    m.scale.set(m.userData.baseScale, m.userData.baseScale * k, m.userData.baseScale);
  }
  if (face.feats) {
    for (const [k, m] of Object.entries(face.feats.mouths)) if (m) m.visible = k === (e.mouth === 'yawn' ? 'small' : e.mouth);
    for (const m of face.feats.brows) if (m) { m.visible = e.brow.show; m.rotation.z = -m.userData.side * e.brow.angle * 0.6; }
    for (const m of face.feats.cheeks) if (m) m.visible = e.blush > 0.3;
    if (face.feats.gloom) face.feats.gloom.visible = e.marks.includes('gloom');
  }
  face.emotion = emotion;
}
// まばたき(round の 目だけ)
export function blink(face, amount) {
  if (!face) return;
  for (const m of face.eyes) if (m.userData.shape === 'round' || m.userData.shape === 'droop') m.scale.y = m.userData.baseScale * (m.userData.open || 1) * (1 - 0.9 * clamp(amount, 0, 1));
}
export { paint };
