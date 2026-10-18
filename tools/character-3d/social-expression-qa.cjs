// Deterministic presentation fixture using the production semantic session and presenter.
// Complements (does not replace) the real UI free-life browser runner.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {serve}=require('./shot.cjs');
(async()=>{
 const out='docs/qa/social-expression-20261016';const server=await serve(),browser=await require('playwright').chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}).catch(error=>{server.close();throw error;});
 const page=await browser.newPage({viewport:{width:1000,height:450}}),errors=[],records=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.route('**/social-expression-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/social-expression-fixture`);
  for(const src of ['pet-expression.js','relationship-expression.js','resident-expression.js','expression-presentation.js','relationship-life.js'])await page.addScriptTag({url:`/${src}`});
  for(const mode of ['baseline','greeting','farewell','expired','reduced']){
   const row=await page.evaluate(async mode=>{
    const {THREE}=await import('/character-3d/geometry.mjs'),rt=await import('/character-3d/runtime.mjs');
    const scene=new THREE.Scene();scene.background=new THREE.Color('#e9f0f0');scene.add(new THREE.HemisphereLight(0xffffff,0x687580,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-200,300,400);scene.add(light);
    const camera=new THREE.OrthographicCamera(-400,400,180,-180,.1,2000);camera.position.set(0,180,650);camera.lookAt(0,15,0);
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1000,450);document.body.replaceChildren(renderer.domElement);document.body.style.margin='0';
    const defs=[['shiba',0],['partner:cat_ceo',0],['clownfish',4],['dandelion',4],['mushroom',4],['starfish',3],['dog',8]];
    const actors=defs.map(([id,stage],i)=>({key:id,kind:'companion',id:'shiba',emotion:'normal',asset:'assets/characters/companions/shiba.png',x:(i-3)*108,z:0,heading:0,specKey:{id,stage}}));
    const targets=actors.map(a=>({key:'target:'+a.key,x:a.x+60,z:20,emotion:'normal'}));
    const c=NaotocchiExpressionPresentation.createViewController({relationshipInput:()=>({value:29})}),s=NaotocchiRelationshipLife.createSession(),view={world:{regionId:'home'},residents:actors.concat(targets),party:[]};c.session.subscribe(s);c.prepare(view,0);
    const p=rt.createCharacterPresenter({scene,buildBudget:99,animLevel:mode==='reduced'?0:2});
    if(mode!=='baseline')for(const a of actors){s.emit(mode==='farewell'?'accompany_end':'greeting',a.key,{context:'meguru',regionId:'home',targetKey:'target:'+a.key,reason:'player_choice'});if(mode==='farewell')s.emit('return_to_free_life',a.key,{context:'meguru',regionId:'home',reason:'player_choice'});}
    const end=mode==='expired'?11000:500;
    for(let t=50;t<=end;t+=50){c.prepare(view,t);p.beginFrame(t);for(const a of actors)p.present(a,{specKey:a.specKey,emotion:a.expr.emotion,cue:a.expr.cue,dt:.05,moving:false});p.endFrame();}
    renderer.render(scene,camera);const result=actors.map(a=>({key:a.key,emotion:a.expr.emotion,attention:!!a.expr.cue?.attention,yaw:p.instanceOf(a).yaw,head:p.instanceOf(a).anim.lookYaw,heading:a.heading}));
    window.__socialDispose=()=>{p.dispose();renderer.dispose();};return result;
   },mode);
   for(const r of row){assert.equal(r.heading,0);assert.ok(Number.isFinite(r.yaw));assert.equal(r.emotion,['baseline','expired'].includes(mode)?'lonely':'positive');if(mode==='reduced')assert.equal(r.head,0);}
   await page.screenshot({path:path.join(out,`direction-${mode}.png`)});records.push({mode,actors:row});await page.evaluate(()=>window.__socialDispose());
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'direction-browser.json'),JSON.stringify({fixture:true,environment:'Chromium software WebGL; not iPhone',records,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
