'use strict';
const songs=THEME_V3.SONGS,$=id=>document.getElementById(id);
let context,master,source,current=null,started=0,duration=0,generation=0;
const cache=new Map();
for(const [index,s] of songs.entries()){
  const card=document.createElement('article');card.className='card'+(index<2?' ref':'');card.id='card-'+s.id;
  card.innerHTML=`<div class="card-top"><span class="letter">${s.label}</span><span class="meta">${s.signature.join('/')} · ♩${s.bpm} · ${Math.round(s.bars.length*s.meter*60/s.bpm*s.repeats)}秒</span></div><h3>${s.title}</h3><p class="subtitle">${s.subtitle}</p><p class="description">${s.character}</p><div class="card-bottom"><button type="button" data-play="${s.id}" aria-label="${s.title}を再生">▶ 再生</button><a href="scores/${s.id}.musicxml" download>楽譜</a><a href="midi/${s.id}.mid" download>MIDI</a><button type="button" class="stop" data-wav="${s.id}">WAV保存</button></div>`;
  $(index<2?'references':'candidates').append(card);
}
function rendered(s){const bpm=$('tempo').value==='native'?s.bpm:96, full=$('mode').value==='full',key=[s.id,bpm,full].join(':');if(!cache.has(key)){if(cache.size>=3)cache.delete(cache.keys().next().value);cache.set(key,THEME_AUDIO.render(s,full,bpm));}return cache.get(key);}
function stop(){generation++;if(source){source.onended=null;source.stop();source.disconnect();source=null;}current=null;for(const c of document.querySelectorAll('.card'))c.classList.remove('active');for(const b of document.querySelectorAll('[data-play]')){b.textContent='▶ 再生';b.setAttribute('aria-pressed','false');}$('progress').value=0;$('status').textContent='停止中';}
async function play(s){
  stop();const ticket=generation;$('status').textContent=s.title+' — 準備中…';
  try{
    if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.connect(context.destination);}
    await context.resume();if(ticket!==generation)return;
    const r=rendered(s);if(ticket!==generation)return;
    const buffer=context.createBuffer(1,r.samples.length,r.sampleRate);buffer.copyToChannel(r.samples,0);
    source=context.createBufferSource();source.buffer=buffer;source.loop=$('loop').checked;source.connect(master);master.gain.value=Number($('volume').value)/100;
    current=s;duration=r.duration;started=context.currentTime;source.onended=()=>{if(ticket===generation)stop();};source.start();
    $('card-'+s.id).classList.add('active');const b=document.querySelector(`[data-play="${s.id}"]`);b.textContent='↺ 最初から';b.setAttribute('aria-pressed','true');
    $('status').textContent=`再生中：${s.title} / ${$('mode').selectedOptions[0].textContent} / ♩${$('tempo').value==='native'?s.bpm:96}`;
  }catch(e){stop();$('status').textContent='音声を開始できませんでした。もう一度「再生」を押してください。';console.error(e);}
}
document.addEventListener('click',e=>{const p=e.target.closest('[data-play]'),w=e.target.closest('[data-wav]');if(p)play(songs.find(s=>s.id===p.dataset.play));if(w){const s=songs.find(s=>s.id===w.dataset.wav),blob=new Blob([THEME_AUDIO.wav(rendered(s))],{type:'audio/wav'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=s.id+'-'+$('mode').value+'-'+$('tempo').value+'.wav';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}});
$('stop').onclick=stop;
for(const name of ['mode','tempo'])$(name).onchange=()=>{if(current)play(current);};
$('loop').onchange=()=>{if(source)source.loop=$('loop').checked;};
$('volume').oninput=()=>{if(master)master.gain.setTargetAtTime(Number($('volume').value)/100,context.currentTime,.02);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
setInterval(()=>{if(current)$('progress').value=((context.currentTime-started)%duration)/duration;},150);
