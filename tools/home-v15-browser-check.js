// Explicit QA control, loaded only by the private validation page.
const matrix15=document.createElement('button');matrix15.textContent='V15全表示検証';matrix15.id='matrix15';document.querySelector('nav').append(matrix15);
matrix15.onclick=async()=>{
 const f=document.getElementById('game'),rows=[],errors=[];
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
 function measure(){const d=f.contentDocument,w=f.contentWindow,api=w.HomeV15QA;return {rects:Object.fromEntries(['homeInformation','homeEventSlot','castStage','speechSlot','speechBubble','homeChoiceResult','careMeters','lifeMeterRow','careActions'].map(id=>[id,rect(d.getElementById(id))])),actors:api.metrics().cast.length,headingDirection:w.getComputedStyle(d.querySelector('.cast-names')).flexDirection,meters:[...d.querySelectorAll('.home-meters .bar-line')].map(e=>({name:e.querySelector('.bar-label').textContent,...rect(e),value:e.querySelector('.bar-value').textContent})),overflow:d.documentElement.scrollWidth>f.clientWidth,message:d.getElementById('message').textContent,brokenImages:[...d.images].filter(i=>i.src.includes('characters/')&&(!i.complete||!i.naturalWidth)).map(i=>i.src)};}
 const check=(ok,context,reason)=>{if(!ok)errors.push({...context,reason});};
 for(const region of ['forest','river_lake','city'])for(const count of [1,2,3,6,13,20,28])for(const [width,height] of [[320,844],[375,844],[390,844],[430,844],[320,568]]){
 const c={region,count,width,height};matrix15.textContent='検証中 '+JSON.stringify(c);
 for(const [id,value]of Object.entries(c))document.getElementById(id).value=value;
 const loaded=new Promise(resolve=>f.addEventListener('load',resolve,{once:true}));await start();await loaded;
 for(let retry=0;retry<80&&!f.contentWindow.HomeV15QA;retry++)await delay(100);
 const api=f.contentWindow.HomeV15QA;if(!api){errors.push({...c,reason:'boot failed'});continue;}
 api.prepare();await delay(180);const base=measure();
 check(base.headingDirection==='row',c,'header protagonist/partner not one row');check(base.actors===count,c,'cast missing');check(!base.overflow,c,'horizontal overflow');
 check(base.meters.length===9,c,'meters missing');
 check(base.rects.careMeters.y>=base.rects.speechSlot.bottom-1,c,'meters overlap conversation');
 check(base.meters.slice(0,5).every(m=>m.y===base.meters[0].y),c,'daily row not five');
 check(base.meters.slice(5).every(m=>m.y===base.meters[5].y),c,'life row not four');
 const states=[];
 for(const action of ['short','long','english','resultBoth','sick','multiple','deltas','reward','hidden']){
 api[action]();await delay(25);const m=measure();states.push({action,...m});
 for(const id of ['castStage','speechSlot','careMeters','careActions'])check(Math.abs(m.rects[id].y-base.rects[id].y)<1&&Math.abs(m.rects[id].h-base.rects[id].h)<1,{...c,action,id},'layout changed');
 if(['short','long','english'].includes(action)){const b=m.rects.speechBubble,s=m.rects.speechSlot;check(b.x>=s.x-1&&b.right<=s.right+1&&b.y>=s.y-1&&b.bottom<=s.bottom+1,{...c,action},'speech outside fixed slot');}
 if(action==='resultBoth'){const b=m.rects.speechBubble,r=m.rects.homeChoiceResult;check(b.bottom<=r.y+1,{...c,action},'choice result covers speech');}
 if(action==='sick')check(m.message.includes('びょうき'),c,'illness absent');
 if(action==='deltas')check(m.message==='',c,'routine deltas visible');
 }
 rows.push({context:c,base,states});
 }
 const report={engine:navigator.userAgent,rows,errors};window.lastV15Report=report;
 document.getElementById('qaMetrics').textContent=JSON.stringify({cases:rows.length,errors},null,2);
 const a=document.createElement('a');a.textContent='V15検証JSONを保存';a.download='home-v15-browser-matrix.json';a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));matrix15.after(a);matrix15.textContent='V15検証完了 '+rows.length+'件 / 問題 '+errors.length;
};
const observe15=document.createElement('button');observe15.textContent='V15動作観測';document.querySelector('nav').append(observe15);
observe15.onclick=async()=>{
 const results=[];for(const count of [1,13,28]){
  observe15.textContent=count+'体・30秒観測中';for(const [id,value]of Object.entries({count,width:390,height:844,region:'forest',version:'qa-v15-game.html'}))document.getElementById(id).value=value;
  await start();const f=document.getElementById('game');for(let i=0;i<100&&!f.contentWindow.HomeV15QA;i++)await new Promise(r=>setTimeout(r,100));
  results.push({count,...await f.contentWindow.HomeV15QA.observe(30)});
 }
 const report={engine:navigator.userAgent,results};const a=document.createElement('a');a.textContent='動作観測JSONを保存';a.download='home-v15-observation.json';a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));observe15.after(a);observe15.textContent='V15動作観測完了';
};
const edge15=document.createElement('button');edge15.textContent='V15上部境界検証';document.querySelector('nav').append(edge15);
edge15.onclick=async()=>{
 const rows=[],errors=[],f=document.getElementById('game');
 for(const [width,height]of [[320,568],[320,844],[375,844],[390,844],[430,844]]){
  for(const [id,value]of Object.entries({width,height,count:2,region:'forest',partner:'yes',version:'qa-v15-game.html'}))document.getElementById(id).value=value;
  await start();for(let n=0;n<100&&!f.contentWindow.HomeV15QA;n++)await new Promise(r=>setTimeout(r,100));const api=f.contentWindow.HomeV15QA;
  for(const action of ['prepare','married','noPartner','infinite']){
   api[action]();await new Promise(r=>setTimeout(r,150));const d=f.contentDocument,dev=d.getElementById('device').getBoundingClientRect(),header=d.querySelector('.device-header').getBoundingClientRect(),actions=d.querySelector('.header-actions').getBoundingClientRect(),badges=d.querySelector('.cast-badges');
   const row={width,height,action,deviceRight:dev.right,headerRight:header.right,actionsRight:actions.right,badges:d.querySelectorAll('.ending-badge').length,badgeViewport:badges.clientWidth,badgeContent:badges.scrollWidth,lifeHidden:getComputedStyle(d.getElementById('deathMeterItem')).display==='none'};rows.push(row);
   if(actions.right>dev.right+1||header.right>dev.right+1)errors.push({...row,reason:'header clips menu'});
   if(action==='married'&&row.badges!==5)errors.push({...row,reason:'badge missing'});
   if(action==='infinite'&&!row.lifeHidden)errors.push({...row,reason:'infinite life visible'});
  }
 }
 const a=document.createElement('a');a.textContent='上部境界JSONを保存';a.download='home-v15-header-edges.json';a.href=URL.createObjectURL(new Blob([JSON.stringify({rows,errors},null,2)],{type:'application/json'}));edge15.after(a);edge15.textContent='V15上部境界完了 '+rows.length+'件 / 問題 '+errors.length;
};
