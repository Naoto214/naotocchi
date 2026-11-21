(function(){
 'use strict';
 const $=id=>document.getElementById(id),{THEMES,slotAt,nextSlot}=HomeThemes;
 const regions=[['home','おうち'],['forest','森'],['river_lake','水辺'],['city','都会'],['countryside','田舎'],['mountain','山'],['snow','雪国'],['sea','海'],['jungle','ジャングル'],['desert','砂漠'],['deepsea','深海'],['star_stop','星空'],['memory_lake','記憶の湖']];
 let slot='morning',sequence=false,desired=false,request=0,simMinutes=299,lastTick=performance.now();
 const theme=()=>THEMES.find(t=>t.slot===slot),fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const status=text=>$('status').textContent=text;
 const player=new AuditionPlayer({
  render:(t,mode)=>NAOTOCCHI_THEME_ENGINE_V2.renderOffline(t.song,mode,{sampleRate:22050}),
  onstart:t=>{$('now-title').textContent=t.title;const next=nextTheme();if(next)player.buffer(next,$('timbre').value).catch(()=>{});},
  onstate:s=>{if(s==='suspended'||s==='interrupted'){status('音声が中断されました。再生ボタンで再開できます');$('play').textContent='▶ 再開';}},
  onend:()=>{if(!desired)return;const next=nextSlot(slot,sequence||$('clock').value!=='manual',$('loop').checked);
   if($('clock').value!=='manual') {if($('loop').checked)start();else stop();}
   else if(next){slot=next;paint();start();}else stop('4曲の試聴が終わりました');}
 });
 function nextTheme(){const next=$('clock').value==='manual'?nextSlot(slot,sequence,$('loop').checked):($('loop').checked?slot:null);return THEMES.find(t=>t.slot===next);}
 function sendScene(){const frame=$('home');try{if(frame.contentWindow.HomeAuditionFixture){frame.contentWindow.HomeAuditionFixture.setScene($('region').value,slot);return;}}catch{} }
 function paint(){$('quick-time').value=slot;$('quick-region').value=$('region').value;for(const b of $('themes').children)b.setAttribute('aria-pressed',String(b.dataset.slot===slot));$('scene-label').textContent=regions.find(r=>r[0]===$('region').value)[1]+' · '+theme().label;sendScene();}
 async function start(){const n=++request;desired=true;$('play').textContent='▶ 読み込み中';status('音を準備しています…');
  try{const started=await player.play(theme(),$('timbre').value);if(n!==request||!started)return;$('play').textContent='▶ 最初から';status(sequence?'4曲を順番に再生中':'再生中 · '+theme().label);}
  catch(e){if(n!==request)return;desired=false;$('play').textContent='▶ 再生';status(e.message||'再生できませんでした。もう一度お試しください。');}
 }
 function stop(text='停止しました'){++request;desired=false;player.stop();$('play').textContent='▶ 再生';$('now-title').textContent='停止中';status(text);$('progress').style.width='0%';$('elapsed').textContent='0:00';}
 function clockMode(mode){$('clock').value=mode;sequence=false;lastTick=performance.now();$('simulation').hidden=mode!=='simulation';if(mode==='simulation'){const [h,m]=$('sim-time').value.split(':').map(Number);simMinutes=h*60+m;}tick();}
 for(const t of THEMES){const b=document.createElement('button');b.className='theme';b.dataset.slot=t.slot;b.innerHTML=`<span class="slot">${t.label}　${t.hours}</span><b>${t.title}</b>`;b.onclick=()=>{clockMode('manual');slot=t.slot;paint();if(desired)start();};$('themes').appendChild(b);const o=document.createElement('option');o.value=t.slot;o.textContent=t.label+' · '+t.title;$('quick-time').appendChild(o);}
 for(const [id,label] of regions){const o=document.createElement('option');o.value=id;o.textContent=label;$('region').appendChild(o);$('quick-region').appendChild(o.cloneNode(true));}
 $('quick-time').onchange=()=>{clockMode('manual');slot=$('quick-time').value;paint();if(desired)start();};
 $('quick-region').onchange=()=>{$('region').value=$('quick-region').value;paint();};
 $('quick-play').onclick=()=>desired?stop():start();
 $('play').onclick=()=>start();$('stop').onclick=()=>stop();
 $('sequence').onclick=()=>{clockMode('manual');sequence=true;slot='morning';paint();start();};
 $('region').onchange=()=>paint();$('timbre').onchange=()=>{if(desired)start();};
 $('volume').oninput=()=>{player.setVolume(Number($('volume').value)/100);$('volume-value').textContent=$('volume').value+'%';};
 $('clock').onchange=()=>clockMode($('clock').value);
 $('sim-time').onchange=()=>{const [h,m]=$('sim-time').value.split(':').map(Number);if(Number.isFinite(h+m)){simMinutes=h*60+m;lastTick=performance.now();tick();}};
 $('home').onload=()=>{paint();};$('reset-home').onclick=()=>{$('home').src='../../home-audition.html';};
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===$('home').contentWindow&&e.data==='home-audition-ready')paint();});
 function tick(){$('quick-play').textContent=desired?'■':'▶';$('quick-play').setAttribute('aria-label',desired?'音楽を停止':'音楽を再生');const now=performance.now(),delta=(now-lastTick)/1000;lastTick=now;const mode=$('clock').value;let minutes;
  if(mode==='device'){const date=new Date;minutes=date.getHours()*60+date.getMinutes()+date.getSeconds()/60;}
  if(mode==='simulation'){simMinutes=(simMinutes+Math.min(delta,2)*Number($('speed').value))%1440;minutes=simMinutes;}
  if(minutes!==undefined){const next=slotAt(minutes);if(next!==slot){slot=next;paint();if(desired)start();}
   const time=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(Math.floor(minutes%60)).padStart(2,'0');
   $('clock-label').textContent=(mode==='device'?'端末時刻 ':'シミュレーション ')+time+' · '+theme().label+' · 曲間は4秒のフェード';
  }else $('clock-label').textContent=sequence?'4曲連続 · 朝→昼→夕→夜':'手動切り替え · 曲間は4秒のフェード';
  const p=player.position();if(p&&desired&&!player.loading&&p.duration-p.seconds<=4){const next=nextTheme();if(next){slot=next.slot;paint();start();}}
  if(p){$('progress').style.width=Math.min(100,p.seconds/p.duration*100)+'%';$('elapsed').textContent=fmt(p.seconds)+' / '+fmt(p.duration);}
 }
 document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(document.hidden&&desired){stop('画面を離れたため停止しました。再生ボタンで再開できます');}else if(!document.hidden)tick();});
 window.addEventListener('pagehide',()=>player.stop());
 setInterval(tick,250);paint();
})();
