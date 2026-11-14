import {mountOfficialFrame} from '../../prototypes/life-sugoroku/official-host-v4.js';
import {POOLS,GAME_NAMES} from '../../prototypes/life-sugoroku/tournament-v4.mjs';
const $=id=>document.getElementById(id),key='naokoro-minigame-qa-v7';
let host,epoch=0,save=null,savedMatch=null,paused=false,tournament=null,last=null;
for(const [pool,ids] of Object.entries(POOLS)){
 const group=document.createElement('optgroup');group.label=pool==='quick'?'クイック':'通常ゲーム';
 for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=GAME_NAMES[id];group.append(option);} $('game').append(group);
}
function buttons(){for(const id of ['pause','resume','skip'])$(id).disabled=!host||last?.done||(id==='skip'&&!last?.cpu)||(id==='resume'&&!paused)||(id==='pause'&&paused);$('restore').disabled=!save;}
function report(snapshot){last=snapshot;$('report').textContent=JSON.stringify(snapshot,null,2);buttons();}
async function launch(options,keep=false){
 const generation=++epoch;host?.destroy();host=null;paused=false;last=null;
 if(!keep)tournament=null;
 $('status').textContent='正式ゲームを準備しています…';buttons();
 try{
 const mounted=await mountOfficialFrame($('host'),{onSnapshot:s=>{
  if(generation!==epoch)return;report(s);
  if(paused){save=structuredClone(s);savedMatch=structuredClone(tournament);sessionStorage.setItem(key,JSON.stringify({attempt:save,match:savedMatch}));$('status').textContent='保存しました。';buttons();}
  else $('status').textContent=s.done?`${GAME_NAMES[s.gameId]}：${s.score}点`:`${s.cpu?'CPU':'あなた'}の挑戦${tournament?'（'+(tournament.rows.length+1)+'／4）':''}`;
  if(s.done&&tournament){const match=tournament;tournament=null;match.rows.push(s);
   if(match.rows.length<4){tournament=match;void launch({...match.options,cpuSeed:101+match.rows.length},true);}
   else {const body=$('results').querySelector('tbody');body.replaceChildren();for(const [i,row]of match.rows.entries()){const rank=1+match.rows.filter(x=>x.score>row.score).length,tr=document.createElement('tr');for(const value of [i+1,row.score,rank,'＋'+(20-5*rank)+(POOLS.quick.includes(row.gameId)?' お金':' そだち')]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}$('results').hidden=false;window.qaResult=match.rows;}
  }
 },onError:e=>{if(generation===epoch){$('status').textContent='エラー：'+e;window.qaError=String(e);}}});
 if(generation!==epoch){mounted.destroy();return;}host=mounted;await host.start(options);buttons();
 }catch(e){$('status').textContent='開始できません：'+e;window.qaError=String(e);}
}
function start(cpu,four=false){save=null;savedMatch=null;sessionStorage.removeItem(key);$('results').hidden=true;window.qaResult=null;window.qaError=null;
 const options={gameId:$('game').value,seed:3,cpuSeed:101,cpu,difficulty:$('difficulty').value};
 tournament=four?{options,rows:[]}:null;void launch(options,four);
}
$('human').onclick=()=>start(false);$('cpu').onclick=()=>start(true);$('four').onclick=()=>start(true,true);
$('pause').onclick=()=>{paused=true;host?.pause();buttons();};$('resume').onclick=()=>{paused=false;host?.resume();buttons();};
$('restore').onclick=()=>{if(save){tournament=structuredClone(savedMatch);void launch(structuredClone(save),!!tournament);}};$('skip').onclick=()=>host?.speed(60);
try{const raw=sessionStorage.getItem(key);if(raw){const stored=JSON.parse(raw);save=stored.attempt||stored;savedMatch=stored.match||null;buttons();}}catch{sessionStorage.removeItem(key);}
// Development-only hooks; the production package/allowlist never includes tools/.
window.minigameQA={start:options=>launch(options),snapshot:()=>last,pause:()=>{$('pause').click();},restore:()=>{$('restore').click();},speed:value=>host?.speed(value)};
