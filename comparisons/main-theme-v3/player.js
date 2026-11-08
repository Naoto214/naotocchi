'use strict';
const songs=THEME_V3.SONGS,$=id=>document.getElementById(id);
const media=$('media');
let current=null,loadedSong=null,mediaURL=null,generation=0;
const cache=new Map();
for(const [index,s] of songs.entries()){
  const card=document.createElement('article');card.className='card'+(index<2?' ref':'');card.id='card-'+s.id;
  card.innerHTML=`<div class="card-top"><span class="letter">${s.label}</span><span class="meta">${s.signature.join('/')} · ♩${s.bpm} · ${Math.round(s.bars.length*s.meter*60/s.bpm*s.repeats)}秒</span></div><h3>${s.title}</h3><p class="subtitle">${s.subtitle}</p><p class="description">${s.character}</p><div class="card-bottom"><button type="button" data-play="${s.id}" aria-label="${s.title}を再生">▶ 再生</button><a href="scores/${s.id}.musicxml" download>楽譜</a><a href="midi/${s.id}.mid" download>MIDI</a><button type="button" class="stop" data-wav="${s.id}">WAV保存</button></div>`;
  $(index<2?'references':'candidates').append(card);
}
function rendered(s){const bpm=$('tempo').value==='native'?s.bpm:96, full=$('mode').value==='full',key=[s.id,bpm,full].join(':');if(!cache.has(key)){if(cache.size>=3)cache.delete(cache.keys().next().value);cache.set(key,THEME_AUDIO.render(s,full,bpm));}return cache.get(key);}
function resetCards(){for(const c of document.querySelectorAll('.card'))c.classList.remove('active');for(const b of document.querySelectorAll('[data-play]')){b.textContent='▶ 再生';b.setAttribute('aria-pressed','false');}}
function stop(){generation++;media.pause();try{media.currentTime=0;}catch{}current=null;resetCards();$('progress').value=0;$('status').textContent='停止中';}
function showPlaying(){
  if(!loadedSong||media.paused)return;
  current=loadedSong;resetCards();$('card-'+current.id).classList.add('active');
  const b=document.querySelector(`[data-play="${current.id}"]`);b.textContent='↺ 最初から';b.setAttribute('aria-pressed','true');
  $('status').textContent=`再生中：${current.title} / ${$('mode').selectedOptions[0].textContent} / ♩${$('tempo').value==='native'?current.bpm:96}`;
}
async function play(s){
  stop();const ticket=generation;$('status').textContent=s.title+' — 準備中…';
  try{
    // Everything up to play() stays in the user's tap. No AudioContext resume,
    // fetch or awaited rendering can consume Safari's transient activation.
    const nextURL=URL.createObjectURL(new Blob([THEME_AUDIO.wav(rendered(s))],{type:'audio/wav'}));
    const previousURL=mediaURL;mediaURL=nextURL;loadedSong=s;current=s;
    media.src=nextURL;media.loop=$('loop').checked;media.volume=Number($('volume').value)/100;media.load();
    if(previousURL)URL.revokeObjectURL(previousURL);
    const promise=media.play();
    if(promise)await promise;
    // 'playing' and 'timeupdate', not a successful start request, drive the UI.
    if(ticket!==generation)return;
  }catch(e){
    if(ticket!==generation)return;
    $('status').textContent='標準プレーヤーの ▶ を押してください。音量は端末の音量ボタンでも調整できます。';
    console.error(e);
  }
}
media.addEventListener('playing',showPlaying);
media.addEventListener('timeupdate',()=>{if(Number.isFinite(media.duration)&&media.duration>0)$('progress').value=media.currentTime/media.duration;});
media.addEventListener('pause',()=>{if(media.paused&&current){resetCards();$('status').textContent='一時停止：'+current.title;}});
media.addEventListener('waiting',()=>{if(current&&!media.paused)$('status').textContent='音声を読み込み中：'+current.title;});
media.addEventListener('ended',stop);
media.addEventListener('error',()=>{$('status').textContent='音声を読み込めませんでした。曲の「再生」をもう一度押してください。';});
document.addEventListener('click',e=>{const p=e.target.closest('[data-play]'),w=e.target.closest('[data-wav]');if(p)play(songs.find(s=>s.id===p.dataset.play));if(w){const s=songs.find(s=>s.id===w.dataset.wav),blob=new Blob([THEME_AUDIO.wav(rendered(s))],{type:'audio/wav'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=s.id+'-'+$('mode').value+'-'+$('tempo').value+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}});
$('stop').onclick=stop;
for(const name of ['mode','tempo'])$(name).onchange=()=>{if(current)play(current);else{media.pause();media.removeAttribute('src');media.load();loadedSong=null;if(mediaURL){URL.revokeObjectURL(mediaURL);mediaURL=null;}}};
$('loop').onchange=()=>{media.loop=$('loop').checked;};
$('volume').oninput=()=>{media.volume=Number($('volume').value)/100;};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
