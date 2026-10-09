const test=require('node:test'),assert=require('node:assert/strict');
test('owl source candidate owns paired ear tufts, asymmetric folded wings and cream feather markings',async()=>{
 const rows=require('../character-3d/nonplayer-spec.js')(),row=rows['companion:owl'];assert.ok(row);const s=row.spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),r=BUILDERS[s.archetype](s,'companion:owl:0');assert.equal(s.archetype,'avian');assert.equal(s.earTufts.length,2);assert.ok(s.featherMarks);assert.ok(Math.abs(r.bones.wingL.rotation.z-r.bones.wingR.rotation.z)>1);assert.equal(r.bones.wingL.parent,r.bones.body);const wing=r.parts.find(p=>p.bone==='wingL').mesh.geometry;wing.computeBoundingBox();assert.ok(wing.boundingBox.max.z>.2,'folded wing reaches forward from its shoulder');const bare=BUILDERS[s.archetype]({...s,earTufts:[]},'companion:owl:0'),g=r.parts.find(p=>p.bone==='head').mesh.geometry;assert.ok(g.attributes.position.count>bare.parts.find(p=>p.bone==='head').mesh.geometry.attributes.position.count+100,'physical paired ear tufts');const plain=BUILDERS[s.archetype]({...s,featherMarks:null},'companion:owl:0');assert.ok(r.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count>plain.parts.find(p=>p.bone==='body').mesh.geometry.attributes.position.count+100,'physical small breast feather marks');r.root.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(r.root,true).min.y>=-.005);assert.equal(require('../character-3d/spec.js').specKeyFor({kind:'companion',id:'owl'}).exact,true);
});
test('owl candidate retains canonical face, owned finite motion and scoped capture',async()=>{
 const row=require('../character-3d/nonplayer-spec.js')()['companion:owl'];assert.ok(row);const SPEC=require('../character-3d/spec.js'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),r=BUILDERS[row.spec.archetype](row.spec,'companion:owl:0');r.faces=[attachFace(r,r.faceSpec,'C')];for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){const a=instantiate({rig:r,key:'companion:owl:0'});setEmotion(a,emotion);for(let i=0;i<20;i++)animate(a,{dt:.05,moving,animLv});assert.equal(a.faces.length,1);assert.equal(a.faces[0].emotion,emotion);for(const b of Object.values(a.bones))assert.ok([...b.position.toArray(),...b.rotation.toArray().slice(0,3)].every(Number.isFinite));}const {captureRows}=require('../tools/character-3d/nonplayer-review.cjs');assert.deepEqual(captureRows(['companion:owl']).map(r=>r.key),['companion:owl']);assert.throws(()=>captureRows(['companion:typo']),/unknown capture/);
});

test('owl revised source details avoid coarse paint bands and expose its folded wing',()=>{const s=require('../character-3d/nonplayer-spec.js')()['companion:owl'].spec;assert.ok(s.featherMarks.positions?.length>=8,'explicit small breast feather positions');assert.ok(s.faceDiscs,'large paired cream facial discs');assert.ok(s.wing.sides.left.forward>=.2,'wing curves forward from attached base');});

test('owl held wing is actually visible ahead of breast and lower head',async()=>{
 const s=require('../character-3d/nonplayer-spec.js')()['companion:owl'].spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),r=BUILDERS.avian(s,'owl');r.root.updateMatrixWorld(true);const wing=r.parts.find(p=>p.bone==='wingL').mesh,others=r.parts.filter(p=>['body','head'].includes(p.bone)).map(p=>p.mesh);let visible=0;for(const [x,y]of [[-.25,.40],[-.20,.47],[-.15,.53]]){const ray=new THREE.Raycaster(new THREE.Vector3(x,y,2),new THREE.Vector3(0,0,-1)),a=ray.intersectObject(wing)[0],b=ray.intersectObjects(others)[0];if(a&&b&&a.distance<b.distance-.008)visible++;}assert.ok(visible>=2,'held wing must emerge in front of breast/head, not merely extend forward locally');
});

// Sample the actual C-mode decal triangles, including their projection onto the skull.
function decalPoint(THREE,mesh,px,py){
 const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,idx=g.index,u=px/128,v=1-py/128;
 for(let i=0;i<idx.count;i+=3){const a=idx.getX(i),b=idx.getX(i+1),c=idx.getX(i+2),ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b),by=uv.getY(b),cx=uv.getX(c),cy=uv.getY(c),d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy),wa=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/d,wb=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/d,wc=1-wa-wb;if(Math.min(wa,wb,wc)>=-1e-6)return new THREE.Vector3().fromBufferAttribute(p,a).multiplyScalar(wa).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,b),wb).addScaledVector(new THREE.Vector3().fromBufferAttribute(p,c),wc).applyMatrix4(mesh.matrixWorld);}
 throw Error('mouth sample outside assembled decal');
}
test('owl held wing has exposed overlapping feather volumes with clear canonical eyes and mouth in all 32 states',async()=>{
 const s=require('../character-3d/nonplayer-spec.js')()['companion:owl'].spec,SPEC=require('../character-3d/spec.js'),{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),{attachFace}=await import('../character-3d/rig.mjs'),{instantiate}=await import('../character-3d/runtime.mjs'),{animate,setEmotion}=await import('../character-3d/animate.mjs'),r=BUILDERS.avian(s,'owl');r.faces=[attachFace(r,r.faceSpec,'C')];
 const g=r.parts.find(p=>p.bone==='wingL').mesh.geometry;
 assert.ok(g.attributes.position.count>1500,'held wing must contain physical feather layers, not a smooth flipper');
 const colors=g.attributes.color;let rim=0,dark=0;for(let i=0;i<colors.count;i++){if(colors.getY(i)>.25)rim++;if(colors.getY(i)<.18)dark++;}assert.ok(rim>150&&dark>150,'assembled feathers retain warm cream rims and dark centers');
 // Each existing plume volume contributes the same indexed topology, so ray faceIndex
 // identifies which real layer is exposed, rather than merely counting data entries.
 const {plumeGeometry}=await import('../character-3d/plumed-bird.mjs'),triPerFeather=plumeGeometry(s.wing.sides.left.plumes[0]).index.count/3;
 let states=0,minVisible=Infinity,minLayers=Infinity;
 for(const emotion of SPEC.CANONICAL_EMOTIONS)for(const moving of [false,true])for(const animLv of [0,2]){
  const a=instantiate({rig:r,key:'owl'});setEmotion(a,emotion);states++;
  const wing=a.bones.wingL.children.find(o=>o.isMesh),occluders=[a.bones.body,a.bones.head].flatMap(b=>b.children.filter(o=>o.isMesh&&o.name.endsWith(':opaque'))),ray=new THREE.Raycaster();
  for(let frame=0;frame<40;frame++){animate(a,{dt:.05,moving,animLv});if(frame%5!==0&&frame!==39)continue;a.root.updateMatrixWorld(true);const label=`${emotion}/${moving}/${animLv}/frame${frame}`;
   // Match front and three-quarter review directions, including camera elevation.
   for(const az of [0,.62]){
   const toward=new THREE.Vector3(Math.sin(az),.175,Math.cos(az)).transformDirection(a.root.matrixWorld),cast=p=>{ray.set(p.clone().addScaledVector(toward,2),toward.clone().negate());return ray.intersectObject(wing)[0];};
   for(const eye of a.faces[0].eyes){const pos=eye.geometry.attributes.position;for(let i=0;i<pos.count;i+=13){const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(eye.matrixWorld),hit=cast(p);assert.ok(!hit||hit.distance>=1.997,`wing covers canonical eye: ${label}`);}}
   // Conservative bounds contain every canonical mouth stroke, including open/yawn.
   for(let px=53;px<=75;px+=3)for(let py=102;py<=121;py+=3){const p=decalPoint(THREE,a.faces[0].decal,px,py),hit=cast(p);assert.ok(!hit||hit.distance>=1.997,`wing covers canonical mouth: ${label}, px=${px}, py=${py}, hit=${hit?.point.toArray()}`);}
   let visible=0,heldTip=0;const layers=new Set();
   for(let x=-.32;x<=-.08;x+=.025)for(let y=.27;y<=.57;y+=.025){const p=a.bones.body.localToWorld(new THREE.Vector3(x,y,.30)),hit=cast(p),body=ray.intersectObjects(occluders)[0];if(hit&&(!body||hit.distance<body.distance-.006)){visible++;if(x>=-.25&&y>=.47)heldTip++;layers.add(Math.floor(hit.faceIndex/triPerFeather));}}
   assert.ok(heldTip>=3,`held feathers must reach beside the lower face: ${label} (${heldTip})`);
   minVisible=Math.min(minVisible,visible);minLayers=Math.min(minLayers,layers.size);assert.ok(visible>=18,`held wing must stay exposed left of beak: ${label} (${visible})`);assert.ok(layers.size>=4,`at least four actual feather layers must be visible: ${label} (${layers.size})`);
   }
  }
 }
 assert.equal(states,32);console.log({owlStates:states,minVisible,minLayers});
});

function geometryHash(parts){const h=require('node:crypto').createHash('sha256');for(const p of parts){h.update(p.bone);for(const[n,a]of Object.entries(p.mesh.geometry.attributes)){h.update(n);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}const idx=p.mesh.geometry.index;if(idx)h.update(Buffer.from(idx.array.buffer,idx.array.byteOffset,idx.array.byteLength));}return h.digest('hex');}
test('optional avian plumes preserve every Pilot avian and unrelated Owl geometry byte',async()=>{
 const SPEC=require('../character-3d/spec.js'),{BUILDERS}=await import('../character-3d/archetypes.mjs');
 const expected={1:'fd3cfa91113ec0d6a6a98e903d227836a35bbb63f3d0c830be804224c417959d',4:'83792dca996fe7348614ded661a9c38eada791240aacf61ceaa01f8dad2eb8dd',8:'6990e9f66fcad12de14846e33de27eed6d54d78ccfecadf4f0f661f7544f2c82'};
 for(const[n,s]of Object.entries(SPEC.PILOT.penguin.stages))assert.equal(geometryHash(BUILDERS.avian(s,`penguin:${n}`).parts),expected[n],`Pilot penguin ${n} equals base 540e8ef5`);
 const s=require('../character-3d/nonplayer-spec.js')()['companion:owl'].spec,r=BUILDERS.avian(s,'owl');assert.equal(geometryHash(r.parts.filter(p=>p.bone!=='wingL')),'57e27b95693e414ba6daba8bba9583ec7854a24b9caa9d618862e2955c730b67','Owl body, head, right wing and feet equal base 540e8ef5');
});
test('assembled held feathers are closed volumes and physically enter the breast at the shoulder',async()=>{
 const s=require('../character-3d/nonplayer-spec.js')()['companion:owl'].spec,{BUILDERS}=await import('../character-3d/archetypes.mjs'),{THREE}=await import('../character-3d/geometry.mjs'),r=BUILDERS.avian(s,'owl');r.root.updateMatrixWorld(true);const wing=r.parts.find(p=>p.bone==='wingL').mesh,body=r.parts.find(p=>p.bone==='body').mesh,g=wing.geometry,pos=g.attributes.position,idx=g.index,edges=new Map(),key=i=>[pos.getX(i),pos.getY(i),pos.getZ(i)].map(n=>Math.round(n*1e5)).join(',');
 for(let i=0;i<idx.count;i+=3){const vs=[key(idx.getX(i)),key(idx.getX(i+1)),key(idx.getX(i+2))];if(new Set(vs).size<3)continue;for(let j=0;j<3;j++){const e=[vs[j],vs[(j+1)%3]].sort().join('/');edges.set(e,(edges.get(e)||0)+1);}}assert.ok([...edges.values()].every(n=>n===2),'no boundary edges after welding closed feather volumes');
 const ray=new THREE.Raycaster();let embedded=0;for(let i=0;i<pos.count;i++){const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(wing.matrixWorld);ray.set(new THREE.Vector3(p.x,p.y,2),new THREE.Vector3(0,0,-1));const hits=ray.intersectObject(body);if(hits.length>=2&&p.z<hits[0].point.z-.004&&p.z>hits.at(-1).point.z+.004)embedded++;}assert.ok(embedded>=8,`feather shoulder must physically overlap breast (${embedded} embedded vertices)`);console.log({owlShoulderEmbeddedVertices:embedded});
});
