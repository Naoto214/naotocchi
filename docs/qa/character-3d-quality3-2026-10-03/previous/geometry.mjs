// なおとっち — Character 3D の 形の 道具(three.js だけ。外部 asset なし・ぜんぶ ここで つくる)。
//
// ・「球・棒・箱を くみあわせた だけ」に しない ため、形は 変形した 球(blob)・回転体(lathe)・
//   太さが かわる すいーぷ(sweep)・格子の 面(sheet)で つくり、つなぎめの 法線を ならす(smooth)
// ・色は 頂点色(vertex color)。material は ほぼ 1 つを みんなで つかう(draw call と material を ふやさない)
// ・顔は 頭の 面へ 投影(projectGrid / projectPoint)。どんな 形の 頭(かさ・星・魚の 鼻先)でも おなじ 道具で のせる
import * as THREE from '../../../../vendor/three-0.170.0/three.module.min.js';
export { THREE };

const TAU = Math.PI * 2;
const _c = new THREE.Color();
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
// 決まった 乱数(おなじ species は いつも おなじ 形)
export function rng(seed) { let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function noise3(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }

// ---------------- 法線を ならす(球 / lathe の 継ぎ目を 見せない)
export function smoothNormals(geo) {
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal, map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4);
    const e = map.get(k); if (e) e.push(i); else map.set(k, [i]);
  }
  for (const ids of map.values()) {
    if (ids.length < 2) continue;
    let x = 0, y = 0, z = 0; for (const i of ids) { x += nor.getX(i); y += nor.getY(i); z += nor.getZ(i); }
    const l = Math.hypot(x, y, z) || 1; for (const i of ids) nor.setXYZ(i, x / l, y / l, z / l);
  }
  nor.needsUpdate = true;
  return geo;
}
// ---------------- 頂点色
export function paint(geo, fn) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i), nor ? nor.getX(i) : 0, nor ? nor.getY(i) : 1, nor ? nor.getZ(i) : 0, i);
    _c.set(c); arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
export const solid = (geo, hex) => paint(geo, () => hex);
export function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)).getHexString(); }
export function shade(a, k) { const c = new THREE.Color(a); c.multiplyScalar(k); return '#' + c.getHexString(); }
// ---------------- 変換
export function xform(geo, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')), new THREE.Vector3(...(Array.isArray(scale) ? scale : [scale, scale, scale])));
  geo.applyMatrix4(m);
  return geo;
}
// ---------------- まとめる(おなじ bone・おなじ material の 部品は 1 つの geometry = 1 draw call)
export function merge(geos) {
  const list = geos.filter(Boolean);
  let vc = 0, ic = 0;
  const cs = list.some(g => g.attributes.color?.itemSize === 4) ? 4 : 3;
  for (const g of list) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
  const P = new Float32Array(vc * 3), N = new Float32Array(vc * 3), C = new Float32Array(vc * cs), U = new Float32Array(vc * 2), I = new (vc > 65535 ? Uint32Array : Uint16Array)(ic);
  let vo = 0, io = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    P.set(g.attributes.position.array.subarray(0, n * 3), vo * 3);
    if (g.attributes.normal) N.set(g.attributes.normal.array.subarray(0, n * 3), vo * 3);
    for (let j=0;j<n;j++) { const c=g.attributes.color; C[(vo+j)*cs]=c?c.getX(j):1; C[(vo+j)*cs+1]=c?c.getY(j):1; C[(vo+j)*cs+2]=c?c.getZ(j):1; if(cs===4)C[(vo+j)*cs+3]=c?.itemSize===4?c.getW(j):1; }
    if (g.attributes.uv) U.set(g.attributes.uv.array.subarray(0, n * 2), vo * 2);
    if (g.index) { for (let i = 0; i < g.index.count; i++) I[io + i] = g.index.getX(i) + vo; io += g.index.count; } else { for (let i = 0; i < n; i++) I[io + i] = vo + i; io += n; }
    vo += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.BufferAttribute(C, cs));
  out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  out.setIndex(new THREE.BufferAttribute(I, 1));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

// ---------------- 変形した 球。shape(x, y, z) は 単位球の 点 → あたらしい [x, y, z]
export function blob(shape, ws = 18, hs = 12) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const r = shape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, r[0], r[1], r[2]); }
  return smoothNormals(g);
}
export const ellipsoid = (rx, ry, rz, ws = 14, hs = 10) => blob((x, y, z) => [x * rx, y * ry, z * rz], ws, hs);

// A continuous open cap. The boundary follows the hairline instead of sinking
// parts of a whole sphere through the skull (which exposes scalp triangles).
// azimuth 0 faces +z; polar angle runs from crown to the lower hairline.
export function scalpCap(radius, { front = 1.05, side = 1.65, back = 2.05, volume = 0.04 } = {}) {
  const pos = [], indices = [], around = 32, rings = 10;
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= around; i++) {
    const a = i / around * TAU, ca = Math.cos(a);
    const boundary = ca >= 0 ? lerp(side, front, ca * ca) : lerp(side, back, ca * ca);
    const t = j / rings, p = t * boundary;
    const r = radius * (1 + volume * Math.sin(a * 7 + t * 1.7) ** 2 * Math.sin(p));
    pos.push(Math.sin(a) * Math.sin(p) * r, Math.cos(p) * r, Math.cos(a) * Math.sin(p) * r);
    if (j < rings && i < around) { const k = j * (around + 1) + i, n = k + around + 1; indices.push(k,n,k+1,n,n+1,k+1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3)); g.setIndex(indices);
  return smoothNormals(g);
}

// Smooth front outline with a shallow rounded back. Shared by soft larvae,
// lobed bodies and future irregular silhouettes; not a species-specific mesh.
export function outlineLoft(outline, depth, segments = 48, rings = 6) {
  const curve = new THREE.CatmullRomCurve3(outline.map(([x,y])=>new THREE.Vector3(x,y,0)),true,'centripetal');
  const cx=outline.reduce((s,p)=>s+p[0],0)/outline.length,cy=outline.reduce((s,p)=>s+p[1],0)/outline.length;
  const area=outline.reduce((sum,p,i)=>{const q=outline[(i+1)%outline.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
  const winding = area >= 0 ? 1 : -1;
  const pos=[],idx=[],sideSize=(rings+1)*(segments+1);
  for(const side of [1,-1])for(let r=0;r<=rings;r++)for(let i=0;i<=segments;i++){
    const p=curve.getPoint(i/segments),t=r/rings;
    pos.push(lerp(cx,p.x,t),lerp(cy,p.y,t),side*depth*Math.sqrt(1-t*t));
    if(r<rings&&i<segments){const a=(side===1?0:sideSize)+r*(segments+1)+i,b=a+segments+1;
      if(side*winding===1)idx.push(a,b,a+1,a+1,b,b+1);else idx.push(a,a+1,b,a+1,b+1,b);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);return smoothNormals(g);
}
// ---------------- 回転体(profile = [[半径, 高さ], …] 下から上)
export function lathe(profile, seg = 16) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
  return smoothNormals(g);
}
// ---------------- すいーぷ: path(Vector3 の ならび)に そって、radius(t) の 太さで。はしは まるく とじる
export function sweep(path, radius, radial = 9, opt = {}) {
  const pts = path.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p)));
  const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.LineCurve3(pts[0], pts[1]);
  const steps = opt.steps || Math.max(6, pts.length * 4);
  const frames = curve.computeFrenetFrames(steps, false);
  const flat = opt.flat || 1;   // 断面の ひらたさ(1 = まる)
  const rings = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, c = curve.getPointAt(t), r = radius(t);
    rings.push({ c, r, N: frames.normals[s], B: frames.binormals[s], T: frames.tangents[s] });
  }
  const capN = opt.cap === false ? 0 : 3;
  const ringList = [];
  // はじめの まるい ふた
  for (let k = capN; k >= 1; k--) { const a = (k / (capN + 1)) * Math.PI / 2, R = rings[0]; ringList.push({ c: R.c.clone().addScaledVector(R.T, -Math.sin(a) * R.r), r: R.r * Math.cos(a), N: R.N, B: R.B }); }
  ringList.push(...rings);
  for (let k = 1; k <= capN; k++) { const a = (k / (capN + 1)) * Math.PI / 2, R = rings[rings.length - 1]; ringList.push({ c: R.c.clone().addScaledVector(R.T, Math.sin(a) * R.r), r: R.r * Math.cos(a), N: R.N, B: R.B }); }
  const pos = [], uv = [], idx = [];
  ringList.forEach((R, i) => {
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * TAU, cx = Math.cos(a), sy = Math.sin(a) * flat;
      pos.push(R.c.x + (R.N.x * cx + R.B.x * sy) * R.r, R.c.y + (R.N.y * cx + R.B.y * sy) * R.r, R.c.z + (R.N.z * cx + R.B.z * sy) * R.r);
      uv.push(j / radial, i / (ringList.length - 1));
    }
  });
  for (let i = 0; i < ringList.length - 1; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }   // 法線が 外を むく 向き
  // ふたの さき(1 点に あつめる)
  if (capN) {
    const add = (R, sgn) => { const c = R.c; const base = pos.length / 3; pos.push(c.x, c.y, c.z); uv.push(0.5, sgn > 0 ? 1 : 0); return base; };
    const first = add({ c: rings[0].c.clone().addScaledVector(rings[0].T, -rings[0].r) }, -1);
    for (let j = 0; j < radial; j++) idx.push(first, j, j + 1);
    const lastRing = (ringList.length - 1) * (radial + 1);
    const lastR = rings[rings.length - 1];
    const last = add({ c: lastR.c.clone().addScaledVector(lastR.T, lastR.r) }, 1);
    for (let j = 0; j < radial; j++) idx.push(lastRing + j + 1, lastRing + j, last);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return smoothNormals(g);
}
// ---------------- 格子の 面(葉・はね・ひれ)。outline(u ∈ 0..1 の ながさ方向)→ 半はば w(u)、warp で まげる。両面
export function sheet(len, halfWidth, opt = {}) {
  const nu = opt.nu || 10, nv = opt.nv || 4, warp = opt.warp || ((x, y, z) => [x, y, z]);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, w = halfWidth(u);
    for (let j = 0; j <= nv; j++) { const v = j / nv * 2 - 1; const p = warp(v * w, u * len, 0, u, v); pos.push(p[0], p[1], p[2]); uv.push((v + 1) / 2, u); }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// 放射の 面(はね・ひれの 扇): radius(a) で ふちを きめる。a ∈ [a0, a1]
export function fan(radius, a0, a1, opt = {}) {
  const na = opt.na || 16, nr = opt.nr || 5, warp = opt.warp || ((x, y, z) => [x, y, z]);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= na; i++) {
    const a = lerp(a0, a1, i / na), R = radius(a);
    for (let j = 0; j <= nr; j++) { const r = (j / nr) * R; const p = warp(Math.cos(a) * r, Math.sin(a) * r, 0, j / nr, i / na); pos.push(p[0], p[1], p[2]); uv.push(j / nr, i / na); }
  }
  for (let i = 0; i < na; i++) for (let j = 0; j < nr; j++) { const a = i * (nr + 1) + j, b = a + nr + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------- 顔の 投影(頭の 面へ のせる)
const _ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
// center: 顔の まんなか(頭 bone の 座標)、fwd: 顔の むき、up: 顔の うえ。(u, v) は 顔の 面の うえの きょり
export function faceFrame(center, fwd, up) {
  const f = new THREE.Vector3(...fwd).normalize(), u0 = new THREE.Vector3(...up);
  const r = new THREE.Vector3().crossVectors(u0, f).normalize(), u = new THREE.Vector3().crossVectors(f, r).normalize();
  return { c: new THREE.Vector3(...center), f, r, u };
}
export function projectPoint(target, fr, u, v, lift = 0.004) {
  _o.copy(fr.c).addScaledVector(fr.r, u).addScaledVector(fr.u, v).addScaledVector(fr.f, 3);
  _d.copy(fr.f).negate();
  _ray.set(_o, _d); _ray.near = 0; _ray.far = 10;
  const hit = _ray.intersectObject(target, false)[0];
  if (!hit) return null;
  const n = hit.face.normal.clone();
  // 頂点法線の ほうが なめらか
  const g = target.geometry, nor = g.attributes.normal;
  if (nor) { const a = hit.face.a, b = hit.face.b, c = hit.face.c, bc = hit.barycoord || new THREE.Vector3(1 / 3, 1 / 3, 1 / 3); n.set(0, 0, 0).addScaledVector(new THREE.Vector3().fromBufferAttribute(nor, a), bc.x).addScaledVector(new THREE.Vector3().fromBufferAttribute(nor, b), bc.y).addScaledVector(new THREE.Vector3().fromBufferAttribute(nor, c), bc.z).normalize(); }
  return { p: hit.point.clone().addScaledVector(n, lift), n };
}
// 顔の デカール(格子を 投影した 面)。uv は 顔の 正方形 0..1
export function projectGrid(target, fr, half, n = 10, lift = 0.006) {
  const pos = [], uv = [], ok = [], idx = [];
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    const u = (j / n * 2 - 1) * half, v = (i / n * 2 - 1) * half, h = projectPoint(target, fr, u, v, lift);
    ok.push(!!h); pos.push(...(h ? [h.p.x, h.p.y, h.p.z] : [0, 0, 0])); uv.push(j / n, i / n);
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = i * (n + 1) + j, b = a + n + 1;
    if (ok[a] && ok[b] && ok[a + 1] && ok[b + 1]) idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Soft volume from three crossed, scalloped veils. Vertex alpha fades the rim;
// merged with the seed/core it costs no additional bone or filament draw call.
export function softHalo(radius, seed='halo') {
  const random=rng(seed), pos=[],colors=[],index=[],uv=[];
  const rings=[0,.38,.65,.83,1], alpha=[.8,.85,.75,.55,0], count=20;
  for(let plane=0;plane<3;plane++) {
    const phase=random()*Math.PI*2, start=pos.length/3;
    for(let j=0;j<rings.length;j++)for(let i=0;i<=count;i++) {
      const a=i/count*Math.PI*2, r=radius*rings[j]*(1+.08*Math.sin(a*5+phase)+.04*Math.sin(a*9-phase));
      const x=Math.cos(a)*r,y=Math.sin(a)*r,z=.035*radius*Math.sin(a*3)*rings[j];
      const v=new THREE.Vector3(x,y,z).applyAxisAngle(new THREE.Vector3(0,1,0),plane*Math.PI/3);
      pos.push(v.x,v.y,v.z);uv.push(.5+x/(radius*2.3),.5+y/(radius*2.3));colors.push(1,1,1,alpha[j]);
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<count;i++){const a=start+j*(count+1)+i,b=a+count+1;index.push(a,b,a+1,a+1,b,b+1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
}
