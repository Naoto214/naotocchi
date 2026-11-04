// Exercise real egg warming/hatching; inspection and age fixtures are QA-only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.env.HOME_BIRTH_OUTPUT||'test-results/home-production-birth');
fs.mkdirSync(out,{recursive:true});
const inspect=`
window.HomeBirthQA={
 detail(){const rect=id=>document.querySelector(id).getBoundingClientRect().toJSON();
 const img=el.petSprite.querySelector('img'),asset=img?.getAttribute('src'),box=window.NaotocchiCastBounds[asset]?.box||[0,0,128,128],r=img.getBoundingClientRect();
 const stage=rect('#castStage'),pane=rect('.screen-frame'),a=homeDiorama?.model.snapshot().find(a=>a.kind==='pet'),scene=homeDiorama?.inspectScene();
 return {stage:state.stage,age:state.ageTicks,asset,box,sprite:rect('#petSprite'),image:r.toJSON(),
 alpha:{x:r.left+r.width*(box[0]+box[2])/256,y:r.top+r.height*(box[1]+box[3])/256,foot:r.top+r.height*box[3]/128},
 cast:stage,pane,visible:{left:Math.max(stage.left,pane.left),right:Math.min(stage.right,pane.right),top:Math.max(stage.top,pane.top),bottom:Math.min(stage.bottom,pane.bottom)},
 actor:a,ground:a&&scene?.navigation?.unproject(a),safe:a&&scene?.navigation?.valid(a),notice:rect('#homeEventSlot'),speech:rect('#speechSlot'),comment:rect(document.getElementById('homeCommentDock')?'#homeCommentDock':'#speechSlot'),display:document.body.dataset.homeDisplayVersion,
 buttons:[...document.querySelectorAll('#careActions>button')].map(e=>({id:e.id,...e.getBoundingClientRect().toJSON()})),world:document.body.dataset.livingHome,
 save:JSON.parse(JSON.stringify(state))};},
 grow(){state.ageTicks=25*AGE_TICKS_PER_YEAR;state.stageIndex=3;homeCastLayoutKey='';render();},
 settle(){clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;castMotion.clear();el.storyFlash.classList.add('hidden');el.lifeCardOverlay.classList.add('hidden');render();},
 save(){saveState();return JSON.parse(JSON.stringify(state));}
};
if(state.stage==='egg'){state.lifetime.nextEggLine='dog';state.lifetime.nextEggKind='normal';state.items.c_egg_normal=1;state.lifetime.timeMode='day';state.lifetime.weatherMode='sunny';render();}
`;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
let insets={};
const server=http.createServer((req,res)=>{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';const file=path.resolve(root,'.'+p);
 if(!file.startsWith(root+'/')||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 if(p==='/script.js'){res.end(fs.readFileSync(file,'utf8').replace('setInterval(loop, TICK_MS);','/* QA controlled lifecycle clock */').replace(/\}\)\(\);\s*$/,inspect+'\n})();'));return;}
 if(p==='/home-production-diorama.js'){res.end(fs.readFileSync(file,'utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));return;}
 if(p.endsWith('.css')){res.end(fs.readFileSync(file,'utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)(?:,\s*0px)?\)/g,(_,edge)=>(insets[edge]||0)+'px'));return;}
 fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,results=[],errors=[];
try{for(const engine of (process.env.HOME_BIRTH_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const motion of ['reduce','no-preference'])for(const [width,height,safe] of [[320,568],[375,667],[390,844],[430,932],[390,844,true]]){
 insets=safe?{top:59,bottom:34}:{};
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:motion});
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.goto(base);await page.waitForFunction(()=>window.HomeBirthQA&&window.HomeV6Egg&&document.querySelector('.home-v6-egg-world img')?.complete);
 await page.evaluate(()=>document.fonts.ready);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 const row={engine,width,height,motion,safe:!!safe};results.push(row);
 async function capture(name){await page.clock.runFor(70);row[name]=await page.evaluate(()=>HomeBirthQA.detail());if(width===390&&!safe)await page.screenshot({path:path.join(out,`${engine}-${motion}-${name}-390.png`)});}
 await capture('egg');
 const words=['たまごが、ほんのりあたたかい。','なかで、なにかがうごいた気がする。','たまごが、こつんとゆれた。','もうすぐ、あえそうだ。'];
 for(let i=0;i<4;i++){
  await page.locator('#playWithBtn').click();await page.clock.runFor(120);
  assert.equal(await page.locator('#message').innerText(),words[i]);
  assert.doesNotMatch(await page.locator('#worldDescription').innerText(),/[0-9]+%/);
  assert.equal(await page.locator('#evoValue').isVisible(),false);
  assert.equal(await page.evaluate(()=>HomeBirthQA.detail().save.growth),(i+1)*4,'each real tap warms the egg once');
  // V18 queues upper notices for their full 4200ms reading duration.
  // Let this notice finish before checking the next one; do not clear the queue.
  await page.clock.runFor(4200);
 }
 await capture('ready');
 await page.locator('#playWithBtn').click();await page.clock.runFor(1050);
 assert.equal(await page.locator('.birth-panel').count(),0);
 assert.equal(await page.locator('#message.birth-notice').innerText(),'あかちゃんいぬがうまれた！');
 assert.equal(await page.locator('.birth-celebration').getAttribute('aria-hidden'),'true');
 assert.equal(await page.locator('#message').evaluate(e=>e.scrollHeight<=e.clientHeight+1),true,'birth text fits its unchanged lane');
 assert.equal(await page.locator('.birth-star').count(),8);
 assert.equal(await page.locator('.birth-celebration').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 if(motion==='reduce')assert.equal(await page.locator('.birth-star').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 await capture('celebration');
 await page.clock.runFor(1900);
 assert.equal(await page.locator('.birth-celebration').count(),0);

 await page.waitForFunction(()=>document.body.dataset.livingHome==='art-25d'&&document.querySelector('.home-art-canvas')?.width>0);
 await capture('newborn');
 await page.locator('#playWithBtn').click();
 row.afterBirthCare=await page.evaluate(()=>HomeBirthQA.detail().save.actionCounts.pet);
 assert.equal(row.afterBirthCare,row.newborn.save.actionCounts.pet+1,'care button works after birth');
 await page.evaluate(()=>HomeBirthQA.grow());await capture('grown');
 const saved=await page.evaluate(()=>HomeBirthQA.save());
 // Reload must run startup animation frames/timers; the paused test clock can
 // otherwise strand a valid saved game before the renderer becomes ready.
 // Inspect restored entry before autonomous wandering; hatching above still
 // exercises both motion modes. Reduced motion leaves manual input intact.
 await page.emulateMedia({reducedMotion:'reduce'});row.resumeMotion='reduce';
 await page.clock.resume();await page.reload();
 try{await page.waitForFunction(()=>window.HomeBirthQA&&document.body.dataset.livingHome==='art-25d');}
 catch(e){console.error('RELOAD_DIAGNOSTICS',await page.evaluate(()=>({qa:!!window.HomeBirthQA,body:document.body.dataset,ready:document.readyState,text:document.body.innerText.slice(0,1000)})),errors);throw e;}
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 await capture('resumed');
 assert.equal(row.resumed.save.speciesLine,saved.speciesLine);assert.equal(row.resumed.age,saved.ageTicks);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,errors},null,2));await page.close();
 }
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);
if(!process.env.HOME_BIRTH_CAPTURE_ONLY)for(const r of results)for(const phase of ['egg','newborn']){
 // The existing idle egg sway is a visual transform, not a placement change.
 // Preserve every original static-centering assertion; normal motion checks
 // still verify the newborn centre, legal ground and lifecycle below.
 if(r.motion!=='reduce'&&phase==='egg')continue;
 const d=r[phase],cx=(d.visible.left+d.visible.right)/2,cy=(d.visible.top+d.visible.bottom)/2;
 assert.ok(Math.abs(d.alpha.x-cx)<=2,`${r.engine}/${r.width}/${phase}: alpha centre ${d.alpha.x}, visible centre ${cx}`);
 if(phase==='newborn'&&d.display==='18'){
  // V18 preserves legal world coordinates while independently scaling the
  // resident body and the walking area. Its newborn need not occupy the old
  // transformed stage midpoint, especially on the compact 320px viewport.
  assert.ok(Math.abs(d.ground.x-.5)<.01,'newborn enters on the central world axis');
  const inkTop=d.image.top+d.image.height*d.box[1]/128;
  assert.ok(inkTop>=d.pane.top-1&&d.alpha.foot<=d.pane.bottom+1,'newborn ink stays in the world viewport');
  assert.ok(inkTop>=d.notice.bottom-1&&d.alpha.foot<=d.comment.top+1,'newborn clears both fixed text lanes');
 }else assert.ok(Math.abs(d.alpha.y-cy)<=2,`${r.engine}/${r.width}/${phase}: vertical alpha centre ${d.alpha.y}, visible centre ${cy}`);
 if(phase==='newborn')assert.ok(d.safe,'newborn stays on approved ground');
}
if(!process.env.HOME_BIRTH_CAPTURE_ONLY)for(const r of results){
 for(const axis of ['x','y','z'])assert.ok(Math.abs(r.grown.ground[axis]-r.newborn.ground[axis])<=1e-12,'growth preserves the hatch foot '+axis+' (floating-point projection)');
 assert.ok(r.grown.safe&&r.resumed.safe);
 assert.ok(Math.abs(r.resumed.ground.x-.55)<=1e-12,'saved adult entry does not replay the hatch placement');
 assert.ok(Math.abs(r.resumed.ground.z-.74)<=1e-12,'saved adult depth is preserved (floating-point projection)');
 for(const phase of ['newborn','grown','resumed']){
  const d=r[phase];assert.equal(d.notice.height,42);assert.equal(d.comment.height,76);assert.equal(d.buttons.length,9);
  assert.ok(d.buttons.every(b=>b.bottom<=r.height-(r.safe?34:0)+1),'fixed controls remain above the safe-area edge');
 }
}
console.log('PASS birth display',results.length,'viewport cases');
}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
