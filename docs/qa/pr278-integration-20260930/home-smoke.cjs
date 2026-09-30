// Disposable real-browser smoke. Runtime exposure exists only in HTTP response.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const {chromium}=require('playwright');
const {buildPreview}=require(root+'/tools/cat-expression-preview.cjs');
const preview=buildPreview({preset:'normal',form:'adult'});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const expose=`window.__integrationQA={state:()=>state,render,hatchEgg,triggerDeath,startMinigame,setSpeechBubble};`;
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/preview'){res.setHeader('Content-Type','text/html');res.end(preview);return;}const p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+'/')){res.writeHead(403).end();return;}try{let body=fs.readFileSync(p);if(pathname==='/script.js')body=body.toString().replace(/\}\)\(\);\s*$/,expose+'\n})();');res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.PW_CHROMIUM});const rows=[],errors=[];try{
 for(const preset of ['normal','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping','happy']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(preset+': '+e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/preview?preset=${preset==='happy'?'normal':preset}`);const frame=page.frames().find(f=>f.parentFrame());await frame.waitForFunction(()=>window.__naotocchiBooted&&window.__integrationQA);
  if(preset==='happy')await frame.evaluate(()=>window.__integrationQA.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'}));
  const actual=await frame.locator('#petSprite').getAttribute('data-expression');assert.equal(actual,preset);
  const missing=await frame.locator('#petSprite img').evaluateAll(xs=>xs.filter(x=>!x.complete||x.naturalWidth===0).map(x=>x.src));assert.deepEqual(missing,[]);rows.push({preset,actual,missing});
  if(preset==='normal'){
   const lifecycle=await frame.evaluate(()=>{const a=window.__integrationQA,s=a.state();Object.assign(s,{stage:'egg',infinite:true});a.hatchEgg();const guarded=s.stage==='egg';s.infinite=false;a.hatchEgg();const hatched=s.stage==='growing';Object.assign(s,{speciesLine:'cat',stage:'growing',ageTicks:500,stageIndex:5,deathMeter:100});s.items.c_life_charm=1;a.triggerDeath();const rescued=s.stage==='growing'&&(s.items.c_life_charm||0)===0&&s.deathMeter===0;a.setSpeechBubble('うれしい',{kind:'pet',label:'ねこ'},{event:'play_with'});a.triggerDeath();a.render();return {guarded,hatched,rescued,dead:s.stage==='dead',stale:document.getElementById('petSprite').dataset.expression==='happy'};});assert.deepEqual(lifecycle,{guarded:true,hatched:true,rescued:true,dead:true,stale:false});rows.push({lifecycle});
  }
  if(preset==='hungry'){
   const transition=await frame.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));return {expression:document.getElementById('petSprite').dataset.expression,schema:window.__integrationQA.state().schemaVersion};});assert.equal(transition.expression,'hungry');assert.equal(transition.schema,5);rows.push({tabReturn:transition});
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(__dirname+'/home-smoke.json',JSON.stringify({browser:browser.version(),rows,errors,scope:'real index runtime; disposable memory save; no aesthetic evaluation; back/minigame covered by official back-navigation browser'},null,2)+'\n');console.log('Home 10 expressions + hatch/infinite/rescue/death/tab-return PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
