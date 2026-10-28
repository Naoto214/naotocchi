// Final iPhone-size browser check (390x844, touch) for the partner-deck change, before release:
// 指定 with either seat order, save/restore of a new-list match, 固定 reuses partner, おまかせ labels its seed,
// and a match saved with the earlier 10-lover list restores with its own 40 cards.
// Usage: node ui-final.cjs <outDir>   (NODE_PATH must reach a playwright install)
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const fs=require('fs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.argv[2]??'.'),port=8125,KEY='naotocchi-cpu-match-v1';
(async()=>{const srv=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const results={};let browser;
 try{browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const home=async()=>{await page.goto(`http://127.0.0.1:${port}/prototypes/card-game/`);await page.waitForSelector('#cpu-deck-mode');await page.selectOption('#match-mode','cpu').catch(()=>{});};
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const version=cards=>page.evaluate(async c=>(await import('./cpu-decks.mjs')).cpuDeckVersion('partner',c),cards);
  for(const human of ['A','B']){
   await home();await page.selectOption('#human-seat',human);await page.selectOption('#cpu-deck-mode','choose');await page.selectOption('#cpu-deck-type','partner');
   await page.click('#new');await page.waitForSelector('#game:not([hidden])');const s=await saved(),cpu=human==='A'?'B':'A';
   await home();await page.click('#restore');await page.waitForSelector('#game:not([hidden])');const back=await saved();
   results['human'+human]={cpuSeat:cpu,label:s.cpuDeck,list:await version(s.game.decks[cpu]),lovers:s.game.decks[cpu].filter(x=>x.startsWith('P-')).length,
    restored:true,restoredList:await version(back.game.decks[cpu]),restoredSameCards:JSON.stringify(back.game.decks[cpu])===JSON.stringify(s.game.decks[cpu])};
   if(human==='B')await page.screenshot({path:path.join(out,'cpu-first-partner.png')});
  }
  await home();await page.selectOption('#cpu-deck-mode','fixed');results.guideFixed=await page.$eval('#cpu-deck-guide',x=>x.textContent);
  await page.click('#new');await page.waitForSelector('#game:not([hidden])');{const s=await saved();results.fixed={label:s.cpuDeck,list:s.cpuDeck.id==='partner'?await version(s.game.decks.B):'not partner'};}
  await home();await page.selectOption('#cpu-deck-mode','auto');await page.click('#new');await page.waitForSelector('#game:not([hidden])');
  {const s=await saved();results.auto={label:s.cpuDeck,seedRecorded:Number.isSafeInteger(s.cpuDeck.seed)};}
  // earlier 10-lover list, saved mid-match in the app's own format
  await home();const oldRaw=await page.evaluate(async()=>{const e=await import('./engine.mjs'),d=await import('./cpu-decks.mjs'),s=await import('./cpu-session.mjs'),r=await import('./records-match.mjs'),p=await import('./cpu-policy.mjs');
   const old=[...d.CPU_DECK_HISTORY.partner[0].cards],label={mode:'choose',id:'partner',name:'こいびと・交際',seed:null};
   const x=new s.CpuSession({humanSeat:'A',difficulty:'beginner',policySeed:11,cpuDeck:label});x.start(e.createGame(4242,{A:[...e.DEFAULT_DECK],B:old}));
   for(let i=0;i<60&&!x.finished;i++){if(x.cpuPending)x.stepCpu(x.projection.revision);else{const o=x.decisionInput(),a=p.chooseCpuAction(o,{seed:5,step:o.revision});x.commit(a.id,o.revision,o.seat);}}
   const meta=r.newMetadata({mode:'cpu',human:'A',difficulty:'beginner',cpuDeck:'partner',decks:{A:{id:null,name:'初期デッキ',cards:[...e.DEFAULT_DECK]},B:{id:null,name:'CPU こいびと・交際',cards:JSON.parse(x.save()).game.decks.B}}});
   return r.encodeMatch(x.save(),meta);});
  await page.evaluate(([k,raw])=>localStorage.setItem(k,raw),[KEY,oldRaw]);
  await home();await page.click('#restore');await page.waitForSelector('#game:not([hidden])');await page.waitForTimeout(1500);
  {const b=await saved();results.oldSave={label:b.cpuDeck,difficulty:b.difficulty,list:await version(b.game.decks.B),lovers:b.game.decks.B.filter(x=>x.startsWith('P-')).length,commands:b.game.commands?.length??null};}
  await page.screenshot({path:path.join(out,'old-save-restored.png')});
  results.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  results.pageErrors=errors;
 }finally{await browser?.close();srv.kill();}
 fs.writeFileSync(path.join(out,'ui-final.json'),JSON.stringify(results,null,1));console.log(JSON.stringify(results,null,1));
})();
