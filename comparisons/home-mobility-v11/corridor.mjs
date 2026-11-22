const get = id => document.getElementById(id);
const region=get('region'),result=get('result'),apply=get('apply'),walk=get('walk');
const view=document.querySelector('.view'),frame=view.querySelector('iframe');
const controls=[...document.querySelectorAll('[data-mode]')];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const records=new Map();
let mode='guard',generation=0,last=null,description='';
new ResizeObserver(()=>{
  const scale=view.clientWidth/320;frame.style.transform='scale('+scale+')';view.style.height=516*scale+'px';
}).observe(view);
function problem(error) {
  result.textContent='この場面を再生できません。'+error.message;
  apply.disabled=true;walk.disabled=true;document.body.dataset.ready='false';
}
async function restore() {
  const id=++generation,key=region.value;
  controls.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
  apply.disabled=true;walk.disabled=true;last=null;description='';
  document.body.dataset.ready='false';
  result.textContent='記録の住民と背景を読み込んでいます…';
  try {
    const path=new URL('../game/mobility-v11-corridor-'+key+'.html',location.href);
    path.search=new URLSearchParams({region:key,count:10,time:'day',paused:1,ground:'on',variant:'B',policy:'B',
      layout:'optimized',curve:'linear',compareSplit:0,paired:1,trialSeed:214,diagnostics:0});
    const loaded=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    frame.src=path.href;await loaded;
    const win=frame.contentWindow,deadline=performance.now()+100000;
    while(!(win.FootCorridorReplay && win.HomeCastTrial?.ready && win.HomeDragTrial?.opening())){
      if(id!==generation)return;
      if(performance.now()>deadline)throw Error('地形を読み込めませんでした。');
      await sleep(90);
    }
    if(!records.has(key))records.set(key,fetch('./corridor-'+key+'.json').then(async response=>{
      if(!response.ok)throw Error('足位置の記録を読み込めません。');return response.json();
    }).catch(error=>{records.delete(key);throw error;}));
    const record=await records.get(key);
    await Promise.all([...frame.contentDocument.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()));
    if(id!==generation)return;
    const restored=win.FootCorridorReplay.restore(record);
    result.textContent=Math.round(restored.clock)+'秒時点の10体を元の足位置に戻しました。';
    apply.disabled=false;document.body.dataset.ready='true';document.body.dataset.phase='opening';
  } catch(error){if(id===generation)problem(error);}
}
apply.addEventListener('click',()=>{
  apply.disabled=true;
  try {
    last=frame.contentWindow.FootCorridorReplay.apply(mode);
    const panda=last.change.find(a=>a.key==='companion:panda').css;
    const action=last.held?'元の足位置を保持しました。':mode==='native'?'通常の配置を使いました。':
      last.oldRays===0?'以前の足位置では長い退路を確かめられず、通常の配置を使いました。':'保持条件が合わず、通常の配置を使いました。';
    description=action+' パンダの変位 '+panda.toFixed(2)+' CSS px。主人公の長い退路は96方向中、配置前 '+last.oldRays+'方向、配置後 '+last.rays+'方向です。';
    result.textContent=description;walk.disabled=!last.canWalk;document.body.dataset.phase='arranged';
  }catch(error){problem(error);}
});
walk.addEventListener('click',async()=>{
  const id=generation;walk.disabled=true;
  try {
    const api=frame.contentWindow.FootCorridorReplay;
    let travel=api.begin();
    result.textContent=description+' 主人公の歩行を再生しています。';
    while(!travel.done) {
      await sleep(50);if(id!==generation)return;
      travel=api.step();
    }
    result.textContent=description+' 主人公は'+travel.walked.toFixed(2)+' CSS px歩き、'+(travel.arrived?'退路の終点に到着しました。':'途中で停止しました。');
    document.body.dataset.phase='finished';
    last={...last,travel};
  }catch(error){if(id===generation)problem(error);}
});
controls.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;restore();}));
region.addEventListener('change',restore);get('restart').addEventListener('click',restore);
window.FootCorridorComparison=Object.freeze({read:()=>last?structuredClone(last):null});
restore();
