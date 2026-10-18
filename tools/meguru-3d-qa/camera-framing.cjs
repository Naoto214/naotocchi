// Same scene/pose comparison. QA-only freezing/probes; production gets no hooks.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('child_process');
const {serve}=require('../character-3d/shot.cjs');
const {makeSave}=require('./character-integration.cjs');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.env.FRAMING_OUT||'qa-artifacts/camera-framing');
const variants=(process.env.FRAMING_VARIANTS||'legacy,rejected,candidate').split(',');
const refs={legacy:'44a1415f73860620f06a88a1736a6b55f2196d13',rejected:'6ba125c1b00bf77b98f2561580fb9b0e16175ab5'};
const regions=['forest','snow','city'];
async function pose(page,region){
 await page.evaluate(async region=>{
  const r=__meguruRun;
  __meguruBridge.getState().regionId=region;r.enterWorld(region);
  r.sim.setCameraMotion(false);
  r.sim.setEnv({...r.sim.env,time:'day',weather:'sunny'});r.sim.setEnv=()=>{};
  const e=r.world.spots.find(x=>x.id==='entry')||r.world.spots[0];
  r.sim.setPlayer(e.x,e.z);
  Object.assign(r.sim.camera,{x:r.player.x,z:r.player.z,yaw:0,dist:430,height:1});
  r.sim.step=()=>[];
  r.party.forEach((a,i)=>Object.assign(a,{x:r.player.x+(i?95:-95),z:r.player.z+15,moving:false,bob:0}));
  Object.assign(r.player,{moving:false,bob:0,heading:0});
  r.renderer.setAnimLevel(0);
  if(!globalThis.__fixedDraw){const draw=r.renderer.draw.bind(r.renderer);r.renderer.draw=v=>draw(v,1000);globalThis.__fixedDraw=true;}
  for(let i=0;i<10;i++)await new Promise(requestAnimationFrame);
 },region);
 await page.waitForFunction(()=>__meguruRun.renderer.is3D&&__meguruRun.renderer.char3dPresenter?.has(__meguruRun.player));
}
async function measure(page){return page.evaluate(async()=>{
 const T=await import('/vendor/three-0.170.0/three.module.min.js'), r=__meguruRun,c=__framingCamera;
 c.updateMatrixWorld(true);
 const box=document.querySelector('#mgrCanvas').getBoundingClientRect(),v=r.sim.view(),p=r.player;
 const inst=r.renderer.char3dPresenter.instanceOf(p),ground=inst.holder.position.y;
 const screen=(x,y,z)=>{const q=new T.Vector3(x,y,-z).project(c);return {x:(q.x+1)/2,y:(1-q.y)/2,inFrame:Math.abs(q.x)<=1&&Math.abs(q.y)<=1&&q.z<=1};};
 const ray=(x,y)=>new T.Vector3(x,y,.5).unproject(c).sub(c.position).normalize();
 const center=ray(0,0),top=ray(0,1),bottom=ray(0,-1);
 return {region:r.world.regionId,viewport:[innerWidth,innerHeight],canvas:[box.width,box.height],player:[p.x,p.z],yaw:v.camera.yaw,
  camera:{position:c.position.toArray(),elevation:c.position.y-ground,pitch:c.rotation.x,yaw:c.rotation.y,fov:c.fov,aspect:c.aspect,view:c.view,matrix:c.projectionMatrix.toArray(),centerDownDegrees:-Math.asin(center.y)*180/Math.PI,visibleVerticalDegrees:top.angleTo(bottom)*180/Math.PI,horizontalDegrees:ray(-1,0).angleTo(ray(1,0))*180/Math.PI},
  feet:screen(p.x,ground,p.z),horizon:screen(p.x,ground,p.z+1e9),road:[300,900,1800].map(d=>({distance:d,...screen(p.x,ground,p.z+d)})),
  nominalGroundFraction:1-screen(p.x,ground,p.z+1e9).y,
  playerVisibility:r.renderer.playerVisible,stats:r.renderer.stats3d(),party:r.party.map(a=>[a.x,a.z]),
  obstacleCount:r.world.obstacles.length,canvasCount:document.querySelectorAll('.meguru-3d-canvas').length};
 });}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const result={physicalIPhone:'NOT_RUN',environment:'Chromium software WebGL',refs,rows:[],errors:[]};
 const server=await serve(),browser=await require('playwright').chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM?{executablePath:process.env.PLAYWRIGHT_CHROMIUM}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const variant of variants){
  const ctx=await browser.newContext({viewport:{width:393,height:760},reducedMotion:'reduce'}),page=await ctx.newPage();
  page.on('pageerror',e=>result.errors.push(String(e)));
  if(refs[variant]){const source=execFileSync('git',['show',refs[variant]+':meguru-3d.mjs'],{cwd:ROOT,encoding:'utf8'});await ctx.route('**/meguru-3d.mjs?*',r=>r.fulfill({contentType:'text/javascript',body:source}));}
  await ctx.route('**/*.css?*',route=>{const file=path.join(ROOT,new URL(route.request().url()).pathname);const css=fs.readFileSync(file,'utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,(_,edge)=>({top:0,right:47,bottom:21,left:47}[edge]+'px'));return route.fulfill({contentType:'text/css',body:css});});
  await page.addInitScript(s=>localStorage.setItem('naotocchi-save-v1',s),makeSave('forest'));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.evaluate(async()=>{const T=await import('/vendor/three-0.170.0/three.module.min.js'),orig=T.PerspectiveCamera.prototype.updateProjectionMatrix;T.PerspectiveCamera.prototype.updateProjectionMatrix=function(){orig.call(this);if(this.view?.enabled)globalThis.__framingCamera=this;};});
  await page.locator('#travelBtn').click();await page.locator('#meguruEnterBtn').click();await page.waitForFunction(()=>__meguruRun?.renderer.is3D);
  for(const region of regions){await pose(page,region);let first;
   for(const [width,height] of [[393,760],[852,320],[667,300],[852,390],[393,760]]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>{const b=document.querySelector('#mgrCanvas').getBoundingClientRect(),p=document.querySelector('.mg-pad').getBoundingClientRect(),v=globalThis.__framingCamera?.view;return v&&Math.abs(v.width-b.width)<1&&Math.abs(v.height-b.height)<1&&b.bottom<=innerHeight&&p.bottom<=innerHeight;},null,{timeout:20000});
    await page.evaluate(async()=>{for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);});
    const row=await measure(page);row.variant=variant;row.label=variant+'-'+region+'-'+width+'x'+height;
    // Repeated portrait verifies projection restoration after several rotations.
    if(!first)first=row;else if(width===393){assert.deepEqual(row.camera.matrix,first.camera.matrix);assert.deepEqual(row.camera.position,first.camera.position);row.restored=true;}
    assert.equal(row.playerVisibility.ok,true,JSON.stringify(row.playerVisibility));assert.equal(row.canvasCount,1);
    if(variant==='candidate'){assert.ok(Math.abs(row.horizon.y-.3)<.006);assert.ok(row.feet.y>.72&&row.feet.y<.87);assert.ok(row.road.every(x=>x.inFrame));assert.ok(row.nominalGroundFraction<.72);}
    if(!row.restored){row.file=row.label+'.png';await page.screenshot({path:path.join(OUT,row.file),clip:await page.locator('#mgrCanvas').boundingBox()});}
    result.rows.push(row);console.log('PASS '+row.label+(row.restored?' restored':''));
   }
  }
  if(variant==='candidate'){
   // Full regional lifecycle stability at a fixed short landscape ratio.
   await page.setViewportSize({width:852,height:320});
   for(const region of ['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert','star_stop','memory_lake']){
    const old=await page.evaluate(()=>{globalThis.__old=[];__meguruRun.renderer.char3dPresenter.scene.traverse(o=>{if(o.name.startsWith('c3d-actor:'))__old.push(o);});return __old.length;});
    await pose(page,region);const row=await measure(page);assert.equal(row.region,region);assert.ok(Math.abs(row.horizon.y-.3)<.006);assert.equal(row.playerVisibility.ok,true);assert.equal(await page.evaluate(()=>__old.every(o=>!o.parent)),true);result.rows.push({variant,regionalCheck:true,oldActors:old,...row});
   }
  }
  await ctx.close();
 }
 // Matched comparisons are assertions about equal inputs, not impressions.
 if(variants.length===3)for(const after of result.rows.filter(x=>x.variant==='candidate'&&!x.regionalCheck&&!x.restored)){
  for(const variant of ['legacy','rejected']){const before=result.rows.find(x=>x.variant===variant&&x.region===after.region&&String(x.viewport)===String(after.viewport));
   for(const key of ['player','party','yaw','canvas','obstacleCount'])assert.deepEqual(after[key],before[key],key+' mismatch');
   if(after.viewport[0]===393)assert.deepEqual(after.camera.matrix,before.camera.matrix,'portrait must be unchanged');
  }
 }
 assert.deepEqual(result.errors,[]);result.status='PASS';
 }finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(result,null,2)+'\n');await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
