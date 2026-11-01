// Disposable private QA only. Extract authored text; never ship fixture hooks.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),vm=require('node:vm');
const out=path.resolve(process.argv[2]);
cp.execFileSync(process.execPath,['tools/home-production-v5-qa.cjs',out]);
const src=fs.readFileSync('script.js','utf8'),literals=[];
for(const m of src.matchAll(/setMessage\(\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")\s*\)/g))literals.push({kind:'message',source:'script.js:'+src.slice(0,m.index).split('\n').length,text:vm.runInNewContext(m[1])});
let js=fs.readFileSync(path.join(out,'v5-qa-script.js'),'utf8');
js=js.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 noticeCorpus(){
  const rows=${JSON.stringify(literals)};
  for(const [pool,events] of Object.entries(STORY_EVENT_POOLS))for(const event of events)if(typeof event.message==='string')rows.push({kind:'story',source:'STORY_EVENT_POOLS.'+pool,text:compactJapaneseText(event.message),event});
  for(const [pool,events] of Object.entries(ACTION_RESULT_MESSAGES))for(const text of events)rows.push({kind:'message',source:'ACTION_RESULT_MESSAGES.'+pool,text});
  for(const [pool,events] of Object.entries(ACTION_BLOCKED_MESSAGES))for(const text of events)rows.push({kind:'message',source:'ACTION_BLOCKED_MESSAGES.'+pool,text});
  for(const [season,event] of Object.entries(SEASON_CHANGE_ANNOUNCE))rows.push({kind:'story',source:'SEASON_CHANGE_ANNOUNCE.'+season,text:event.text,event:{emoji:event.emoji}});
  for(const [id,beats] of Object.entries(PARTNER_FIRST_ENCOUNTERS))for(const text of beats)rows.push({kind:'story',source:'PARTNER_FIRST_ENCOUNTERS.'+id,text,event:{character:WORLD_MASTER.partners.find(p=>p.id===id)}});
  for(const r of REGIONS)for(const line of REGION_RUNTIME_META[r.id]?.lines||[])rows.push({kind:'message',source:'REGION_RUNTIME_META.'+r.id,text:compactJapaneseText(r.label+'にやってきた！'+line)});
  rows.push({kind:'story',source:'long-name/reaction',text:STORY_EVENT_POOLS.travel[1].message,event:{...STORY_EVENT_POOLS.travel[1],petReaction:true},longName:true});
  rows.push({kind:'message',source:'emergency-long-token',text:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(5)});
  // Empty notifications are checked explicitly by the expiry/reset case.
  return rows.filter(x=>x.text).map(x=>({...x,text:compactJapaneseText(x.text)}));
 },
 presentNotice(row){
  clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;homeStoryCurrent=null;
  clearTimeout(messageTimer);messageTimer=null;message='';el.storyFlash.classList.add('hidden');
  state.hunger=5;state.energy=90;state.health=100;state.isSleeping=false;render();
  if(!row){setMessage('');render();return;}
  if(row.kind==='story')showStoryEvent({...row.event,message:row.text});else setMessage(row.text);
  if(row.longName){el.storyFlashName.textContent='とてもながい名前のものしりふくろう';el.storyFlashName.classList.remove('hidden');}
 },
`);
js=js.replace(/\}\)\(\);\s*$/,`
const reviewCase=new URLSearchParams(location.search).get('notice');
if(reviewCase)setTimeout(()=>{
 const rows=HomeReleaseQA.noticeCorpus(),row=rows.find(r=>reviewCase==='food'?r.source==='STORY_EVENT_POOLS.feed':reviewCase==='forest'?r.text.includes('食べずに'):reviewCase==='desert'?r.text.includes('しばらく立ち'):reviewCase==='jungle'?r.text.includes('迷いかけ'):r.longName);
 HomeReleaseQA.presentNotice(row);clearTimeout(messageTimer);messageTimer=null;clearTimeout(storyFlashTimer);storyFlashTimer=null;
},500);
})();`);
fs.writeFileSync(path.join(out,'v6-qa-script.js'),js);
fs.copyFileSync(path.join(out,'v5-qa-diorama.js'),path.join(out,'v6-qa-diorama.js'));
fs.writeFileSync(path.join(out,'v6-qa.html'),fs.readFileSync(path.join(out,'v5-qa.html'),'utf8').replaceAll('v5-qa','v6-qa'));
fs.mkdirSync(path.join(out,'v6-review'),{recursive:true});
fs.writeFileSync(path.join(out,'v6-review/index.html'),fs.readFileSync(path.join(out,'v5-review/index.html'),'utf8').replaceAll('VERSION 5','VERSION 6').replaceAll('v5-qa','v6-qa'));
console.log('V6 private QA, literal system messages:',literals.length);

fs.writeFileSync(path.join(out,'v6-notice-review.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><title>V6 notice review</title><style>body{font:16px system-ui;background:#e9efea}iframe{border:0;height:844px}a{display:inline-block;padding:8px}</style><h1>V6 実文・画面幅比較</h1><nav></nav><main></main><script>const p=new URLSearchParams(location.search),w=[320,375,390,430].includes(+p.get('width'))?+p.get('width'):320,n=['forest','desert','jungle','name','food'].includes(p.get('notice'))?p.get('notice'):'forest';document.querySelector('nav').innerHTML=['forest','desert','jungle','name','food'].flatMap(n=>[320,375,390,430].map(w=>'<a href="?width='+w+'&notice='+n+'">'+n+' '+w+'</a>')).join('');document.querySelector('main').innerHTML='<iframe width="'+w+'" src="v6-qa.html?region='+(['name','food'].includes(n)?'forest':n)+'&count=28&notice='+n+'"></iframe>';</script></html>`);
