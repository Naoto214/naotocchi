// 実画面（Chromium・タッチ・390×844）で、たこやきやさんの終了時の誘発の選択肢を確認する。
// 新しい版（hotseat-5）の途中保存では「→ たこやきやさん」（自分自身）が出ず、ほかの札を選んで進める。
// 旧保存（hotseat-4、修正前エンジンで作成）の同じ場面では、旧挙動のまま自分自身も選べる。
// 使い方: QA_URL=http://127.0.0.1:8767/ node ui-qa.cjs <出力ディレクトリ>
const {reveal,projection,actionButton}=require('../../tests/ui-browser-helpers.cjs');
const {chromium}=require('playwright');const fs=require('node:fs');
const URL_=process.env.QA_URL||'http://127.0.0.1:8767/',dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const prefix5=JSON.parse(fs.readFileSync(__dirname+'/../evidence/ui-prefix-hotseat5.json','utf8'));
const old=JSON.parse(fs.readFileSync(__dirname+'/../../tests/takoyaki-hotseat4-saves.json','utf8')).rows.find(r=>r.selfTargeted);
const prefix4={...old.save,commands:old.save.commands.slice(0,old.triggerRevision)};
(async()=>{const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={viewport:'390x844',cases:{}};let ok=true;
 async function open(save){await page.goto(URL_);await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),JSON.stringify(save));await page.goto(URL_);await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);}
 for(const [key,save] of [['hotseat-5',prefix5.save],['hotseat-4-old-save',prefix4]]){await open(save);const v=await projection(page);
  const tako=v.actions.filter(a=>a.kind==='trigger'&&a.label.startsWith('たこやきやさんの能力を発動'));
  const labels=[];for(const a of tako){const b=await actionButton(page,a);labels.push(b?(await b.innerText?.().catch(()=>a.label))??a.label:null);}
  await page.screenshot({path:`${dir}/${key}-trigger.png`});
  const self=tako.filter(a=>a.label.endsWith('→ たこやきやさん'));const r={version:save.version,choices:tako.map(a=>a.label),buttonsFound:labels.filter(Boolean).length,selfOffered:self.length>0};
  if(key==='hotseat-5'){const pick=tako.find(a=>!a.label.endsWith('→ たこやきやさん'));const b=await actionButton(page,pick);await b.click();await page.waitForTimeout(400);const confirm=page.locator('#confirm-dialog button',{hasText:'確定する'});if(await confirm.count()){await page.screenshot({path:`${dir}/${key}-confirm.png`});await confirm.click();}await page.waitForTimeout(500);const after=await projection(page);
   r.afterClick={revision:after.revision,takoyakiLeftPrepared:!Object.values(after.players).some(p=>(p.board?.prepared??[]).some(c=>c.id===prefix5.tako)),log:after.log?.slice?.(-2)};await page.screenshot({path:`${dir}/${key}-after.png`});
   if(r.selfOffered||tako.length<1||r.buttonsFound!==tako.length||!(after.revision>save.commands.length))ok=false;}
  else if(!r.selfOffered)ok=false;
  report.cases[key]=r;}
 report.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);report.pageErrors=errors;if(errors.length||report.horizontalOverflow)ok=false;
 report.ok=ok;fs.writeFileSync(`${dir}/ui-qa.json`,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report,null,1));await browser.close();process.exit(ok?0:1);})();
