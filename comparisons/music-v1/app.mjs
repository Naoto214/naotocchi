import {AuditionBus} from './player.mjs';
const $=s=>document.querySelector(s),status=$('#status');
let storage;try{storage=window.localStorage}catch{storage={getItem:()=>null,setItem:()=>{}}}
const bus=new AuditionBus({storage,onState:text=>status.textContent=text});
let legacyScene='home',legacyActive=false,action=0;
const legacyState={stage:'alive',isSleeping:false,lifetime:{soundBgm:false,soundSfx:false,quickVoice:'off'}};
const old=installNaotocchiAudio({nativeSetTimeout:setTimeout,getState:()=>legacyState,STAGE:{DEAD:'dead',FAREWELL:'farewell'},el:{},isGameActive:()=>['game','race','puzzle','sports'].includes(legacyScene),getActiveMinigame:()=>({}),minigameGenreId:()=>({race:'drive3d',puzzle:'puzzle',sports:'sports',game:'action'})[legacyScene],isDateOpen:()=>legacyScene==='movie'});
function legacyOff(){legacyActive=false;legacyState.lifetime.soundBgm=false;old.settingsChanged();const c=old._debug().ctx;if(c)c.suspend().catch(()=>{});}
function mark(id){document.querySelectorAll('.card').forEach(e=>e.classList.toggle('playing',e.id===id));}
async function play(t,offset=0){const token=++action;legacyOff();mark(t.id);try{if(!bus.settings.enabled){await bus.setEnabled(true);$('#enabled').checked=true;}if(token!==action)return;await bus.play(t,{offset});}catch(e){status.textContent=e.message;}}
async function legacyPlay(scene){const token=++action;await bus.stop();if(token!==action)return;bus.settings.enabled=true;bus.save();$('#enabled').checked=true;legacyScene=scene;legacyState.stage=scene==='farewell'?'dead':'alive';legacyState.isSleeping=scene==='night';legacyState.lifetime.soundBgm=true;legacyActive=true;old.settingsChanged();const d=old._debug();if(d.ctx){await d.ctx.resume();if(d.master)d.master.gain.value=.9*bus.settings.bgm;}status.textContent='現行 '+scene+' 再生中';mark(null);}
$('#enabled').checked=bus.settings.enabled;$('#volume').value=bus.settings.bgm;$('#sfx').value=bus.settings.sfx;
$('#stop').onclick=()=>{++action;legacyOff();bus.stop();mark(null);};
$('#enabled').onchange=e=>{legacyOff();bus.setEnabled(e.target.checked);};
$('#volume').oninput=e=>{bus.setVolume('bgm',e.target.value);const d=old._debug();if(d.master)d.master.gain.value=.9*bus.settings.bgm;};
$('#sfx').oninput=e=>bus.setVolume('sfx',e.target.value);
$('#sfx-test').onclick=()=>bus.testSfx().catch(e=>status.textContent=e.message);
$('[data-legacy]').onclick=()=>legacyPlay('home').catch(e=>status.textContent=e.message);
$('#legacy-play').onclick=()=>legacyPlay($('#legacy-select').value).catch(e=>status.textContent=e.message);
document.addEventListener('visibilitychange',()=>{if(legacyActive){if(document.hidden)old._debug().ctx?.suspend().catch(()=>{});else old._debug().ctx?.resume().catch(()=>status.textContent='再生ボタンで再開してください');}bus.visibility(document.hidden);});
window.addEventListener('pagehide',()=>{legacyOff();bus.visibility(true);});
window.addEventListener('pageshow',()=>{if(!document.hidden)bus.visibility(false);});
const tracks=await fetch('manifest.json').then(r=>{if(!r.ok)throw Error('一覧を読み込めません');return r.json()});
for(const [i,t] of tracks.entries()){
 const card=document.createElement('article');card.className='card';card.id=t.id;
 const num=document.createElement('div');num.className='number';num.textContent=String(i+1).padStart(2,'0')+' / '+t.scene;
 const title=document.createElement('h3');title.textContent=t.title;
 const meta=document.createElement('p');meta.className='meta';meta.textContent=`${t.bpm} BPM · ${t.key} · ${t.seconds.toFixed(1)}秒\n${t.instruments}\nMP3 / ${(t.bytes/1024).toFixed(0)} KB`;meta.style.whiteSpace='pre-line';
 const buttons=document.createElement('div');buttons.className='buttons';
 const start=document.createElement('button');start.className='primary';start.textContent='▶ 試聴';start.onclick=()=>play(t);
 const seam=document.createElement('button');seam.textContent='ループ境界';seam.onclick=async()=>{await bus.stop();await play(t,t.seconds-3)};
 const download=document.createElement('a');download.className='download';download.textContent='MP3';download.href=t.file;download.download=t.id+'.mp3';
 buttons.append(start,seam,download);
 const memo=document.createElement('textarea');memo.placeholder='好きなところ・気になるところ';memo.setAttribute('aria-label',t.title+'の感想');try{memo.value=storage.getItem('music-v1:note:'+t.id)||'';}catch{}memo.oninput=()=>{try{storage.setItem('music-v1:note:'+t.id,memo.value)}catch{}};
 card.append(num,title,meta,buttons,memo);(i<3?$('#themes'):$('#worlds')).append(card);
}
