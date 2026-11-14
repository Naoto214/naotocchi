// Deliberately independent of AudioContext, MediaElementAudioSourceNode and MediaStream.
(function(){
 'use strict';
 const $=id=>document.getElementById(id),audio=$('nativeAudio'),params=new URLSearchParams(location.search);
 const base={6:'../audio/v6/',7:'../audio/v7/a/',8:'../audio/v7/b/'};
 const events=[];let seekTarget=Math.max(0,Number(params.get('at'))||0),generation=0;
 const log=(event,detail='')=>{events.push({at:new Date().toISOString(),event,detail});if(events.length>80)events.shift()};
 const setSession=()=>{try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){log('session-error',e.message)}};
 for(const t of window.BGM_TRACKS){const option=document.createElement('option');option.value=t.id;option.textContent=t.title;$('track').appendChild(option)}
 if(window.BGM_TRACKS.some(t=>t.id===params.get('track')))$('track').value=params.get('track');
 if(base[params.get('version')])$('version').value=params.get('version');
 function load(){
  generation++;audio.pause();audio.onloadedmetadata=null;setSession();$('heard').value='unconfirmed';$('result').value='';
  const token=generation,target=seekTarget;seekTarget=0;
  audio.onloadedmetadata=()=>{if(token!==generation)return;audio.currentTime=Math.min(target,Math.max(0,audio.duration-.1))};
  audio.src=base[$('version').value]+$('track').value+'.m4a';audio.muted=false;audio.load();$('status').textContent='標準プレーヤーの再生ボタンを押してください。';log('file-selected',audio.src);
 }
 for(const name of ['play','playing','pause','waiting','stalled','ended','error','loadedmetadata','seeking','seeked','volumechange'])audio.addEventListener(name,()=>{
  log(name,{time:audio.currentTime,readyState:audio.readyState,paused:audio.paused,error:audio.error?.code||null});
  if(name==='play')setSession();
  if(name==='playing')$('status').textContent='標準プレーヤーが再生中です。実際の音は耳で確認してください。';
  if(name==='pause')$('status').textContent='停止中です。出力切替後は再生ボタンを押してください。';
  if(name==='error')$('status').textContent='音源の再生エラー: '+audio.error?.code;
 });
 navigator.audioSession?.addEventListener('statechange',()=>log('session-state',navigator.audioSession.state));
 navigator.mediaDevices?.addEventListener('devicechange',()=>{log('devicechange');$('heard').value='unconfirmed'});
 document.addEventListener('visibilitychange',()=>log('visibility',document.visibilityState));
 $('track').addEventListener('change',load);$('version').addEventListener('change',()=>{seekTarget=audio.currentTime;load()});
 $('nativePlay').addEventListener('click',()=>{setSession();audio.play().catch(e=>{log('play-rejected',e.message);$('status').textContent='再生を開始できません: '+e.message})});
 $('report').addEventListener('click',()=>{$('result').value=JSON.stringify({revision:'speaker-check-1',path:'HTMLAudioElement direct AAC (no Web Audio)',track:$('track').value,version:$('version').value,userReportedSpeaker:$('heard').value,physicalOutput:'unknown to browser; user report only',currentTime:audio.currentTime,paused:audio.paused,muted:audio.muted,volume:audio.volume,readyState:audio.readyState,networkState:audio.networkState,error:audio.error?.code||null,sessionType:navigator.audioSession?.type||'unsupported',sessionState:navigator.audioSession?.state||'unsupported',userAgent:navigator.userAgent,events},null,2)});
 load();
})();
