// 正式採用の確認: style.css に組み込んだ改善A案（試遊版の「現行」= 比較用の属性なし）が、
// 本人が承認した試遊版の改善A案（qa/ab-results.json の a2）と同じ表示・操作性になっているかを、同じ場面・同じ画面幅で比べる。
// 使い方: build-trial.mjs で現在の正式ファイルから試遊版を組み立てて配信し、
//   QA_BASE=http://127.0.0.1:8766/trial/index.html node prototypes/card-game/detail-ui-ab-20261028/adoption-20261029/parity.mjs
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {openCase,measure,readToEnd,CASES,VIEWPORTS} from '../qa/run-ab-qa.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url));
const approved=JSON.parse(fs.readFileSync(path.join(HERE,'../qa/ab-results.json'),'utf8')).filter(r=>r.variant==='a2');
const keys=['ratio','lines','visibleLines','buttonsTappable','commandH','minButtonGap','artVisibleArea','overflowX'];
const browser=await chromium.launch(),rows=[];let same=0;
for(const [w,h] of VIEWPORTS){const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const c of CASES){const tag=`${w}x${h}`;await openCase(page,c,'current');const m=await page.evaluate(measure),read=await readToEnd(page);
  const a=approved.find(r=>r.viewport===tag&&r.case===c.key).initial;
  const prod={...Object.fromEntries(keys.map(k=>[k,m[k]])),buttons:m.buttons.length,scrollers:m.scrollers.length,variantAttr:m.variant};
  const want={...Object.fromEntries(keys.map(k=>[k,a[k]])),buttons:a.buttons.length,scrollers:a.scrollers.length};
  const diff=Object.keys(want).filter(k=>JSON.stringify(prod[k])!==JSON.stringify(want[k]));
  if(!diff.length)same++;rows.push({viewport:tag,case:c.key,match:!diff.length,diff,production:prod,approved:want,fullyRead:read?.fullyRead,errors:errors.splice(0)});
  fs.mkdirSync(path.join(HERE,'screenshots'),{recursive:true});if(['target','choice-long','response'].includes(c.key))await page.screenshot({path:path.join(HERE,'screenshots',`${tag}-${c.key}.jpg`),type:'jpeg',quality:60});
  process.stderr.write(`${tag} ${c.key} ${diff.length?'DIFF '+diff.join(','):'same'}\n`);}
 await ctx.close();}
await browser.close();
fs.writeFileSync(path.join(HERE,'parity-results.json'),JSON.stringify({summary:{total:rows.length,identical:same},rows},null,1)+'\n');
console.log(`${same}/${rows.length} identical to the approved improved A`);
