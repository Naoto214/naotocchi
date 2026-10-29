const {chromium}=require('playwright');const fs=require('fs');
const BASE='http://127.0.0.1:8765/prototypes/card-game/index.html';
(async()=>{const b=await chromium.launch();const out=[];
 const rows=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../../tests/lover-fix-hotseat2-saves.json'))).rows;
 for(const r of rows){const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  // finished save and a mid-game save (before the old-behaviour branch)
  for(const [label,save] of [['finished',r.save],['mid',{...r.save,commands:r.save.commands.slice(0,r.triggerRevision-5)}]]){
   await p.goto(BASE);await p.evaluate(s=>localStorage.setItem('naotocchi-hotseat-v1',s),JSON.stringify(save));await p.reload();
   await p.evaluate(()=>{document.getElementById('match-mode').value='hotseat';});await p.click('#restore',{force:true});await p.waitForTimeout(400);
   const msg=await p.evaluate(()=>document.body.innerText.match(/(保存を検証して復帰しました|復帰できません[^\n]*)/)?.[0]??null);
   const stored=await p.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-hotseat-v1')));
   out.push({case:r.case,label,msg,versionAfterPersist:(stored.version??stored.game?.version)??null,commands:(stored.commands??stored.game?.commands)?.length,errors});}
  await ctx.close();}
 console.log(JSON.stringify(out,null,1));await b.close();})();
