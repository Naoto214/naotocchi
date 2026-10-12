import {THREE,smoothNormals} from '../../character-3d/geometry.mjs';
const TAU=Math.PI*2;
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
