const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const mod = (name) => import(path.join(root, 'character-3d', name));

test('hair cap covers crown, temples and nape without crossing the face opening', async () => {
  const g = await mod('geometry.mjs');
  assert.equal(typeof g.scalpCap, 'function', 'continuous cap surface is required');
  const cap = g.scalpCap(1, { front: 0.9, side: 1.7, back: 2.0 });
  const mesh = new g.THREE.Mesh(cap, new g.THREE.MeshBasicMaterial({ side: g.THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  for (const [az, polar] of [[0,0.3],[0,0.8],[Math.PI/2,1.5],[Math.PI,1.8],[-Math.PI/2,1.5]]) {
    const d = new g.THREE.Vector3(Math.sin(az)*Math.sin(polar),Math.cos(polar),Math.cos(az)*Math.sin(polar));
    assert.ok(new g.THREE.Raycaster(d.clone().multiplyScalar(3),d.clone().negate()).intersectObject(mesh).length, `coverage ${az}/${polar}`);
  }
  // A ray segment from the face side stops before reaching the rear cap.
  assert.equal(new g.THREE.Raycaster(new g.THREE.Vector3(0,0,3),new g.THREE.Vector3(0,0,-1),0,3).intersectObject(mesh).length,0);
  assert.ok(cap.attributes.position.array.every(Number.isFinite));
});

test('dog play bow lowers the chest at idle and blends back to locomotion; shiba preserves its compact bow', async () => {
  const rt = await mod('runtime.mjs'), anim = await mod('animate.mjs');
  const dog = rt.instantiate(rt.getTemplate('dog',4));
  anim.animate(dog,{dt:0,moving:false,animLv:0});
  assert.ok(dog.bones.body.rotation.x > 0.2, 'front of body must bow');
  const idle = dog.bones.legFL.rotation.x;
  for(let i=0;i<30;i++)anim.animate(dog,{dt:1/30,moving:true,animLv:0});
  assert.ok(Math.abs(dog.bones.body.rotation.x)<0.1, 'walking body returns to level');
  assert.ok(Math.abs(idle)>0.4, 'front paws reach forward');
  const shiba=rt.instantiate(rt.getTemplate('shiba',0));
  assert.equal(shiba.meta.idlePose,'playBow','the shiba original also bows');
  assert.ok(shiba.meta.bodyR>dog.meta.bodyR && shiba.meta.bodyLen<dog.meta.bodyLen,'compact shiba silhouette');
});

test('both adult and child mushroom faces survive cloning and canonical expression changes', async () => {
  const rt=await mod('runtime.mjs'),anim=await mod('animate.mjs');
  const t=rt.getTemplate('mushroom',8), a=rt.instantiate(t),b=rt.instantiate(t);
  assert.equal(t.rig.faces.length,2);
  assert.equal(a.faces.length,2);
  assert.deepEqual(t.rig.faces.map(f=>f.bone),['body','child']);
  for(const e of ['normal','positive','dislike','tired','sick']) {
    anim.setEmotion(a,e);
    for(const f of a.faces)assert.equal(f.decal.material,f.decal.userData.atlas.mats[e]);
  }
  for(const f of b.faces)assert.equal(f.decal.material,f.decal.userData.atlas.mats.normal);
});

test('radial bubbles occupy the specified separated positions rather than the origin', async () => {
  const {buildRig}=await mod('archetypes.mjs');
  const r=buildRig('starfish',8),g=r.bones.bubbles.children[0].geometry;
  g.computeBoundingBox();
  assert.ok(g.boundingBox.min.x<-.8);
  assert.ok(g.boundingBox.max.x>.8);
  assert.ok(g.boundingBox.max.y>1);
  assert.ok(g.boundingBox.min.y>.2);
});

test('all six dandelion seed-puff faces remain independently bound within the existing mesh budget',async()=>{
  const rt=await mod('runtime.mjs');
  const t=rt.getTemplate('dandelion',8);
  assert.equal(t.status,'ok',t.error);
  assert.equal(t.rig.faces.length,6);
  assert.equal(new Set(t.rig.faces.map(f=>f.bone)).size,6);
  assert.ok(t.meshes<=14);
  assert.ok(t.tris<6500);
});

test('outline loft preserves side notches and lower lobes with a finite closed thickness',async()=>{
  const g=await mod('geometry.mjs');assert.equal(typeof g.outlineLoft,'function');
  const outline=[[0,1],[-.22,.82],[-.2,.62],[-.4,.5],[-.2,.4],[-.36,.15],[-.18,0],[0,.1],[.18,0],[.36,.15],[.2,.4],[.4,.5],[.2,.62],[.22,.82]];
  const geo=g.outlineLoft(outline,.15);geo.computeBoundingBox();
  assert.ok(geo.boundingBox.min.z<-.14&&geo.boundingBox.max.z>.14);
  assert.ok(geo.attributes.position.array.every(Number.isFinite));
  const mesh=new g.THREE.Mesh(geo,new g.THREE.MeshBasicMaterial({side:g.THREE.DoubleSide}));mesh.updateMatrixWorld(true);
  const hit=(x,y)=>new g.THREE.Raycaster(new g.THREE.Vector3(x,y,2),new g.THREE.Vector3(0,0,-1)).intersectObject(mesh).length>0;
  assert.ok(hit(.33,.5),'side protrusion');assert.ok(!hit(.33,.36),'notch below protrusion');
  assert.ok(hit(-.19,.09)&&hit(.19,.09),'two lower lobes');
  for(const sign of [1,-1]){const h=new g.THREE.Raycaster(new g.THREE.Vector3(0,.5,sign*2),new g.THREE.Vector3(0,0,-sign)).intersectObject(mesh)[0];assert.ok(h.face.normal.z*sign>.5,'outward front/back winding');}
});

test('butterfly abdomen points below its head and wing roots stay attached during reduced idle',async()=>{
  const rt=await mod('runtime.mjs'),anim=await mod('animate.mjs');const t=rt.getTemplate('butterfly',8),i=rt.instantiate(t);
  const body=t.rig.bones.body.children[0].geometry;body.computeBoundingBox();
  assert.ok(body.boundingBox.min.y<-.35,'upright abdomen below thorax');
  assert.ok(body.boundingBox.min.z>-.25,'not a rearward horizontal abdomen');
  anim.animate(i,{dt:.1,moving:false,animLv:0});const angle=i.bones.wingL.rotation.y;
  anim.animate(i,{dt:.1,moving:false,animLv:0});assert.equal(i.bones.wingL.rotation.y,angle,'reduced idle holds rest angle');
});

test('bow paw contact stays on the ground for both canine proportions',async()=>{
  const rt=await mod('runtime.mjs'),anim=await mod('animate.mjs'),{THREE}=await mod('geometry.mjs');
  for(const [id,stage]of [['dog',4],['shiba',0]]){
    const i=rt.instantiate(rt.getTemplate(id,stage));anim.animate(i,{dt:0,moving:false,animLv:0});i.root.updateMatrixWorld(true);
    for(const name of ['legFL','legFR','legBL','legBR']){
      let min=Infinity;i.bones[name].traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let k=0;k<p.count;k++)min=Math.min(min,new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld).y);});
      assert.ok(min>=-.012 && min<=.025,`${id}/${name} contact ${min}`);
    }
  }
});

test('child mushroom eyes and mouth are visible below the cap from gallery front and three-quarter',async()=>{
  const {buildRig}=await mod('archetypes.mjs'),g=await mod('geometry.mjs');
  const rig=buildRig('mushroom',8),spec=rig.faceSpec.find(f=>f.bone==='child');
  const target=new g.THREE.Mesh(spec.target,new g.THREE.MeshBasicMaterial({side:g.THREE.DoubleSide}));target.updateMatrixWorld(true);
  const fr=g.faceFrame(spec.center,spec.fwd,[0,1,0]);
  for(const [px,py] of [[40,56],[88,56],[64,82]]){
    const hit=g.projectPoint(target,fr,(px-64)*spec.half/64,(64-py)*spec.half/64,spec.half*.02);assert.ok(hit);
    for(const az of [0,Math.PI/4]){
      const dir=new g.THREE.Vector3(Math.sin(az),.32,Math.cos(az)).normalize();
      const obstruction=new g.THREE.Raycaster(hit.p.clone().addScaledVector(dir,.002),dir,.001,3).intersectObject(target);
      assert.equal(obstruction.length,0,`child feature ${px},${py} occluded at ${az}`);
    }
  }
});

test('Claude QA uses the current actor input adapter while preserving immutable geometry and presenter',async()=>{
  const fs=require('node:fs'),{serve}=require('../tools/character-3d/shot.cjs');
  const server=await serve({claude:true});
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const baseline=fs.readFileSync(path.join(root,'docs/qa/character-3d-quality-2026-10-02/claude/runtime.mjs'),'utf8').replaceAll('../../../../vendor/','../vendor/');
    const served=await (await fetch(base+'/character-3d/runtime.mjs')).text();
    assert.ok(served.startsWith(baseline),'immutable presenter retained');
    assert.match(served,/export \{ actorInfo \} from '\.\/qa-actor-info\.mjs'/,'new World calls the same adapter in both comparisons');
    const adapter=await (await fetch(base+'/character-3d/qa-actor-info.mjs')).text();
    const current=fs.readFileSync(path.join(root,'character-3d/runtime.mjs'),'utf8');
    const exact=current.slice(current.indexOf('export function actorInfo('),current.indexOf('export function templateCount('));
    assert.ok(adapter.endsWith(exact),'adapter is taken verbatim from current host contract');
    const normal=await serve();try{assert.equal((await fetch('http://127.0.0.1:'+normal.address().port+'/character-3d/qa-actor-info.mjs')).status,404,'shim only exists on baseline QA server')}finally{normal.close()}
  }finally{server.close()}
});
