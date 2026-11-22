import {restoreOwl,matchesForestCamera} from './goal-owl-scene.mjs';
const $=s=>document.querySelector(s);
const keys=['original','after'];
const names={original:'従来',after:'拒否後の探索'};
const frames=Object.fromEntries(keys.map(k=>[k,$('[data-arm="'+k+'"]')]));
const status=$('#status'),ring=$('.ring');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let revision=0,recording;
const receipts=new Map();

function draw(mode,point){
  for(const key of keys)frames[key].setAttribute('aria-hidden',String(key!==mode));
  // Each untouched game iframe keeps the original 320 × 792 camera. Crop the
  // controls above/below the scene and put the circle on its native foot.
  const offset=Math.round(Math.max(0,Math.min(472,point.stage[1]+250)));
  for(const frame of Object.values(frames))frame.style.top=-offset+'px';
  ring.style.left=point.owl[0]+'px';ring.style.top=point.owl[1]-offset+2+'px';ring.hidden=false;
}
function restore(mode){
  const replay=restoreOwl(frames[mode].contentWindow,...recording);
  draw(mode,replay.initial);
  return replay;
}
async function run(mode,id){
  const replay=restore(mode);
  status.textContent=names[mode]+'の足位置を復元しました。';
  await sleep(500);
  const steps=[];
  let result;
  for(let i=0;i<10;i++){
    if(id!==revision)return false;
    result=replay.next();
    draw(mode,result.painted);
    steps.push({foot:result.foot,painted:result.painted.owl,body:result.painted.bodyTranslation,distance:result.distance});
    await sleep(125);
  }
  if(id!==revision)return false;
  const message=result.arrived?'終点に到着しました。':'この指示では移動を開始しませんでした。';
  status.textContent=names[mode]+'　'+result.distance.toFixed(2)+' CSS px。'+message;
  receipts.set(mode,{accepted:replay.accepted,origin:replay.initial,steps,arrived:result.arrived});
  document.body.dataset.finished=mode;
  return true;
}
async function play(modes){
  const id=++revision;
  document.body.dataset.finished='';
  try{
    for(const mode of modes){
      if(!await run(mode,id))return;
      if(id!==revision)return;
      if(mode!==modes.at(-1))await sleep(900);
      if(id!==revision)return;
    }
  }catch(error){status.textContent='再生を中断しました。'+error.message;}
}
async function ready(mode){
  const frame=frames[mode];
  const url=new URL('../game/mobility-v11-owl-'+mode+'.html',location.href);
  url.search=new URLSearchParams({region:'forest',count:28,paired:1,paused:1,variant:'B',ground:'on',time:'day',weather:'sunny',season:'autumn',clock:0,waitForPainting:1,trialSeed:214});
  const load=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
  frame.src=url.href;
  await load;
  const w=frame.contentWindow,deadline=performance.now()+75000;
  while(!(w.OwlReplayPaint && w.HomeCastTrial?.ready && w.HomeDragTrial?.opening())){
    if(performance.now()>deadline)throw Error('森の読み込みが完了していません。');
    await sleep(80);
  }
  await Promise.all([...frame.contentDocument.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()));
}
try{
  const json=async name=>{const reply=await fetch(name);if(!reply.ok)throw Error('記録を読み込めません。');return reply.json();};
  [recording]=await Promise.all([Promise.all(['owl-forest.json','owl-request.json'].map(json)),...keys.map(ready)]);
  // The native camera can perform a final painted-asset fit after ready.
  // Wait through its transition before restoring the recorded CSS coordinates.
  const deadline=performance.now()+20000;
  let stable=0;
  while(stable<3){
    const matched=keys.every(key=>matchesForestCamera(frames[key].contentWindow.OwlReplayPaint.projection(),recording[0]));
    stable=matched?stable+1:0;
    if(performance.now()>deadline)throw Error('森の表示位置を復元できませんでした。');
    await sleep(70);
  }
  for(const mode of keys)restore(mode);
  restore('original');
  status.textContent='28体を同じ足位置に戻しました。';
  for(const [k,list] of [['both',keys],...keys.map(k=>[k,[k]])]){
    $('#'+k).disabled=false;
    $('#'+k).addEventListener('click',()=>play(list));
  }
  window.OwlComparison=Object.freeze({receipt:mode=>receipts.get(mode)});
  document.body.dataset.ready='true';
}catch(error){status.textContent='記録を再生できません。'+error.message;}
