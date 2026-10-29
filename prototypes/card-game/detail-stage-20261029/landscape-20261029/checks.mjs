// 横画面の追加確認: Safari のアドレスバー（高さ−50px）、セーフエリアの模擬（左右59px・下21px）、カードの拡大と戻り、拡大で状態が変わらないこと。
// 使い方: リポジトリ直下を配信し、node .../landscape-20261029/checks.mjs <出力dir>
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {LANDSCAPE,load,board,openCard,detail} from './capture.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
// env(safe-area-inset-*) は Chromium では 0 なので、正式CSSが env() を使う箇所を iPhone 横向きの値で置き換える
const SAFE='body.playing{padding:0 59px 21px 59px!important}#card-dialog.card-detail{left:calc(var(--ui-vleft,0px) + 59px + 8px)!important;width:calc(var(--ui-vw,100vw) - 118px - 16px)!important;height:calc(var(--ui-vh,100dvh) - 21px - 16px)!important}';
const CASES=[{scenario:'target',card:'C-chameleon'},{scenario:'many',card:'I-bowtie'},{scenario:'choice',card:'W-city'},{scenario:'response',card:'I-c_coin2'}];
const rows=[],fails=[];const check=(name,vp,ok,info)=>{rows.push({name,vp,ok,info});if(!ok)fails.push(name+' '+vp);process.stderr.write(`${ok?'PASS':'FAIL'} ${vp} ${name}\n`);};
const okBoard=b=>!b.clipped.length&&!b.pageScroll&&!b.overflowX&&!b.innerScrollers.length&&b.handVisible===b.handCards&&b.slotsInView===b.slots&&Object.values(b.regions).every(r=>!r||r.inView);
const okDetail=d=>d.wholeCardVisible&&!d.overflowX&&d.buttons.filter(b=>b.tap).length>=Math.min(3,d.buttons.length);
const saved=page=>page.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1'));
const browser=await chromium.launch();fs.mkdirSync(path.join(OUT,'checks'),{recursive:true});
for(const [w,h] of LANDSCAPE){
 // 667×375（SE・8）と 736×414（Plus）はホームボタンの機種で、横向きのセーフエリアは0。ノッチ・Dynamic Island の機種（844・852・932）だけで模擬する
 const notch=w>=844;
 for(const [cond,hh,safe] of [['通常',h,false],['アドレスバー表示',h-50,false],...(notch?[['セーフエリア',h,true],['アドレスバー＋セーフエリア',h-50,true]]:[])]){
  const vp=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:hh},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  for(const c of CASES){await load(page,c.scenario);if(safe){await page.addStyleTag({content:SAFE});await page.waitForTimeout(300);}
   const b=await page.evaluate(board);check(`${cond}：基本盤面がスクロールなしで全部見える（${c.scenario}）`,vp,okBoard(b),{clipped:b.clipped,innerScrollers:b.innerScrollers,hand:`${b.handVisible}/${b.handCards}`,minSlotH:b.minSlotH,pageScrollH:b.pageScrollH});
   if(c.scenario==='target'&&cond!=='通常')await page.screenshot({path:path.join(OUT,'checks',`${vp}-${cond}-board.jpg`),type:'jpeg',quality:62});
   await openCard(page,c.card);const d=await page.evaluate(detail);
   check(`${cond}：カード全体と操作ボタンが見える（${c.scenario}）`,vp,okDetail(d),{card:d.card,text:d.textPx,buttons:d.buttons.map(x=>x.tap)});
   if(c.scenario==='target'&&cond!=='通常')await page.screenshot({path:path.join(OUT,'checks',`${vp}-${cond}-detail.jpg`),type:'jpeg',quality:62});
   if(c.scenario==='target'&&cond==='通常'){
    // 拡大と戻り。拡大しても保存・盤面は変わらない
    const before=await saved(page);await page.locator('#card-dialog .stage-card').click();await page.waitForTimeout(350);const z=await page.evaluate(detail);
    await page.screenshot({path:path.join(OUT,'checks',`${vp}-zoom.jpg`),type:'jpeg',quality:62});
    check('カードを押すと拡大し、「－ 縮小」が出る',vp,z.card.w>d.card.w&&z.zoomChip?.includes('縮小'),{from:d.card,to:z.card,text:z.textPx});
    const sc=await page.evaluate(()=>{const s=document.querySelector('#card-dialog .stage-scroll');s.scrollTop=s.scrollHeight;return s.scrollTop>0;});
    check('拡大中はカードの部分だけスクロールして本文の下まで読める',vp,sc,{});
    await page.locator('#card-dialog .stage-zoom').click();await page.waitForTimeout(350);const back=await page.evaluate(detail);
    check('「－ 縮小」で全体表示に戻る',vp,back.wholeCardVisible&&back.card.w===d.card.w,{card:back.card});
    await page.locator('#card-dialog .stage-card').click();await page.waitForTimeout(300);await page.locator('#card-dialog .stage-card').click();await page.waitForTimeout(300);
    const again=await page.evaluate(detail);check('カードをもう一度押しても全体表示に戻る',vp,again.wholeCardVisible,{});
    check('拡大・縮小で保存データ（対戦状態）が変わらない',vp,before===await saved(page),{});
    await page.locator('#card-dialog [data-close]').click();await page.waitForTimeout(300);
    check('「盤面へ ×」で盤面に戻る',vp,!(await page.locator('#card-dialog[open]').count())&&okBoard(await page.evaluate(board)),{});
    // 開いたままアドレスバーが出入りしても全体表示を保つ
    await openCard(page,c.card);await page.setViewportSize({width:w,height:h-50});await page.waitForTimeout(400);const s1=await page.evaluate(detail);
    await page.setViewportSize({width:w,height:h});await page.waitForTimeout(400);const s2=await page.evaluate(detail);
    check('詳細を開いたままアドレスバーが出入りしても全体が見える',vp,okDetail(s1)&&okDetail(s2),{shown:s1.card,hidden:s2.card});
   }
   await page.keyboard.press('Escape');await page.waitForTimeout(200);}
  check(`${cond}：ページエラーなし`,vp,!errors.length,{errors});await ctx.close();}}
await browser.close();
fs.writeFileSync(path.join(OUT,'checks.json'),JSON.stringify({pass:rows.filter(r=>r.ok).length,total:rows.length,fails,rows},null,1)+'\n');
console.log(`${rows.filter(r=>r.ok).length}/${rows.length} PASS`,fails);
