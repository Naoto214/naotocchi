// Reproducible browser checks driven by an explicit QA button.
const run16=document.createElement('button');run16.id='run16';run16.textContent='V16検証';document.querySelector('nav').append(run16);
const delay16=ms=>new Promise(r=>setTimeout(r,ms));
run16.onclick=async()=>{
 const frame=document.getElementById('game'),rows=[],errors=[];
 const rect=n=>n.getBoundingClientRect().toJSON();
 const measure=()=>{const d=frame.contentDocument,w=frame.contentWindow;return {slots:Object.fromEntries(['homeInformation','homeEventSlot','castStage','speechSlot','careMeters','lifeMeterRow','careActions'].map(id=>[id,rect(d.getElementById(id))])),actors:d.querySelectorAll('[data-diorama-actor]').length,overflow:d.documentElement.scrollWidth>frame.clientWidth,panels:['message','storyFlash','speechBubble','homeChoiceResult','speechChoices','individualityDialog'].map(id=>{const n=d.getElementById(id);if(!n)return{id,missing:true,visible:false};const css=w.getComputedStyle(n);return{id,text:n.textContent,visible:css.display!=='none'&&css.visibility!=='hidden',...rect(n),font:css.fontSize,scroll:n.scrollHeight,client:n.clientHeight};}),buttons:[...d.querySelectorAll('#speechChoices button,#individualityDialog button')].filter(n=>n.getBoundingClientRect().height>0).map(n=>({text:n.textContent,...rect(n)})),meters:d.querySelectorAll('.home-meters .bar-line').length,care:d.querySelectorAll('#careActions>button').length};};
 const configs=[];for(const count of [1,3,13,28])for(const [width,height]of [[320,568],[320,844],[375,844],[390,844],[430,844]])configs.push({count,width,height,region:'forest'});
 for(const region of ['river_lake','city'])configs.push({count:28,width:390,height:844,region});
 for(const c of configs){
  run16.textContent='検証中 '+JSON.stringify(c);for(const [id,v]of Object.entries(c))document.getElementById(id).value=v;document.getElementById('version').value='qa-v16-game.html';
  const key=c.region+':'+c.count;if(frame.dataset.qaKey!==key){await start();frame.dataset.qaKey=key;}else{frame.style.width=c.width+'px';frame.style.height=c.height+'px';}
  for(let i=0;i<150;i++){let ready=false;try{ready=!!frame.contentWindow.HomeV16QA;}catch(_){}if(ready)break;await delay16(100);}await delay16(100);
  let api;try{api=frame.contentWindow.HomeV16QA;}catch(_){}if(!api){errors.push({c,reason:'boot'});continue;}api.prepare();await delay16(1200);const base=measure(),bounds=JSON.stringify(api.inspect().bounds);
  if(base.actors!==c.count)errors.push({c,reason:'actors',actual:base.actors});
  const samples=[];
  for(const action of ['shortJP','mediumJP','long','english','noticeShort','noticeMedium','noticeEnglish','sick','multiple','sickEvent','deltas','reward','resultShort','resultBoth','question','questionLong','hidden']){
   api.prepare();api[action]();await delay16(90);const m=measure();samples.push({action,...m});
   for(const id of Object.keys(base.slots)){const a=base.slots[id],b=m.slots[id];if(Math.abs(a.y-b.y)>.6||Math.abs(a.height-b.height)>.6)errors.push({c,action,id,reason:'layout moved',before:a,after:b});}
   if(m.slots.homeEventSlot.height!==42||m.slots.speechSlot.height!==76)errors.push({c,action,reason:'fixed lane'});
   for(const p of m.panels)if(p.missing)errors.push({c,action,reason:'missing panel',id:p.id});
   if(m.overflow||m.meters!==9||m.care!==9)errors.push({c,action,reason:'missing/overflow'});
   if(bounds!==JSON.stringify(api.inspect().bounds))errors.push({c,action,reason:'navigation changed'});
   for(const p of m.panels.filter(p=>p.visible&&['speechBubble','homeChoiceResult'].includes(p.id))){if(action.startsWith('question'))continue;const s=m.slots.speechSlot;if(p.y<s.y-.6||p.bottom>s.bottom+.6||p.x<s.x-.6||p.right>s.right+.6)errors.push({c,action,reason:'panel outside',p});}
   for(const b of m.buttons)if(b.height<44)errors.push({c,action,reason:'small tap',b});
   if(action==='question'){const d=frame.contentDocument,q=d.getElementById('speechText').textContent,btn=d.querySelector('#speechChoices button');if(!btn)errors.push({c,reason:'question absent'});else{btn.click();await delay16(500);samples.push({action:'reply',question:q,...measure()});}}
  }
  if(c.count===28){api.prepare();api.exchange();await delay16(100);const m=measure();samples.push({action:'exchange',...m});const p=m.panels.find(p=>p.id==='individualityDialog'),s=m.slots.speechSlot;if(!p.visible||p.y<s.y-.6||p.bottom>s.bottom+.6)errors.push({c,reason:'exchange outside',p});frame.contentDocument.getElementById('individualityLater').click();await delay16(500);}
  rows.push({c,base,samples});document.getElementById('qaMetrics').textContent=JSON.stringify({cases:rows.length,errors});
 }
 const report={engine:navigator.userAgent,rows,errors};const raw=document.createElement('pre');raw.id='report16Raw';raw.hidden=true;raw.textContent=JSON.stringify(report,null,2);document.body.append(raw);document.getElementById('qaMetrics').textContent=JSON.stringify({cases:rows.length,errors},null,2);
 const a=document.createElement('a');a.id='report16';a.textContent='V16検証JSON';a.download='home-v16-matrix.json';a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));run16.after(a);run16.textContent='V16完了 '+rows.length+'件 / 問題 '+errors.length;
};
