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
 actor:a,ground:a&&scene?.navigation?.unproject(a),safe:a&&scene?.navigation?.valid(a),notice:rect('#homeEventSlot'),speech:rect('#speechSlot'),
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
 if(p.endsWith('.css')){res.end(fs.readFileSync(file,'utf8').replace(/env\(safe-area-inset-(top|right|bottom|left)\)/g,(_,edge)=>(insets[edge]||0)+'px'));return;}
 fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,results=[],errors=[];
try{for(const engine of (process.env.HOME_BIRTH_ENGINES||'chromium,webkit').split(',')){
 const browser=await require('playwright')[engine].launch();try{
 for(const [width,height,safe] of [[320,568],[375,667],[390,844],[430,932],[390,844,true]]){
 insets=safe?{top:59,bottom:34}:{};
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
 await page.goto(base);await page.waitForFunction(()=>window.HomeBirthQA&&window.HomeV6Egg&&document.querySelector('.home-v6-egg-world img')?.complete);
 await page.evaluate(()=>document.fonts.ready);await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+1000));
 const row={engine,width,height,safe:!!safe};results.push(row);
 async function capture(name){await page.clock.runFor(70);row[name]=await page.evaluate(()=>HomeBirthQA.detail());if(width===390&&!safe)await page.screenshot({path:path.join(out,`${engine}-${name}-390.png`)});}
 await capture('egg');
 for(let i=0;i<5;i++){await page.locator('#playWithBtn').click();await page.clock.runFor(120);}
 await page.waitForFunction(()=>document.body.dataset.livingHome==='art-25d'&&document.querySelector('.home-art-canvas')?.width>0);
 await capture('newborn');
 await page.evaluate(()=>HomeBirthQA.grow());await capture('grown');
 const saved=await page.evaluate(()=>HomeBirthQA.save());await page.reload();await page.waitForFunction(()=>window.HomeBirthQA&&document.body.dataset.livingHome==='art-25d');
 await capture('resumed');
 assert.equal(row.resumed.save.speciesLine,saved.speciesLine);assert.equal(row.resumed.age,saved.ageTicks);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,errors},null,2));await page.close();
 }
 }finally{await browser.close();}
}
assert.deepEqual(errors,[]);
if(!process.env.HOME_BIRTH_CAPTURE_ONLY)for(const r of results)for(const phase of ['egg','newborn']){
 const d=r[phase],cx=(d.visible.left+d.visible.right)/2,cy=(d.visible.top+d.visible.bottom)/2;
 assert.ok(Math.abs(d.alpha.x-cx)<=2,`${r.engine}/${r.width}/${phase}: alpha centre ${d.alpha.x}, visible centre ${cx}`);
 assert.ok(Math.abs(d.alpha.y-cy)<=2,`${r.engine}/${r.width}/${phase}: vertical alpha centre ${d.alpha.y}, visible centre ${cy}`);
 if(phase==='newborn')assert.ok(d.safe,'newborn stays on approved ground');
}
if(!process.env.HOME_BIRTH_CAPTURE_ONLY)for(const r of results){
 assert.deepEqual(r.grown.ground,r.newborn.ground,'growth preserves the hatch foot, not the body centre');
 assert.ok(r.grown.safe&&r.resumed.safe);
 assert.equal(r.resumed.ground.x,.55,'saved adult entry does not replay the hatch placement');
 assert.equal(r.resumed.ground.z,.74);
 for(const phase of ['newborn','grown','resumed']){
  const d=r[phase];assert.equal(d.notice.height,42);assert.equal(d.speech.height,76);assert.equal(d.buttons.length,9);
  assert.ok(d.buttons.every(b=>b.bottom<=r.height-(r.safe?34:0)+1),'fixed controls remain above the safe-area edge');
 }
}
console.log('PASS birth display',results.length,'viewport cases');
}finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
