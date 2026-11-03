// 実画面（Chromium・タッチ・390×844）で、かえるのおうちがえりの誘発の選択肢を確認する。
// 新しい版（hotseat-6）の途中保存では「→ かえるのおうちがえり」（自分自身）が出ず、ほかの札を選んで進める。
// 旧保存（hotseat-5、修正前エンジンで作成）の同じ場面では、旧挙動のまま自分自身も選べる。
// 使い方: QA_URL=http://127.0.0.1:8767/ node ui-qa.cjs <出力ディレクトリ>
const {reveal,projection,actionButton}=require('../../tests/ui-browser-helpers.cjs');
const {chromium}=require('playwright');const fs=require('node:fs');
const URL_=process.env.QA_URL||'http://127.0.0.1:8767/',dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const prefix6=JSON.parse(fs.readFileSync(__dirname+'/../evidence/ui-prefix-hotseat6.json','utf8'));
const old=JSON.parse(fs.readFileSync(__dirname+'/../../tests/frogger-hotseat5-saves.json','utf8')).rows.find(r=>r.selfTargeted);
const prefix5={...old.save,commands:old.save.commands.slice(0,old.triggerRevision)};
(async()=>{const e=await import('../../engine.mjs');
 // 同じ局面をエンジンで計算した、かえるの誘発の対象（画面では伏せ札のIDが伏せられるため、こちらで自分自身かを判定する）
 const engineTargets=save=>{const s=e.restore(JSON.stringify(save));return e.legalActions(s).filter(a=>a.kind==='trigger'&&s.cards[a.source]?.cardId==='G-frogger-road').map(a=>({self:a.target===a.source,target:s.cards[a.target]?.cardId}));};
 const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={viewport:'390x844',cases:{}};let ok=true;
 async function open(save){await page.goto(URL_);await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),JSON.stringify(save));await page.goto(URL_);await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);}
 for(const [key,save] of [['hotseat-6',prefix6.save],['hotseat-5-old-save',prefix5]]){await open(save);const v=await projection(page);
  const frogId=key==='hotseat-6'?prefix6.frog:v.actions.find(a=>a.kind==='trigger')?.source; // 旧保存の場面では、出ている誘発はかえるだけ
  const frogActs=v.actions.filter(a=>a.kind==='trigger'&&a.source===frogId);
  const labels=[];for(const a of frogActs){const b=await actionButton(page,a);labels.push(b?(await b.innerText?.().catch(()=>a.label))??a.label:null);}
  await page.screenshot({path:`${dir}/${key}-trigger.png`});
  const eng=engineTargets(save);const r={version:save.version,choices:frogActs.map(a=>a.label),buttonsFound:labels.filter(Boolean).length,engineTargets:eng,selfOffered:eng.some(t=>t.self),uiMatchesEngine:frogActs.length===eng.length};if(!r.uiMatchesEngine)ok=false;
  if(key==='hotseat-6'){const pick=frogActs.find(a=>a.target!==a.source);const b=await actionButton(page,pick);await b.click();await page.waitForTimeout(400);const confirm=page.locator('#confirm-dialog button',{hasText:'確定する'});if(await confirm.count()){await page.screenshot({path:`${dir}/${key}-confirm.png`});await confirm.click();}await page.waitForTimeout(500);const after=await projection(page);
   r.afterClick={revision:after.revision,frogLeftPrepared:!Object.values(after.players).some(p=>(p.board?.prepared??[]).some(c=>c.id===prefix6.frog)),log:after.log?.slice?.(-2)};await page.screenshot({path:`${dir}/${key}-after.png`});
   if(r.selfOffered||frogActs.length<1||r.buttonsFound!==frogActs.length||!(after.revision>save.commands.length))ok=false;}
  else if(!r.selfOffered)ok=false;
  report.cases[key]=r;}
 report.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);report.pageErrors=errors;if(errors.length||report.horizontalOverflow)ok=false;
 report.ok=ok;fs.writeFileSync(`${dir}/ui-qa.json`,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report,null,1));await browser.close();process.exit(ok?0:1);})();
