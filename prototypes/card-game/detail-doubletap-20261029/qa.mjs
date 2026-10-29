// カード詳細のダブルタップ拡大・縮小のブラウザQA（Chromium・iPhone相当のタッチ・モバイル表示）。
// シングルタップ・ダブルタップ・ゆっくり2回・離れた2回・2本指タッチ・ピンチ・ボタン・閉じる・キーボードを区別して確かめる。
// 使い方: リポジトリ直下を 8765 で配信し、node prototypes/card-game/detail-doubletap-20261029/qa.mjs [出力dir]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {load,openCard} from '../detail-stage-20261029/landscape-20261029/capture.mjs';
import {restore} from '../engine.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
const VIEWPORTS=(process.env.QA_VIEWPORTS??'390x844,320x568,844x390,852x393,932x430,667x375').split(',').map(v=>v.split('x').map(Number));
const rows=[];const check=(name,vp,ok,info={})=>{rows.push({name,vp,ok:!!ok,info});process.stderr.write(`${ok?'PASS':'FAIL'} ${vp} ${name} ${JSON.stringify(info).slice(0,200)}\n`);};
const saved=page=>page.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1'));
const state=page=>page.evaluate(()=>{const d=document.querySelector('#card-dialog'),c=d?.querySelector('.stage-card'),r=c?.getBoundingClientRect(),chip=d?.querySelector('.stage-zoom');
 return {open:!!d?.open,zoom:d?.dataset.stageZoom==='1',w:r?Math.round(r.width):0,chip:chip&&!chip.hidden?chip.textContent:null,scale:visualViewport.scale,
  confirm:!!document.querySelector('#confirm-dialog[open]'),selection:String(getSelection()).length};});
const center=async page=>page.evaluate(()=>{const r=document.querySelector('#card-dialog .stage-card').getBoundingClientRect(),s=document.querySelector('#card-dialog .stage-scroll').getBoundingClientRect();
 const top=Math.max(r.top,s.top),bottom=Math.min(r.bottom,s.bottom);return {x:Math.round((Math.max(r.left,s.left)+Math.min(r.right,s.right))/2),y:Math.round(top+(bottom-top)*.35)};});
const tap=async(page,p)=>{await page.touchscreen.tap(p.x,p.y);};
const doubleTap=async(page,p,gap=90,q=p)=>{await tap(page,p);await page.waitForTimeout(gap);await tap(page,q);await page.waitForTimeout(350);};
// 2本指のタッチ（CDP）: 押して離す（指は動かさない）
async function twoFinger(cdp,p){const pts=[{x:p.x-20,y:p.y,id:1},{x:p.x+20,y:p.y,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
// ピンチ（CDP）: 2本の指の間隔を from → to px へ、steps 回に分けて動かす。中心 p
async function pinch(cdp,p,from,to,steps=8){const pts=d=>[{x:p.x-d/2,y:p.y,id:1},{x:p.x+d/2,y:p.y,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pts(from)});
 for(let i=1;i<=steps;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pts(from+(to-from)*i/steps)});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
// 拡大・縮小のアニメーション（実行中のものの長さ）
const anim=page=>page.evaluate(()=>(document.querySelector('#card-dialog .stage-card')?.getAnimations()??[]).map(a=>a.effect.getTiming().duration));
// 指の位置のカード上の点が、拡大後も指の下にあるか（スクロールの端で動かせない時は除く）
const pointKept=(page,f,at)=>page.evaluate(({f,at})=>{const c=document.querySelector('#card-dialog .stage-card').getBoundingClientRect(),s=document.querySelector('#card-dialog .stage-scroll');
 const dx=c.left+f.x*c.width-at.x,dy=c.top+f.y*c.height-at.y,edgeX=s.scrollLeft<=0||s.scrollLeft>=s.scrollWidth-s.clientWidth-1,edgeY=s.scrollTop<=0||s.scrollTop>=s.scrollHeight-s.clientHeight-1;
 return {dx:Math.round(dx),dy:Math.round(dy),ok:(Math.abs(dx)<=3||edgeX)&&(Math.abs(dy)<=3||edgeY)};},{f,at});
const fractionAt=(page,at)=>page.evaluate(at=>{const c=document.querySelector('#card-dialog .stage-card').getBoundingClientRect();return {x:(at.x-c.left)/c.width,y:(at.y-c.top)/c.height};},at);
const browser=await chromium.launch();fs.mkdirSync(path.join(OUT,'screenshots'),{recursive:true});
for(const [w,h] of VIEWPORTS){const vp=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:3,isMobile:true,hasTouch:true}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await load(page,'target');await openCard(page,'C-chameleon');const s0=await saved(page),a=await state(page),p=await center(page);
 // 1) シングルタップ: 拡大しない・閉じない・状態不変
 await tap(page,p);await page.waitForTimeout(500);const b=await state(page);
 check('シングルタップでは拡大しない（詳細は開いたまま・保存不変）',vp,b.open&&!b.zoom&&b.w===a.w&&!b.confirm&&await saved(page)===s0,{before:a.w,after:b.w});
 // 2) ダブルタップで拡大（拡大のアニメーション・指の位置）
 const fp=await fractionAt(page,p);await tap(page,p);await page.waitForTimeout(90);await tap(page,p);const an1=await anim(page);await page.waitForTimeout(350);const c=await state(page);
 check('通常のダブルタップ：拡大は約0.26秒のアニメーション',vp,an1.length===1&&an1[0]>=200&&an1[0]<=300,{durations:an1});
 const kept=await pointKept(page,fp,p);check('通常のダブルタップ：タップした位置のカードが指の下に残る（スクロール端を除く）',vp,kept.ok,kept);
 await page.screenshot({path:path.join(OUT,'screenshots',`${vp}-zoom.jpg`),type:'jpeg',quality:60});
 check('ダブルタップで拡大する',vp,c.open&&c.zoom&&c.w>a.w*1.2&&!c.confirm,{from:a.w,to:c.w,chip:c.chip});
 check('拡大で保存データ・対戦状態が変わらない／ページ全体はズームしない／文字が選択されない',vp,await saved(page)===s0&&c.scale===1&&c.selection===0,{scale:c.scale,selection:c.selection});
 // 3) 拡大中も「盤面へ ×」が押せる位置にある
 const closeOk=await page.evaluate(()=>{const b=document.querySelector('#card-dialog [data-close]'),r=b.getBoundingClientRect(),n=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return !!n&&b.contains(n)&&r.height>=44;});
 check('拡大中も「盤面へ ×」が押せる',vp,closeOk);
 // 4) 拡大中にダブルタップで元の大きさへ
 const p2=await center(page);await tap(page,p2);await page.waitForTimeout(90);await tap(page,p2);const an2=await anim(page);await page.waitForTimeout(350);const d=await state(page);
 check('通常のダブルタップ：縮小も拡大と同じ約0.26秒のアニメーション',vp,an2.length===1&&an2[0]>=200&&an2[0]<=300,{durations:an2});
 check('拡大中のダブルタップで元の大きさに戻る',vp,d.open&&!d.zoom&&d.w===a.w&&await saved(page)===s0,{w:d.w});
 // 5) ゆっくり2回（0.6秒間隔）・離れた2か所の2回は拡大しない
 await doubleTap(page,p,600);const e1=await state(page);
 check('ゆっくり2回タップ（0.6秒間隔）では拡大しない',vp,!e1.zoom&&e1.w===a.w);
 await doubleTap(page,{x:p.x-50,y:p.y-60},90,{x:p.x+50,y:p.y+60});const e2=await state(page);
 check('離れた2か所の連続タップでは拡大しない',vp,!e2.zoom&&e2.w===a.w);
 // 6) 2本指のタッチ（ピンチの始まり）を2回続けても拡大しない
 await twoFinger(cdp,p);await page.waitForTimeout(80);await twoFinger(cdp,p);await page.waitForTimeout(400);const f=await state(page);
 check('2本指のタッチ（ピンチ）はダブルタップと見なさない',vp,f.open&&!f.zoom&&f.w===a.w&&await saved(page)===s0);
 // 6b) ピンチアウトでカードを拡大 → ダブルタップで元の大きさ（通常のダブルタップとは別の項目）
 const pp=await center(page),fpp=await fractionAt(page,pp);await pinch(cdp,pp,60,130);const anp=await anim(page);await page.waitForTimeout(350);const pz1=await state(page);
 check('ピンチアウト：カード自体が拡大し、ページ全体はズームしない（保存不変）',vp,pz1.zoom&&pz1.w>a.w*1.5&&pz1.scale===1&&await saved(page)===s0,{from:a.w,to:pz1.w,scale:pz1.scale});
 const keptP=await pointKept(page,fpp,pp);check('ピンチアウト：指の間のカードの位置が保たれ、指を離しても位置が飛ばない',vp,keptP.ok&&anp.length<=1,{...keptP,durations:anp});
 const pq=await center(page);await tap(page,pq);await page.waitForTimeout(90);await tap(page,pq);const anq=await anim(page);await page.waitForTimeout(350);const pz2=await state(page);
 check('ピンチアウト後のダブルタップ：さらに拡大せず、元の大きさに戻る（アニメーションあり）',vp,!pz2.zoom&&pz2.w===a.w&&anq.length===1&&await saved(page)===s0,{w:pz2.w,durations:anq});
 await tap(page,pq);await page.waitForTimeout(90);await tap(page,pq);await page.waitForTimeout(350);const pz3=await state(page);
 check('ピンチ後に戻した後も、通常のダブルタップで拡大する（状態が食い違わない）',vp,pz3.zoom&&pz3.w>a.w*1.2,{w:pz3.w});
 const pr=await center(page);await pinch(cdp,pr,200,60);await page.waitForTimeout(350);const pz4=await state(page);
 check('ピンチインで元の大きさまで戻る（それ以上は小さくならない）',vp,!pz4.zoom&&pz4.w===a.w,{w:pz4.w});
 // 7) キーボード（Enter）でも拡大・縮小できる
 await page.focus('#card-dialog .stage-card');await page.keyboard.press('Enter');await page.waitForTimeout(250);const k1=await state(page);await page.keyboard.press('Enter');await page.waitForTimeout(250);const k2=await state(page);
 check('キーボード（Enter）の拡大・縮小は従来どおり',vp,k1.zoom&&!k2.zoom&&k2.w===a.w);
 // 8) 拡大中に閉じる → 次に開くと通常表示
 await doubleTap(page,p);const z=await state(page);await page.locator('#card-dialog [data-close]').tap();await page.waitForTimeout(300);const closed=!(await state(page)).open;
 await openCard(page,'C-chameleon');const g=await state(page);
 check('拡大中に「盤面へ ×」で閉じられ、次に開くと通常表示',vp,z.zoom&&closed&&g.open&&!g.zoom&&g.w===a.w&&await saved(page)===s0);
 // 9) 縦画面の「＋ 拡大／－ 縮小」ボタン（出ている時）は1回で切り替わる
 if(w<h){await doubleTap(page,p);const y=await state(page);const chipOk=y.chip==='－ 縮小';if(chipOk){await page.locator('#card-dialog .stage-zoom').tap();await page.waitForTimeout(300);}const y2=await state(page);
  check('縦画面：拡大中は「－ 縮小」ボタンでも戻れる',vp,chipOk&&!y2.zoom&&y2.w===a.w,{chip:y.chip});}
 // 10) ダブルタップ・拡大の後でも、操作ボタンは1回のタップで正しく働く（3択の2番目 → なかま②と入れ替え）
 await doubleTap(page,p);await doubleTap(page,p);
 const btn=page.locator('#card-dialog [data-action]').nth(1);const label=await btn.innerText();await btn.tap();await page.waitForTimeout(350);
 if(await page.locator('#confirm-dialog[open]').count()){await page.locator('#confirm-dialog [data-confirm]').tap();await page.waitForTimeout(500);}
 // 正式エンジンで確認: なかま②のカードだけが外れ、カメレオンが場に出る（1回だけ実行）
 const eng=raw=>{const {recordsMeta,...x}=JSON.parse(raw);return restore(JSON.stringify(x.game??x));},ids=s=>s.players.A.board.companions.map(x=>x?.id??x);
 const was=ids(eng(s0)),now=ids(eng(await saved(page)));
 check('拡大・縮小の後でも操作ボタンは1回のタップで正しく実行される（3択の2番目＝なかま②と入れ替え）',vp,/なかま②/.test(label)&&!now.includes(was[1])&&now.includes(was[0])&&now.includes(was[2])&&now.length===3,{label:label.replace(/\n/g,' / '),was,now});
 // 11) 盤面：手札カードの1回タップで詳細が開く（従来どおり）。手札カードのダブルタップでも状態は変わらない
 await load(page,'normal');const s1=await saved(page);
 const hand=page.locator('#hand [data-inspect]').first();await hand.scrollIntoViewIfNeeded();const hb=await hand.boundingBox();
 await page.touchscreen.tap(hb.x+hb.width/2,hb.y+hb.height/2);await page.waitForTimeout(400);const h1=await state(page);
 check('盤面：手札カードの1回タップで詳細が開く（従来どおり）',vp,h1.open&&!h1.zoom);
 await page.keyboard.press('Escape');await page.waitForTimeout(300);
 await page.touchscreen.tap(hb.x+hb.width/2,hb.y+hb.height/2);await page.waitForTimeout(90);await page.touchscreen.tap(hb.x+hb.width/2,hb.y+hb.height/2);await page.waitForTimeout(500);const h2=await state(page);
 check('盤面：手札カードのダブルタップでも対戦状態は変わらない',vp,!h2.confirm&&await saved(page)===s1,{open:h2.open,zoom:h2.zoom});
 // 12) ピンチ（ページ全体の拡大）は従来どおり使える
 if(h2.open){await page.keyboard.press('Escape');await page.waitForTimeout(300);}
 await openCard(page,'C-monkey').catch(()=>{});const q=await center(page).catch(()=>({x:w/2,y:h/2}));
 // カードの外（盤面など）では Safari 標準のピンチ（ページ全体の拡大）を妨げない: viewport にズーム禁止がなく、
 // 盤面の touch-action がピンチを許し、2本指のタッチを打ち消さない（Chromium のヘッドレスはページ全体のピンチ自体は再現できない）
 await page.keyboard.press('Escape');await page.waitForTimeout(300);
 const pinchOk=await page.evaluate(()=>{const acts=[];for(let n=document.body;n&&n.nodeType===1;n=n.parentElement)acts.push(getComputedStyle(n).touchAction);
  const meta=document.querySelector('meta[name=viewport]')?.content??'';window.__blocked=0;for(const t of ['touchstart','touchmove'])addEventListener(t,e=>{if(e.defaultPrevented)window.__blocked++;},{passive:true});
  return {acts:[...new Set(acts)],allows:acts.every(a=>['auto','manipulation'].includes(a)||a.includes('pinch-zoom')),meta,metaOk:!/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(meta)};});
 await twoFinger(cdp,{x:Math.round(w/2),y:Math.round(h/3)});await page.waitForTimeout(200);const blocked=await page.evaluate(()=>window.__blocked);
 check('カードの外では Safari 標準のピンチを妨げない（viewport・touch-action・2本指を打ち消さない）',vp,pinchOk.allows&&pinchOk.metaOk&&blocked===0&&await saved(page)===s1,{acts:pinchOk.acts,meta:pinchOk.meta,blocked});
 check('ページ内エラーなし',vp,!errors.length,{errors});
 await ctx.close();}
await browser.close();
const summary={total:rows.length,pass:rows.filter(r=>r.ok).length};
fs.writeFileSync(path.join(OUT,'qa-results.json'),JSON.stringify({summary,rows},null,1)+'\n');console.log(JSON.stringify(summary));
