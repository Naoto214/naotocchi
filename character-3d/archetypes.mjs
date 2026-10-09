import {rigidObject} from './rigid-object.mjs';
import {mysteryBlob} from './mystery-blob.mjs';
import {cosmic} from './cosmic.mjs';
import {softToy} from './soft-toy.mjs';
import {spectral} from './spectral.mjs';
import {celestialHumanoid} from './celestial-humanoid.mjs';
import {plumedBird, plumeGeometry} from './plumed-bird.mjs';
import {wingedReptile} from './winged-reptile.mjs';
import {cocoonPod} from './cocoon-pod.mjs';
import {armoredInsect} from './armored-insect.mjs';
import {jellyOrganism} from './jelly-organism.mjs';
import {branchOrganism} from './branch-organism.mjs';
// なおとっち — Character 3D の archetype builder(pilot)。
//
// builder は archetype ごとに 1 つ。species / stage の ちがいは spec.js の 数字と 色だけ(1 species 専用の 関数は つくらない)。
// 座標: 前 = +z、うえ = +y、足もと = y 0。大きさは だいたい 高さ 1 前後(あとで 2D の 絵の 大きさに あわせる: runtime の fit)
// どの builder も: rig(bone)・顔の 場所(face spec)・locomotion・idlePose・hover を かえす
import { THREE, blob, lathe, sweep, sheet, fan, ellipsoid, paint, solid, mix, shade, xform, merge, clamp, lerp, smooth, rng, noise3, scalpCap, outlineLoft, softHalo, openedShellParts } from './geometry.mjs';
import { Rig } from './rig.mjs';
import { crouchedQuadruped } from './crouched-quadruped.mjs';
import SPEC from './spec-esm.mjs';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ================= 付属品(attachments) =================
function caneGeo(h, color = '#8a5a2e') {
  return solid(sweep([[0, 0.02, 0], [0, h * 0.55, 0.01], [0, h, 0], [0, h + 0.07, 0.06], [0, h + 0.03, 0.13]], () => 0.022, 6, { steps: 14 }), color);
}
function branchGeo(len, y) {
  const stick = paint(sweep([[-len / 2, y, 0], [-len * 0.1, y + 0.02, 0.01], [len / 2, y - 0.01, 0]], (t) => 0.045 * (1 - 0.3 * t), 7, { steps: 12 }), (x, yy, z, nx, ny) => mix('#7a4e2a', '#a8784a', ny * 0.5 + 0.5));
  const leaf = paint(xform(sheet(0.26, (u) => Math.sin(Math.PI * u) * 0.09, { nu: 8, nv: 2, warp: (x, yy, z, u) => [x, yy, Math.sin(Math.PI * u) * 0.03] }), { pos: [-len / 2 + 0.04, y + 0.02, 0], rot: [0, 0, 1.2] }), (x, yy, z, nx, ny, nz, i) => '#5ab83a');
  return merge([stick, leaf]);
}
function dirtGeo(r, colors, seed) {
  const R = rng(seed);
  const mound = paint(blob((x, y, z) => { const n = 1 + 0.09 * (noise3(x * 3, y * 3, z * 3) - 0.5); return [x * r * n, Math.max(-0.02, y) * r * 0.22 * n, z * r * 0.85 * n]; }, 16, 8), (x, y, z, nx, ny) => mix(colors.dirt, shade(colors.dirt, 1.25), ny));
  const stones = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + (R()-.5)*.2, d = r * (0.78 + R() * 0.18), s = 0.05 + R() * 0.05; stones.push(paint(xform(ellipsoid(s,s*.72,s*.9,7,5), { pos: [Math.cos(a) * d, r * 0.06, Math.sin(a) * d * 0.85], rot: [R(), R(), R()] }), () => mix(colors.pebble, '#d8b890', R() * 0.6))); }
  const grass = [];
  for (let i = 0; i < 3; i++) { const a = -0.8 + i * 0.9 + R() * 0.3, d = r * 0.8; grass.push(solid(sweep([[Math.cos(a) * d, 0.02, Math.sin(a) * d * 0.8], [Math.cos(a) * d * 1.04, 0.1, Math.sin(a) * d * 0.82]], (t) => 0.025 * (1 - t), 4, { steps: 3 }), '#5aa83a')); }
  return merge([mound, ...stones.map((g) => { g.computeVertexNormals(); return g; }), ...grass]);
}
function pappusGeo(r, color, n = 22, seed = 'p', fluffy = false) {
  const R = rng(seed), parts = [];
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, b = Math.acos(1 - R() * (fluffy ? 2 : 1.3)), d = V(Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a));
    parts.push(solid(sweep([[0, 0, 0], [d.x * r, d.y * r, d.z * r]], () => fluffy ? r*.008 : .008, 3, { steps: 2, cap: false }), color));
    if (!fluffy) parts.push(solid(xform(ellipsoid(0.028, 0.028, 0.028, 5, 4), { pos: [d.x * r, d.y * r, d.z * r] }), color));
  }
  return merge(parts);
}
function bubblesGeo(list) {
  return merge(list.map(([x, y, z, r]) => paint(xform(ellipsoid(r, r, r, 10, 8), {pos:[x,y,z]}), (px, py, pz, nx, ny) => (ny > 0.55 ? '#ffffff' : '#7ec8f8'))));
}

// Surface ribbons follow the hex boundaries exactly. Sampling narrow seams only
// at the dome's coarse vertices made disconnected blurry spots in browser QA.
function shellSeams(sh,color){
  const cell=sh.cell||.3,positions=[],normals=[],indices=[],seen=new Set(),limit=.985;
  const point=(u,v)=>[u*sh.width,sh.height*Math.sqrt(Math.max(0,1-u*u-v*v))+.003,v*sh.length];
  for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++){
    const cx=(col+(Math.abs(row)%2)*.5)*cell*Math.sqrt(3),cz=row*cell*1.5;
    for(let side=0;side<6;side++){
      const a=(side+.5)*TAU/6,b=(side+1.5)*TAU/6;
      const ax=cx+Math.cos(a)*cell,az=cz+Math.sin(a)*cell,bx=cx+Math.cos(b)*cell,bz=cz+Math.sin(b)*cell;
      const keys=[[ax,az],[bx,bz]].map(p=>p.map(x=>x.toFixed(5)).join(',')).sort().join('/');if(seen.has(keys))continue;seen.add(keys);
      const dx=bx-ax,dz=bz-az,A=dx*dx+dz*dz,B=2*(ax*dx+az*dz),C=ax*ax+az*az-limit*limit,D=B*B-4*A*C;if(D<=0)continue;
      const lo=Math.max(0,(-B-Math.sqrt(D))/(2*A)),hi=Math.min(1,(-B+Math.sqrt(D))/(2*A));if(hi<=lo)continue;
      const length=Math.sqrt(A),nx=-dz/length*.009,nz=dx/length*.009,start=positions.length/3,steps=10;
      for(let i=0;i<=steps;i++)for(const sign of [-1,1]){const t=lerp(lo,hi,i/steps),u=ax+dx*t+nx*sign,v=az+dz*t+nz*sign;positions.push(...point(u,v));const n=V(u/sh.width,Math.sqrt(Math.max(0,1-u*u-v*v))/sh.height,v/sh.length).normalize();normals.push(...n.toArray());}
      for(let i=0;i<steps;i++){const k=start+i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setIndex(indices);return solid(g,color);
}

// ================= quadruped(犬・柴・ねこ …) =================
export function quadruped(sp, key) {
  if(sp.crouch)return crouchedQuadruped(sp,key);
  const c = sp.colors, B = sp.body, Hd = sp.head, Lg = sp.legs;
  const rig = new Rig(key, 'quadruped', 'quadWalk');
  const bodyY = Lg.len + B.r * 0.72;
  const regionPaint=(regions,x,y,z)=>{for(const p of regions||[]){const d=((x-p.at[0])/p.size[0])**2+((y-p.at[1])/p.size[1])**2+((z-p.at[2])/p.size[2])**2;if(d<1+.08*Math.sin(y*12+z*8))return c[p.color];}return null;};
  const patch = (x, y, z) => sp.patches && (Math.sin(x * 7 + z * 3) + Math.cos(z * 5 - y * 4)) > 1.1 ? (z > 0 ? c.patch : c.patch2) : null;
  const bodyCol = (x, y, z, nx, ny, nz) => { const p = sp.patchMap ? regionPaint(sp.patchMap.body,x/B.r,y/B.r,z/(B.len/2)) : patch(x, y, z); if (p) return p; const belly = smooth(-0.15, -0.6, ny) + (z > B.len * 0.28 ? smooth(0.3, -0.2, ny) * 0.9 : 0); return mix(mix(c.base, shade(c.base, 0.92), smooth(0.4, 0.95, ny) * 0.5), c.belly, belly); };
  const body = paint(blob((x, y, z) => { const t = (z + 1) / 2, s = lerp(B.hip, B.chest, t), sag = y < 0 ? 0.94 : 1; return [x * B.r * s * 0.9, y * B.r * s * sag * 0.95, z * B.len / 2]; }, B.segments?.[0]||20, B.segments?.[1]||14), bodyCol);
  const neck = paint(sweep([[0, B.r * 0.1, B.len * 0.36], [0, B.r * 0.55 + sp.neck * 0.6, B.len * 0.5 + 0.02]], (t) => B.r * lerp(0.62, 0.5, t), 9, { steps: 4 }), bodyCol);
  const parts = [body, neck];
  if (sp.fluff === 'chest' || sp.coat) parts.push(paint(blob((x, y, z) => { const n = 1 + 0.18 * Math.max(0, noise3(x * 4, y * 4, z * 4) - 0.4); return [x * B.r * (sp.coat?.width || .62) * n, y * B.r * (sp.coat?.height || .62) * n, z * B.r * (sp.coat?.depth || .5) * n + B.len * 0.42]; }, 12, 10), () => c.belly));
  rig.add('body', 'root', [0, bodyY, 0], parts);
  if(sp.shell){
    const sh=sp.shell;
    const dome=paint(blob((x,y,z)=>[x*sh.width,y*(y>0?sh.height:.07),z*sh.length],32,20),(x,y,z,nx,ny)=>{
      if(y<.012)return c.belly;
      const u=x/sh.width,v=z/sh.length,cell=sh.cell||.3;let first=Infinity,second=Infinity;
      const row=Math.round(v/(cell*1.5)),col=Math.round(u/(cell*Math.sqrt(3)));
      for(let j=row-2;j<=row+2;j++)for(let i=col-2;i<=col+2;i++){const dx=u-(i+(Math.abs(j)%2)*.5)*cell*Math.sqrt(3),dz=v-j*cell*1.5,d=dx*dx+dz*dz;if(d<first){second=first;first=d;}else if(d<second)second=d;}
      return mix(c.shell,c.scute,Math.max(0,1-first/(cell*cell))*.5);
    });
    const moss=[];
    for(const patch of sh.moss||[])for(let i=0;i<5;i++){
      const a=i*TAU/5,u=patch.u+Math.cos(a)*patch.r*.55/sh.width,v=patch.v+Math.sin(a)*patch.r*.55/sh.length;
      const y=sh.height*Math.sqrt(Math.max(0,1-u*u-v*v));
      moss.push(paint(xform(blob((x,yy,z)=>{const bump=1+.12*Math.sin(x*8+z*9);return [x*patch.r*.60*bump,yy*patch.h,z*patch.r*.60*bump];},8,6),{pos:[u*sh.width,y+patch.h*.40,v*sh.length]}),(x,y,z,nx,ny)=>mix(c.moss,shade(c.moss,1.18),ny*.5+.5)));
    }
    rig.add('shell','body',[0,.02,-.025],[dome,shellSeams(sh,c.seam),...moss]);
  }
  // 頭
  const hr = Hd.r;
  const headCol = (x, y, z, nx, ny, nz) => { const p = sp.patchMap ? regionPaint(sp.patchMap.head,x/Hd.r,y/Hd.r,z/Hd.r) : patch(x * 2, y * 2, z * 2 + 3); if (p && (sp.patchMap || y>0)) return p; const muz = smooth(0.0, 0.5, nz) * smooth((sp.markings === 'urajiro' ? 0.36 : 0.12) * hr, -0.25 * hr, y); return mix(c.base, c.muzzle, muz * (sp.fluff ? 1 : 0.85)); };
  const skull = paint(blob((x, y, z) => { const ch = y < 0 ? 1 + (Hd.cheek || 0.1) * -y : 1; return [x * hr * (Hd.width || 1.04) * ch, y * hr * Hd.squash, z * hr * 0.95]; }, 18, 12), headCol);
  const snout = Hd.flatFace ? null : paint(xform(blob((x, y, z) => [x * Hd.snoutR * 1.2, y * Hd.snoutR * 0.85, z * (Hd.snout * 0.5 + Hd.snoutR * 0.55)], 12, 8), { pos: [0, -hr * 0.3, hr * 0.62 + Hd.snout * 0.35] }), () => c.muzzle);
  const nose = Hd.flatFace ? null : solid(xform(ellipsoid(Hd.snoutR * 0.42, Hd.snoutR * 0.3, Hd.snoutR * 0.26, 8, 6), { pos: [0, -hr * 0.3 + Hd.snoutR * 0.55, hr * 0.62 + Hd.snout * 0.35 + Hd.snout * 0.5 + Hd.snoutR * 0.4] }), c.nose);
  const headGeo = merge(Hd.flatFace ? [skull] : [skull, snout, nose]);
  const headPos = [0, B.r * 0.55 + sp.neck, B.len / 2 + hr * 0.25 + (Hd.forward||0)];
  rig.add('head', 'body', headPos, null);
  rig.mesh('head', [headGeo.clone()]);
  // 耳
  for (const s of [-1, 1]) {
    const E = {...sp.ears, ...sp.ears.sides?.[s < 0 ? "left" : "right"]};
    if(E.type==='none'){rig.add(s<0?'earL':'earR','head',[s*hr*.6,hr*.55,-hr*.08],null);continue;}
    let g;
    if (E.type === 'floppy') g = paint(blob((x, y, z) => { const t = (1 - y) / 2; return [x * E.w * (0.55 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.1))), -t * E.len, z * 0.06 + 0.02]; }, 10, 8), () => c.ear);
    else g = paint(blob((x, y, z) => { const t = (y + 1) / 2; return [x * E.w * (1 - t) * 0.95, t * E.len, z * 0.07 * (1 - t * 0.6)]; }, 10, 8), (x, y, z, nx, ny, nz) => (nz > 0.3 ? mix(c.ear, '#f0b0a0', 0.35) : c.base));
    rig.add(s < 0 ? 'earL' : 'earR', 'head', [s * hr * 0.6, hr * (E.type === 'floppy' ? 0.62 : 0.55), -hr * 0.08], [g], 'opaque', [0, 0, s * (E.type === 'floppy' ? 0.45 + E.tilt : -0.25 + E.tilt)]);
  }
  // 足(付けね = 肩 / こし。下へ のびる)
  const legTop = bodyY - B.r * 0.25;
  for (const [nm, x, z] of [['legFL', -1, 1], ['legFR', 1, 1], ['legBL', -1, -1], ['legBR', 1, -1]]) {
    const L = legTop, pr = Lg.r * 1.05;
    const leg = paint(sweep([[0, 0, 0], [x*(Lg.splay||0)*.7, -L * 0.5, (z < 0 ? -0.02 : 0.01)], [x*(Lg.splay||0), -L + pr * 0.8, 0.0]], (t) => Lg.r * lerp(z < 0 ? 1.45 : 1.25, 0.85, t), 8, { steps: 8 }), (px, py, pz, nx, ny) => (py < -L * 0.75 ? c.paw : sp.patches && z < 0 ? c.patch2 || c.base : c.base));
    const paw = solid(xform(ellipsoid(pr, pr * 0.62, pr * 1.3, 10, 6), { pos: [x*(Lg.splay||0), -L + pr * 0.6, pr * 0.35] }), c.paw);
    rig.add(nm, 'body', [x * B.r * 0.52, -B.r * 0.25, z * B.len * 0.33], [leg, paw]);
  }
  // しっぽ
  const T = sp.tail, tl = T.len, tr = T.r;
  const tailPath = { wrap: [[0,0,0],[-tl*.32,-tr,-tl*.12],[-B.r*1.08,-B.r*.55,tl*.30],[-B.r*.92,-B.r*.62,tl*.68],[-B.r*.30,-B.r*.64,tl*.82],[B.r*.30,-B.r*.61,tl*.78]], hook: [[0,0,0],[tl*.32,tl*.12,-tl*.22],[tl*.55,tl*.6,-tl*.35],[tl*.37,tl*.96,-tl*.3],[tl*.04,tl*.96,-tl*.2],[-tl*.09,tl*.78,-tl*.14]], raised: [[0,0,0],[0,tl*0.4,-tl*0.3],[0,tl*0.9,-tl*0.34],[0,tl*1.1,-tl*0.12]], curl: [[0, 0, 0], [0, tl * 0.45, -tl * 0.3], [tl*.16, tl * .87, -tl * .1], [tl*.42, tl * .78, tl * .12], [tl*.39,tl*.52,tl*.2], [tl*.19,tl*.49,tl*.16]], plume: [[0, 0, 0], [0, tl * 0.15, -tl * 0.5], [0, tl * 0.35, -tl * 0.95]], short: [[0, 0, 0], [0, tl * 0.35, -tl * 0.6]], long: [[0, 0, 0], [0, -tl * 0.05, -tl * 0.45], [0, tl * 0.25, -tl * 0.8], [0, tl * 0.55, -tl * 0.85]] }[T.type];
  const tailR = T.type === 'plume' ? (t) => tr * (0.9 + Math.sin(Math.PI * t) * 0.9) : (t) => tr * lerp(1.1, 0.55, t);
  rig.add('tail', 'body', [0, B.r * 0.35, -B.len / 2 * 0.9], [paint(sweep(tailPath, tailR, 8, { steps: T.type==='hook'?20:12 }), (x, y, z) => (T.type === 'curl' && y > tl * 0.6 ? c.belly : sp.patches ? (y>tl*.91?c.base:y>tl*.66?c.patch2:c.patch) : c.base))]);
  // Optional closed source hair/horns inherit established head/body/tail owners.
  for(const q of sp.details||[]){const parts=(q.volumes||[]).map(v=>solid(xform(ellipsoid(...v.size,v.segments?.[0]||16,v.segments?.[1]||12),{pos:v.at,rot:v.rotation||[0,0,0]}),v.color||q.color));
    for(const p of q.paths||[])parts.push(solid(sweep(p.path,t=>p.radius*(1-(p.taper||0)*t),p.radial||9,{steps:p.steps||20,flat:p.flat||1}),p.color||q.color));
    rig.add(q.name,q.bone||'body',q.at||[0,0,0],parts,'opaque',q.rotation||[0,0,0]);
  }
  rig.meta = { idlePose: sp.idlePose, hover: 0, bodyY, legTop, bodyR: B.r, bodyLen: B.len, pawR: Lg.r*1.05, earType: sp.ears.type, poseProfile: sp.poseProfile || null };
  rig.faceSpec = { bone: 'head', target: headGeo, center: [0, hr * 0.0, hr * 0.92], fwd: [0, 0.08, 1], half: hr * 0.74, eyeSize: Hd.eyeSize || 0.25, eyeProfile: Hd.eyeProfile,
    layout: { eyeX: Hd.eyeX || 25, eyeY: 54, mouthY: 104, browY: 34, cheekX: 38, cheekY: 80, mouthW: 9 }, style: { mouth: '#9a2a24', blush: '#f08a7a' }, normalEye: sp.normalEye || (sp.idlePose === 'lie' || sp.fluff === 'chest' ? 'content' : null) };
  if(sp.sourceFace)rig.faceSpec={...rig.faceSpec,...sp.sourceFace,layout:{...rig.faceSpec.layout,...sp.sourceFace.layout}};
  return rig;
}

// ================= avian(ペンギン) =================
export function avian(sp, key) {
  const c = sp.colors, B = sp.body, Hd = sp.head;
  const rig = new Rig(key, 'avian', 'waddle');
  const R = rng(key), fl = sp.fluff || 0;
  const fuzz = (x, y, z) => 1 + fl * 0.08 * (noise3(x * 9, y * 9, z * 9) - 0.3);
  const patchy = (x, y, z) => sp.patchy && Math.sin(x * 9 + 1.3) * Math.sin(y * 7 + 0.4) * Math.sin(z * 8 + 2.1) > 0.22;
  const bodyCol = (x, y, z, nx, ny, nz) => {
    const by = B.h * 0.42, bw = B.r * B.belly, bh = B.h * 0.42;
    const inBelly = nz > 0.15 && (x * x) / (bw * bw) + ((y - by) * (y - by)) / (bh * bh) < 1;
    if (inBelly) return c.belly;
    if (patchy(x, y, z)) return c.fluff;
    return nz < -0.3 ? c.back : c.base;
  };
  const body = paint(blob((x, y, z) => { const f = fuzz(x, y, z), yy = y * 0.5 + 0.5, k = 1 - 0.36 * Math.pow(yy, 1.6) + (y < 0 ? 0.04 * y : 0); return [x * B.r * k * f, yy * B.h, z * B.r * 0.92 * k * f]; }, 20, 14), bodyCol);
  const featherParts=[];
  if(sp.featherMarks){const m=sp.featherMarks,surface=(x,y)=>{const yy=y/B.h,unitY=yy*2-1,k=1-.36*Math.pow(yy,1.6)+(unitY<0?.04*unitY:0);return [x,y,B.r*.92*k*Math.sqrt(Math.max(0,1-unitY*unitY-(x/(B.r*k))**2))+.009];};for(const [x,y]of m.positions)featherParts.push(solid(sweep([surface(x-m.width,y+m.height),surface(x,y),surface(x+m.width,y+m.height)],()=>.006,5,{steps:6}),m.color));}
  rig.add('body', 'root', [0, 0.02, 0], [body,...featherParts]);
  const hr = Hd.r, hy = B.h * 0.82 + hr * (0.42 - Hd.merge * 0.3);
  const headCol = (x, y, z, nx, ny, nz) => { if(sp.faceDiscs){const d=sp.faceDiscs,lobe=((Math.abs(x)/hr-d.x)/d.width)**2+((y/hr-d.y)/d.height)**2;return nz>.18&&lobe<1?c.face:c.base;} if (patchy(x + 3, y, z) && y > hr * 0.3) return c.fluff; const lobe = Math.pow((Math.abs(x)-hr*.40)/(hr*.43),2)+Math.pow((y+hr*.18)/(hr*.66),2); const face = nz > .20 && (lobe < 1 || (Math.abs(x)<hr*.38 && y<0 && y>-hr*.83)); return face ? c.face : c.base; };
  const skull = paint(blob((x, y, z) => { const f = fuzz(x + 1, y, z); return [x * hr * 1.08 * f, y * hr * f, z * hr * f]; }, sp.faceDiscs?40:18, sp.faceDiscs?28:12), headCol);
  const tufts = [];
  if (fl > 0.3 || sp.patchy) for (let i = 0; i < 4; i++) { const a = -0.6 + i * 0.4 + R() * 0.2; tufts.push(solid(sweep([[Math.sin(a) * hr * 0.4, hr * 0.85, 0], [Math.sin(a) * hr * 0.7, hr * 1.18, -0.03]], (t) => 0.05 * (1 - t), 5, { steps: 3 }), sp.patchy ? c.fluff : c.base)); }
  for(const q of sp.earTufts||[])tufts.push(paint(sweep(q.path,t=>q.r*(1-t)+.002,8,{steps:12}),(x,y,z,nx,ny,nz)=>mix(c.back,c.base,Math.max(0,nz))));
  const beak = paint(xform(lathe([[0.001, 0], [Sbeak(sp).r, 0.0], [Sbeak(sp).r * 0.7, Sbeak(sp).len * 0.5], [0.001, Sbeak(sp).len]], 8), { pos: [0, -hr * 0.12, hr * 0.92], rot: [Math.PI / 2 - 0.15, 0, 0] }), (x, y) => (y < -hr * 0.2 ? shade(c.beak, 0.85) : c.beak));
  const headGeo = merge([skull, ...tufts, beak]);
  rig.add('head', 'body', [0, hy, 0.02], null);
  rig.mesh('head', [headGeo.clone()]);
  // つばさ(ひれ)
  for (const s of [-1, 1]) {
    const W={...sp.wing,...sp.wing.sides?.[s<0?'left':'right']};
    const g = W.plumes ? merge(W.plumes.map(plumeGeometry)) : paint(blob((x, y, z) => { const t = (1 - y) / 2; return [x * W.w * Math.sin(Math.PI * Math.min(1,t*.9+.08)) + s * .02, -t * W.len, W.forward ? z * .065 * (1 - t * 0.6) * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.15))+W.forward*t : z * .065 * (1 - t * 0.6) * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.15))]; }, 12, 8), (x,y,z) => sp.patchy && y > -W.len*.48 ? c.fluff : fl>.5 ? c.base : c.back);
    rig.add(s < 0 ? 'wingL' : 'wingR', 'body', W.at?.[s<0?'left':'right'] || [s * B.r * 0.84, B.h * 0.72, -0.02], [g], 'opaque', [0, 0, sp.wingPose?.[s < 0 ? 'left' : 'right'] ?? (sp.raisedWing && s>0 ? 2.25 : s * .20)]);
  }
  // 足
  for (const s of [-1, 1]) {
    const foot = paint(blob((x, y, z) => { const toe = z > 0 ? 1 + 0.18 * Math.cos(Math.atan2(x, z) * 3) : 1; return [x * 0.11 * toe, (y * 0.5 + 0.5) * 0.06, z * sp.feet.len * 0.6 * toe + sp.feet.len * 0.35]; }, 12, 6), () => c.feet);
    rig.add(s < 0 ? 'footL' : 'footR', 'root', [s * B.r * 0.42, 0, B.r * 0.2], [foot]);
  }
  if ((sp.attachments || []).includes('cane')) rig.add('cane', 'root', [B.r * 1.05, 0, B.r * 0.55], [caneGeo(B.h * 0.55)]);
  rig.meta = { idlePose: sp.idlePose, hover: 0, bodyH: B.h };
  rig.faceSpec = { bone: 'head', target: headGeo, center: [0, hr * 0.05, hr * 0.9], fwd: [0, 0.05, 1], half: hr * 0.74, eyeSize: 0.25,
    layout: { eyeX: 25, eyeY: 50, mouthY: 108, browY: 30, cheekX: 40, cheekY: 74, mouthW: 7 }, style: { blush: '#f4a0a0' }, normalEye: sp.normalEye || (sp.idlePose === 'sit' ? 'content' : null) };
  return rig;
}
const Sbeak = (sp) => sp.beak;

// ================= fish(カクレクマノミ) =================
export function fish(sp, key) {
  const c = sp.colors, B = sp.body, len = B.len;
  const rig = new Rig(key, 'fish', 'swimHover');
  const prof = (t) => (t >= -0.15 ? Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t + 0.15) / 1.15, 2.6)), 1 / 2.6) : lerp(0.24, 1, Math.pow((t + 1) / 0.85, 1.3)));
  const profile=t=>B.roundHead && t>-.15 ? 1 : prof(t);
  const along = (z) => (1 - z / (len / 2)) / 2;   // 0 = 頭 1 = 尾
  const band = (s) => { for (const b of sp.bands || []) { const d = Math.abs(s - b), w = b > 0.8 ? .04 : .068; if (d < w) return 'band'; if (sp.bandEdge && d < w + 0.022) return 'edge'; } return null; };
  const bodyCol = (x, y, z, nx, ny) => {
    const b=band(along(z));if(b==='band')return c.band;if(b==='edge')return c.edge;
    let color=mix(c.base,c.belly,smooth(-.1,-.7,ny));
    if(c.back)color=mix(color,c.back,smooth(.05,.8,ny));
    if(c.head)color=mix(color,c.head,smooth(.19,.36,z/len));
    const marks=sp.sideMarks;
    if(marks){
      const s=along(z),flank=Math.abs(x)/B.w;
      if(marks.bars && s>.25 && s<.86 && flank>.48 && Math.abs(y)<B.h*.28 && Math.cos((s-.28)*marks.bars*Math.PI*2/.63)>.38)color=mix(color,marks.color,marks.strength??.7);
    }
    return color;
  };
  const g = new THREE.SphereGeometry(1, 18, 44); g.rotateX(Math.PI / 2);   // しまの ために 長さ方向の 輪を こまかく
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rho = Math.hypot(x, y) || 1, k = profile(z) * Math.sqrt(Math.max(0, 1 - z * z)) / rho; p.setXYZ(i, x * k * B.w, y * k * B.h / 2 * (y > 0 ? 1 : 0.92), z * len / 2); }
  const body = paint((await_smooth(g)), bodyCol);
  const finCol = (edgeT) => (u, rim) => (rim > edgeT ? c.edge : c.fin);
  // 背びれ・しりびれ(体の 線に そって たてる)
  const strip = (z0, z1, top, height) => {
    const pos = [], col = [], idx = [], nu = 12, nv = 3;
    for (let i = 0; i <= nu; i++) { const u = i / nu, z = lerp(z0, z1, u), base = profile(z / (len / 2)) * B.h / 2 * (top ? 0.9 : -0.85), hgt = height(u) * (top ? 1 : -1);
      for (let j = 0; j <= nv; j++) { const v = j / nv; pos.push(0, base + hgt * v, z - v * 0.06); const cc = new THREE.Color(v > 0.9 && sp.bandEdge ? c.edge : band(along(z)) === 'band' && v < 0.5 ? c.band : c.fin); col.push(cc.r, cc.g, cc.b); } }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b2 = a + nv + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.setIndex(idx); gg.computeVertexNormals(); return gg;
  };
  const dorsal = strip(len * (sp.fins.dorsalRange?.[0] ?? .16), len * (sp.fins.dorsalRange?.[1] ?? -.4), true, (u) => sp.fins.dorsal * 0.62 * (u < 0.45 ? 0.8 : 1.05) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7) * (u < 0.45 ? 0.85 + 0.15 * Math.abs(Math.sin(u * 28)) : 1));
  const anal = strip(-len * 0.12, -len * 0.38, false, (u) => sp.fins.dorsal * 0.5 * Math.pow(Math.sin(Math.PI * u), 0.6));
  const matKey = sp.translucent ? 'translucent:' + sp.translucent : 'opaque';
  const spots=[];
  if(sp.sideMarks?.spots){
    const random=rng(key+':spots');
    for(let i=0;i<sp.sideMarks.spots;i++){
      const t=-.65+random()*1.1,a=.06+random()*1.05,side=i%2?-1:1,r=profile(t)*Math.sqrt(1-t*t),radius=.009+random()*.009;
      const x=side*Math.cos(a)*r*B.w,y=Math.sin(a)*r*B.h/2,z=t*len/2;
      const normal=V(x/(B.w*B.w),y/(B.h*B.h/4),z/(len*len/4)).normalize();
      const dot=new THREE.CircleGeometry(radius,6);dot.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),normal));dot.translate(x+normal.x*.002,y+normal.y*.002,z+normal.z*.002);
      spots.push(solid(dot,mix(bodyCol(x,y,z,normal.x,normal.y),c.spot||c.back,sp.sideMarks.strength??.5)));
    }
  }
  rig.add('body', 'root', [0, 0, 0], [body, dorsal, anal, ...spots], matKey);
  if(sp.yolk)rig.add('yolk','body',sp.yolk.at,[solid(ellipsoid(sp.yolk.r*.85,sp.yolk.r,sp.yolk.r*1.04,12,8),sp.yolk.color)]);
  if(sp.jaw){
    const J=sp.jaw;
    rig.add('jaw','body',[0,-B.h*.18,len*.38],[solid(sweep([[0,0,-J.length*.6],[0,-J.depth*.2,J.length*.45],[0,J.depth*.75,J.length]],t=>J.depth*(.78-.46*t),8,{steps:8}),c.head||c.belly)]);
  }
  // 尾びれ(まるい 扇 / forked silhouette)

  const tail = paint(xform(fan((a) => sp.tail.len * 0.85 * (sp.tail.fork ? .40+sp.tail.fork*Math.pow(Math.abs(a)/.9,.7) : 0.9 + 0.12 * Math.cos(a * 3.2)), -0.9, 0.9, { na: 14, nr: 5, warp: (x, y) => [x, y * sp.tail.h / sp.tail.len * 0.9, 0] }), { rot: [0, Math.PI / 2, 0] }), (x, y, z) => (Math.hypot(z, y) > sp.tail.len * 0.74 && sp.bandEdge ? c.edge : (c.tail||c.fin)));
  rig.add('tail', 'body', [0, 0, -len / 2 + 0.04], [tail], matKey);
  // 胸びれ
  for (const s of [-1, 1]) {
    const pf = paint(xform(fan((a) => sp.fins.pectoral * (0.85 + 0.15 * Math.cos(a * 2)), -0.7, 0.7, { na: 8, nr: 3 }), { rot: [0, Math.PI / 2 + s * (sp.fins.spread ? -sp.fins.spread : .5), 0.3 * s] }), (x, y, z) => (Math.hypot(x, y, z) > sp.fins.pectoral * 0.75 && sp.bandEdge ? c.edge : c.fin));
    rig.add(s < 0 ? 'finL' : 'finR', 'body', [s * B.w * (sp.fins.spread ? .94 : .8), -B.h * 0.12, len * 0.12], [pf], matKey);
  }
  // 顔は 頭の 先(からだの 前)
  rig.meta = { idlePose: 'swim', hover: sp.hover, len };
  rig.faceSpec = { bone: 'body', target: body, center: [0, B.h * 0.04, len * 0.4], fwd: [0, 0, 1], half: sp.face?.half ?? B.h * 0.66, eyeSize: sp.face?.eyeSize ?? 0.24,
    layout: { eyeX: 36, eyeY: 54, mouthY: 96, browY: 34, cheekX: 42, cheekY: 78, mouthW: 8 }, style: { blush: '#ff9a7a' }, normalEye: sp.normalEye || null };
  if(sp.school?.length){
    const faces=[rig.faceSpec];rig.meta.swimSubrigs=[];
    for(const [i,unit] of sp.school.entries()){
      const child=fish({...sp,school:null,normalEye:unit.normalEye||'round',body:{...B},sideMarks:sp.sideMarks},key+':school'+i),prefix='school'+i+':';
      const group=rig.add(prefix+'root','body',unit.at,null,'opaque',[0,unit.heading||0,0]);
      group.scale.setScalar(unit.scale);group.userData.rest.s.copy(group.scale);
      for(const [name,bone]of Object.entries(child.bones))if(name!=='root'){
        const geos=child.parts.filter(p=>p.bone===name).map(p=>p.mesh.geometry);
        const b=rig.add(prefix+name,prefix+(bone.parent===child.root?'root':bone.parent.name),bone.position.toArray(),geos,matKey,bone.rotation.toArray());
        b.scale.copy(bone.scale);b.userData.rest.s.copy(b.scale);
      }
      faces.push({...child.faceSpec,bone:prefix+child.faceSpec.bone});
      rig.meta.swimSubrigs.push({prefix,phase:.65*(i+1)});
    }
    rig.faceSpec=faces;
  }
  return rig;
}
function await_smooth(g) { g.computeVertexNormals(); return g; }

// ================= humanoid(人) =================
export function humanoid(sp, key) {
  const c = sp.colors, Hd = sp.head, B = sp.body, Lg = sp.legs, Ar = sp.arms;
  const rig = new Rig(key, 'humanoid', sp.idlePose === 'crawl' ? 'crawl' : 'humanWalk');
  const hipY = Lg.len + 0.06;
  const dressed = sp.clothing && sp.clothing !== 'romper';
  const torso = dressed
    ? paint(xform(lathe([[0.001,0],[B.r*.91,0],[B.r,B.h*.12],[B.r*.94,B.h*.65],[B.r*.78,B.h*.9],[B.r*.40,B.h],[0.001,B.h]],16),{scale:[1,1,.78]}),(x,y)=>sp.clothing==='overalls'&&y>B.h*.40?c.sleeve||c.accent:c.top)
    : solid(blob((x,y,z)=>[x*B.r,(y+1)*B.h/2,z*B.r*.78],16,10),c.top);
  const parts = [torso];
  const panel = (points, color) => {
    const sh = new THREE.Shape(); points.forEach(([x,y],i)=>i?sh.lineTo(x,y):sh.moveTo(x,y)); sh.closePath();
    const g = new THREE.ShapeGeometry(sh); g.translate(0,0,B.r*.79); return solid(g,color);
  };
  if (dressed && sp.clothing === 'overalls') {
    // A bib and shoulder straps overlap the shirt volume; the shirt is not an
    // open jacket with a recoloured panel. Shared across toddler lines.
    parts.push(panel([[-B.r*.65,B.h*.16],[B.r*.65,B.h*.16],[B.r*.57,B.h*.70],[-B.r*.57,B.h*.70]],c.top));
    for(const side of [-1,1]){
      parts.push(solid(sweep([[side*B.r*.48,B.h*.66,B.r*.8],[side*B.r*.51,B.h*.98,B.r*.27],[side*B.r*.48,B.h*.88,-B.r*.52],[side*B.r*.48,B.h*.68,-B.r*.72],[side*B.r*.48,B.h*.35,-B.r*.75]],()=>B.r*.11,6,{steps:12,flat:.4}),c.top));
      parts.push(solid(xform(ellipsoid(.015,.015,.01,6,4),{pos:[side*B.r*.48,B.h*.68,B.r*.84]}),'#ddb45e'));
    }
  } else if (dressed && !['shirt','hoodie','knit','vneck'].includes(sp.clothing)) {
    const hoodie=sp.clothing==='layeredHoodie';
    const jacket = sp.clothing === 'jacket' || hoodie;
    parts.push(panel([[-B.r*.24,B.h*.06],[B.r*.24,B.h*.06],[B.r*.31,B.h*.84],[0,B.h*.97],[-B.r*.31,B.h*.84]],c.accent));
    for(const side of [-1,1]) {
      if(!hoodie)parts.push(panel([[side*B.r*.05,B.h*.92],[side*B.r*.28,B.h*1.02],[side*B.r*.38,B.h*.82],[side*B.r*.14,B.h*.73]],c.accent));
      parts.push(panel([[side*B.r*.35,B.h*.91],[side*B.r*.64,B.h*.73],[side*B.r*.31,B.h*(jacket?.42:.61)],[side*B.r*.20,B.h*.77]],shade(c.top,1.13)));
      parts.push(solid(sweep([[side*B.r*.28,B.h*.07,B.r*.8],[side*B.r*.30,B.h*.5,B.r*.8],[side*B.r*.33,B.h*.8,B.r*.72]],()=>.009,4,{steps:5}),shade(c.top,.7)));
    }
    if(!hoodie)for(let i=0;i<3;i++)parts.push(solid(xform(ellipsoid(.012,.012,.009,6,4),{pos:[jacket?0:B.r*.24,B.h*(.22+i*.2),B.r*.83]}),jacket?'#b0a8a0':'#805c36'));
    parts.push(solid(xform(lathe([[B.r*.90,0],[B.r*.93,.025]],16),{scale:[1,1,.79]}),shade(c.top,.83)));
  }
  if(sp.clothing==='vneck')parts.push(panel([[-B.r*.28,B.h*.95],[0,B.h*.64],[B.r*.28,B.h*.95]],c.accent));
  if(sp.wardrobe?.number){
    // Tiny shared digit grid, merged into clothing: no canvas/texture per outfit.
    const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001010010010','111101111101111','111101111001111'];
    const value=String(sp.wardrobe.number),cell=.022,width=(value.length*4-1)*cell;
    for(let n=0;n<value.length;n++){const glyph=digits[Number(value[n])];if(!glyph)continue;for(let i=0;i<15;i++)if(glyph[i]==='1'){
      const x=-width/2+(n*4+i%3)*cell,y=B.h*.65-Math.floor(i/3)*cell;
      const g=panel([[x,y],[x+cell*.87,y],[x+cell*.87,y-cell*.87],[x,y-cell*.87]],c.accent);g.translate(0,0,.008);parts.push(g);
    }}
  }
  if((sp.attachments||[]).includes('tie')){const tie=panel([[-.025,B.h*.85],[0,B.h*.90],[.025,B.h*.85],[.016,B.h*.72],[.042,B.h*.40],[0,B.h*.33],[-.042,B.h*.40],[-.016,B.h*.72]],c.tie);tie.translate(0,0,.004);parts.push(tie);}
  if((sp.attachments||[]).includes('chestBadge')){
    const badge=solid(xform(ellipsoid(.049,.038,.012,10,6),{pos:[0,B.h*.48,B.r*.83]}),c.badge);
    parts.push(badge,...[-1,1].map(s=>solid(xform(ellipsoid(.018,.019,.012,6,4),{pos:[s*.038,B.h*.51,B.r*.84]}),c.badge)));
  }
  if ((sp.attachments || []).includes('backpack')) {
    const bp = paint(blob((x, y, z) => { const sx = Math.sign(x) * Math.pow(Math.abs(x), 0.6), sy = Math.sign(y) * Math.pow(Math.abs(y), 0.6), sz = Math.sign(z) * Math.pow(Math.abs(z), 0.7); return [sx * B.r * 0.78, sy * B.h * 0.42 + B.h * 0.55, sz * B.r * 0.42 - B.r * 0.95]; }, 12, 10), (x, y, z, nx, ny, nz) => (nz < -0.6 && y < B.h * 0.5 ? (c.bag?shade(c.bag,1.12):'#3a3a4c') : c.bag||'#26262f'));
    const straps = [-1, 1].map((s) => solid(sweep([[s * B.r * 0.45, B.h * 0.95, -B.r * 0.55], [s * B.r * 0.5, B.h * 1.0, B.r * 0.2], [s * B.r * 0.45, B.h * 0.5, B.r * 0.82]], () => 0.025, 5, { steps: 8 }), c.bag||'#26262f'));
    parts.push(bp, ...straps);
  }
  if((sp.attachments||[]).includes('bow')){
    for(const side of [-1,1])parts.push(solid(xform(ellipsoid(.065,.044,.026,10,6),{pos:[side*.055,B.h*.84,B.r*.82],rot:[0,0,side*.25]}),c.bow));
    parts.push(solid(xform(ellipsoid(.025,.03,.03,8,6),{pos:[0,B.h*.84,B.r*.85]}),c.bow));
  }
  rig.add('body', 'root', [0, hipY, 0], parts);
  if(sp.wardrobe?.skirt){
    const sk=sp.wardrobe.skirt,g=lathe([[B.r*.89,.06],[B.r,.0],[B.r*sk.flare,-sk.length],[B.r*sk.flare*.95,-sk.length-.015]],32),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const a=Math.atan2(p.getX(i),p.getZ(i)),k=1+.035*Math.cos(a*(sk.pleats||10));p.setXYZ(i,p.getX(i)*k,p.getY(i),p.getZ(i)*k*.82);}g.computeVertexNormals();
    rig.add('skirt','body',[0,0,0],[solid(g,c.bottom)]);
  }
  if((sp.attachments||[]).includes('hood'))rig.add('hood','body',[0,B.h*.88,-B.r*.60],[solid(xform(ellipsoid(B.r*.85,B.h*.25,B.r*.65,14,8),{rot:[-.3,0,0]}),c.accent)]);
  if((sp.attachments||[]).includes('groundToy')){
    const g=[solid(xform(ellipsoid(.16,.07,.085,12,6),{pos:[0,.10,0]}),'#ba4542'),solid(xform(ellipsoid(.09,.07,.079,10,6),{pos:[-.02,.17,0]}),'#4a809b')];
    for(const x of [-1,1])for(const z of [-1,1])g.push(solid(xform(ellipsoid(.043,.043,.024,8,6),{pos:[x*.10,.044,z*.075]}),'#34303b'));
    rig.add('groundToy','root',[-B.r-.20,0,.12],g);
  }
  if((sp.attachments||[]).includes('playBall')){
    const r=.16;rig.add('playBall','root',[B.r+.23,r,.20],[paint(ellipsoid(r,r,r,16,12),(x,y,z)=>Math.cos(Math.atan2(x,z)*5+Math.floor((y/r+1)*2)*1.7)>.5&&Math.cos(y/r*8)>.05?'#253a50':'#eeede5')]);
  }
  // 頭 と かみ
  const hr = Hd.r;
  const skull = paint(blob((x, y, z) => { const k = y < 0 ? 1 + y * 0.1 : 1; return [x * hr * 1.04 * k, y * hr * 0.98, z * hr * 0.96 * k]; }, 18, 14), () => c.skin);
  const ears = [-1, 1].map((s) => solid(xform(ellipsoid(hr * 0.12, hr * 0.17, hr * 0.08, 8, 6), { pos: [s * hr * 1.0, -hr * 0.05, -hr * 0.02] }), c.skin));
  const R = rng(key + 'hair'), style = sp.hair.style;
  const hair = solid(scalpCap(hr * 1.085, {
    front: style === 'soft' ? 0.92 : 1.12,
    side: 1.72, back: 2.08, volume: style === 'soft' ? 0.03 : 0.065,
  }), c.hair);
  const extra = [];
  // Overlapping tapered locks follow the forehead instead of hiding whole
  // triangles inside the head. All locks are merged with the head mesh.
  const locks = style === 'soft' ? 5 : 6;
  const surface=(x,y)=>Math.sqrt(Math.max(.09,1-Math.pow(x/(hr*1.14),2)-Math.pow(y/(hr*1.14),2)))*hr*1.09+.018;
  for (let i=0;i<locks;i++) {
    const shaped=style==='swept'||!!sp.hair.length;
    const u=i/(locks-1),x=(u-.5)*hr*(shaped?1.62:1.85),y=hr*(.68-.12*Math.abs(u-.5));
    const endY=hr*(style==='swept' ? .02+.58*u : style==='soft' ? .08+.48*Math.exp(-Math.pow((u-.63)/.22,2)) : .04+.26*u+.12*Math.sin(u*9)),ex=x-hr*.10;
    extra.push(solid(sweep([[x+hr*.10,y,surface(x+hr*.10,y)],[x,y-hr*.16,surface(x,y-hr*.16)],[ex,endY,surface(ex,endY)]],t=>hr*(style==='soft'?.23:.24)*(1-t*.94),6,{steps:5,flat:.30}),c.hair));
  }
  if (style === 'baby') extra.push(solid(sweep([[0,hr,0],[0.08,hr*1.22,0],[0.03,hr*1.34,0],[-0.02,hr*1.3,0]],t=>hr*0.075*(1-t*0.8),5,{steps:6}),c.hair));
  if (!(sp.attachments||[]).includes('schoolHat') && (style === 'spiky' || style === 'baby')) for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU;
    extra.push(solid(sweep([[Math.sin(a)*hr*.65,hr*.7,Math.cos(a)*hr*.65],[Math.sin(a)*hr*.94,hr*(.78+R()*.2),Math.cos(a)*hr*.94]],t=>hr*.12*(1-t*.98),5,{steps:3}),c.hair));
  }
  if(sp.hair.length){
    const length=hr*sp.hair.length;
    extra.push(solid(blob((x,y,z)=>[x*hr*.96,y*(length+hr*.40)/2+(hr*.40-length)/2,z*hr*.53-hr*.45],18,12),c.hair));
    for(const side of [-1,1])extra.push(solid(sweep([[side*hr*.87,hr*.27,0],[side*hr*1.03,-hr*.42,.03],[side*hr*1.05,-length*.76,.08],[side*hr*.92,-length,.13]],t=>hr*.36*(1-t*.40),8,{steps:9,flat:.80}),c.hair));
  }
  if(sp.hair.pigtails)for(const side of [-1,1]){
    extra.push(solid(xform(ellipsoid(hr*.31,hr*.46,hr*.30,12,8),{pos:[side*hr*1.03,-hr*.12,-hr*.14],rot:[0,0,side*.25]}),c.hair));
    extra.push(solid(xform(ellipsoid(hr*.10,hr*.10,hr*.23,8,6),{pos:[side*hr*.94,hr*.15,-hr*.03]}),c.top));
  }
  if((sp.attachments||[]).includes('schoolHat')){
    for(const g of [hair,...extra]){const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>hr*.56){const r=Math.hypot(p.getX(i),p.getZ(i));if(r>hr*.93){const k=hr*.93/r;p.setXYZ(i,p.getX(i)*k,p.getY(i),p.getZ(i)*k);}}g.computeVertexNormals();}
  }
  if((sp.attachments||[]).includes('schoolHat'))extra.push(solid(lathe([[.001,hr*1.29],[hr*.65,hr*1.23],[hr*1.03,hr*.96],[hr*1.05,hr*.68],[hr*1.24,hr*.65],[hr*1.25,hr*.59],[hr*.99,hr*.60]],24),c.hat));
  if(sp.hair.bun){const b=sp.hair.bun,r=b.r||[.39,.38,.38],at=b.at||[-.18,.96,-.42];extra.push(solid(xform(ellipsoid(...r.map(v=>v*hr),12,8),{pos:at.map(v=>v*hr)}),c.hair));}
  const headGeo = merge([skull, ...ears]);
  rig.add('head', 'body', [0, B.h * 0.98, 0.01], null);
  const headCenter = [0, hr * 0.92, 0.02];
  rig.mesh('head', [xform(headGeo.clone(), { pos: headCenter }), xform(merge([hair, ...extra]), { pos: headCenter })]);
  // Bent arms end at the actual strap / handle. The prop shares the arm bone,
  // so locomotion and emotion posture cannot pull it away from the grip.
  if((sp.attachments||[]).includes('pacifier'))rig.add('pacifier','head',[0,headCenter[1]-hr*.36,hr*1.01],[solid(ellipsoid(hr*.17,hr*.11,.023,10,6),c.accent),solid(xform(new THREE.TorusGeometry(hr*.075,.009,5,12),{pos:[0,-hr*.085,.028]}),'#eee9db')]);
  const hold=(sp.attachments||[]).includes('backpack')?'backpack':(sp.attachments||[]).includes('cane')?'cane':(sp.attachments||[]).includes('briefcase')?'briefcase':(sp.attachments||[]).includes('shoulderBag')?'shoulderBag':(sp.attachments||[]).includes('heldPet')?'heldPet':null;
  let caneGrip;const handEnds={};
  for (const s of [-1,1]) {
    const holding=(hold==='heldPet'&&(sp.heldPet?.grip!=='left'||s<0))||((hold==='backpack'||hold==='shoulderBag')&&s<0)||(hold==='cane'&&s>0);
    const end=holding&&hold==='heldPet'?[-s*B.r*.25,-B.h*.50,B.r*1.05]:holding?((hold==='backpack'||hold==='shoulderBag')?[s*-B.r*.43,-B.h*.32,B.r*.87]:[s*.035,-Ar.len*.52,B.r*.70]):[s*.045,-Ar.len-Ar.r*.7,.02];
    const elbow=holding?[s*.075,-Ar.len*.72,.055]:[s*.03,-Ar.len*.5,.01];
    const arm=paint(sweep([[0,0,0],elbow,end],t=>Ar.r*lerp(1.15,.85,t),8,{steps:8}),(x,y)=>sp.wardrobe?.sleeve && y < -Ar.len*sp.wardrobe.sleeve?c.skin:c.sleeve||c.top);
    const hand=solid(xform(ellipsoid(Ar.r*1.10,Ar.r*.95,Ar.r,8,6),{pos:end}),c.skin);
    const parts=[arm,hand];
    rig.add(s<0?'armL':'armR','body',[s*B.r*.88,B.h*.82,0],parts,'opaque',[0,0,holding?0:s*.12]);
    handEnds[s<0?'left':'right']=end;
    if(hold==='shoulderBag'&&s<0){
      const low=-B.h*.62;
      const strap=solid(sweep([[0,0,0],[-.07,B.h*.29,-.03],[-.14,B.h*.24,-.17],[-.20,low,-.12]],()=>.023,6,{steps:12,flat:.55}),c.bag);
      const bag=solid(blob((x,y,z)=>[Math.sign(x)*Math.pow(Math.abs(x),.55)*.15-.13,Math.sign(y)*Math.pow(Math.abs(y),.65)*.105+low,Math.sign(z)*Math.pow(Math.abs(z),.55)*.075],12,8),c.bag);
      rig.add('heldBag','armL',end,[strap,bag]);
    }
    if(hold==='briefcase'&&s<0){
      const h=.24,w=.18,d=.07;
      const handle=solid(sweep([[-w*.4,-.07,0],[-w*.35,.006,0],[w*.35,.006,0],[w*.4,-.07,0]],()=>.017,6,{steps:8}),c.bag);
      const bag=solid(blob((x,y,z)=>[Math.sign(x)*Math.pow(Math.abs(x),.45)*w,-.07-h/2+Math.sign(y)*Math.pow(Math.abs(y),.45)*h/2,Math.sign(z)*Math.pow(Math.abs(z),.45)*d],12,8),c.bag);
      const clasp=solid(xform(ellipsoid(.018,.025,.01,6,4),{pos:[0,-.11,d]}),'#b39a7a');
      rig.add('heldCase','armL',end,[bag,handle,clasp]);
    }
    if(hold==='cane'&&s>0)caneGrip=end;
  }
  // 足
  for (const s of [-1, 1]) {
    if(Lg.articulated){
      const half=Lg.len*.5,upper=solid(sweep([[0,0,0],[0,-half,0]],t=>Lg.r*(1.15-.1*t),8,{steps:4}),c.bottom);
      rig.add(s<0?'legL':'legR','body',[s*B.r*(Lg.spread??.42),.02,0],[upper]);
      const lower=solid(sweep([[0,0,0],[0,-half,0]],t=>Lg.r*(1.05-.15*t),8,{steps:4}),c.bottom);
      const shoe=solid(xform(ellipsoid(Lg.r*1.15,.05,Lg.r*1.7,10,6),{pos:[0,-half-.015,Lg.r*.45]}),c.shoe);
      rig.add(s<0?'kneeL':'kneeR',s<0?'legL':'legR',[0,-half,0],[lower,shoe]);continue;
    }
    const L = hipY - 0.06;
    const leg = paint(sweep([[0, 0, 0], [0, -L * 0.5, 0], [0, -L + 0.02, 0]], (t) => Lg.r * lerp(1.15, 0.9, t), 8, { steps: 6 }), (x,y) => sp.wardrobe?.shorts && y < -L*sp.wardrobe.shorts ? (y < -L*(1-(sp.wardrobe.socks||0)) ? c.socks||c.skin : c.skin) : c.bottom);
    const shoe = solid(xform(blob((x, y, z) => [x * Lg.r * 1.15, (y * 0.5 + 0.5) * 0.09, z * Lg.r * 1.7 + Lg.r * 0.45], 10, 6), { pos: [0, -hipY, 0] }), c.shoe);
    rig.add(s < 0 ? 'legL' : 'legR', 'body', [s * B.r * (Lg.spread??0.42), 0.02, 0], [leg, shoe, solid(xform(ellipsoid(Lg.r*1.17,.025,Lg.r*1.72,10,4),{pos:[0,-hipY+.014,Lg.r*.45]}),shade(c.shoe,.65))]);
  }
  if(caneGrip){const h=hipY+B.h*.82+caneGrip[1]-.04; const cg=caneGeo(h);cg.translate(0,-h-.04,-.06);rig.add('cane','armR',caneGrip,[cg]);}

  const sittingHip=Lg.len*.5+.06+Lg.len*.5*Math.cos(1.4)+.003;
  if(sp.poseProfile?.seated && sp.wardrobe?.skirt){
    const sk=sp.wardrobe.skirt,drop=sittingHip-.025;
    const g=lathe([[B.r*.90,.03],[B.r*1.12,-drop*.28],[B.r*sk.flare,-drop*.82],[B.r*sk.flare*.96,-drop],[B.r*sk.flare*.88,-drop+.025]],32),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const t=clamp(-p.getY(i)/drop,0,1),a=Math.atan2(p.getX(i),p.getZ(i)),k=1+.025*Math.cos(a*(sk.pleats||8));p.setXYZ(i,p.getX(i)*k,p.getY(i),p.getZ(i)*.69*k+.13*Math.sin(t*Math.PI*.8));}g.computeVertexNormals();
    rig.add('seatedSkirt','body',[0,0,0],[solid(g,c.bottom)]);
  }
  if((sp.attachments||[]).includes('chair')){
    const seatY=sittingHip-.025,chair=[solid(xform(ellipsoid(B.r*1.17,.045,B.r,14,6),{pos:[0,seatY,-.015]}),c.chair),solid(xform(ellipsoid(B.r*1.12,B.h*.62,.04,14,8),{pos:[0,seatY+B.h*.6,-B.r*.86]}),c.chair)];
    for(const x of [-1,1])for(const z of [-1,1])chair.push(solid(sweep([[x*B.r*.86,.025,z*B.r*.72],[x*B.r*.86,seatY,z*B.r*.72]],()=>.027,6,{steps:3}),c.chair));
    rig.add('chair','root',[0,0,0],chair);
  }
  rig.meta = { idlePose: sp.idlePose, hover: 0, hipY, hold, stoop: sp.stoop || 0,handEnds,sittingHip,poseProfile:sp.poseProfile||null };
  const hc = headCenter;
  rig.faceSpec = { bone: 'head', target: xform(headGeo.clone(), { pos: hc }), center: [0, hc[1] - hr * 0.12, hr * 0.9], fwd: [0, 0, 1], half: hr * 0.80, eyeSize: 0.30,
    layout: { eyeX: 24, eyeY: 54, mouthY: 90, browY: 32, cheekX: 38, cheekY: 76, mouthW: 8 }, style: { blush: '#f6a0a0' }, normalEye: sp.normalEye || (sp.hair.style === 'soft' ? 'content' : null) };
  if(sp.heldPet){
    const child=quadruped(sp.heldPet,key+':heldPet'),prefix='heldPet:';
    const left=sp.heldPet.grip==='left',at=left?handEnds.left.map((v,i)=>v+(sp.heldPet.offset?.[i]||0)):[0,B.h*.08,B.r*.98];
    const group=rig.add(prefix+'root',left?'armL':'body',at,null);group.scale.setScalar(sp.heldPet.scale||.6);group.userData.rest.s.copy(group.scale);
    // Held secondary geometry has no independent locomotion. Merge its body,
    // paws and tail after building through the shared archetype; retain one face.
    child.root.updateMatrixWorld(true);
    rig.add(prefix+'body',prefix+'root',[0,0,0],child.parts.map(p=>p.mesh.geometry.clone().applyMatrix4(child.bones[p.bone].matrixWorld)));
    const f=child.faceSpec,m=child.bones[f.bone].matrixWorld;
    rig.faceSpec=[rig.faceSpec,{...f,bone:prefix+'body',target:f.target.clone().applyMatrix4(m),center:new THREE.Vector3(...f.center).applyMatrix4(m).toArray(),fwd:new THREE.Vector3(...f.fwd).transformDirection(m).toArray()}];
  }
  return rig;
}

// ================= larva(いもむし) =================
// からだは つながった 1 本の すいーぷ(節の くびれ つき)。うごく ために 3 つの かたまり(bone)に わけて かさねる
export function larva(sp, key) {
  const c = sp.colors, n = sp.segments, r = sp.r, L = sp.len;
  const rig = new Rig(key, 'larva', sp.hang ? 'hangSway' : 'inchCrawl');
  // 中心線(t: 0 = しっぽ → 1 = 頭)。hang は 枝から たれて J の 字に 前へ まがる
  const ctrl = sp.bodyPath || (sp.hang
    ? [[0, L * 0.98, -0.16], [0, L * 0.78, -0.2], [0, L * 0.5, -0.18], [0, L * 0.26, -0.04], [0, L * 0.24, L * 0.16], [0, L * 0.36, L * 0.28]]
    : [[0, r, -L / 2], [0.03, r * 1.02, -L / 4], [-0.02, r * 1.05, 0], [0.01, r * (1.15 + ((sp.foreRise ?? 1.45)-1.45)*.45), L / 4], [0, r * (sp.foreRise ?? 1.45), L / 2 * 0.8]]);
  const curve = new THREE.CatmullRomCurve3(ctrl.map((q) => V(q[0], q[1], q[2])), false, 'centripetal');
  const rad = (t) => r * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.18))) * (0.86 + 0.14 * Math.abs(Math.cos(Math.PI * t * n)));
  const segCol = (x, y, z, nx, ny, nz) => { if(sp.tailPatch && Math.hypot(x-ctrl[0][0],y-ctrl[0][1],z-ctrl[0][2])<sp.tailPatch.radius)return sp.tailPatch.color; const up = sp.hang ? nz : ny; if (up < -0.45) return c.belly; const spot = Math.abs(nx) > 0.5 && Math.sin((y + z) * 34) > 0.55; return spot ? c.spot : mix(c.base, shade(c.base, 1.1), up * 0.5 + 0.5); };
  const CH = 3, ov = 0.06;
  for (let k = 0; k < CH; k++) {
    const t0 = Math.max(0, k / CH - ov), t1 = Math.min(1, (k + 1) / CH + ov), pts = [];
    for (let i = 0; i <= 8; i++) pts.push(curve.getPointAt(lerp(t0, t1, i / 8)));
    const g = paint(sweep(pts, (u) => rad(lerp(t0, t1, u)), 12, { steps: 14, cap: k === 0 }), segCol);
    const feet = [];
    if(k===0&&sp.tailPatch&&sp.tailSeal!==false)feet.push(solid(xform(ellipsoid(r*.86,r*.86,r*.86,14,10),{pos:ctrl[0]}),sp.tailPatch.color));
    if (!sp.hang) for (let i = 0; i < (sp.feetPerSection ?? 3); i++) { const t = lerp(t0, t1, (i + 0.5) / (sp.feetPerSection ?? 3)); const q = curve.getPointAt(t), rr = rad(t); for (const s of [-1, 1]) feet.push(solid(xform(ellipsoid(rr * 0.2, rr * 0.24, rr * 0.2, 6, 4), { pos: [q.x + s * rr * 0.5, q.y - rr * 0.82, q.z] }), c.foot)); }
    // Grubs have only three thoracic pairs near the head, not caterpillar prolegs.
    for(const t of sp.thoracicFeet||[])if(Math.min(CH-1,Math.floor(t*CH))===k){
      const q=curve.getPointAt(t),rr=rad(t);
      for(const side of [-1,1])feet.push(solid(sweep([[q.x,q.y-rr*.5,q.z+side*rr*.6],[q.x+.06,q.y-rr,q.z+side*rr],[q.x+.12,q.y-rr*1.4,q.z+side*rr*1.1]],u=>sp.footRadius*(1-.35*u),6,{steps:6}),c.foot));
    }
    const cen = curve.getPointAt((t0 + t1) / 2);
    const geo = merge([g, ...feet]); geo.translate(-cen.x, -cen.y, -cen.z);
    rig.add('seg' + k, 'root', [cen.x, cen.y, cen.z], [geo]);
  }
  // 頭(体より 大きめ。2D の 顔の ある 頭)
  const hr = sp.head.r, end = curve.getPointAt(1), tan = curve.getTangentAt(1);
  const hp = end.clone().addScaledVector(tan, hr * 0.55);
  const headGeo = paint(blob((x, y, z) => [x * hr * 1.08, y * hr * 0.98, z * hr * 0.95], 18, 12), (x, y, z, nx, ny, nz) => (ny < -0.55 ? c.belly : c.head));
  const ant = sp.antennae===false ? [] : [-1, 1].map((s) => solid(sweep([[s * hr * 0.35, hr * 0.8, 0], [s * hr * 0.5, hr * 1.12, -0.02]], (t) => 0.028 * (1 - t * 0.5), 4, { steps: 3 }), shade(c.base, 0.7)));
  rig.add('head', 'root', [hp.x, hp.y, hp.z], null);
  rig.mesh('head', [headGeo.clone(), ...ant]);
  if (sp.hang) rig.add('branch', 'root', [0, 0, 0], [branchGeo(1.15, L * 1.0)]);
  rig.meta = { idlePose: sp.hang ? 'hang' : 'crawl', hover: 0, segs: CH, hang: !!sp.hang, top: L, curveLocked:!!sp.curveLocked };
  rig.faceSpec = { bone: 'head', target: headGeo, center: [0, -hr * 0.02, hr * 0.9], fwd: [0, 0, 1], half: hr * 0.74, eyeSize: 0.26,
    layout: { eyeX: 24, eyeY: 54, mouthY: 84, browY: 34, cheekX: 38, cheekY: 72, mouthW: 8 }, style: { blush: '#f0a0a0' }, normalEye: sp.normalEye ?? (sp.hang ? null : 'content') };
  return rig;
}

// ================= pod(さなぎ・たね) =================
export function pod(sp, key) {
  if(sp.shape==='granularCocoon')return cocoonPod(sp,key);
  const c = sp.colors;
  const rig = new Rig(key, 'pod', 'hopSway');
  if(sp.shape==='insectPupa'){
    const h=sp.h,r=sp.r;
    const profile=[[.025,0],[r*.45,h*.08],[r*.77,h*.22],[r,h*.43],[r*.94,h*.62],[r*.67,h*.82],[.02,h*.9]];
    const abdomen=paint(lathe(profile,20),(x,y,z)=>mix(c.base,c.dark,.13+.12*Math.cos(y/h*TAU*7)));
    const folds=[];
    for(let i=1;i<=5;i++){const y=h*(.10+i*.08);let j=0;while(j<profile.length-2&&profile[j+1][1]<y)j++;const [ra,ya]=profile[j],[rb,yb]=profile[j+1],rr=lerp(ra,rb,(y-ya)/(yb-ya))+.014;folds.push(solid(xform(ellipsoid(rr,.025,rr,20,8),{pos:[0,y,0]}),c.light));}
    for(const side of [-1,1])folds.push(solid(xform(ellipsoid(r*.42,h*.26,r*.57,14,10),{pos:[side*r*.69,h*.57,r*.30],rot:[0,0,-side*.18]}),c.light));
    for(const points of sp.foldedLegs)folds.push(solid(sweep(points,u=>sp.legRadius*(1-.3*u),7,{steps:9}),c.limb));
    rig.add('body','root',[0,0,0],[abdomen,...folds]);
    const H=sp.head,head=solid(ellipsoid(H.width,H.height,H.depth,18,12),c.head),organs=[];
    if(sp.horn){organs.push(solid(sweep(sp.horn.path,u=>sp.horn.r*(1-.65*u),8,{steps:12}),c.light));for(const q of sp.horn.forks)organs.push(solid(sweep(q,u=>sp.horn.r*.62*(1-.7*u),7,{steps:7}),c.light));}
    for(const q of sp.jawBuds||[])organs.push(solid(sweep(q,u=>.024*(1-.45*u),6,{steps:7}),c.limb));
    rig.add('head','body',H.at,[head.clone(),...organs]);
    rig.meta={idlePose:'stand',hover:0,foldedLegs:sp.foldedLegs.length,developingHorn:!!sp.horn};
    rig.faceSpec={bone:'head',target:head,center:[0,-H.height*.08,H.depth*.92],fwd:[0,0,1],half:H.width*.72,eyeSize:.26,layout:{eyeX:24,eyeY:54,mouthY:84,browY:34,cheekX:38,cheekY:72,mouthW:8},style:{blush:'#e7a354'},normalEye:sp.normalEye??'content'};
    return rig;
  }
  let bodyGeo, faceCenter, half, hangY = null;
  if (sp.shape === 'chrysalis') {
    const h = sp.h, r = sp.r, top = h * 1.02;
    // とがった 下・ふくらんだ まんなか・ほそい くび
    // A continuous shell: broad wing cases, soft abdominal folds, slight bend.
    // No detached seam tubes or dark lines on the front surface.
    const profile=[[0,.02],[.1,.32],[.25,.61],[.45,.85],[.62,1],[.78,.78],[.9,.4],[1,.035]];
    const radius=t=>{let j=0;while(j<profile.length-2&&profile[j+1][0]<t)j++;const [a,ra]=profile[j],[b,rb]=profile[j+1];return lerp(ra,rb,smooth(a,b,t));};
    const prof=Array.from({length:33},(_,i)=>[r*radius(i/32),top*i/32]);
    const g=lathe(prof,24),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),z=p.getZ(i),y=p.getY(i),t=y/top,a=Math.atan2(x,z);
      const fold=1-.045*Math.cos(t*TAU*5+.25*Math.sin(a))*Math.pow(Math.sin(Math.PI*t),2);
      const cases=1+.075*Math.cos(a*2+.25)*Math.exp(-Math.pow((t-.56)/.23,2));
      p.setXYZ(i,x*fold*cases+.025*Math.sin(Math.PI*t)*Math.sin(t*4),y,z*fold*(.98+.045*Math.sin(a+t*3)));
    }
    g.computeVertexNormals();
    bodyGeo=paint(g,(x,y,z,nx,ny,nz)=>mix(mix(c.base,c.dark,smooth(.2,-.9,nz)*.28),c.light,smooth(.15,.9,nz)*.30));
    const thread=solid(sweep([[0,top-.02,0],[0,top+.12,0]],t=>.022*(1-.2*t),6,{steps:3}),c.base);
    bodyGeo=merge([bodyGeo,thread]);
    faceCenter = [0, h * 0.55, r * 0.85]; half = r * 0.8; hangY = top + 0.14;
    rig.add('body', 'root', [0, 0, 0], [bodyGeo.clone()]);
    rig.add('branch', 'root', [0, 0, 0], [branchGeo(1.1, hangY)]);
  } else {
    // たね(下ぶくれ の まめ)+ くちばし + わた毛
    const h = sp.h, r = sp.r;
    const seed = paint(blob((x, y, z) => { const yy = (y * 0.5 + 0.5); const k = 1 + 0.18 * (1 - yy) - 0.25 * Math.pow(yy, 3); return [x * r * k, yy * h, z * r * k * 0.92]; }, 18, 12), (x, y, z, nx, ny, nz) => mix(mix(c.base, c.light, smooth(0.3, 0.9, nz) * 0.45), c.dark, smooth(0.0, -0.8, nz) * 0.5));
    const beakPath = [[0, h * 0.95, 0], [0.08, h * 1.25, 0], [0.2, h * 1.55, -0.02]];
    const beak = solid(sweep(beakPath, (t) => 0.035 * (1 - t * 0.4), 6, { steps: 8 }), c.dark);
    bodyGeo = merge([seed, beak]);
    faceCenter = [0, h * 0.45, r * 0.85]; half = r * 0.72;
    rig.add('body', 'root', [0, 0, 0], [bodyGeo.clone()]);
    rig.add('pappus', 'body', [0.2, h * 1.55, -0.02], [pappusGeo(0.42, c.pappus, 28, key)]);
  }
  const target = sp.shape === 'chrysalis' ? rig.bones.body.children[0].geometry : rig.bones.body.children[0].geometry;
  rig.meta = { idlePose: sp.shape === 'chrysalis' ? 'hang' : 'stand', hover: 0, hangY };
  rig.faceSpec = { bone: 'body', target, center: faceCenter, fwd: [0, 0, 1], half, eyeSize: 0.25,
    layout: { eyeX: 24, eyeY: 56, mouthY: 84, browY: 36, cheekX: 38, cheekY: 74, mouthW: 8 }, style: { blush: '#f4a0a0' }, normalEye: sp.shape === 'chrysalis' ? 'content' : null };
  return rig;
}

// ================= winged_insect(ちょう) =================
export function wingedInsect(sp, key) {
  const c = sp.colors, B = sp.body, Wg = sp.wings;
  const rig = new Rig(key, 'winged_insect', 'flutter');
  const thorax = solid(ellipsoid(B.r * 1.2, B.r * 1.25, B.r * 1.5, 10, 8), c.body);
  const abdomen = paint(sweep([[0,-B.r,0],[0,-B.len*.55,-.01],[0,-B.len,-.02]], (t) => B.r * lerp(1.0, 0.45, t), 8, { steps: 8 }), (x, y, z) => (Math.sin(y * 45) > 0.6 ? shade(c.body, 1.4) : c.body));
  // Rounded bent limbs share the thorax mesh and existing flutter transform.
  const limbs = [];
  if (sp.legs) for (const side of [-1,1]) for (const [originY,elbowX,elbowY,tipX,tipY] of sp.legs.pairs) {
    limbs.push(solid(sweep([[side*B.r*.35,originY,B.r*.45],[side*elbowX,elbowY,B.r*1.6],[side*tipX,tipY,B.r*1.9]], t=>sp.legs.radius*(1-.18*t),6,{steps:6}),shade(c.body,1.55)));
  }
  rig.add('body', 'root', sp.bodyOffset || [0, 0, 0], [thorax, abdomen, ...limbs]);
  const hr = sp.head.r;
  const headGeo = solid(blob((x, y, z) => [x * hr * 1.06, y * hr, z * hr * 0.95], 18, 12), c.face);
  const ant = [-1, 1].map((s) => merge([solid(sweep([[s * hr * 0.3, hr * 0.8, 0], [s * hr * 0.6, hr * 0.8 + sp.antenna * 0.6, -0.02], [s * hr * 0.9, hr * 0.8 + sp.antenna, 0.02]], () => 0.016, 4, { steps: 8 }), c.body), solid(xform(ellipsoid(0.045, 0.045, 0.045, 6, 5), { pos: [s * hr * 0.9, hr * 0.8 + sp.antenna, 0.02] }), c.wing)]));
  rig.add('head', 'body', [0, B.r * 1.6, B.r * 1.1], null);
  rig.mesh('head', [headGeo.clone(), ...ant]);
  // はね: 扇の 面(根もと = 体)。色は 中心 → ふち(こい 青 + 白い 点)
  const wingCol = (lo, hi) => (x, y, z, nx, ny, nz, i) => { const rr = Math.hypot(x, y); const t = (rr - lo) / (hi - lo); return t > 0.86 ? c.wingDark : t > 0.78 ? (Math.sin(Math.atan2(y, x) * 26) > 0.55 ? c.dots : c.wingDark) : mix(c.wingLight, c.wing, smooth(0.0, 0.6, t)); };
  for (const s of [-1, 1]) {
    const fR = (a) => Wg.span * .73 * (Wg.foreScale ?? 1) * (.10 + .90 * Math.pow(Math.max(0,Math.sin(Math.PI*(a-.05)/1.50)),.55)) * (1+.018*Math.cos(a*14));
    const hR = (a) => Wg.span * .48 * (Wg.hindScale ?? 1) * (.12 + .88 * Math.pow(Math.max(0,Math.sin(Math.PI*(a+1.35)/1.40)),.55)) * (1+.025*Math.cos(a*10));
    const tone = (Rf) => (x, y) => { const a=Math.atan2(y,x), t = Math.hypot(x, y) / Rf(a); const vein=Math.abs(Math.sin(a*9)); return t > 0.84 || (vein<.16 && t>.12) ? c.wingDark : mix(c.wingLight, c.wing, smooth(0.05, 0.82, t)*.7); };
    const fw = paint(fan(fR, 0.05, 1.55, { na: 20, nr: 7 }), tone(fR));
    const hw = paint(fan(hR, -1.35, 0.05, { na: 16, nr: 6 }), tone(hR));
    // ふちの 白い 点(2D の とおり)
    const dots = [];
    for (let i = 0; i < 9; i++) { const a = lerp(0.12, 1.48, i / 8), R = fR(a) * 0.9; dots.push(solid(xform(ellipsoid(0.028, 0.028, 0.01, 6, 4), { pos: [Math.cos(a) * R, Math.sin(a) * R, 0.006] }), c.dots)); }
    for (let i = 0; i < 6; i++) { const a = lerp(-1.25, -0.1, i / 5), R = hR(a) * 0.88; dots.push(solid(xform(ellipsoid(0.026, 0.026, 0.01, 6, 4), { pos: [Math.cos(a) * R, Math.sin(a) * R, 0.006] }), c.dots)); }
    // 扇は xy 面(x = 外へ)。s で 左右、すこし 後ろへ ねかせる
    const veins = [];
    for(const [lo,hi,Rf,n]of [[.1,1.5,fR,5],[-1.3,-.06,hR,4]])for(let i=1;i<n;i++){const a=lerp(lo,hi,i/n),r=Rf(a);veins.push(solid(sweep([[Math.cos(a)*r*.08,Math.sin(a)*r*.08,.012],[Math.cos(a+.09)*r*.5,Math.sin(a+.09)*r*.5,.015],[Math.cos(a)*r*.84,Math.sin(a)*r*.84,.012]],()=>.008,3,{steps:4,cap:false}),c.wingDark));}
    const wing = merge([fw, hw, ...dots, ...veins]);
    wing.scale(s, Wg.vertical ?? 1, 1); wing.rotateY(-s * 0.12);
    rig.add(s < 0 ? 'wingL' : 'wingR', 'body', [s * B.r * 0.6, B.r * 0.4, -B.r * 0.2], [wing]);
  }
  if (sp.emergence) {
    const e=sp.emergence,h=e.h,r=e.r;
    rig.add('emptyShell','root',e.at,openedShellParts(e));
    const top=e.at[1]+h;
    const thread=solid(sweep([[e.at[0],top,e.at[2]],[e.at[0],e.branchY,0]],()=>.015,5,{steps:3}),e.colors.dark);
    rig.add('branch','root',[0,0,0],[branchGeo(1.20,e.branchY),thread]);
  }
  rig.meta = { idlePose: 'hover', hover: sp.hover || 0.55 };
  rig.faceSpec = { bone: 'head', target: headGeo, center: [0, -hr * 0.05, hr * 0.9], fwd: [0, 0, 1], half: hr * 0.72, eyeSize: 0.25,
    layout: { eyeX: 24, eyeY: 56, mouthY: 86, browY: 36, cheekX: 38, cheekY: 74, mouthW: 7 }, style: { blush: '#f4a0b0' }, normalEye: sp.normalEye ?? 'content' };
  return rig;
}

// ================= plant(タンポポ: ロゼット / 花) =================
function leafGeo(len, w, c, up = 0.5) {
  // タンポポの 葉: ながい へら形に、根もとへ むいた ぎざぎざ(のこぎり)
  const tooth = (u) => { const f = (u * 5.5) % 1; return 0.55 + 0.45 * Math.pow(f, 1.6); };
  const g = sheet(len, (u) => w * Math.sin(Math.PI * Math.pow(u, 0.7)) * (u > 0.12 && u < 0.92 ? tooth(u) : 1), { nu: 22, nv: 4, warp: (x, y, z, u) => [x, y, Math.pow(u, 2) * len * up * 0.5 + Math.abs(x) * 0.25] });
  return paint(g, (x, y, z, nx, ny, nz, i) => { const vv = (i % 5) / 4; return Math.abs(vv - 0.5) < 0.12 ? c.vein : mix(c.leafDark, c.leaf, 0.3 + 0.7 * (y / len)); });
}
export function plant(sp, key) {
  const c = sp.colors;
  const rig = new Rig(key, 'plant', 'plantSway');
  // 葉(2 つの むれ = 2 bone に わけて ゆらす)
  const groups = [[], []];
  if (sp.form === 'sprout') {
    const cp=sp.cotyledons,br=sp.bulb;
    for(let side=0;side<2;side++) {
      const sign=side?1:-1;
      const blade=paint(blob((x,y,z)=>[x*cp.width,(y+1)*cp.len*.5,z*cp.width*.22],16,10),
        (x,y,z,nx,ny,nz)=>Math.abs(x)<cp.width*.075?c.vein:mix(c.leaf,c.leafDark,smooth(.5,-.8,nz)*.45));
      blade.rotateZ(-sign*cp.lift);blade.translate(sign*.025,br*1.37,-.01);
      const stalk=solid(sweep([[sign*.015,br*1.24,0],[sign*.045,br*1.47,-.01]],()=>.025,6,{steps:3}),c.leaf);
      groups[side].push(blade,stalk);
    }
  } else {
  for (let i = 0; i < sp.leaves; i++) {
    const a = (i / sp.leaves) * TAU + 0.3, l = sp.leafLen * (0.85 + 0.25 * ((i * 7) % 3) / 2);
    // 顔の まえ(+z)の 葉は ひくく、うしろ・よこ の 葉は 立てて 顔の まわりを かこむ(2D の ロゼット)
    const front = Math.max(0, Math.cos(a)), lift = sp.leafLift ?? (sp.form === 'flower' ? 0.55 : 0.58 - front * 0.56);
    const g = leafGeo(l, l * .34, c, sp.form === 'flower' ? .35 : .12);
    // 葉は +y に のびる → ねかせて 外へ(a の むき)
    g.rotateX(-Math.PI / 2 + lift); g.rotateY(a + Math.PI);
    const origin = sp.form === 'rosette' ? sp.bulb * .72 : .05;
    g.translate(Math.sin(a)*origin, .018+(i%3)*.008, Math.cos(a)*origin - (sp.form === 'rosette' ? sp.bulb*.18 : 0));
    groups[i % 2].push(g);
  }
  }
  rig.add('leavesA', 'root', [0, 0, 0], groups[0]);
  rig.add('leavesB', 'root', [0, 0, 0], groups[1]);
  let target, faceCenter, half, faceBone;
  if (sp.form === 'rosette' || sp.form === 'sprout') {
    const br = sp.bulb;
    const bulb = paint(blob((x, y, z) => { const yy = y * 0.5 + 0.5; const k = 1 + 0.1 * (1 - yy); return [x * br * k, yy * br * 1.45, z * br * k * 0.95]; }, 18, 12), (x, y, z, nx, ny, nz) => mix(c.bulb, shade(c.bulb, 0.86), smooth(0.2, -0.8, nz)));
    const sprout = solid(sweep([[0, br * 1.4, 0], [0.03, br * 1.62, -0.02]], (t) => 0.04 * (1 - t * 0.6), 5, { steps: 3 }), c.leaf);
    const extras=[];
    if(sp.form==='sprout') {
      for(const side of [-1,1])extras.push(solid(xform(ellipsoid(br*.25,br*.12,br*.23,10,6),{pos:[side*br*.65,br*.06,br*.22]}),c.foot));
      const shoot=leafGeo(br*.60,br*.12,c,.10);shoot.translate(0,br*1.43,-.04);extras.push(shoot);
    }
    rig.add('body', 'root', [0, 0, 0], [bulb.clone(), sprout,...extras]);
    target = bulb; faceCenter = [0, br * 0.72, br * 0.85]; half = br * 0.68; faceBone = 'body';
  } else {
    const sh = sp.stem, hr = sp.head;
    rig.add('stem', 'root', [0, 0, 0], [solid(sweep([[0, 0, 0], [0.02, sh * 0.5, 0.01], [0, sh, 0.03]], (t) => 0.05 * (1 - t * 0.3), 7, { steps: 8 }), c.stem)]);
    if (sp.form === 'bud' || sp.form === 'seedHead') {
      const bud = sp.form === 'bud', height = bud ? sp.bud.height : hr * 2;
      const depth = bud ? sp.bud.depth : sp.seedHead.depth;
      const core = paint(blob((x,y,z)=>{
        const taper = bud ? 1 - .42 * Math.max(0,y) : 1;
        return [x*hr*taper,y*height*.5,z*depth*taper];
      },24,16),(x,y,z,nx,ny,nz)=>mix(c.face,bud?c.petalDark:'#eadfcf',smooth(.4,-.8,nz)*.23));
      const ornaments=[];
      if (bud) {
        for(let i=0;i<sp.bud.sepals;i++) {
          const a=i/sp.bud.sepals*TAU;
          const sepal=paint(blob((x,y,z)=>{
            const t=(y+1)/2,w=Math.sin(Math.PI*t)*hr*.42,yy=-height*.49+t*height*.43;
            const surface=depth*Math.sqrt(Math.max(0,1-(yy/(height*.5))**2));
            return [x*w,yy,z*.018-surface-.014];
          },10,8),()=>c.leaf);
          sepal.rotateY(a);ornaments.push(sepal);
        }
      } else {
        // Rounded peripheral seed lobes, with depth continuing behind the face.
        // One merged head draw; no needles or detached gameplay bodies.
        for(let i=0;i<sp.seedHead.lobes;i++) {
          const a=i/sp.seedHead.lobes*TAU,r=hr*.96;
          const lobe=solid(ellipsoid(hr*.20,hr*.31,depth*.60,10,8),c.pappus);
          lobe.rotateZ(-a);lobe.translate(Math.sin(a)*r,Math.cos(a)*r,-depth*.12);
          ornaments.push(lobe);
        }
      }
      const headY=sh+height*.43;
      rig.add('head','stem',[0,headY,.03],[core.clone(),...ornaments]);
      target=core;faceCenter=[0,-height*.04,depth*.97];half=hr*.65;faceBone='head';
    } else {
    const disc = paint(blob((x, y, z) => [x * hr * 0.8, y * hr * 0.8, z * hr * 0.3 + (z > 0 ? 0 : -0.02)], 18, 12), (x, y, z, nx, ny, nz) => (nz < -0.3 ? c.leafDark : mix(c.face, c.petalDark, smooth(0.6, 1.0, Math.hypot(x, y) / hr) * 0.4)));
    const petals = [];
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < sp.petals / 2; i++) {
      const a = (i / (sp.petals / 2)) * TAU + layer * (Math.PI / (sp.petals / 2)), L = hr * (layer ? 0.78 : 0.95);
      const p = paint(blob((x,y,z)=>[x*hr*.22,(y+1)*L*.5,z*hr*.14-layer*.03],8,6),(x,y)=>mix(c.petalDark,c.petal,smooth(0,.5,y/L)));
      p.translate(0, hr * 0.55, 0); p.rotateZ(a); petals.push(p);
    }
    const calyx = solid(xform(ellipsoid(hr * 0.55, hr * 0.55, hr * 0.2, 12, 6), { pos: [0, 0, -hr * 0.3] }), c.leafDark);
    rig.add('head', 'stem', [0, sh + hr * 0.62, 0.05], null, 'opaque', [-0.12, 0, 0]);
    rig.mesh('head', [disc.clone(), ...petals, calyx]);
    target = disc; faceCenter = [0, -hr * 0.02, hr * 0.28]; half = hr * 0.58; faceBone = 'head';
    }
  }
  rig.meta = { idlePose: 'stand', hover: 0, form: sp.form };
  rig.faceSpec = { bone: faceBone, target, center: faceCenter, fwd: [0, 0, 1], half, eyeSize: 0.25, normalEye:sp.normalEye,
    layout: { eyeX: 24, eyeY: 56, mouthY: 84, browY: 36, cheekX: 38, cheekY: 74, mouthW: 9 }, style: { blush: '#f8a0a0', mouth: '#c0302a' } };
  return rig;
}

// ================= fungus(キノコ) =================
function mushroomParts(cap, stem, c, faceOn) {
  const sh = stem.h, sr = stem.r;
  const stemGeo = lathe([[sr*1.18,0],[sr*1.3,sh*.08],[sr*1.18,sh*.24],[sr*.91,sh*.55],[sr*.77,sh*.84],[sr*.81,sh],[.001,sh]],20);
  const sp2 = stemGeo.attributes.position;
  if (faceOn === 'stem') for (let i = 0; i < sp2.count; i++) { const x = sp2.getX(i), z = sp2.getZ(i), a = Math.atan2(x, z); const k = 1 + 0.035 * Math.cos(a * 14); sp2.setX(i, x * k); sp2.setZ(i, z * k); }
  stemGeo.computeVertexNormals();
  paint(stemGeo, (x, y, z, nx, ny, nz) => mix(c.stem, shade(c.stem, 0.88), smooth(0.2, -0.9, nz) * 0.6));
  const cr = cap.r, ch = cap.h;
  const prof = cap.shape === 'upturned'
    ? [[.001,-ch*.45],[cr*.35,-ch*.35],[cr*.72,-ch*.10],[cr,ch*.45],[cr*.99,ch*.73],[cr*.75,ch*.47],[cr*.4,ch*(cap.crown ? cap.crown*.62 : .2)],[.001,ch*(cap.crown ?? .10)]]
    : cap.shape === 'cone'
    ? [[0.001, -ch * 0.05], [cr * 0.9, 0], [cr * 1.0, ch * 0.12], [cr * 0.92, ch * 0.4], [cr * 0.66, ch * 0.75], [cr * 0.3, ch * 0.96], [0.001, ch]]
    : [[0.001, -ch * 0.12], [cr * 0.7, -ch * 0.19], [cr * 1.0, 0.0], [cr * 1.02, ch * 0.2], [cr * 0.85, ch * 0.62], [cr * 0.45, ch * 0.92], [0.001, ch]];
  const profileCurve=new THREE.SplineCurve(prof.map(([r,y])=>new THREE.Vector2(r,y)));
  const capGeo = lathe(profileCurve.getPoints(16).map(p=>[p.x,p.y]), 32);
  const cp = capGeo.attributes.position;
  for (let i = 0; i < cp.count; i++) { const y = cp.getY(i); if (y < 0.001) { const x = cp.getX(i), z = cp.getZ(i), a = Math.atan2(x, z), k = 1 + 0.06 * Math.cos(a * 20) * Math.hypot(x, z) / cr; cp.setY(i, y * k - 0.009 * Math.cos(a * 16) * Math.sin(Math.PI*Math.hypot(x,z)/cr)); } }
  capGeo.computeVertexNormals();
  paint(capGeo, (x,y,z,nx,ny,nz) => {
    if(y<.005||(cap.shape==='upturned'&&ny<-.05))return shade(c.gill,.92+.08*Math.cos(Math.atan2(x,z)*16));
    if(cap.spots&&ny>.05&&cap.spots.some(([sx,sz,r])=>Math.hypot(x/cr-sx,z/cr-sz)<r*(1+.1*Math.sin(Math.atan2(z/cr-sz,x/cr-sx)*5))))return c.spot;
    const tone=mix(c.cap,c.capDark,cap.shape==='flat'?smooth(.6,0,ny)*.55:smooth(.4,-.3,ny)*.4);
    return c.capFace?mix(tone,c.capFace,smooth(ch*.7,ch*.2,y)*.95):tone;
  });
  return { stemGeo, capGeo };
}
export function fungus(sp, key) {
  const c = sp.colors;
  const rig = new Rig(key, 'fungus', 'squashHop');
  if (sp.form === 'mycelium') {
    const core=sp.core,b=sp.branches;
    const target=paint(blob((x,y,z)=>[x*core.r*(1+.05*Math.sin(y*4)),y*core.h,z*core.depth],20,14),(x,y,z,nx,ny)=>mix(c.stem,c.branch,Math.max(0,-ny)*.3));
    const arms=[];
    for(let i=0;i<b.count;i++){
      const a=TAU*i/b.count+.08*Math.sin(i*2.7),reach=b.reach*(.88+.12*Math.sin(i*1.8)**2),depth=.09*Math.sin(i*2.4);
      const point=(t,turn=0)=>{const r=core.r*.7+(reach-core.r*.7)*t,angle=a+turn+.10*Math.sin(t*Math.PI+i);return [Math.cos(angle)*r,Math.sin(angle)*r,depth*t];};
      arms.push(solid(sweep([point(0),point(.35),point(.7),point(1)],t=>b.r*(1-.72*t),6,{steps:10}),c.branch));
      for(const [t,side]of [[.5,-1],[.72,1]]){const at=point(t),tip=point(Math.min(1,t+.25),side*.24);arms.push(solid(sweep([at,[(at[0]+tip[0])*.5,(at[1]+tip[1])*.5,depth*t+side*.025],tip],u=>b.r*.65*(1-.72*u),5,{steps:5}),c.branch));}
    }
    rig.add('body','root',[0,b.reach+.04,0],[target.clone(),...arms]);
    rig.meta={idlePose:'stand',hover:0};
    rig.faceSpec={bone:'body',target,center:[0,0,core.depth*.9],fwd:[0,0,1],half:core.r*.8,eyeSize:.27,normalEye:sp.normalEye||null,layout:{eyeX:24,eyeY:56,mouthY:82,browY:36,cheekX:38,cheekY:72,mouthW:8},style:{blush:'#f4a090'}};
    return rig;
  }
  const { stemGeo, capGeo } = mushroomParts(sp.cap, sp.stem, c, sp.faceOn);
  const atts = sp.attachments || [];
  if (atts.includes('dirt')) rig.add('dirt', 'root', [0, 0, 0], [dirtGeo(sp.stem.r * 2.0 + 0.12, c, key)]);
  rig.add('body', 'root', [0, 0.04, 0], [stemGeo.clone()], 'opaque', [0,0,sp.stem.lean||0]);
  rig.add('cap', 'body', [0, sp.stem.h * 0.92, 0], [capGeo.clone()], 'opaque', [sp.cap.tilt || 0,0,sp.cap.roll || 0]);
  if (sp.collar) {
    const co=sp.collar;
    const g=lathe([[sp.stem.r*.78,co.h*.4],[co.r*.72,co.h*.12],[co.r,-co.h*.25],[co.r*.94,-co.h*.45],[sp.stem.r*.80,co.h*.16]],40),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const a=Math.atan2(p.getX(i),p.getZ(i)),k=1+.06*Math.cos(a*12);p.setXYZ(i,p.getX(i)*k,p.getY(i)+.025*Math.cos(a*12),p.getZ(i)*k);}g.computeVertexNormals();
    rig.add('collar','body',[0,co.at,0],[solid(g,c.stem)]);
  }
  let childFace = null;
  if (atts.includes('child')) {
    const small = mushroomParts({ r: sp.cap.r * 0.5, h: sp.cap.h * 1.1, shape: 'flat' }, { h: sp.stem.h * 0.55, r: sp.stem.r * 0.45 }, c, 'cap');
    const cg = merge([small.stemGeo, small.capGeo.translate(0, sp.stem.h * 0.5, 0)]);
    rig.add('child', 'root', [sp.cap.r * 0.82, 0.03, 0.16], [cg], 'opaque', [0, -0.4, 0.12]);
    childFace = { bone: 'child', target: cg, center: [0, sp.stem.h * .24, sp.stem.r * .45], fwd: [0,0,1], half: sp.stem.r * .48, eyeSize: .26, forceMode: 'A', normalEye: 'content', layout: {eyeX:24,eyeY:56,mouthY:82,browY:36,cheekX:38,cheekY:72,mouthW:8}, style: {blush:'#f4a090'} };
  }
  let target, center, half, bone;
  if (sp.faceOn === 'cap') { target = capGeo; bone = 'cap'; center = [0, sp.cap.h * (sp.face?.capHeight ?? 0.3), sp.cap.r * 0.8]; half = sp.cap.r * (sp.face?.half ?? 0.6); }
  else { target = stemGeo; bone = 'body'; center = [0, sp.stem.h * 0.5, sp.stem.r * 0.9]; half = sp.stem.r * 0.85; }
  rig.meta = { idlePose: 'stand', hover: 0 };
  rig.faceSpec = { bone, target, center, fwd: [0, 0.05, 1], half, eyeSize: 0.26,
    layout: { eyeX: 24, eyeY: 56, mouthY: 82, browY: 36, cheekX: 38, cheekY: 72, mouthW: 8 }, style: { blush: '#f4a090' }, normalEye: sp.normalEye ?? (sp.faceOn === 'stem' ? 'content' : null) };
  if (childFace) rig.faceSpec = [rig.faceSpec, childFace];
  if(sp.sporeCluster)attachCluster(rig,sp.sporeCluster,'spores',key);
  return rig;
}

// ================= cluster(胞子の むれ・わたげの むれ) =================
// 子は それぞれ bone(ばらばらに ゆれる)。顔は A 方式(atlas だけ。子の 数 × 目 2 の draw call を ふやさない)
export function cluster(sp, key) {
  const c = sp.colors, R = rng(key);
  const rig = new Rig(key, 'cluster', 'clusterBob');
  const units = [];
  const layout = (sp.layout || [[0, 0.32, 0.05, 1.0], [-0.42, 0.62, -0.05, 0.8], [0.4, 0.66, 0.0, 0.85], [-0.5, 0.18, 0.1, 0.62], [0.52, 0.2, 0.08, 0.6], [0.0, 0.92, -0.08, 0.66]]).slice(0, sp.count);
  layout.forEach(([x, y, z, s], i) => {
    let geo, faceGeo, fc, half;
    if (sp.unit === 'spore') {
      const r = 0.24 * s;
      geo=paint(blob((px,py,pz)=>{
        const w=1+.055*Math.sin(py*3.1+i*1.7)+.025*Math.sin(pz*4+i);
        return [px*r*w*(1+(i%2)*.08),py*r*(.87+(i%3)*.085)+r*.018*px,pz*r*(.87+(i%2)*.09)];
      },20,12),(px,py,pz,nx,ny,nz)=>{
        const cheek=smooth(.01,-r*.72,py)*.38;
        const shine=Math.exp(-Math.pow((px/r+.35)/.22,2)-Math.pow((py/r-.48)/.27,2))*Math.max(0,nz);
        return mix(mix(c.base,c.blush,cheek), '#ffffff',shine*.85);
      });
      faceGeo=geo;fc=[0,-r*.05,r*.9];half=r*.72;
      rig.add('u'+i,'root',[x*sp.spread/.6,y*sp.spread/.6+.04,z],[geo.clone()],'opaque',[0,(i%3-1)*.1,(i%2?1:-1)*.06]);
    } else {
      const r = 0.18 * s;
      const puff = paint(blob((px, py, pz) => { const n = 1 + 0.16 * Math.max(0, noise3(px * 7 + i, py * 7, pz * 7) - 0.35); return [px * r * n * .65, py * r * n * .65, pz * r * n * .65]; }, 12, 8), () => c.pappus);
      const seed = solid(xform(blob((px, py, pz) => { const yy = py * 0.5 + 0.5; return [px * r * 0.3 * (1 - yy * 0.5), -yy * r * 1.3, pz * r * 0.3 * (1 - yy * 0.5)]; }, 8, 6), { pos: [0, -r * 0.95, 0] }), c.base);
      const connection = sp.connector || { radiusRatio: .067, opacity: 1, color: c.base };
      const beak = solid(sweep([[0,-r*.96,0],[r*.025,-r*.72,0],[0,-r*.48,0]], () => r*connection.radiusRatio, 4, { steps: 2 }), connection.color);
      const bc=beak.attributes.color, rgba=new Float32Array(bc.count*4);
      for(let j=0;j<bc.count;j++)rgba.set([bc.getX(j),bc.getY(j),bc.getZ(j),connection.opacity],j*4);
      beak.setAttribute('color',new THREE.BufferAttribute(rgba,4));
      for(const g of [puff,seed,beak]){const uv=g.attributes.uv;if(uv)for(let j=0;j<uv.count;j++)uv.setXY(j,.5,.5);}
      geo = puff; faceGeo = puff; fc = [0, 0, r * .65]; half = r * .54;
      rig.add('u' + i, 'root', [x * sp.spread / 0.6, y * sp.spread / 0.6 + 0.35, z], [puff.clone(), seed, beak, softHalo(r*1.52,key+':'+i)], 'soft', [0, 0, (R() - 0.5) * 0.4]);
    }
    units.push({ bone: 'u' + i, target: faceGeo, center: fc, half, normalEye:i%3===1 ? 'happy' : null });
  });
  rig.meta = { idlePose: 'stand', hover: sp.unit === 'seedPuff' ? 0.1 : 0, units: units.length };
  rig.faceSpec = units.map((u) => ({ bone: u.bone, target: u.target, center: u.center, fwd: [0, 0, 1], half: u.half, eyeSize: 0.26, forceMode: 'A', normalEye:u.normalEye,
    layout: { eyeX: 24, eyeY: 58, mouthY: 84, browY: 36, cheekX: 38, cheekY: 74, mouthW: 9 }, style: { blush: '#f8a090' } }));
  return rig;
}

// Graft a presentation cluster; each unit keeps its face/rig, but uses its owner's clock.
function attachCluster(rig,attachment,prefix,key){
  const child=cluster(attachment.spec,key+':'+prefix),anchor=rig.add(prefix+':anchor','root',attachment.at,null);
  anchor.scale.setScalar(attachment.scale);anchor.userData.rest.s.copy(anchor.scale);
  for(let i=0;i<child.meta.units;i++){
    const name='u'+i,b=child.bones[name];rig.add(prefix+':'+name,prefix+':anchor',b.position.toArray(),null,'opaque',[b.rotation.x,b.rotation.y,b.rotation.z]);
    for(const part of child.parts.filter(p=>p.bone===name))rig.mesh(prefix+':'+name,[part.mesh.geometry.clone()],part.mesh.material.name.slice(4));
  }
  rig.faceSpec=[...(Array.isArray(rig.faceSpec)?rig.faceSpec:[rig.faceSpec]),...child.faceSpec.map(f=>({...f,bone:prefix+':'+f.bone}))];
  rig.meta.clusterSubrigs=[...(rig.meta.clusterSubrigs||[]),{prefix:prefix+':',units:child.meta.units}];
}

// ================= radial(ヒトデ) =================
// 星は 正面を むいて 下の 2 本の うでで 立つ(2D の すがたの まま)。うでは 先へ ほそく・すこし 前へ まがる
export function radial(sp, key) {
  const c = sp.colors, N = sp.arms;
  const rig = new Rig(key, 'radial', 'radialShuffle');
  const g = new THREE.SphereGeometry(1, 60, 16); g.rotateX(Math.PI / 2);   // 極 = 前 / 後ろ
  const p = g.attributes.position;
  const star = (phi) => Math.pow((1 + Math.cos(N * phi)) / 2, 1.6);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rho = Math.hypot(x, y), phi = Math.atan2(x, y);
    const s = star(phi), R = sp.armR + (sp.r - sp.armR) * s * 1.0 + sp.armR * 0.05;
    const rr = rho * R * (1 + 0.04 * Math.sin(phi * 3));
    const thick = sp.thick * (1 - 0.55 * Math.pow(rho, 2) * s) * (z > 0 ? 1 : 0.7);
    const bend = sp.curl * Math.pow(rho * s, 2);
    p.setXYZ(i, (x / (rho || 1)) * rr, (y / (rho || 1)) * rr, z * thick + bend);
  }
  g.computeVertexNormals();
  const col = (x, y, z, nx, ny, nz) => { const rr = Math.hypot(x, y) / sp.r; if (nz < -0.4) return shade(c.dark, 0.9); const body=mix(c.light,mix(c.base,c.dark,smooth(.75,1,rr)),smooth(.15,.6,rr));return c.tip?mix(body,c.tip,smooth(.65,.94,rr)):body; };
  const body = paint(g, col);
  const parts = [body];
  if (sp.dots) {
    const R = rng(key);
    for (let k = 0; k < 36; k++) {
      const phi = Math.floor(k / 7) * (TAU / N) + (R() - 0.5) * 0.22, rho = 0.25 + (k % 7) / 7 * 0.6, s = star(phi), Rr = (sp.armR + (sp.r - sp.armR) * s) * rho;
      const zz = sp.thick * (1 - 0.55 * rho * rho * s) * Math.sqrt(Math.max(0, 1 - rho * rho)) + sp.curl * Math.pow(rho * s, 2);
      parts.push(solid(xform(ellipsoid(sp.dotRadius??.016, sp.dotRadius??.016, sp.dotRadius ? sp.dotRadius*.25 : .004, 6, 4), { pos: [Math.sin(phi) * Rr, Math.cos(phi) * Rr, zz + 0.004] }), c.dot));
    }
  }
  // 下の 2 本の うで(φ = ±144°)の 先で 地面に 立つ
  const footY = -Math.cos((2 * TAU) / N) * (sp.r * 0.92);
  rig.add('body', 'root', [0, footY, 0], parts);
  if ((sp.attachments || []).includes('bubbles')) rig.add('bubbles', 'root', [0, 0, 0], [bubblesGeo([[-0.75, 0.95, 0.1, 0.07], [-0.85, 0.75, 0.15, 0.045], [0.78, 0.5, 0.1, 0.06], [0.7, 1.1, 0.0, 0.05], [0.88, 0.3, 0.12, 0.035]])], 'translucent:0.55');
  rig.meta = { idlePose: 'stand', hover: 0 };
  rig.faceSpec = { bone: 'body', target: body, center: [0, 0.02, sp.thick], fwd: [0, 0, 1], half: sp.armR * 0.95, eyeSize: 0.25, normalEye:sp.normalEye||null,
    layout: { eyeX: 25, eyeY: 56, mouthY: 82, browY: 36, cheekX: 40, cheekY: 74, mouthW: 9 }, style: { blush: '#ff8a9a' } };
  if(sp.larvalAttachment){
    const u=sp.larvalAttachment,child=blobArchetype(u.spec,key+':larva');
    const anchor=rig.add('larva:anchor','body',u.at,null,'opaque',[0,0,u.roll||0]);anchor.scale.setScalar(u.scale);anchor.userData.rest.s.copy(anchor.scale);
    rig.add('larva:body','larva:anchor',[0,0,0],null);
    for(const part of child.parts)rig.mesh('larva:body',[part.mesh.geometry.clone()],part.mesh.material.name.slice(4));
    rig.meta.blobSubrigs=['larva:body'];
  }
  return rig;
}

// ================= blob(ヒトデ幼生: すけた 光る からだ) =================
export function blobArchetype(sp, key) {
  const c = sp.colors;
  const rig = new Rig(key, 'blob', sp.locomotion ?? 'blobFloat');
  const h = sp.h, r = sp.r;
  // ビピンナリア: たてながの 体に 左右 2 つずつの ふくらみ(うで の もと)
  const contour = sp.contour ? sp.contour.map(([x,y])=>[x*r,y*h]) : [[0,h],[-r*.3,h*.96],[-r*.51,h*.8],[-r*.57,h*.66],[-r*.88,h*.59],[-r*.95,h*.49],[-r*.78,h*.42],[-r*.57,h*.35],[-r*.82,h*.25],[-r*.88,h*.12],[-r*.69,.0],[-r*.48,h*.01],[-r*.28,h*.11],[-r*.13,h*.015],[0,-h*.015],[r*.13,h*.015],[r*.28,h*.11],[r*.48,h*.01],[r*.69,0],[r*.88,h*.12],[r*.82,h*.25],[r*.57,h*.35],[r*.78,h*.42],[r*.95,h*.49],[r*.88,h*.59],[r*.57,h*.66],[r*.51,h*.8],[r*.3,h*.96]];
  const outer = paint(outlineLoft(contour,r*.42,72,8,{concave:sp.concaveContour}), (x, y, z, nx, ny, nz) => mix(c.base, c.edge, smooth(0.4, 0.0, Math.abs(nz)) * 0.7));
  const core = paint(blob((x, y, z) => {
    if(sp.coreProfile){const q=sp.coreProfile,a=q.tilt||0,xx=x*r*q.radii[0],yy=y*h*q.radii[1];return [xx*Math.cos(a)-yy*Math.sin(a)+q.center[0]*r,xx*Math.sin(a)+yy*Math.cos(a)+q.center[1]*h,z*r*q.radii[2]];}
    return [x*r*.55,(y*.5+.5)*h*.7+h*.12,z*r*.24];
  }, 14, 10), () => c.light);
  rig.add('body', 'root', [0, 0, 0], [outer.clone()], 'glow:' + sp.glow + ':' + sp.translucent);
  if(!sp.solidBody)rig.mesh('body', [core], 'opaque');
  rig.meta = { idlePose: 'stand', hover: 0.12 };
  rig.faceSpec = { bone: 'body', target: outer, center: sp.face?.center ? sp.face.center.map((v,i)=>v*(i===1?h:r)) : [0, h * 0.5, r * 0.6], fwd: [0, 0, 1], half: r * (sp.face?.half ?? 0.7), eyeSize: 0.25,
    layout: { eyeX: 24, eyeY: 56, mouthY: 82, browY: 36, cheekX: 38, cheekY: 74, mouthW: 8 }, style: { blush: '#ff8aa8' } };
  return rig;
}

export const BUILDERS = { rigid_object:rigidObject, mystery_blob:mysteryBlob, cosmic, soft_toy:softToy, spectral, celestial_humanoid:(sp,key)=>celestialHumanoid(sp,key,humanoid), quadruped, avian, fish, humanoid, larva, pod, winged_insect: wingedInsect, plant, fungus, cluster, radial, blob: blobArchetype, branch_organism:branchOrganism, jellyfish:jellyOrganism, armored_insect:armoredInsect, winged_reptile:wingedReptile, plumed_bird:plumedBird };
export function buildRig(id, stage) {
  const sp = SPEC.stageSpec(id, stage);
  if (!sp) throw new Error(`no 3D spec: ${id}/${stage}`);
  const fn = BUILDERS[sp.archetype];
  if (!fn) throw new Error(`no builder for archetype ${sp.archetype}`);
  return fn(sp, `${id}:${stage}`);
}
