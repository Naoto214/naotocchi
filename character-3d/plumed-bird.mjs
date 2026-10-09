// Closed, curved feather volumes and one bird owner; original paths are data.
import {THREE,ellipsoid,sweep,lathe,xform,paint,solid,mix,outlineLoft,merge} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function plumeGeometry(q){
 const curve=new THREE.CatmullRomCurve3(q.path.map(p=>new THREE.Vector3(...p)),false,'centripetal'),w=q.width;
 const g=outlineLoft([[0,0],[-w*.75,.20],[-w,.43],[-w*.7,.72],[0,1],[w*.68,.70],[w,.40],[w*.7,.18]],q.depth||.010,22,4),p=g.attributes.position,edge=[];
 for(let i=0;i<p.count;i++){edge[i]=Math.max(0,Math.min(1,(Math.sqrt(Math.max(0,1-Math.pow(p.getZ(i)/(q.depth||.010),2)))-.62)/.38));const t=Math.max(0,Math.min(1,p.getY(i))),c=curve.getPoint(t),tan=curve.getTangent(t),side=new THREE.Vector3(-tan.y,tan.x,0).normalize();if(side.lengthSq()<.1)side.set(1,0,0);const normal=new THREE.Vector3().crossVectors(tan,side).normalize(),v=c.addScaledVector(side,p.getX(i)).addScaledVector(normal,p.getZ(i));p.setXYZ(i,v.x,v.y,v.z);}
 g.computeVertexNormals();return paint(g,(x,y,z,nx,ny,nz,i)=>{const base=mix(q.color,q.light,Math.max(0,nz)*.32+Math.max(0,ny)*.15);return q.edge?mix(base,q.edge,edge[i]):base;});
}
export function plumedBird(sp,key){
 const r=new Rig(key,'plumed_bird','waddle'),c=sp.colors,b=sp.body,h=sp.head;
 const vol=(size,pos,color)=>paint(xform(ellipsoid(...size,18,12),{pos}),(x,y,z,nx,ny,nz)=>mix(color,c.light,Math.max(0,nz)*.18+Math.max(0,ny)*.12));
 r.add('body','root',[0,b.y,0],[vol(b.size,[0,0,0],c.base),solid(sweep(sp.neck.path,t=>sp.neck.r*(1-t*.25),10,{steps:14}),c.neck),...sp.breast.map(plumeGeometry)]);
 const beak=sp.beak.path?solid(sweep(sp.beak.path,t=>sp.beak.r*(1-.75*t),10,{steps:14}),c.beak):solid(xform(lathe([[.001,0],[sp.beak.r,0],[sp.beak.r*.65,sp.beak.length*.55],[.001,sp.beak.length]],10),{pos:[0,-h.size[1]*.16,h.size[2]*.88],rot:[Math.PI/2-.15,0,0]}),c.beak),head=merge([vol(h.size,[0,0,0],c.face),beak]);
 r.add('head','body',h.at,[head.clone(),...sp.crest.map(plumeGeometry)]);
 if(sp.wings)for(const side of [-1,1]){const name=side<0?'left':'right';r.add(side<0?'wingL':'wingR','body',[side*sp.wings.at[0],sp.wings.at[1],sp.wings.at[2]],sp.wings[name].map(plumeGeometry));}
 if(sp.tail)r.add('tail','body',sp.tail.at,sp.tail.feathers.map(plumeGeometry));
 if(sp.legs)for(const side of [-1,1]){
  const parts=[solid(sweep([[0,0,0],[side*.012,-.17,-.01],[side*.02,-.31,.035]],()=>sp.legs.radius,7,{steps:9}),c.feet)];
  for(const spread of [-1,0,1])parts.push(solid(sweep([[side*.02,-.30,.035],[side*.02+spread*.04,-.325,.10],[side*.02+spread*.075,-.34,.19-Math.abs(spread)*.02]],t=>sp.legs.radius*.8*(1-t*.75),6,{steps:6}),c.feet));
  parts.push(solid(sweep([[side*.02,-.30,.025],[side*.015,-.33,-.055],[side*.01,-.34,-.09]],t=>sp.legs.radius*.65*(1-t*.8),6,{steps:5}),c.feet));
  const scale=sp.legs.scale||1;
  r.add(side<0?'footL':'footR','root',[side*sp.legs.spread,.36*scale,.025],scale===1?parts:parts.map(g=>xform(g,{scale:[scale,scale,scale]})));
 }
 if(sp.embers){
  const e=sp.embers,coals=[solid(lathe([[0,.025],[e.radius*.92,.025],[e.radius*.88,.075],[e.radius*.60,e.height*.60],[e.radius*.30,e.height*.90],[0,e.height]],24),e.colors[0])];
  for(let ring=0;ring<4;ring++){const count=ring===3?5:18-ring*4,rad=e.radius*(1-ring*.25);for(let i=0;i<count;i++){const a=i*Math.PI*2/count+ring*.41,sz=.065+(i%3)*.008,y=.080+ring*.052;const g=new THREE.IcosahedronGeometry(1,0);coals.push(solid(xform(g,{scale:[sz,sz*.70,sz*.9],pos:[Math.cos(a)*rad,y,Math.sin(a)*rad],rot:[i*.3,ring*.7,i*.5]}),e.colors[(i+ring)%e.colors.length]));}}
  r.add('embers','root',[0,0,0],coals);
 }
 r.faceSpec={bone:'head',target:head,center:[0,h.size[1]*.05,h.size[2]*.9],fwd:[0,.05,1],half:h.size[0]*.74,eyeSize:.25,normalEye:sp.normalEye,layout:{eyeX:sp.face?.eyeX??25,eyeY:50,mouthY:sp.face?.mouthY??108,browY:30,cheekX:40,cheekY:74,mouthW:7},style:{blush:'#f0a164'}};
 r.meta={idlePose:'stand',hover:0,featherTail:!!sp.tail};return r;
}
