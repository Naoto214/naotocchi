import {THREE,blob,sweep,ellipsoid,paint,solid,mix,shade,xform,merge,lerp,smooth,noise3} from '../../character-3d/geometry.mjs';
import {Rig} from '../../character-3d/rig.mjs';
import {crouchedQuadruped} from '../../character-3d/crouched-quadruped.mjs';
const TAU=Math.PI*2,V=(x,y,z)=>new THREE.Vector3(x,y,z);
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

export function quadruped(sp, key) {
  if(sp.crouch)return crouchedQuadruped(sp,key);
  const c = sp.colors, B = sp.body, Hd = sp.head, Lg = sp.legs;
  const rig = new Rig(key, 'quadruped', 'quadWalk');
  const bodyY = Lg.len + B.r * 0.72;
  const regionPaint=(regions,x,y,z)=>{for(const p of regions||[]){const d=((x-p.at[0])/p.size[0])**2+((y-p.at[1])/p.size[1])**2+((z-p.at[2])/p.size[2])**2;if(d<1+.08*Math.sin(y*12+z*8))return c[p.color];}return null;};
  const patch = (x, y, z) => sp.patches && (Math.sin(x * 7 + z * 3) + Math.cos(z * 5 - y * 4)) > 1.1 ? (z > 0 ? c.patch : c.patch2) : null;
  const bodyCol = (x, y, z, nx, ny, nz) => { const p = sp.patchMap ? regionPaint(sp.patchMap.body,x/B.r,y/B.r,z/(B.len/2)) : patch(x, y, z); if (p) return p; const belly = smooth(-0.15, -0.6, ny) + (z > B.len * 0.28 ? smooth(0.3, -0.2, ny) * 0.9 : 0); return mix(mix(c.base, shade(c.base, 0.92), smooth(0.4, 0.95, ny) * 0.5), c.belly, belly); };
  const body = paint(blob((x, y, z) => { const t = (z + 1) / 2, s = lerp(B.hip, B.chest, t), sag = y < 0 ? 0.94 : 1; return [x * B.r * s * 0.9, y * B.r * s * sag * 0.95, z * B.len / 2]; }, 20, 14), bodyCol);
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
  rig.meta = { idlePose: sp.idlePose, hover: 0, bodyY, legTop, bodyR: B.r, bodyLen: B.len, pawR: Lg.r*1.05, earType: sp.ears.type, poseProfile: sp.poseProfile || null };
  rig.faceSpec = { bone: 'head', target: headGeo, center: [0, hr * 0.0, hr * 0.92], fwd: [0, 0.08, 1], half: hr * 0.74, eyeSize: Hd.eyeSize || 0.25, eyeProfile: Hd.eyeProfile,
    layout: { eyeX: Hd.eyeX || 25, eyeY: 54, mouthY: 104, browY: 34, cheekX: 38, cheekY: 80, mouthW: 9 }, style: { mouth: '#9a2a24', blush: '#f08a7a' }, normalEye: sp.normalEye || (sp.idlePose === 'lie' || sp.fluff === 'chest' ? 'content' : null) };
  return rig;
}

