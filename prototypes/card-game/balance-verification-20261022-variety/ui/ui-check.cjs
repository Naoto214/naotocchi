// iPhone-size browser check of the CPU deck selector (390x844, touch). Serves the repo with `python3 -m http.server`.
// Usage: node ui-check.cjs <outDir>   (NODE_PATH must reach a playwright install)
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const fs=require('fs');
const root=path.resolve(__dirname,'../../../..'),out=path.resolve(process.argv[2]??'.'),port=8123;
(async()=>{const srv=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
 const results={};let browser;
 try{browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/prototypes/card-game/`);await page.waitForSelector('#cpu-deck-mode');
  results.defaultMode=await page.$eval('#cpu-deck-mode',x=>x.value);
  results.guideAuto=await page.$eval('#cpu-deck-guide',x=>x.textContent);
  results.cpuSeatSelectDisabled=await page.$eval('#select-deck-B',x=>x.disabled);
  await page.screenshot({path:path.join(out,'welcome-auto.png'),fullPage:false});
  await page.selectOption('#cpu-deck-mode','choose');results.typeVisible=await page.isVisible('#cpu-deck-type');
  await page.selectOption('#cpu-deck-type','challenge');results.guideChoose=await page.$eval('#cpu-deck-guide',x=>x.textContent);
  await page.locator('#cpu-deck-mode').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'welcome-choose.png')});
  // start a 指定 match: CPU seat B must hold exactly the chosen strategy deck
  await page.click('#new');await page.waitForSelector('#game:not([hidden])');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')));
  const deck=await page.evaluate(async()=>(await import('./cpu-decks.mjs')).cpuDeck('challenge').cards);
  results.chooseLabel=saved.cpuDeck;results.cpuSeatHasChosenDeck=JSON.stringify([...saved.game.decks.B].sort())===JSON.stringify([...deck].sort());
  results.deckNameHiddenDuringPlay=!(await page.content()).includes('CPUのデッキ：');
  await page.screenshot({path:path.join(out,'match-start.png')});
  // home -> fixed mode reuses the last CPU deck; restore keeps the label
  await page.reload();await page.waitForSelector('#cpu-deck-mode');
  await page.selectOption('#cpu-deck-mode','fixed');results.guideFixed=await page.$eval('#cpu-deck-guide',x=>x.textContent);
  await page.click('#restore');await page.waitForSelector('#game:not([hidden])');
  results.restoredLabel=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')).cpuDeck);
  await page.reload();await page.waitForSelector('#cpu-deck-mode');
  // おまかせ: label records the seed; mydeck keeps the previous behaviour (no label)
  await page.selectOption('#cpu-deck-mode','auto');await page.click('#new');await page.waitForSelector('#game:not([hidden])');
  results.autoLabel=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')).cpuDeck);
  await page.reload();await page.waitForSelector('#cpu-deck-mode');
  await page.selectOption('#cpu-deck-mode','mydeck');results.cpuSeatSelectDisabledMyDeck=await page.$eval('#select-deck-B',x=>x.disabled);
  await page.click('#new');await page.waitForSelector('#game:not([hidden])');results.mydeckLabel=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')).cpuDeck??null);
  results.prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-deck-pref-v1')));
  results.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  results.pageErrors=errors;
 }finally{await browser?.close();srv.kill();}
 fs.writeFileSync(path.join(out,'ui-check.json'),JSON.stringify(results,null,1));console.log(JSON.stringify(results,null,1));
})();
