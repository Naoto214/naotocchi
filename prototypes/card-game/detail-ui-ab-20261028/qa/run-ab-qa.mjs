// A/B 比較の実画面QA（Chromium・タッチ・モバイル表示）。試遊版を実際に操作して測る。
// 使い方: 試遊版を build-trial.mjs で組み立てて配信し、
//   QA_BASE=http://127.0.0.1:8766/trial/index.html node prototypes/card-game/detail-ui-ab-20261028/qa/run-ab-qa.mjs [出力dir]
// 測るもの（同じ場面・同じカード・同じ画面幅で 現行 / A案 / B案）:
//  - 初期表示で読める本文の行の割合（行ごとに「画面内・枠内・他の要素に隠れていない」を elementFromPoint で判定）
//  - 全文を読むのに必要なスクロール量と、スクロールできる枠の数（二重スクロール）
//  - 操作ボタンが初期表示でそのまま押せるか（中心点が最前面で画面内か）、高さ44px以上か
//  - 横はみ出し
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
const BASE=process.env.QA_BASE??'http://127.0.0.1:8766/trial/index.html';
export const VIEWPORTS=[[320,568],[375,667],[390,844],[430,932],[844,390]];
export const VARIANTS=['current','a','b','a2'];
// 場面と、詳細を開くカード（手札のカードID）。
export const CASES=[
 {key:'choice-long',scenario:'choice',card:'W-city',mode:'cpu'},
 {key:'choice-short',scenario:'choice',card:'M-starfish-01',mode:'cpu'},
 {key:'normal-long',scenario:'normal',card:'C-monkey',mode:'cpu'},
 {key:'normal-short',scenario:'normal',card:'M-starfish-01',mode:'cpu'},
 {key:'response',scenario:'response',card:'I-c_coin2',mode:'cpu'},
 {key:'target',scenario:'target',card:'C-chameleon',mode:'cpu'},
 {key:'choice-long-hotseat',scenario:'choice',card:'W-city',mode:'hotseat'},
 {key:'normal-long-hotseat',scenario:'normal',card:'C-monkey',mode:'hotseat'},
];

export async function openCase(page,{scenario,card,mode},variant){
 await page.goto(`${BASE}?variant=${variant}`);await page.waitForSelector('#trial-panel');
 await page.evaluate(()=>{for(const k of Object.keys(localStorage))localStorage.removeItem(k);});
 await page.click(`[data-trial-load="${scenario}"][data-mode="${mode}"]`);
 await page.waitForTimeout(400);
 if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 const id=await page.evaluate(card=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.split(':')[1]===card),card);
 if(!id)throw Error('手札にありません: '+card);
 const hand=page.locator(`#hand [data-inspect="${id}"]`).first();await hand.scrollIntoViewIfNeeded();await hand.click({force:true});
 await page.waitForSelector('#card-dialog[open]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);
 return id;
}

// 詳細の状態を測る（ページ内で実行）。
export const measure=()=>{
 const d=document.querySelector('#card-dialog'),W=innerWidth,H=innerHeight;
 const p=d.querySelector('.effect-scroll .full-effect')??d.querySelector('.effect-scroll p');
 const visibleAt=(x,y,owner)=>{if(x<0||y<0||x>=W||y>=H)return false;const n=document.elementFromPoint(x,y);return !!n&&(owner.contains(n)||n===owner);};
 const lines=[];
 if(p){const r=document.createRange();r.selectNodeContents(p);
  const rects=[...r.getClientRects()].filter(q=>q.width>1&&q.height>1);
  // 同じ行の断片はまとめる
  for(const q of rects){const last=lines.at(-1);if(last&&Math.abs(last.top-q.top)<2){last.right=Math.max(last.right,q.right);last.left=Math.min(last.left,q.left);}else lines.push({top:q.top,bottom:q.bottom,left:q.left,right:q.right});}
 }
 const lineVisible=l=>visibleAt(Math.min(l.left+8,(l.left+l.right)/2),(l.top+l.bottom)/2,p);
 const visibleLines=lines.filter(lineVisible).length;
 const scrollers=[...d.querySelectorAll('*')].concat([d]).filter(n=>{const cs=getComputedStyle(n);return /(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+1;});
 const describe=n=>n===d?'dialog':(n.className&&typeof n.className==='string'?'.'+n.className.split(' ')[0]:n.tagName.toLowerCase());
 const buttons=[...d.querySelectorAll('.detail-command button[data-action]')].map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent.trim().slice(0,40),kind:b.dataset.kind,h:Math.round(r.height),w:Math.round(r.width),top:Math.round(r.top),bottom:Math.round(r.bottom),tappable:visibleAt((r.left+r.right)/2,(r.top+r.bottom)/2,b)};});
 const close=d.querySelector('[data-close]').getBoundingClientRect();
 const dr=d.getBoundingClientRect(),art=d.querySelector('.detail-image').getBoundingClientRect();
 const overflowX=[...d.querySelectorAll('*')].some(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.right>W+1||r.left<-1);})||document.documentElement.scrollWidth>W+1;
 // 下部操作帯の高さ、ボタン同士の最小間隔（誤タップの目安）、カード画像の見えている面積
 const cmd=d.querySelector('.detail-command'),cmdH=cmd?Math.round(cmd.getBoundingClientRect().height):0;
 const br=[...d.querySelectorAll('.detail-command button[data-action]')].map(b=>b.getBoundingClientRect());
 let minGap=null;for(let i=0;i<br.length;i++)for(let j=i+1;j<br.length;j++){const a=br[i],b=br[j];const gx=Math.max(b.left-a.right,a.left-b.right),gy=Math.max(b.top-a.bottom,a.top-b.bottom);const g=Math.max(gx,gy);minGap=minGap===null?g:Math.min(minGap,g);}
 const artVisible=Math.max(0,Math.min(art.bottom,H)-Math.max(art.top,0))*Math.max(0,Math.min(art.right,W)-Math.max(art.left,0));
 const fs=p?parseFloat(getComputedStyle(p).fontSize):null,lh=p?parseFloat(getComputedStyle(p).lineHeight):null;
 return {lines:lines.length,visibleLines,ratio:lines.length?+(visibleLines/lines.length).toFixed(3):null,
  textFontPx:fs,lineHeightPx:lh,scrollers:scrollers.map(n=>({el:describe(n),client:n.clientHeight,scroll:n.scrollHeight})),
  buttons,buttonsTappable:buttons.filter(b=>b.tappable).length,buttonsMin44:buttons.every(b=>b.h>=44),
  closeTappable:visibleAt((close.left+close.right)/2,(close.top+close.bottom)/2,d.querySelector('[data-close]')),
  dialog:{top:Math.round(dr.top),bottom:Math.round(dr.bottom),left:Math.round(dr.left),right:Math.round(dr.right)},art:{w:Math.round(art.width),h:Math.round(art.height),top:Math.round(art.top),visible:art.bottom>0&&art.top<H},
  overflowX,variant:document.documentElement.dataset.detailVariant??'current',commandH:cmdH,commandRatio:+(cmdH/H).toFixed(3),minButtonGap:minGap===null?null:Math.round(minGap),artArea:Math.round(art.width*art.height),artVisibleArea:Math.round(artVisible),buttonsVisible:buttons.filter(b=>b.top>=0&&b.bottom<=H).length};
};

// 全文を最後まで読むためのスクロール（本文の最終行が見えるまで、内側→外側の順に1つずつスクロールする）。
export async function readToEnd(page){
 return page.evaluate(async()=>{
  const d=document.querySelector('#card-dialog'),p=d.querySelector('.effect-scroll .full-effect')??d.querySelector('.effect-scroll p');if(!p)return null;
  const W=innerWidth,H=innerHeight;
  const lastVisible=()=>{const r=document.createRange();r.selectNodeContents(p);const q=[...r.getClientRects()].filter(x=>x.height>1).at(-1);const n=document.elementFromPoint(Math.min(q.left+8,W-1),(q.top+q.bottom)/2);return q.top>=0&&q.bottom<=H&&!!n&&p.contains(n);};
  const chain=[];for(let n=p.parentElement;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(/(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+1)chain.push(n);}
  const used=[];let px=0;
  for(const n of chain){if(lastVisible())break;const before=n.scrollTop;
   for(let i=0;i<60&&!lastVisible()&&n.scrollTop<n.scrollHeight-n.clientHeight;i++){n.scrollTop+=12;await new Promise(r=>requestAnimationFrame(r));}
   if(n.scrollTop!==before){used.push(n.className.split?.(' ')[0]||n.tagName);px+=n.scrollTop-before;}}
  const buttons=[...d.querySelectorAll('.detail-command button[data-action]')].map(b=>{const r=b.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;const n=y>=0&&y<H?document.elementFromPoint(x,y):null;return !!n&&b.contains(n);});
  return {fullyRead:lastVisible(),scrollContainersUsed:used,scrollPx:Math.round(px),buttonsTappableAfter:buttons.filter(Boolean).length,buttons:buttons.length};
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const browser=await chromium.launch(),results=[];
 for(const [w,h] of VIEWPORTS){
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  for(const c of CASES)for(const v of VARIANTS){
   const tag=`${w}x${h}`;let rec={viewport:tag,case:c.key,variant:v,mode:c.mode,card:c.card};
   try{await openCase(page,c,v);rec.initial=await page.evaluate(measure);
    fs.mkdirSync(path.join(OUT,'screenshots',tag),{recursive:true});
    if(c.mode==='cpu')await page.screenshot({path:path.join(OUT,'screenshots',tag,`${c.key}-${v}.jpg`),type:'jpeg',quality:60});
    rec.read=await readToEnd(page);
    if(c.mode==='cpu'&&c.key==='choice-long')await page.screenshot({path:path.join(OUT,'screenshots',tag,`${c.key}-${v}-end.jpg`),type:'jpeg',quality:60});
   }catch(e){rec.error=String(e.message??e);}
   rec.errors=errors.splice(0);results.push(rec);
   process.stderr.write(`${tag} ${c.key} ${v} ${rec.error??`ratio ${rec.initial.ratio} tappable ${rec.initial.buttonsTappable}/${rec.initial.buttons.length} scrollers ${rec.initial.scrollers.map(s=>s.el).join('+')}`}\n`);
  }
  await ctx.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(OUT,'ab-results.json'),JSON.stringify(results,null,1)+'\n');
}
