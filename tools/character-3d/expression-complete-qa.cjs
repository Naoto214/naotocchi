// Real shared gallery renderer, software WebGL; not physical iPhone evidence.
const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const {serve}=require('./shot.cjs');
(async()=>{
 const out=process.env.QA_OUT||'docs/qa/expression-complete-20261016';fs.mkdirSync(out,{recursive:true});
 const server=await serve();const browser=await require('playwright').chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}).catch(error=>{server.close();throw error;});
 const page=await browser.newPage({viewport:{width:280,height:280}}),errors=[],records=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const base='http://127.0.0.1:'+server.address().port;
 const targets=[['dog',1],['dog',4],['dog',8],['clownfish',4],['penguin',4],['dandelion',4],['mushroom',4],['starfish',3],['shiba',0],['partner:cat_ceo',0],['author:naoto',0]];
 try{
  for(const [id,stage] of targets)for(const emotion of ['normal','hungry','weak','critical','lonely','positive']){
   await page.goto(base+'/character-3d/gallery.html?'+new URLSearchParams({id,stage,emotion,bare:1,t:1,view:'front',layout:'single',reduced:1}));
   await page.waitForFunction(()=>window.__c3d?.items.length===1);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const row=await page.evaluate(()=>{const x=__c3d.items[0];return {id:x.id,stage:x.inst.tpl.stage,emotion:x.inst.anim.emotion,faces:x.inst.faces.map(f=>({mode:f.mode,material:f.decal?.material.name,eyes:f.eyes.map(e=>e.userData.shape)})),calls:__c3d.renderer.info.render.calls,triangles:__c3d.renderer.info.render.triangles};});
   assert.equal(row.id,id);assert.equal(row.emotion,emotion);
   const file=`${id.replaceAll(':','-')}-${stage}-${emotion}.png`;await page.screenshot({path:path.join(out,file)});records.push({...row,file});
  }
  // Real canvas atlas creation for all 293 models and all 12 states.
  const all=await page.evaluate(async()=>{
   const rt=await import('/character-3d/runtime.mjs'),an=await import('/character-3d/animate.mjs');let builds=0,states=0,fullFace=0;
   for(const r of rt.SPEC.inventory()){
    const k=rt.SPEC.specKeyFor(r.kind==='form'?{line:r.id,stage:r.stage-1}:r),t=rt.getTemplate(k.id,k.stage);
    if(t.status!=='ok')throw Error(r.id+':'+t.error);const i=rt.instantiate(t);builds++;
    for(const em of rt.SPEC.CANONICAL_EMOTIONS){an.setEmotion(i,em);an.animate(i,{dt:.016,animLv:0,moving:false});for(const f of i.faces){if(f.decal&&!f.decal.material)throw Error('missing material');}states++;}
    fullFace+=i.faces.filter(f=>f.mode==='A').length;rt.disposeInstance(i);
   }
   return {builds,states,fullFace};
  });assert.equal(all.builds,293);assert.equal(all.states,3516);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({environment:'Chromium software WebGL, 280x280, not iPhone',all,records,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
