// 本文を明確化した2枚のカード詳細を、スマホ幅（縦3種＋横1種、タッチ）の実画面で確認する（Chromium）。
// 配信用パッケージ（tools/pages/package.py の出力）を QA_URL で配信して使う。 使い方: node ui-qa.cjs <出力ディレクトリ>
const {reveal}=require('../../tests/ui-browser-helpers.cjs');
const {chromium}=require('playwright');const fs=require('node:fs');
const URL_=process.env.QA_URL||'http://127.0.0.1:8766/prototypes/card-game/',dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const CARDS=[['ルナランダー','解決時に自分の残り時がちょうど2なら、1枚引き、自分のそだち+5。','lunar'],
 ['サブマリン3D','山札の上から、選んだ数が0なら3枚、1なら5枚、2なら7枚を見る。','submarine']];
const OLD=[/(?<!解決時に)自分の残り時がちょうど2なら/,/3に選んだ数の2倍/];// 旧本文だけにある言い回し
const VIEWPORTS=[[320,568],[390,844],[430,932],[844,390]];
(async()=>{const browser=await chromium.launch({headless:true});const report={url:URL_,viewports:{}};let ok=true;
 for(const [w,h] of VIEWPORTS){const ctx=await browser.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const r={cards:{}};await page.goto(URL_);
  for(const [name,text,key] of CARDS){await page.goto(URL_);await page.locator('#my-decks-open').click();await page.waitForTimeout(300);
   if(!(await page.locator('#card-search').isVisible()))await page.locator('#deck-editor > summary').click();await page.locator('#card-search').fill(name);await page.waitForTimeout(300);
   await page.locator('#catalog-list [data-inspect],#catalog-list [data-browse],#catalog-list button').first().click();await page.waitForTimeout(400);
   const dlg=page.locator('#card-dialog');const open=await dlg.isVisible();const body=open?await dlg.innerText():'';
   const clip=await page.evaluate(()=>{const d=document.querySelector('#card-dialog');const els=[...d.querySelectorAll('.card-copy,.detail-ability,.ability-text,p')];return els.map(e=>({cls:e.className,clipped:e.scrollHeight>e.clientHeight+1&&getComputedStyle(e).overflowY!=='visible'})).filter(x=>x.clipped);});
   const overflowX=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   await page.screenshot({path:`${dir}/${key}-${w}x${h}.png`});
   const c={open,newText:body.replace(/\s/g,'').includes(text.replace(/\s/g,'')),oldText:OLD.some(t=>t.test(body)),overflowX,clippedScrollAreas:clip.length};r.cards[key]=c;
   if(!open||!c.newText||c.oldText||overflowX)ok=false;}
  r.pageErrors=errors;if(errors.length)ok=false;report.viewports[`${w}x${h}`]=r;await ctx.close();}
 // 旧保存（hotseat-2、ぴょんぴょんジャンプ旧効果の試合）が今まで通り開ける
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});const page=await ctx.newPage();
 const old=JSON.parse(fs.readFileSync(__dirname+'/../../tests/doodle-jump-hotseat2-saves.json','utf8')).rows[0].save;
 await page.goto(URL_);await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),JSON.stringify(old));await page.goto(URL_);await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);
 report.oldSave={version:old.version,result:await page.locator('#result').count()>0};await page.screenshot({path:`${dir}/old-save-hotseat2-390x844.png`});if(!report.oldSave.result)ok=false;
 await browser.close();report.ok=ok;fs.writeFileSync(`${dir}/ui-qa.json`,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report,null,1));process.exit(ok?0:1);})();
