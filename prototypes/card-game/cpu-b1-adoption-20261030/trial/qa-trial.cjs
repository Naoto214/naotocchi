// Browser QA of the B1 trial build (Chromium, 390x844, touch). Usage: node qa-trial.cjs <url> <out.json> <shotDir>
const {chromium}=require('playwright');const fs=require('fs');
const [url,out,shots]=process.argv.slice(2);
(async()=>{
 const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const R={errors,scenarios:[],restore:null,newGames:[],storageKeys:null};
 // Read through the page's own (wrapped) API: getItem('naotocchi-cpu-match-v1') adds the trial prefix.
 const save=()=>page.evaluate(()=>{const r=localStorage.getItem('naotocchi-cpu-match-v1');return r?JSON.parse(r):null;});
 const lastVariant=d=>{const c=(d?.game?.commands??[]).map(x=>{try{return JSON.parse(x);}catch{return null;}}).filter(x=>x&&x.variant!=null);return c.length?c.at(-1).variant:null;};
 const reveal=async()=>{for(let i=0;i<20;i++){const v=await page.locator('#reveal').isVisible().catch(()=>false);if(v){await page.locator('#reveal').tap();return true;}await page.waitForTimeout(150);}return false;};
 const toWelcome=async()=>{await page.goto(url);await page.waitForTimeout(400);const solo=page.locator('#solo-open');if(await solo.isVisible().catch(()=>false))await solo.tap();await page.waitForTimeout(200);};
 await toWelcome();await page.screenshot({path:`${shots}/01-start.png`});
 const data=JSON.parse(fs.readFileSync(require('path').join(__dirname,'scenarios.json'),'utf8')).scenarios;
 for(const s of data)for(const policy of ['heuristic-2','heuristic-1']){
  await toWelcome();const before=s.saves[policy]?JSON.parse(s.saves[policy]).game.commands.length:0;
  await page.locator(`button[data-trial-load="${s.key}"][data-policy="${policy}"]`).tap();await reveal();
  let d=null;for(let i=0;i<40;i++){await page.waitForTimeout(250);d=await save();if(d&&d.game.commands.length>before)break;}
  await page.waitForTimeout(700);const badge=await page.locator('.trial-badge').textContent().catch(()=>null);
  R.scenarios.push({key:s.key,policy,savedPolicy:d?.policy,cpuMoved:(d?.game.commands.length??0)>before,chosen:lastVariant(d),expected:s.expected[policy],badge});
  if(s.key==='ski:power')await page.screenshot({path:`${shots}/02-${s.key.replace(/:/g,'-')}-${policy}.png`});
 }
 // restore: open the heuristic-1 scenario, reload the page, resume from 「保存した対戦に戻る」
 await toWelcome();await page.locator('button[data-trial-load="fight:wisdom:opp"][data-policy="heuristic-1"]').tap();await reveal();await page.waitForTimeout(1500);
 const a=await save();await toWelcome();
 await page.selectOption('#match-mode','cpu').catch(()=>{});await page.locator('#restore').tap();await reveal();await page.waitForTimeout(1500);
 const b=await save();R.restore={beforeReload:{policy:a?.policy,commands:a?.game.commands.length},afterResume:{policy:b?.policy,commands:b?.game.commands.length},gameVisible:await page.locator('#game').isVisible()};
 await page.screenshot({path:`${shots}/03-restored-heuristic-1.png`});
 // new games, both difficulties
 for(const level of ['beginner','intermediate']){
  await toWelcome();await page.selectOption('#match-mode','cpu').catch(()=>{});await page.selectOption('#cpu-level',level);await page.locator('#new').tap();await reveal();await page.waitForTimeout(2500);
  const d=await save();R.newGames.push({level,policy:d?.policy,difficulty:d?.difficulty,gameVisible:await page.locator('#game').isVisible(),commands:d?.game.commands.length??0});
  await page.screenshot({path:`${shots}/04-new-${level}.png`});
 }
 R.storageKeys=await page.evaluate(()=>{const k=[];for(let i=0;i<localStorage.length;i++)k.push(localStorage.key(i));return k;});
 fs.writeFileSync(out,JSON.stringify(R,null,1));await browser.close();
 console.log(JSON.stringify({errors:errors.length,scenarios:R.scenarios.map(x=>`${x.key} ${x.policy} moved=${x.cpuMoved} chosen=${x.chosen} saved=${x.savedPolicy}`),restore:R.restore,newGames:R.newGames,keys:R.storageKeys},null,1));
})().catch(e=>{console.error(e);process.exit(1);});
