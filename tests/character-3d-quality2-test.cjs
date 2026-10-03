const test=require('node:test'),assert=require('node:assert/strict');
const mod=n=>import('../character-3d/'+n);
test('merged soft geometry keeps per-vertex opacity and opaque components remain opaque',async()=>{
 const g=await mod('geometry.mjs'),a=g.solid(g.ellipsoid(1,1,1),'#fff'),b=g.solid(g.ellipsoid(.5,.5,.5),'#fff');
 const n=b.attributes.position.count,c=new Float32Array(n*4);for(let i=0;i<n;i++)c.set([1,1,1,i%2?.2:0],i*4);b.setAttribute('color',new g.THREE.BufferAttribute(c,4));const m=g.merge([a,b]);
 assert.equal(m.attributes.color.itemSize,4);assert.equal(m.attributes.color.getW(0),1);assert.ok(m.attributes.color.getW(m.attributes.position.count-1)<.3);
});
test('seed halo has fading edges without adding a draw per filament or losing six faces',async()=>{
 const rt=await mod('runtime.mjs'),t=rt.getTemplate('dandelion',8);assert.equal(t.status,'ok',t.error);
 const p=t.rig.parts.filter(x=>x.mesh.geometry.attributes.color.itemSize===4);assert.equal(p.length,6);
 for(const {mesh}of p){let faint=0;const c=mesh.geometry.attributes.color;for(let i=0;i<c.count;i++)if(c.getW(i)<.1)faint++;assert.ok(faint>40);assert.ok(mesh.material.transparent);}
 assert.equal(t.rig.faces.length,6);assert.ok(t.meshes<=14);assert.ok(t.tris<6500);
});
test('reclining feline keeps a low asymmetric rest pose and half-open normal eyes, then rises to walk',async()=>{
 const rt=await mod('runtime.mjs'),an=await mod('animate.mjs');const i=rt.instantiate(rt.getTemplate('cat_friend',0));an.animate(i,{dt:0,animLv:0});
 assert.equal(i.face.normalEye,'droop');assert.ok(Math.abs(i.bones.body.rotation.y)>.5);assert.ok(i.bones.body.position.y<.3);
 assert.notEqual(i.bones.legFL.position.z,i.bones.legFR.position.z);
 for(let n=0;n<30;n++)an.animate(i,{dt:1/30,moving:true,animLv:0});assert.ok(Math.abs(i.bones.body.rotation.y)<.02);assert.ok(i.bones.body.position.y>.4);
});
test('hanging pod swings around its suspension rather than detaching from the branch',async()=>{
 const rt=await mod('runtime.mjs'),an=await mod('animate.mjs'),{THREE}=await mod('geometry.mjs');const i=rt.instantiate(rt.getTemplate('butterfly',5));
 const larva=rt.instantiate(rt.getTemplate('butterfly',4));assert.doesNotThrow(()=>an.animate(larva,{dt:.1}), 'segmented hanging larva uses its existing chain rig');
 const top=new THREE.Vector3(0,i.meta.hangY,0);
 for(const emotion of rt.SPEC.CANONICAL_EMOTIONS){
  an.setEmotion(i,emotion);for(const reaction of ['hop','huff','yawn','wobble']){an.react(i,reaction);for(let n=0;n<20;n++){an.animate(i,{dt:.05,moving:n>10});i.root.updateMatrixWorld(true);const p=i.bones.body.localToWorld(top.clone()),anchor=i.bones.root.localToWorld(top.clone());assert.ok(p.distanceTo(anchor)<.002,emotion+'/'+reaction+' suspension remains joined');}}
 }
});
test('humanoid held attachments stay at hand during locomotion and posture',async()=>{
 const rt=await mod('runtime.mjs'),an=await mod('animate.mjs'),{THREE}=await mod('geometry.mjs');
 const i=rt.instantiate(rt.getTemplate('man',8));assert.ok(i.bones.cane.parent===i.bones.armR,'cane must follow hand bone');
 const rest=i.bones.cane.position.clone();for(let n=0;n<20;n++){an.animate(i,{dt:.05,moving:true});assert.ok(i.bones.cane.position.distanceTo(rest)<1e-8);}
});
test('shared halo material has a soft tuft texture with transparent outside and opaque core',async()=>{
 const {material}=await mod('rig.mjs'),m=material('soft');assert.ok(m.map,'soft density texture');const t=m.map.image,w=t.width,d=t.data;
 assert.ok(d[((w/2|0)*w+(w/2|0))*4+3]>250);assert.equal(d[3],0);assert.ok(d.some((v,i)=>i%4===3&&v>10&&v<180));assert.ok(material('soft').map===m.map,'texture shared');
});
test('projected face decals render in one pass without changing canonical atlases',async()=>{
 const rt=await mod('runtime.mjs');for(const [id,stage]of [['dandelion',8],['man',4],['cat_friend',0]]){const t=rt.getTemplate(id,stage);for(const f of t.rig.faces){assert.ok(f.decal.material.forceSinglePass,'flat decal needs one pass');for(const m of Object.values(f.decal.userData.atlas.mats))assert.ok(m.forceSinglePass);}}
});
