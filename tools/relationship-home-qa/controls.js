(() => {
 'use strict';
 const cases=JSON.parse(document.getElementById('case-data').textContent);
 const get=id=>document.getElementById(id),frame=get('game'),select=get('case');
 let index=0,ready=false,pendingTimer=null;
 for(const c of cases){const o=document.createElement('option');o.value=c.id;o.textContent=c.label;select.appendChild(o);}
 function size(){const mode=get('viewport').value;const w=mode==='390'?390:mode==='320'?320:window.innerWidth,h=mode==='390'?844:mode==='320'?568:window.innerHeight;frame.style.width=mode==='390'||mode==='320'?w+'px':'100%';frame.style.maxWidth='100%';frame.style.height=h+'px';get('dimensions').textContent=`Home領域：${Math.min(w,window.innerWidth)} × ${h} CSS px（${mode==='device'||!mode?'実機':'基準サイズ'}）`;}
 function load(){
  clearTimeout(pendingTimer);ready=false;const c=cases[index];select.value=c.id;
  get('hint').textContent=c.hint;get('phase').disabled=!['play','return'].includes(c.mode);if(get('phase').disabled)get('phase').value='live';get('timing').textContent='';
  get('mode').textContent=get('phase').value&&get('phase').value!=='live'&&['play','return'].includes(c.mode)?'固定比較（lifecycle確認は実遷移を使用）':c.mode==='held'?'固定表示（確認用にReactionを保持）':c.mode==='play'||c.mode==='return'?'遷移確認（正式な2.5秒）':'固定の初期条件（通常操作も可能）';
  get('status').textContent='Homeを読み込み中…';get('run').disabled=true;get('show').disabled=true;
  frame.src='game.html?case='+encodeURIComponent(c.id)+'&phase='+encodeURIComponent(get('phase').value||'live')+'&hearts='+encodeURIComponent(get('hearts').value||'all');size();
  pendingTimer=setTimeout(()=>{if(!ready)get('status').textContent='読み込みが完了していません。通信状況を確認し「やり直す」を押してください。';},30000);
 }
 function show(){frame.scrollIntoView({block:'start',behavior:'instant'});get('quick-back').hidden=false;}
 function back(){get('controls').scrollIntoView({block:'start',behavior:'instant'});get('quick-back').hidden=true;}
 function syncReturn(){const r=frame.getBoundingClientRect();get('quick-back').hidden=!(r.top<=64&&r.bottom>44);}
 select.addEventListener('change',()=>{index=cases.findIndex(c=>c.id===select.value);load();});
 get('viewport').addEventListener('change',()=>{size();});get('phase').addEventListener('change',load);get('hearts').addEventListener('change',load);
 get('previous').onclick=()=>{index=(index+cases.length-1)%cases.length;load();};
 get('next').onclick=()=>{index=(index+1)%cases.length;load();};get('reset').onclick=load;
 get('show').onclick=show;get('back').onclick=back;get('quick-back').onclick=back;
 get('run').onclick=()=>{
  if(!ready)return;get('run').disabled=true;show();
  // The person must see the initial state before the 2.5s transient begins.
  pendingTimer=setTimeout(()=>{
   if(!ready)return;
   try{frame.contentWindow.relationshipQa.run();get('status').textContent='遷移を実行しました。「やり直す」で初期状態へ戻せます。';}
   catch(e){get('status').textContent='遷移を実行できませんでした：'+e.message;}
  },600);
 };
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='relationship-qa-timing'&&e.data.id===cases[index].id){
   get('timing').textContent=`直前の操作→次の描画機会：約${e.data.ms}ms（端末内計測・通信時間は含みません）`;return;
  }
  if(e.data?.type==='relationship-qa-ready'&&e.data.id===cases[index].id){
   clearTimeout(pendingTimer);ready=true;get('show').disabled=false;
   get('run').disabled=(get('phase').value||'live')!=='live'||!['play','return'].includes(cases[index].mode);get('status').textContent='Homeの準備ができました。';
  }else if(e.data?.type==='relationship-qa-error'){clearTimeout(pendingTimer);ready=false;get('show').disabled=true;get('run').disabled=true;get('status').textContent='QA停止：'+e.data.message;}
 });
 window.addEventListener('scroll',syncReturn,{passive:true});
 window.addEventListener('resize',()=>{size();syncReturn();});load();
})();
