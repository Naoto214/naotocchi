// UI改善案の比較（ブラウザ上でCSSを注入するだけ。本番CSS・UIコードは変更しない）。
// 案0=現行 / 案1=能力全文の最小高さを確保 / 案2=能力全文を内側スクロールにせず、詳細全体を縦スクロールにする
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),OUT=path.join(HERE,'ui-proposal');fs.mkdirSync(OUT,{recursive:true});
const e=await import(path.join(CG,'engine.mjs'));const BASE=process.env.QA_BASE??'http://localhost:8765/prototypes/card-game/index.html';
const ID='M-coral-06';const deck=[ID,...e.DEFAULT_DECK.filter(x=>x!==ID).slice(0,39)];let g;
for(let seed=1;seed<900&&!g;seed++){const s=e.createGame(seed,{A:deck,B:[...e.DEFAULT_DECK]});const i=s.players.A.hand.find(x=>s.cards[x].cardId===ID);if(i!==undefined)g={inst:i,text:e.save(s)};}
const CSS={'0-current':'','1-min-height':'#card-dialog .effect-scroll{min-height:8.5em}','2-natural-height':'#card-dialog .effect-scroll{flex:none;overflow:visible;min-height:0}'};
const VIEWS=[[320,568],[375,667],[844,390]];const b=await chromium.launch(),rows=[];
for(const [w,h] of VIEWS)for(const [name,css] of Object.entries(CSS)){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1.5,isMobile:true,hasTouch:true}),p=await ctx.newPage();
 await p.goto(BASE);await p.evaluate(t=>localStorage.setItem('naotocchi-hotseat-v1',t),g.text);await p.reload();await p.waitForTimeout(400);
 await p.selectOption('#match-mode','hotseat').catch(()=>{});await p.click('#restore');await p.waitForTimeout(500);if(await p.locator('#curtain').isVisible()){await p.click('#reveal');await p.waitForTimeout(300);}
 if(css)await p.addStyleTag({content:css});
 await p.locator(`[data-inspect="${g.inst}"]`).first().click({force:true});await p.waitForTimeout(600);
 const m=await p.evaluate(()=>{const d=document.querySelector('#card-dialog'),c=d.querySelector('.detail-copy'),el=d.querySelector('.effect-scroll');const r=el.getBoundingClientRect(),dr=d.getBoundingClientRect();
  const visibleTop=Math.max(r.top,dr.top),visibleBottom=Math.min(r.bottom,dr.bottom,innerHeight);return {effectClient:el.clientHeight,effectScroll:el.scrollHeight,effectVisiblePx:Math.max(0,Math.round(visibleBottom-visibleTop)),copyScrollable:c.scrollHeight>c.clientHeight+1,copyClient:c.clientHeight,copyScroll:c.scrollHeight,dialogScrollable:d.scrollHeight>d.clientHeight+1,lineHeightPx:22.4}});
 m.visibleLines=+(m.effectVisiblePx/22.4).toFixed(1);m.totalLines=+(m.effectScroll/22.4).toFixed(1);
 rows.push({view:`${w}x${h}`,proposal:name,...m});await p.screenshot({path:`${OUT}/${w}x${h}-${name}.jpg`,type:'jpeg',quality:50});await ctx.close();
}
await b.close();fs.writeFileSync(path.join(HERE,'ui-proposal-results.json'),JSON.stringify(rows,null,1));console.table(rows.map(r=>({view:r.view,proposal:r.proposal,visibleLines:r.visibleLines,totalLines:r.totalLines,innerScroll:r.effectScroll>r.effectClient+1,copyScrollable:r.copyScrollable})));
