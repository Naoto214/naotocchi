const $ = id => document.getElementById(id);
const frame=document.querySelector('iframe'), stage=$('scene'), scrub=$('tick'), mark=$('mark');
const labels={'companion:clock':'時計','companion:hedgehog':'ハリネズミ','companion:hamster':'ハムスター'};
let tape, poses, win, edition='shipped', index=0, raf=0, startTime=0, startFrame=0, crops, ready=false;

function decode(arm) {
  const current=[];
  return arm.frames.map(changes=>{
    for(const [i,...values] of changes)current[i]=values;
    return current.slice();
  });
}
const clock=()=>tape.start+index/tape.hz;
function stop() {
  cancelAnimationFrame(raf);raf=0;$('play').textContent=index===180?'もう一度':'再生';
}
function fit() {
  if(!crops)return;
  const crop=crops[$('crop').value], scale=stage.clientWidth/crop.w;
  stage.style.height=crop.h*scale+'px';
  frame.style.transform='scale('+scale+')';
  frame.style.left=-crop.x*scale+'px';frame.style.top=-crop.y*scale+'px';
}
function anchor(residents) {
  function view(people,width,minHeight,padTop,padBottom) {
    const feet=people.map(p=>p.foot),xs=feet.map(p=>p.x),ys=feet.map(p=>p.y);
    const centre=(Math.min(...xs)+Math.max(...xs))/2;
    const y=Math.max(0,Math.min(...ys)-padTop),h=Math.min(792-y,Math.max(minHeight,Math.max(...ys)-y+padBottom));
    return {x:Math.min(375-width,Math.max(0,centre-width/2)),y,w:width,h};
  }
  return {near:view(residents.filter(r=>Object.hasOwn(labels,r.key)),155,109,55,26),
          full:view(residents,375,290,56,23)};
}
function updateMarker(actors) {
  const key=$('subject').value,body=actors.find(r=>r.key===key);
  mark.hidden=!body;if(!body)return;
  const crop=crops[$('crop').value],scale=stage.clientWidth/crop.w;
  mark.style.left=(body.foot.x-crop.x)*scale+'px';mark.style.top=(body.foot.y-crop.y)*scale+3+'px';
  mark.textContent=labels[key];
}
function drawBearings(angles) {
  const chart=$('bearings'),w=Math.max(1,chart.clientWidth),h=28,dpr=Math.min(devicePixelRatio||1,3);
  if(chart.width!==Math.round(w*dpr)||chart.height!==Math.round(h*dpr)){chart.width=Math.round(w*dpr);chart.height=Math.round(h*dpr);}
  const ctx=chart.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const x=deg=>(deg-105)/45*(w-8)+4;
  ctx.strokeStyle='#b3beaf';ctx.lineWidth=1;ctx.beginPath();
  for(let i=112;i<=160;i++){const d=i*360/384;ctx.moveTo(x(d),18);ctx.lineTo(x(d),d%15===0?28:24);}
  ctx.stroke();ctx.fillStyle='#2b7652';
  for(const deg of angles)ctx.fillRect(x(deg)-1.7,3,3.4,16);
}
function phaseText(a,t) {
  if(t<a.phases.start-1e-8)return '道を譲る前';
  if(t<a.phases.ownerStart-1e-8)return 'ハリネズミが曲がって道を譲っています';
  if(t<a.phases.ownerEnd-1e-8)return '時計が歩いています';
  return '時計が8.00pxの中継点に到着';
}
function show() {
  if(!ready)return;
  const a=tape.arms[edition],t=clock();
  win.HomeNarrowPlayback.frame(poses[edition][index],t);
  win.paintYieldReplay();
  const residents=win.HomeCastTrial.inspect();
  if(!crops){crops=anchor(residents);fit();}
  updateMarker(residents);
  scrub.value=index;$('clock').textContent=t.toFixed(2)+'秒';
  const description=phaseText(a,t);if($('stage-state').textContent!==description)$('stage-state').textContent=description;
  const measured=a.exits.filter(row=>row.clock<=t+1e-8).at(-1);
  if(measured){
    const angles=measured.angles, range=angles.length===1?angles[0]+'°':angles.length?angles[0]+'°～'+angles.at(-1)+'°':'';
    $('exit').textContent=measured.clock.toFixed(2)+'秒の測定 · '+angles.length+' / 384方向'+(range?'（'+range+'）':'');
    drawBearings(angles);
  }else{$('exit').textContent='最初の測定は'+a.phases.start.toFixed(2)+'秒です。';drawBearings([]);}
  $('previous').disabled=index===0;$('next').disabled=index===180;
}
function counts() {
  const table=$('residents');table.replaceChildren();
  for(const [key,name] of Object.entries(labels)){
    const row=table.insertRow(),heading=document.createElement('th');heading.scope='row';heading.textContent=name;row.append(heading);
    const current=tape.arms.shipped.counts[key], margin=tape.arms.margin.counts[key];
    for(let half=0;half<2;half++)row.insertCell().textContent=current[half]+' → '+margin[half];
  }
}
function jump(n) {stop();index=Math.max(0,Math.min(180,n));show();stop();}
function advance(now) {
  const target=Math.min(180,startFrame+Math.floor((now-startTime)/1000*tape.hz*Number($('speed').value)));
  if(target!==index){index=target;show();}
  if(index===180)stop();else raf=requestAnimationFrame(advance);
}
$('play').onclick=()=>{
  if(raf){stop();return;}
  if(index===180)jump(0);
  startFrame=index;startTime=performance.now();$('play').textContent='一時停止';raf=requestAnimationFrame(advance);
};
$('speed').onchange=()=>{startFrame=index;startTime=performance.now();};
$('previous').onclick=()=>jump(index-1);$('next').onclick=()=>jump(index+1);
$('before').onclick=()=>jump(Math.max(0,Math.round((tape.arms[edition].phases.start-tape.start)*tape.hz)-1));
$('after').onclick=()=>jump(Math.round((tape.arms[edition].phases.ownerEnd-tape.start)*tape.hz));
scrub.oninput=()=>jump(Number(scrub.value));
$('crop').onchange=()=>{fit();show();};$('subject').onchange=show;
for(const input of document.querySelectorAll('[name=edition]'))input.onchange=()=>{
  stop();edition=input.value;if(ready){counts();show();}
};
new ResizeObserver(()=>{if(ready){fit();show();}}).observe(stage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
async function load(){
  const response=await fetch('./narrow-recording.json');if(!response.ok)throw Error('歩行記録を読み込めませんでした。');
  tape=await response.json();poses={shipped:decode(tape.arms.shipped),margin:decode(tape.arms.margin)};
  const url=new URL('../game/mobility-v12-narrow.html',location.href);
  url.search=new URLSearchParams({region:'forest',time:'day',season:'autumn',weather:'sunny',count:28,trialSeed:937,paused:1,clock:0,variant:'B',ground:'on',paired:1,waitForPainting:1});
  frame.src=url.href;const deadline=performance.now()+150000;
  while(performance.now()<deadline){
    win=frame.contentWindow;
    if(win?.location.href===url.href&&win.HomeCastTrial?.ready&&win.HomeDragTrial?.opening()&&win.HomeNarrowPlayback)break;
    await new Promise(r=>setTimeout(r,75));
  }
  if(!win?.HomeNarrowPlayback)throw Error('森を準備できませんでした。');
  await Promise.all([...win.document.querySelectorAll('#castStage img.character-asset')].map(img=>img.decode()));
  win.HomeNarrowPlayback.prepare(tape.roster,tape.scale);
  ready=true;counts();show();
  for(const key of ['play','before','after','tick'])$(key).disabled=false;
}
load().catch(e=>{stop();$('stage-state').textContent=e.message;});
