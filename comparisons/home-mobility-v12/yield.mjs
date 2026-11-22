const byId=id=>document.getElementById(id);
const bearing=byId('bearing'),rate=byId('rate'),play=byId('play'),live=byId('live'),pause=byId('pause'),reset=byId('reset'),
  message=byId('status'),participants=byId('participants'),frame=document.querySelector('iframe'),stage=document.querySelector('.view');
function fit(){
  const scale=stage.clientWidth/375;
  frame.style.transform='scale('+scale+')';
  stage.style.height=792*scale+'px';
}
new ResizeObserver(fit).observe(stage);
let data,api,win,paused=true,playing=false,request=0,last=0,elapsed=0,previous='',names=new Map();
const person=key=>names.get(key)||key;
function selected(){return data.routes[bearing.selectedIndex];}
function describe(){
  const route=selected();
  const labels=route.steps.map((s,i)=>person(s.who)+(i===route.steps.length-1?'':s.ends.length===2?'（途中で曲がる）':'（直進）'));
  participants.textContent=labels.join(' → ');
  const lost=data.lastExits?.[route.degrees];
  byId('exits').textContent=lost?.length?'記録の終点で単独8pxの退路が塞がる住民 · '+lost.map(person).join('、'):'';

}
function stop(){
  if(request)cancelAnimationFrame(request);
  request=0;last=0;elapsed=0;
}
function recover(error){
  stop();playing=false;paused=true;pause.disabled=true;play.disabled=!api;reset.disabled=!api;
  message.textContent=error?.message || '再生できませんでした。';
}
function opening(){
  stop();playing=false;paused=true;previous='';
  api.reset(data);win.paintYieldReplay();play.disabled=false;reset.disabled=false;pause.disabled=true;pause.textContent='一時停止';
  live.disabled=!api.status().searchAvailable; describe();message.textContent='開始位置 · 28体';
}
function draw(time){
  request=0;if(paused || !playing)return;
  try{
    elapsed+=Math.min(.1,last?(time-last)/1000:0)*Number(rate.value);last=time;
    let report=api.status();
    for(;elapsed>=1/120 && report.state==='playing';elapsed-=1/120)report=api.advance();
    win.paintYieldReplay();
    const label=report.native ? (report.state==='playing'?(report.who?person(report.who)+'が歩いています':'道を確かめています…'):
      (report.state==='arrived'?'タヌキが到着':report.state==='partial'?'安全な途中地点まで移動':'この条件で経路は成立しませんでした')+' · '+report.message) : report.state==='arrived'?'タヌキが到着 · '+report.distanceCSS.toFixed(2)+' CSS px':
      person(report.who || selected().steps[Math.min(report.index,selected().steps.length-1)].who)+'が歩いています';
    if(label!==previous){message.textContent=label;previous=label;}
    if(report.state!=='playing'){
      playing=false;paused=true;play.disabled=false;live.disabled=!report.searchAvailable;pause.disabled=true;return;
    }
    request=requestAnimationFrame(draw);
  }catch(error){recover(error);}
}
function run(native=false){
  try{
    opening();if(native)api.startNative(selected().degrees);else api.start(selected().steps);playing=true;paused=false;play.disabled=true;live.disabled=true;pause.disabled=false;request=requestAnimationFrame(draw);
  }catch(error){recover(error);}
}
function toggle(){
  if(!playing)return;
  paused=!paused;pause.textContent=paused?'再開':'一時停止';
  if(paused){stop();message.textContent='一時停止中';previous='';}
  else {previous='';request=requestAnimationFrame(draw);}
}
play.addEventListener('click',()=>run(false));live.addEventListener('click',()=>run(true));
pause.addEventListener('click',toggle);
reset.addEventListener('click',()=>{try{opening();}catch(e){recover(e);}});
bearing.addEventListener('change',()=>{try{opening();}catch(e){recover(e);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)toggle();});
async function load(){
  const response=await fetch('./yield-recording.json');
  if(!response.ok)throw Error('記録を読み込めませんでした。');
  data=await response.json();
  for(const r of data.routes){
    const o=document.createElement('option');o.value=String(r.degrees);o.textContent=r.degrees+'°';bearing.append(o);
  }
  const url=new URL('../game/mobility-v12-yield.html',location.href);
  url.search=new URLSearchParams({region:'forest',time:'day',season:'autumn',weather:'sunny',count:28,
    trialSeed:data.seed,paused:1,clock:0,variant:'B',ground:'on',paired:1,waitForPainting:1});
  await new Promise(resolve=>{frame.onload=resolve;frame.src=url.href;});
  win=frame.contentWindow;
  const until=performance.now()+90000;
  while(!win.HomeYieldReplay || !win.HomeCastTrial?.ready || !win.HomeDragTrial?.opening()){
    if(performance.now()>until)throw Error('森を開けませんでした。ページを再読み込みできます。');
    await new Promise(r=>setTimeout(r,80));
  }
  await Promise.all([...frame.contentDocument.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()));
  names=new Map(win.HomeCastTrial.inspect().map(item=>[item.key,item.label||item.name||item.key]));
  api=win.HomeYieldReplay;opening();
}
load().catch(recover);
