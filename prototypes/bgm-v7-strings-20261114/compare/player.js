(function(){
 'use strict';
 const tracks=window.BGM_TRACKS,$=id=>document.getElementById(id);
 let context,master,source,sourceGain,selected=-1,version=6,playing=false,offset=0,anchor=0,loading=false,request=0,buffers={},volume=.7,looping=false;
 const base={6:'../audio/v7/b/',7:'../audio/v7-strings/b1/',8:'../audio/v7-strings/b2/'};
 const labels={6:'A（現在のB案）',7:'B1',8:'B2'};
 const outputEvents=[];let analyser,signal,contextSerial=0,outputEpoch=0;
 function record(event,detail=''){outputEvents.push({at:new Date().toISOString(),event,detail});if(outputEvents.length>80)outputEvents.shift()}
 function playbackSession(){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){record('audio-session-setting-error',e.message)}}
 function outputInterrupted(reason){outputEpoch++;record(reason);if(playing)pause();if(selected>=0){$('error').textContent='音声出力が中断されました。再生を押してください。無音が続く場合は「音声出力を再接続」をお試しください。'}}
 function diagnostics(){
  let rms=null;if(analyser&&signal&&context?.state==='running'){analyser.getFloatTimeDomainData(signal);rms=Math.sqrt(signal.reduce((a,x)=>a+x*x,0)/signal.length)}
  return {revision:'speaker-check-1',context:context?.state||'not-created',contextSerial,contextTime:context?.currentTime??null,sampleRate:context?.sampleRate??null,sessionType:navigator.audioSession?.type||'unsupported',sessionState:navigator.audioSession?.state||'unsupported',gain:master?.gain.value??volume,graphRms:rms,physicalOutput:'unknown: browser cannot verify speaker audibility',userAgent:navigator.userAgent,events:outputEvents.slice()};
 }
 function dropContext(){
  stopSource();const old=context;context=null;master=null;analyser=null;signal=null;
  if(old){old.onstatechange=null;old.close().catch(e=>record('close-error',e.message))}
 }
 function reconnect(){
  if(selected<0||loading)return;const token=++request,intent=outputEpoch;pause();dropContext();$('error').textContent='';
  // Resume the replacement context in this user gesture, not after an asynchronous close.
  unlock().then(()=>{if(token===request&&intent===outputEpoch)start()}).catch(e=>{$('error').textContent=e.message;record('reconnect-error',e.message)});
 }

 const format=t=>{t=Math.floor(Math.max(0,t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let html='',last='';
 tracks.forEach((t,i)=>{if(t.category!==last){if(last)html+='</ol>';html+='<h2>'+esc(t.category)+'</h2><ol>';last=t.category}html+='<li id="track-'+i+'"><button class="track" data-index="'+i+'"><span class="number">'+String(i+1).padStart(2,'0')+'</span><span><span class="title">'+esc(t.title)+'</span><span class="usage">'+esc(t.usage)+'</span></span><span class="tag">'+format(t.duration)+'</span></button><p class="change">'+esc(t.change)+'</p></li>'});$('list').innerHTML=html+'</ol>';
 function unlock(){
  playbackSession();
  if(!context){
   const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('このブラウザーでは音声比較を再生できません。');
   const active=context=new C();contextSerial++;master=context.createGain();master.gain.value=volume;
   analyser=context.createAnalyser();analyser.fftSize=2048;signal=new Float32Array(analyser.fftSize);
   master.connect(analyser);analyser.connect(context.destination);
   context.onstatechange=()=>{if(context!==active)return;record('context-state',context.state);if(context.state!=='running')outputInterrupted('context-'+context.state);update()};
   context.addEventListener('sinkchange',()=>{if(context===active)outputInterrupted('sinkchange')});
   record('context-created',contextSerial);
  }
  const active=context;return active.resume().then(()=>{if(context===active&&active.state!=='running')throw Error('音声出力を開始できません。再生をもう一度押してください。')});
 }

 function duration(){return selected<0?0:tracks[selected].duration}
 function position(){let t=offset+(playing?context.currentTime-anchor:0);return looping&&duration()?t%duration():Math.min(t,duration())}
 function stopSource(){if(source){source.onended=null;const old=source,gain=sourceGain;gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(gain.gain.value,context.currentTime);gain.gain.linearRampToValueAtTime(0,context.currentTime+.012);old.stop(context.currentTime+.014);old.onended=()=>{old.disconnect();gain.disconnect()};source=null}}
 function start(){if(selected<0||loading||!buffers[version])return;if(context?.state!=='running'||navigator.audioSession?.state==='interrupted'||document.hidden){outputInterrupted('start-without-running-context');update();return;} $('error').textContent='';stopSource();if(offset>=duration())offset=0;source=context.createBufferSource();sourceGain=context.createGain();source.buffer=buffers[version];source.loop=looping;source.loopStart=0;source.loopEnd=duration();source.connect(sourceGain);sourceGain.connect(master);sourceGain.gain.setValueAtTime(0,context.currentTime);sourceGain.gain.linearRampToValueAtTime(1,context.currentTime+.012);anchor=context.currentTime;playing=true;const current=source;source.onended=()=>{if(source!==current)return;offset=duration();playing=false;source=null;current.disconnect();sourceGain.disconnect();update()};source.start(anchor,offset);update()}
 function pause(){offset=position();playing=false;stopSource();update()}
 function update(){document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.version===version)));$('pause').textContent=playing?'一時停止':'再生';$('pause').disabled=selected<0||loading;$('status').textContent=loading?'A・B1・B2を読み込み中…':playing?labels[version]+' 再生中':selected<0?'待機中':'一時停止';$('seek').disabled=selected<0||loading;$('reconnect').disabled=selected<0||loading}
 async function loadAudio(v,t,signal){const response=await fetch(base[v]+t.id+'.m4a',{signal});if(!response.ok)throw Error('音源を読み込めません（'+response.status+'）。');const data=await response.arrayBuffer();return new Promise((resolve,reject)=>context.decodeAudioData(data,resolve,reject))}
 let controller;
 async function select(i,pos=0){const token=++request;try{await unlock();if(token!==request)return;pause();if(controller)controller.abort();controller=new AbortController();if(selected>=0)$('track-'+selected).classList.remove('current');selected=i;offset=pos;buffers={};loading=true;const intent=outputEpoch;$('error').textContent='';$('track-'+i).classList.add('current');$('nowTitle').textContent=tracks[i].title;$('seek').max=Math.round(duration()*1000);$('duration').textContent=format(duration());update();const pair=await Promise.all([6,7,8].map(v=>loadAudio(v,tracks[i],controller.signal)));if(token!==request)return;buffers={6:pair[0],7:pair[1],8:pair[2]};loading=false;if(intent===outputEpoch)start();else update()}catch(e){if(token!==request||e.name==='AbortError')return;loading=false;playing=false;$('error').textContent=e.message+' 曲をもう一度選ぶと再試行できます。';update()}}
 function switchVersion(v){if(v===version)return;const running=playing;offset=position();version=v;if(running)start();else update()}
 $('list').addEventListener('click',e=>{const b=e.target.closest('.track');if(b)select(+b.dataset.index)});
 document.querySelectorAll('[data-climax]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.climax;select(i,tracks[i].climax)}));
 document.querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>switchVersion(+b.dataset.version)));
 $('pause').addEventListener('click',()=>{if(playing)pause();else unlock().then(start).catch(e=>{$('error').textContent=e.message})});
 $('seek').addEventListener('input',()=>{$('position').textContent=format(+$('seek').value/1000)});
 $('seek').addEventListener('change',()=>{const running=playing;offset=+$('seek').value/1000;anchor=context?.currentTime||0;if(running)start();else update()});
 $('loop').addEventListener('change',()=>{offset=position();looping=$('loop').checked;if(playing)start()});
 $('volume').addEventListener('input',()=>{volume=+$('volume').value;if(master)master.gain.setTargetAtTime(volume,context.currentTime,.01)});
 $('jump36').addEventListener('click',()=>select(tracks.findIndex(t=>t.id==='home-day'),34));
 function tick(){if(selected>=0){const p=position();$('position').textContent=format(p);if(document.activeElement!==$('seek'))$('seek').value=Math.round(p*1000)}requestAnimationFrame(tick)}tick();
 $('reconnect').addEventListener('click',reconnect);
 $('outputCheck').addEventListener('click',()=>{pause();$('outputCheck').href='output-check.html?track='+encodeURIComponent(tracks[selected]?.id||tracks[0].id)+'&version='+version+'&at='+offset;dropContext()});
 $('diagnosticRefresh').addEventListener('click',()=>{$('diagnosticText').value=JSON.stringify(diagnostics(),null,2)});
 navigator.audioSession?.addEventListener('statechange',()=>{record('session-state',navigator.audioSession.state);if(navigator.audioSession.state==='interrupted')outputInterrupted('session-interrupted')});
 // Safari does not reliably expose route-change events. Never assume a devicechange proves a speaker route.
 navigator.mediaDevices?.addEventListener('devicechange',()=>{outputInterrupted('devicechange');if(context)context.suspend().catch(e=>record('suspend-error',e.message))});
 document.addEventListener('visibilitychange',()=>{record('visibility',document.visibilityState);if(document.hidden&&context){outputInterrupted('page-hidden');context.suspend().catch(e=>record('suspend-error',e.message))}});
 window.BGM_COMPARE={tracks,diagnostics,state:()=>({id:tracks[selected]?.id,version,playing,position:position(),loading,volume})};
})();
