const byId = id => document.getElementById(id);
const bearing = byId('bearing'), rate = byId('rate'), scene = byId('scene'), version = byId('version'), entry=byId('entry');
const play = byId('play'), live = byId('live'), pause = byId('pause'), reset = byId('reset');
const message = byId('status'), participants = byId('participants'), outcome = byId('outcome-exits');
const frame = document.querySelector('iframe'), stage = document.querySelector('.view');
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
const isStone = () => scene.value.startsWith('stone');
const sceneWidth = () => isStone()?390:375;
function fit() {
  const scale = stage.clientWidth/sceneWidth();
  frame.style.transform = 'scale('+scale+')';
  stage.style.height = 792*scale+'px';
}
new ResizeObserver(fit).observe(stage);

let data, api, win, paused=true, playing=false, request=0, last=0, elapsed=0, previous='';
let revision=0, diagnosis=0, names=new Map(), stoneExits=null;
const person=key => names.get(key)||key;
const subject=() => isStone()?data.stone.key:scene.value==='opening' ? data.key : scene.value==='cat' ? 'companion:cat_friend' : 'pet:dog';
const state=() => isStone()?{...data.stone,goalPoint:scene.value==='stone'?data.stone.goalPoint:null}:scene.value==='opening' ? data : {...data,key:subject(),feet:data.minuteFeet};
const selected=() => isStone()?{degrees:scene.value==='stone-near'?data.stone.nearDegrees:0}:scene.value==='opening' ? data.routes[bearing.selectedIndex] : {degrees:scene.value==='cat'?120:180};

function stop() {
  if(request)cancelAnimationFrame(request);
  request=0;last=0;elapsed=0;
}
function recover(error) {
  stop();playing=false;paused=true;pause.disabled=true;play.disabled=!api;reset.disabled=!api;
  message.textContent=error?.message||'再生できませんでした。';
}
function describe() {
  const route=selected(), recording=scene.value==='opening';
  play.hidden=!recording;
  bearing.disabled=!recording;
  participants.textContent=recording ? route.steps.map((s,i)=>person(s.who)+
    (i===route.steps.length-1?'':s.ends.length===2?'（途中で曲がる）':'（直進）')).join(' → ') :
    isStone()?'要求404・記録270.19ゲーム秒の28体。'+(scene.value==='stone'?'石像が要求した元の目標まで314.44px。':'同じ足位置で新たに与える近い目標、160°・8.01px。'):'開始'+data.minuteClock.toFixed(2)+'ゲーム秒の足位置 · '+person(subject())+'への指示は10 CSS px';
  const lost=recording?data.lastExits?.[route.degrees]:null;
  byId('exits').textContent=lost?.length?'V11の記録終点で単独8pxの退路が塞がる住民 · '+lost.map(person).join('、'):'';
  live.textContent=(version.value==='v11'?'V11':'V12')+'が道を探す';
}
function opening() {
  diagnosis++;stop();playing=false;paused=true;previous='';outcome.textContent='';
  api.reset(state());win.paintYieldReplay();play.disabled=false;reset.disabled=false;pause.disabled=true;pause.textContent='一時停止';
  live.disabled=false;describe();message.textContent='開始位置 · 28体';
}
function setScene() {
  bearing.replaceChildren();
  const headings=scene.value==='opening'?data.routes.map(r=>r.degrees):isStone()?[scene.value==='stone'?'記録した目標':160]:[scene.value==='cat'?120:180];
  for(const deg of headings){const o=document.createElement('option');o.value=String(deg);o.textContent=typeof deg==='number'?deg+'°':deg;bearing.append(o);}
  opening();
}
async function exitReport() {
  const epoch=++diagnosis,base=isStone()?stoneExits:scene.value==='opening'?data.openingExits:data.minuteExits;
  const now=new Map(),keys=Object.keys(base),currentSubject=subject();
  outcome.textContent='道譲り後の28体の退路を確認しています…';
  for(const key of keys) {
    if(epoch!==diagnosis)return;
    now.set(key,api.exitCount(key));
    await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(epoch!==diagnosis)return;
  const lost=keys.filter(k=>k!==currentSubject && base[k]>0 && now.get(k)===0);
  const gained=keys.filter(k=>k!==currentSubject && base[k]===0 && now.get(k)>0);
  const list=keys=>keys.length?keys.map(person).join('、'):'該当なし';
  outcome.textContent='終点で周囲が静止した場合の単独8pxの退路。ほかの27体で最後の方向が閉じた住民 · '+list(lost)+
    '。新たに方向が開いた住民 · '+list(gained)+'。';
}
function draw(time) {
  request=0;if(paused||!playing)return;
  try {
    elapsed+=Math.min(.1,last?(time-last)/1000:0)*Number(rate.value);last=time;
    let report=api.status();
    const dt=report.stepSeconds;
    for(;elapsed>=dt && report.state==='playing';elapsed-=dt)report=api.advance();
    win.paintYieldReplay();
    let label;
    if(report.native) {
      label=report.state==='playing'?(report.who?person(report.who)+'が歩いています':'道を確かめています…'):
        (report.state==='arrived'?'指示地点に到着':report.state==='partial'?'指示点とは異なる位置まで移動':'この条件で経路は成立しませんでした')+' · '+report.message;
    } else {
      label=report.state==='arrived'?'タヌキが到着 · '+report.distanceCSS.toFixed(2)+' CSS px':
        person(report.who||selected().steps[Math.min(report.index,selected().steps.length-1)].who)+'が歩いています';
    }
    if(label!==previous){message.textContent=label;previous=label;}
    if(report.state!=='playing') {
      playing=false;paused=true;play.disabled=false;live.disabled=false;pause.disabled=true;
      if(report.native) {
        if(report.stages.length)participants.textContent=report.stages.map(s=>person(s.who)+(s.turn?'（途中で曲がる）':'（直進）')).concat(person(subject())).join(' → ');
        exitReport().catch(recover);
      }
      return;
    }
    request=requestAnimationFrame(draw);
  }catch(error){recover(error);}
}
function run(native=false) {
  try {
    opening();
    if(native)api.startNative(selected().degrees,isStone()?data.stone.nearRadius:scene.value==='opening'?8:10,entry.value);
    else api.start(selected().steps);
    playing=true;paused=false;play.disabled=true;live.disabled=true;pause.disabled=false;request=requestAnimationFrame(draw);
  }catch(error){recover(error);}
}
function toggle() {
  if(!playing)return;
  paused=!paused;pause.textContent=paused?'再開':'一時停止';
  if(paused){stop();message.textContent='一時停止中';previous='';}
  else {previous='';request=requestAnimationFrame(draw);}
}
async function loadVersion() {
  const epoch=++revision;diagnosis++;stop();playing=false;paused=true;api=null;
  play.disabled=true;live.disabled=true;pause.disabled=true;reset.disabled=true;scene.disabled=true;
  message.textContent='28体を読み込んでいます…';outcome.textContent='';
  const suffix=version.value==='v11'?'-baseline':'';
  const url=new URL('../game/mobility-v12-yield'+suffix+'.html',location.href);
  stage.style.maxWidth=sceneWidth()+'px';frame.style.width=sceneWidth()+'px';fit();
  url.search=new URLSearchParams({region:'forest',time:'day',season:'autumn',weather:'sunny',count:28,
    trialSeed:isStone()?data.stone.seed:data.seed,scenario:scene.value,paused:1,clock:0,variant:'B',ground:'on',paired:1,waitForPainting:1});
  frame.src=url.href;
  const until=performance.now()+120000;
  while(epoch===revision){
    win=frame.contentWindow;
    if(win?.location.href===url.href&&win.HomeYieldReplay&&win.HomeCastTrial?.ready&&win.HomeDragTrial?.opening())break;
    if(performance.now()>until)throw Error('森を開けませんでした。ページを再読み込みできます。');
    await sleep(80);
  }
  if(epoch!==revision)return;
  await Promise.all([...frame.contentDocument.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()));
  if(epoch!==revision)return;
  names=new Map(win.HomeCastTrial.inspect().map(item=>[item.key,item.label||item.name||item.key]));
  api=win.HomeYieldReplay;setScene();
  if(isStone() && !stoneExits) {
    const counts={};live.disabled=true;reset.disabled=true;
    for(const [id] of data.stone.feet){
      if(epoch!==revision)return;
      counts[id]=api.exitCount(id);
      await sleep(0);
    }
    stoneExits=counts;
  }
  if(epoch!==revision)return;
  live.disabled=false;reset.disabled=false;scene.disabled=false;
}
play.addEventListener('click',()=>run(false));live.addEventListener('click',()=>run(true));
pause.addEventListener('click',toggle);
reset.addEventListener('click',()=>{try{opening();}catch(e){recover(e);}});
bearing.addEventListener('change',()=>{try{opening();}catch(e){recover(e);}});
entry.addEventListener('change',()=>{if(api){try{opening();}catch(e){recover(e);}}});
scene.addEventListener('change',()=>{entry.value=isStone()?'ordinary':'waiting';loadVersion().catch(recover);});
version.addEventListener('change',()=>{loadVersion().catch(recover);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)toggle();});
fetch('./yield-recording.json').then(response=>{
  if(!response.ok)throw Error('記録を読み込めませんでした。');return response.json();
}).then(value=>{
  data=value;
  const params=new URLSearchParams(location.search);
  if([...scene.options].some(o=>o.value===params.get('scene')))scene.value=params.get('scene');
  if(params.get('arm')==='v11')version.value='v11';
  entry.value=params.get('entry')==='ordinary'||isStone()?'ordinary':'waiting';
  return loadVersion();
}).catch(recover);
