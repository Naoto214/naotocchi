// 390x844 touch browser check of the packaged Pages runtime. usage: node ui-check.cjs <base-url> <out-dir>
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const BASE=process.argv[2],OUT=process.argv[3];const T=path.join(__dirname,'../../tests');
const h1=JSON.parse(fs.readFileSync(T+'/hotseat1-saves.json')),h2=JSON.parse(fs.readFileSync(T+'/lover-fix-hotseat2-saves.json')).rows;
const RK='naotocchi-card-records-v1';
(async()=>{const b=await chromium.launch();const R=[];
 const open=async()=>{const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(String(e)));await p.goto(BASE);return p;};
 const restore=async(p,raw)=>{await p.evaluate(s=>localStorage.setItem('naotocchi-hotseat-v1',s),raw);await p.reload();await p.evaluate(()=>{document.getElementById('match-mode').value='hotseat';});await p.click('#restore',{force:true});await p.waitForTimeout(500);
  return p.evaluate(()=>document.body.innerText.match(/(保存を検証して復帰しました[^\n]*|復帰できません[^\n]*)/)?.[0]??null);};
 const state=p=>p.evaluate(k=>{const s=JSON.parse(localStorage.getItem('naotocchi-hotseat-v1'));const r=localStorage.getItem(k);return {version:s.version??s.game?.version,commands:(s.commands??s.game?.commands).length,hasMeta:!!s.recordsMeta,records:r?JSON.parse(r).rows.length:0,overflow:document.documentElement.scrollWidth>window.innerWidth};},RK);
 // 1 hotseat-1 mid: restore, legal action, resave, re-restore
 let p=await open();const m1=await restore(p,JSON.stringify(h1.mid.save));let s1=await state(p);
 await p.click('#reveal');await p.waitForTimeout(300);await p.screenshot({path:OUT+'/hotseat1-board.png'});
 const board=await p.evaluate(()=>({mains:[...document.querySelectorAll('.card-face.main-face')].length,fallbacks:document.querySelectorAll('.art-fallback').length}));
 // tap the first legal action offered on screen
 const before=s1.commands;const buttons=await p.$$('[data-action]');let tapped=null;
 for(const btn of buttons){if(await btn.isVisible()&&await btn.isEnabled()){tapped=(await btn.innerText()).slice(0,30);await btn.click();break;}}
 await p.waitForTimeout(500);
 for(const c of await p.$$('button:has-text("確定"),button:has-text("決定")'))if(await c.isVisible()){await c.click();await p.waitForTimeout(300);break;}
 const s1b=await state(p);await p.screenshot({path:OUT+'/hotseat1-mid.png'});
 const m1b=await restore(p,await p.evaluate(()=>localStorage.getItem('naotocchi-hotseat-v1')));const s1c=await state(p);
 R.push({case:'hotseat-1 途中',msg:m1,board,before:s1,tapped,afterAction:s1b,reRestoreMsg:m1b,afterReRestore:s1c,errors:p.errs});await p.context().close();
 // 2 hotseat-1 finished: no record
 p=await open();const m2=await restore(p,JSON.stringify(h1.finished.save));R.push({case:'hotseat-1 決着済み',msg:m2,state:await state(p),errors:p.errs});
 const m2b=await restore(p,JSON.stringify(h1.finished.save));R.push({case:'hotseat-1 決着済み 再復帰',msg:m2b,state:await state(p)});
 // records screen opens
 await p.reload();await p.click('#records-open');await p.waitForTimeout(400);await p.screenshot({path:OUT+'/records.png'});R.push({case:'戦績画面',visible:await p.evaluate(()=>{const n=document.querySelector('dialog[open]');return n?n.innerText.replace(/\s+/g,' ').slice(0,160):null;}),errors:p.errs});await p.context().close();
 // 3 hotseat-2 mid/finished
 for(const r of h2){p=await open();R.push({case:'hotseat-2 決着済み '+r.case,msg:await restore(p,JSON.stringify(r.save)),state:await state(p),errors:p.errs});
  R.push({case:'hotseat-2 途中 '+r.case,msg:await restore(p,JSON.stringify({...r.save,commands:r.save.commands.slice(0,r.triggerRevision-5)})),state:await state(p)});await p.context().close();}
 // 4 hotseat-3 and the current version: mid/finished with records metadata; finished records exactly once each
 p=await open();
 const versions=await p.evaluate(async()=>{const e=await import('./engine.mjs');return [...new Set(['hotseat-3',e.VERSION])];});
 for(const [i,version] of versions.entries()){
  const h3=await p.evaluate(async ({version,seed})=>{const e=await import('./engine.mjs');const {newMetadata,encodeMatch}=await import('./records-match.mjs');const decks={A:{id:null,name:'A',cards:[...e.DEFAULT_DECK]},B:{id:null,name:'B',cards:[...e.DEFAULT_DECK]}};
   let s=e.createGame(seed,undefined,version);for(let i=0;i<5000&&s.phase!=='finished';i++){const a=e.legalActions(s);s=e.act(s,e.actor(s),s.revision,a[Math.floor(i*104729%a.length)].id);}
   const mid=e.restore(JSON.stringify({...JSON.parse(e.save(s)),commands:s.commands.slice(0,40)}));
   return {fin:encodeMatch(e.save(s),newMetadata({mode:'hotseat',decks})),mid:encodeMatch(e.save(mid),newMetadata({mode:'hotseat',decks})),winner:s.result.winner};},{version,seed:34+i});
  R.push({case:version+' 途中',msg:await restore(p,h3.mid),state:await state(p)});
  R.push({case:version+' 決着済み',msg:await restore(p,h3.fin),state:await state(p),winner:h3.winner});
  R.push({case:version+' 決着済み 再復帰（二重計上なし）',msg:await restore(p,h3.fin),state:await state(p),errors:p.errs});}
 await p.screenshot({path:OUT+'/hotseat3-finished.png'});
 console.log(JSON.stringify(R,null,1));await b.close();})();
