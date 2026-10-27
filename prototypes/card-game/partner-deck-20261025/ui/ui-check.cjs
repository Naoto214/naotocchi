// iPhone-size browser check (390x844, touch) of the CPU こいびと・交際 deck after the 2026-10-25 list change:
// 指定 starts with the new 40 cards, and a match saved with the earlier list restores with its own 40 cards.
// Usage: node ui-check.cjs <outDir>   (NODE_PATH must reach a playwright install)
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const fs=require('fs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.argv[2]??'.'),port=8124;
(async()=>{const srv=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const results={};let browser;
 try{browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/prototypes/card-game/`);await page.waitForSelector('#cpu-deck-mode');
  await page.selectOption('#cpu-deck-mode','choose');await page.selectOption('#cpu-deck-type','partner');
  results.guideChoose=await page.$eval('#cpu-deck-guide',x=>x.textContent);
  await page.screenshot({path:path.join(out,'welcome-partner.png')});
  await page.click('#new');await page.waitForSelector('#game:not([hidden])');
  const cur=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')));
  results.newLabel=cur.cpuDeck;
  results.newMatchUsesCurrentList=await page.evaluate(async b=>{const m=await import('./cpu-decks.mjs');return m.cpuDeckVersion('partner',b);},cur.game.decks.B);
  results.newMatchLovers=cur.game.decks.B.filter(id=>id.startsWith('P-')).length;
  // A match saved before the change: same app wrapper, CPU seat holding the earlier 40 cards, a few moves played.
  const oldRaw=await page.evaluate(async()=>{const e=await import('./engine.mjs'),d=await import('./cpu-decks.mjs'),s=await import('./cpu-session.mjs'),r=await import('./records-match.mjs'),p=await import('./cpu-policy.mjs');
   const old=[...d.CPU_DECK_HISTORY.partner[0].cards],label={mode:'choose',id:'partner',name:'こいびと・交際',seed:null};
   const x=new s.CpuSession({humanSeat:'A',difficulty:'intermediate',policySeed:9,cpuDeck:label});x.start(e.createGame(31337,{A:[...e.DEFAULT_DECK],B:old}));
   for(let i=0;i<40&&!x.finished;i++){if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),a=p.chooseCpuAction(o,{seed:3,step:o.revision});x.commit(a.id,o.revision,o.seat);}}
   const meta=r.newMetadata({mode:'cpu',human:'A',difficulty:'intermediate',cpuDeck:'partner',decks:{A:{id:null,name:'初期デッキ',cards:[...e.DEFAULT_DECK]},B:{id:null,name:'CPU こいびと・交際',cards:JSON.parse(x.save()).game.decks.B}}});
   return r.encodeMatch(x.save(),meta);});
  await page.evaluate(raw=>localStorage.setItem('naotocchi-cpu-match-v1',raw),oldRaw);
  await page.reload();await page.waitForSelector('#cpu-deck-mode');
  await page.selectOption('#match-mode','cpu').catch(()=>{});
  await page.click('#restore');await page.waitForSelector('#game:not([hidden])');
  await page.waitForTimeout(1500);
  const back=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')));
  results.oldSaveRestored=true;results.oldSaveLabel=back.cpuDeck;
  results.oldSaveKeepsEarlierList=await page.evaluate(async b=>(await import('./cpu-decks.mjs')).cpuDeckVersion('partner',b),back.game.decks.B);
  results.oldSaveLovers=back.game.decks.B.filter(id=>id.startsWith('P-')).length;
  results.oldSaveCommands=back.game.commands?.length??null;
  await page.screenshot({path:path.join(out,'old-save-restored.png')});
  results.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  results.pageErrors=errors;
 }finally{await browser?.close();srv.kill();}
 fs.writeFileSync(path.join(out,'ui-check.json'),JSON.stringify(results,null,1));console.log(JSON.stringify(results,null,1));
})();
