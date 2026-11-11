/* Isolated audition page. No game state, audio.js or effect assets are touched. */
(async()=>{
 'use strict';
 const $=id=>document.getElementById(id);let catalog,track,version='v2',mode='featured',ctx,transport,continuous=false;
 const cache=new Map(),decodeQueue=new DecodeQueue();let shown=[];
 const format=x=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,'0')}`;
 function update(){
  $('nowTitle').textContent=track?.title||'なおとっち / SOUND STUDIO';
  const state=transport?.state||'stopped';$('status').textContent={stopped:'停止中',loading:'音源を読み込んでいます…',playing:`${version.toUpperCase()} ${version==='v1'?'現行完成版':'音質改善版'} · 音量調整済み`,error:'再生できませんでした'}[state];
  $('play').textContent=state==='playing'?'↻':'▶';$('play').setAttribute('aria-label',state==='playing'?'最初から再生':'再生');
  for(const v of ['v1','v2']){$(v).classList.toggle('active',v===version);$(v).setAttribute('aria-pressed',String(v===version));}
  $('error').hidden=state!=='error';$('error').textContent=state==='error'?'音源を読み込めませんでした。通信を確認して、再生ボタンをもう一度押してください。':'';
  for(const el of document.querySelectorAll('.track')){el.classList.toggle('current',el.dataset.id===track?.id);for(const b of el.querySelectorAll('.ab button'))b.setAttribute('aria-pressed',String(el.dataset.id===track?.id&&b.dataset.version===version&&state==='playing'));}
 }
 function setup(){
  if(transport)return;
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  transport=new CompareTransport({context:ctx,load:async(t,v,signal)=>{
   const format=$('format').value;const key=t.id+'/'+v+'/'+format;if(cache.has(key)){const b=cache.get(key);cache.delete(key);cache.set(key,b);return b;}
   const meta=t.versions[v],res=await fetch(format==='flac'?meta.master:meta.audio,{signal});if(!res.ok)throw new Error('HTTP '+res.status);
   const bytes=await res.arrayBuffer();if(signal.aborted)throw new DOMException('Aborted','AbortError');
   const decoded=await decodeQueue.run(signal,()=>ctx.decodeAudioData(bytes));if(signal.aborted)throw new DOMException('Aborted','AbortError');
   if(decoded.duration<meta.duration-.025)throw new Error('Incomplete audio');
   const frames=Math.round(meta.duration*decoded.sampleRate),buffer=ctx.createBuffer(decoded.numberOfChannels,frames,decoded.sampleRate);
   for(let ch=0;ch<decoded.numberOfChannels;ch++)buffer.getChannelData(ch).set(decoded.getChannelData(ch).subarray(0,frames));
   cache.set(key,buffer);while(cache.size>2)cache.delete(cache.keys().next().value);return buffer;
  },onchange:update,onended:()=>{if(continuous)move(1);}});
  transport.setListeningMode($('listening').value);transport.setLoop($('loop').checked);transport.setVolume(Number($('volume').value)/100);
 }
 function play(t,v,restart=false){
  try{setup();if(restart)transport.stop();track=t;version=v;const selected={...track,versions:Object.fromEntries(Object.entries(track.versions).map(([v,m])=>[v,{...m,gainDb:$('format').value==='flac'?m.masterGainDb:m.gainDb}]))};transport.play(selected,version);update();}
  catch(e){$('error').hidden=false;$('error').textContent='このブラウザーで音声を開始できませんでした。Safariで開き直してください。';}
 }
 function move(delta){if(!shown.length)return;const i=shown.findIndex(t=>t.id===track?.id);play(shown[(i+delta+shown.length)%shown.length],version,true);}
 function render(){
  const q=$('search').value.trim().toLowerCase();shown=catalog.tracks.filter(t=>(mode==='all'||catalog.featured.includes(t.id))&&`${t.title} ${t.usage} ${t.category}`.toLowerCase().includes(q));
  if(mode==='featured')shown.sort((a,b)=>catalog.featured.indexOf(a.id)-catalog.featured.indexOf(b.id));
  $('count').textContent=shown.length+' TRACKS';$('tracks').replaceChildren();
  for(const t of shown){
   const card=document.createElement('article');card.className='track';card.dataset.id=t.id;
   const top=document.createElement('div');top.className='top';const n=document.createElement('span');n.textContent=String(t.number).padStart(2,'0')+' / '+t.category;const len=document.createElement('span');len.textContent=format(t.versions.v2.duration);top.append(n,len);
   const symbol=document.createElement('div');symbol.className='symbol';symbol.textContent='♪';symbol.setAttribute('aria-hidden','true');
   const name=document.createElement('h3');name.textContent=t.title;const usage=document.createElement('p');usage.className='usage';usage.textContent=t.usage;
   const change=document.createElement('p');change.className='change';change.textContent=t.change;
   const buttons=document.createElement('div');buttons.className='ab';
   for(const v of ['v1','v2']){const b=document.createElement('button');b.type='button';b.dataset.version=v;b.textContent=v==='v1'?'▶ V1 現行':'▶ V2 改善版';b.setAttribute('aria-label',t.title+' '+v.toUpperCase()+'を再生');b.addEventListener('click',()=>play(t,v));buttons.append(b);}
   card.append(top,symbol,name,usage,change,buttons);$('tracks').append(card);
  }
  if(!shown.length){const p=document.createElement('p');p.textContent='該当する曲はありません。検索語を変えてください。';$('tracks').append(p);}update();
 }
 $('featuredTab').onclick=()=>{mode='featured';$('featuredTab').classList.add('selected');$('allTab').classList.remove('selected');$('featuredTab').setAttribute('aria-pressed','true');$('allTab').setAttribute('aria-pressed','false');render();};
 $('allTab').onclick=()=>{mode='all';$('allTab').classList.add('selected');$('featuredTab').classList.remove('selected');$('allTab').setAttribute('aria-pressed','true');$('featuredTab').setAttribute('aria-pressed','false');render();};
 $('search').oninput=render;$('play').onclick=()=>{const t=track||shown[0];if(t)play(t,version,true);};$('stop').onclick=()=>{continuous=false;$('continuous').checked=false;transport?.stop();};
 $('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);
 for(const v of ['v1','v2'])$(v).onclick=()=>{version=v;if(track)play(track,v);else update();};
 $('format').onchange=()=>{if(track&&transport?.state==='playing')play(track,version);};
 $('listening').onchange=()=>transport?.setListeningMode($('listening').value);
 $('volume').oninput=()=>transport?.setVolume(Number($('volume').value)/100);
 $('loop').onchange=()=>{if($('loop').checked){continuous=false;$('continuous').checked=false;}transport?.setLoop($('loop').checked);};
 $('continuous').onchange=()=>{continuous=$('continuous').checked;if(continuous){$('loop').checked=false;transport?.setLoop(false);}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){continuous=false;$('continuous').checked=false;transport?.stop();}});
 setInterval(()=>{const d=track?.versions[version].duration||0,p=transport?.position()||0;$('time').textContent=format(p)+' / '+format(d);$('progress').value=d?p/d:0;},200);
 try{const res=await fetch('catalog.json');if(!res.ok)throw new Error('Catalog');catalog=await res.json();render();}catch(e){$('tracks').textContent='曲一覧を読み込めませんでした。ページを再読み込みしてください。';}
})();
