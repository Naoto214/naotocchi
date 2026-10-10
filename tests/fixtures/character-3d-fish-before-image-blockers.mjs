// Frozen 9528525d fish factory, evaluated with the current unchanged rig/geometry helpers.
import { THREE, fan, ellipsoid, paint, solid, mix, xform, lerp, smooth, rng } from '../../character-3d/geometry.mjs';
import { Rig } from '../../character-3d/rig.mjs';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
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
