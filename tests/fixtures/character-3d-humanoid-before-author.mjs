// Frozen Task10 base humanoid factory; current geometry/rig helpers on the same runtime.
import { THREE, blob, lathe, sweep, sheet, fan, ellipsoid, paint, solid, mix, shade, xform, merge, clamp, lerp, smooth, rng, noise3, scalpCap, outlineLoft, softHalo, openedShellParts } from '../../character-3d/geometry.mjs';
import { Rig } from '../../character-3d/rig.mjs';
import { crouchedQuadruped } from '../../character-3d/crouched-quadruped.mjs';
import SPEC from '../../character-3d/spec-esm.mjs';

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

import {quadruped} from '../../character-3d/archetypes.mjs';
function caneGeo(h, color = '#8a5a2e') {
  return solid(sweep([[0, 0.02, 0], [0, h * 0.55, 0.01], [0, h, 0], [0, h + 0.07, 0.06], [0, h + 0.03, 0.13]], () => 0.022, 6, { steps: 14 }), color);
}
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
