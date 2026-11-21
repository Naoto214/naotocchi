'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=x=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,'0')}`;
let catalog=[],selected=null,category='すべて',queue=null,transport=null;
const cache=new Map();
function visible(){const q=$('search').value.trim().toLowerCase();return catalog.filter(s=>(category==='すべて'||s.category===category)&&(!q||[s.title,s.usage,s.id,s.badge].join(' ').toLowerCase().includes(q)));}
function showTracks(){
 const rows=visible();$('count').textContent=`${rows.length} / 32 曲`;
 $('tracks').innerHTML=rows.map(s=>`<article class="track ${selected===s.id&&transport?.state==='playing'?'active':''}" data-track="${esc(s.id)}"><span class="track-number">${String(s.number).padStart(2,'0')}</span><div class="track-copy"><h3>${esc(s.title)}</h3><p class="usage">${esc(s.usage)}</p><div class="track-meta"><span>${clock(s.duration)}</span><span>♩ ${s.bpm}</span>${s.badge?`<span class="tag">${esc(s.badge)}</span>`:''}</div></div><button data-play="${esc(s.id)}" aria-label="${esc(s.title)}を${selected===s.id&&transport?.state==='playing'?'停止':'再生'}">${selected===s.id&&transport?.state==='playing'?'■':'▶'}</button></article>`).join('')||'<p class="count">一致する曲がありません。</p>';
}
function refresh(){
 const s=catalog.find(s=>s.id===selected),state=transport?.state||'stopped';
 $('now-title').textContent=s?.title||'聴きたい曲を選んでください';$('duration').textContent=clock(s?.duration||0);
 $('toggle').textContent=state==='playing'||state==='loading'?'■':'▶';$('toggle').setAttribute('aria-label',state==='playing'||state==='loading'?'停止':'再生');
 $('status').textContent=state==='loading'?'音源を読み込んでいます…':state==='playing'?(queue?'連続再生中':$('loop').checked&&s.loop?'ループ再生中':'再生中'):state==='error'?'読み込めませんでした。再生ボタンで再試行できます。':'タップして再生';
 $('dot').classList.toggle('playing',state==='playing');$('all').textContent=queue?'■ 連続再生を停止':'▶ すべて連続再生';
 showTracks();
}
function initAudio(){
 if(transport)return transport;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Web Audio unavailable');
 const ctx=new AC();
 transport=new BGMTransport({context:ctx,onchange:refresh,onended:()=>{
  if(!queue)return;const i=queue.indexOf(selected);if(i>=0&&i+1<queue.length)start(queue[i+1],true);else{queue=null;refresh();}
 },load:async(s,signal)=>{
  if(cache.has(s.id)){const b=cache.get(s.id);cache.delete(s.id);cache.set(s.id,b);return b;}
  const res=await fetch(s.audio,{signal});if(!res.ok)throw new Error('audio HTTP '+res.status);
  const input=await res.arrayBuffer();if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const decoded=await ctx.decodeAudioData(input);if(signal.aborted)throw new DOMException('Aborted','AbortError');
  // AAC encoder padding is never part of the musical loop. Keep the exact master duration.
  const length=Math.round(s.duration*decoded.sampleRate),b=ctx.createBuffer(decoded.numberOfChannels,length,decoded.sampleRate);
  if(decoded.length<length-2)throw new Error('audio is shorter than master');
  for(let ch=0;ch<decoded.numberOfChannels;ch++)b.copyToChannel(decoded.getChannelData(ch).subarray(0,length),ch);
  cache.set(s.id,b);while(cache.size>2)cache.delete(cache.keys().next().value);return b;
 }});
 transport.setVolume(Number($('volume').value)/100);
 // A tiny silent source unlocks Safari's output during the original user gesture.
 const n=ctx.createBufferSource();n.buffer=ctx.createBuffer(1,1,ctx.sampleRate);n.connect(ctx.destination);n.start();
 return transport;
}
function start(id,continuing=false){
 if(!continuing)queue=null;selected=id;const s=catalog.find(x=>x.id===id);if(!s)return;
 try{initAudio().play(s,!queue&&$('loop').checked);}catch{ $('status').textContent='このブラウザでは再生できません。Safariなどで開いてください。';}
}
function stop(){queue=null;transport?.stop();refresh();}
$('tracks').addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(!b)return;const id=b.dataset.play;if(selected===id&&['playing','loading'].includes(transport?.state))stop();else start(id);});
$('toggle').addEventListener('click',()=>{if(['playing','loading'].includes(transport?.state))stop();else start(selected||visible()[0]?.id);});
$('all').addEventListener('click',()=>{if(queue){stop();return;}queue=visible().map(s=>s.id);if(queue.length)start(queue[0],true);});
function step(n){const list=queue||visible().map(s=>s.id);if(!list.length)return;const i=list.indexOf(selected);start(list[(Math.max(0,i)+n+list.length)%list.length],Boolean(queue));}
$('prev').addEventListener('click',()=>step(-1));$('next').addEventListener('click',()=>step(1));
$('loop').addEventListener('change',()=>{queue=null;transport?.setLoop($('loop').checked);refresh();});
$('volume').addEventListener('input',()=>{$('vol-value').textContent=$('volume').value+'%';transport?.setVolume(Number($('volume').value)/100);});
$('search').addEventListener('input',showTracks);
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===category)));showTracks();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
setInterval(()=>{const p=transport?.position()||0,s=catalog.find(s=>s.id===selected);$('elapsed').textContent=clock(p);$('progress').style.width=(s?Math.min(100,p/s.duration*100):0)+'%';},250);
fetch('catalog.json').then(r=>{if(!r.ok)throw new Error(r.status);return r.json();}).then(data=>{
 catalog=data.tracks;const cats=['すべて',...new Set(catalog.map(s=>s.category))];$('filters').innerHTML=cats.map(c=>`<button data-category="${esc(c)}" aria-pressed="${c===category}">${esc(c)}</button>`).join('');
 $('total').textContent='32 TRACKS · '+Math.round(catalog.reduce((a,s)=>a+s.duration,0)/60)+' MIN';$('all').disabled=false;showTracks();
}).catch(()=>{$('count').textContent='曲目を読み込めませんでした。ページを再読み込みしてください。';});
