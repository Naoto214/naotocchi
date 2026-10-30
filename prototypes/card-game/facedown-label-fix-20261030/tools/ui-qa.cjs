// 実画面（Chromium・タッチ・390×844、2人対戦）で、伏せ札の表示を持ち主と相手で比べる。
// 局面：手番の席（持ち主）がボンバーの誘発を持ち、相手も同じ名前の札（ボンバー）を伏せている。
// 使い方: QA_URL=http://127.0.0.1:8768/ node ui-qa.cjs <出力ディレクトリ>
const {reveal,projection,actionButton}=require('../../tests/ui-browser-helpers.cjs');
const {chromium}=require('playwright');const fs=require('node:fs');
const URL_=process.env.QA_URL||'http://127.0.0.1:8768/',dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const prefix=JSON.parse(fs.readFileSync(__dirname+'/../evidence/ui-prefix.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={viewport:'390x844',owner:prefix.seat,steps:[]};
 await page.goto(URL_);await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),JSON.stringify(prefix.save));await page.goto(URL_);
 await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);
 const panel=async()=>page.locator('#operation-panel').innerText().catch(()=>'');
 const step=async(name)=>{const v=await projection(page);report.steps.push({name,actor:v.actor,actions:v.actions.map(a=>a.label),chain:v.chain.map(c=>c.name+(c.target?' → '+c.target:'')),prepared:Object.fromEntries(Object.entries(v.players).map(([k,p])=>[k,(p.board?.prepared??[]).map(c=>c.name)])),panel:(await panel()).slice(0,600)});await page.screenshot({path:`${dir}/${name}.png`});return v;};
 let v=await step('1-owner-trigger');
 const trig=v.actions.find(a=>a.kind==='trigger'&&a.source===prefix.bomb);await (await actionButton(page,trig)).click();await page.waitForTimeout(400);
 v=await step('2-owner-own-target');
 const own=v.actions.find(a=>a.kind==='choose'&&!/取りやめ|確定/.test(a.label)&&!a.label.includes('しかけたカード'))??v.actions.find(a=>a.kind==='choose'&&!/取りやめ|確定/.test(a.label));await (await actionButton(page,own)).click();await page.waitForTimeout(400);
 v=await step('3-owner-opponent-target');
 const opp=v.actions.find(a=>a.kind==='choose'&&!/取りやめ|確定/.test(a.label));await (await actionButton(page,opp)).click();await page.waitForTimeout(400);
 const confirm=page.locator('#confirm-dialog button',{hasText:'確定する'});if(await confirm.count()&&await confirm.isVisible())await confirm.click();await page.waitForTimeout(600);
 // 持ち主のもう1枚の誘発は見送り、相手の応答の番まで進める
 for(let i=0;i<6;i++){v=await projection(page);if(v.actor!==prefix.seat)break;const skip=v.actions.find(a=>a.kind==='skip')??v.actions.find(a=>a.kind==='pass');if(!skip)break;await (await actionButton(page,skip)).click();await page.waitForTimeout(400);if(await confirm.count()&&await confirm.isVisible())await confirm.click();await page.waitForTimeout(400);}
 await page.screenshot({path:`${dir}/4-handover.png`});await reveal(page);await page.waitForTimeout(400);
 v=await step('5-opponent-view');
 report.pageErrors=errors;report.horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 fs.writeFileSync(`${dir}/ui-qa.json`,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report,null,1));await browser.close();})();
