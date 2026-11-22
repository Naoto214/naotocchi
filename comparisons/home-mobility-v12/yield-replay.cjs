'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// Installed only in a separate paused recording entry. The home never calls
// this adapter. Each recorded sequence uses the unchanged model stepper.
function createYieldReplay() {
  let fixture, procedure, active, initial, clockAtOpen, liveRequest=null;
  const debt = new Map();
  const close = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)<1e-5;
  const point = pair => ({x:pair[0],y:pair[1]});
  const screenDistance = (a,b) => {
    const s=scene.navigation.intentScale;
    return Math.hypot((a.x-b.x)*s.x,(a.y-b.y)*s.y);
  };
  const status = () => ({
    state:procedure?.state || 'ready', who:active?.who || null,
    index:procedure?.index || 0, count:procedure?.steps.length || 0,
    advanced:procedure?.advanced || 0, checked:procedure?.checked || 0,
    reached:procedure?.reached || 0, expected:procedure?.expected || 0,
    distanceCSS:procedure?.distanceCSS || 0, message:procedure?.message || '', errorCSS:procedure?.errorCSS??null, native:!!liveRequest,
    searchAvailable:typeof curvedHandoff==='function'
  });
  function reset(data) {
    if (!globalThis.HomeCastTrial?.ready || !globalThis.HomeCastTrial.settings.paused ||
        scene.region!=='forest' || actors.length!==28) throw Error('比較用の森を準備できません。');
    if (data.feet.length!==actors.length || !actors.every(a=>data.feet.some(([key,x,y,w,h])=>
        key===a.key && w===a.w && h===a.h && Number.isFinite(x+y))))
      throw Error('記録した28体と現在の住民の体格が一致しません。');
    const s=scene.navigation?.intentScale;
    if (!s || Math.abs(s.x-data.scale.x)>1e-6 || Math.abs(s.y-data.scale.y)>1e-6)
      throw Error('記録と投影条件が異なります。');
    if (!initial) {
      clockAtOpen=clock;
      initial=new Map(actors.map(a=>[a.key,{...a}]));
    }
    clock=clockAtOpen; clearRelief(); manualGoals.clear(); waiting.clear(); crowdMisses.clear(); helpedAt.clear();
    for (const [key,x,y] of data.feet) {
      const a=actor(key);
      Object.assign(a,initial.get(key),{x,y,route:[],target:null,faceKey:null,yieldFor:null,escapeIntent:null});
    }
    fixture=data; procedure=null; active=null; liveRequest=null; debt.clear();
    return status();
  }
  function start(steps) {
    if (!fixture || !steps.length) throw Error('経路を準備できません。');
    const helpers=steps.slice(0,-1);
    if (helpers.length>2 || new Set(helpers.map(s=>s.who)).size!==helpers.length ||
        steps.at(-1).who!==fixture.key || helpers.some(s=>s.who===fixture.key) ||
        steps.some(s=>!actor(s.who) || s.ends.length<1 || s.ends.length>2))
      throw Error('記録の助け手または経路が一致しません。');
    procedure={steps,state:'playing',index:0,advanced:0,checked:0,reached:0,expected:steps.length,distanceCSS:0};
    return status();
  }
  function startNative(degrees) {
    if(!fixture || typeof curvedHandoff!=='function')throw Error('この配布物にV12の探索がありません。');
    const a=actor(fixture.key),s=scene.navigation.intentScale,angle=degrees*Math.PI/180;
    const target={x:a.x+8*Math.cos(angle)/s.x,y:a.y+8*Math.sin(angle)/s.y};
    // Stage a fresh pending request in this isolated opening. Only the real
    // planner supplies helper routes. Every other wander draw is held back.
    clock=20;paused=false;selected=null;
    for(const b of actors)Object.assign(b,{nextAt:1e5,manualUntil:0,yieldAfter:0,yieldFor:null,
      lastWalk:0,lastOwnWalk:0,activity:'rest',source:'ambient'});
    waiting.set(a.key,{point:target,feet:nearbyFeet(a),expires:clock+12,attempted:true});
    relief={owner:a.key,point:target,expires:clock+12,search:intentPlan(a,target),pair:null,stage:0};
    liveRequest={a,origin:{x:a.x,y:a.y},target,helpers:new Set(),end:clock+12,found:false};
    procedure={steps:[],state:'playing',checked:0,advanced:0,distanceCSS:0,index:0,expected:0};
    return status();
  }
  function advanceNative(){
    const req=liveRequest,proc=procedure,dt=1/120;
    if(relief?.pair)req.found=true;
    const prior=actors.map(b=>({x:b.x,y:b.y}));
    step(dt);
    proc.checked++;
    let first=null;
    for(let i=0;i<actors.length;i++){
      const a=actors[i],from=prior[i],d=Math.hypot(a.x-from.x,a.y-from.y);
      if(d<1e-10)continue;
      if(!first)first=a;
      const box=bounds(a,scene);
      if(d>42*dt+1e-7||a.x<box.left||a.x>box.right||a.y<box.top||a.y>box.bottom||
          !scene.navigation.segmentSafe(from,a,scene.planVisibility(a)) || !visible(a,a) ||
          actors.some((b,k)=>b!==a&&!contactSegmentSafe(from,a,k<i?b:prior[k],(a.w+b.w)*.5+10,(a.h+b.h)*.38+10)))
        throw Error('通常の探索後の歩行を再確認できませんでした。');
      if(a===req.a)proc.distanceCSS+=screenDistance(from,a);
      else if(a.source==='yield')req.helpers.add(a.key);else throw Error('この比較に含まれない住民が歩きました。');
      proc.advanced++;
    }
    active=first?{who:first.key}:null;
    if(req.helpers.size>2)throw Error('助け手の人数が変わりました。');
    if(!relief && !req.a.target && !actors.some(b=>b.target && b.source==='yield') || clock>=req.end){
      const error=screenDistance(req.a,req.target);
      proc.errorCSS=error;
      proc.state=error<.05?'arrived':proc.distanceCSS>0?'partial':'closed';
      proc.reached=error<.05?1:0;proc.expected=1;
      proc.message='助け手'+req.helpers.size+'体・タヌキの変位'+screenDistance(req.a,req.origin).toFixed(2)+'px・指示点まで'+error.toFixed(2)+'px';
    }
    return status();
  }
  function advance() {
    if(procedure?.state!=='playing')return status();
    if(liveRequest)return advanceNative();
    const proc=procedure;
    if(!active) {
      active=proc.steps[proc.index];
      const a=actor(active.who),points=active.ends.map(point);
      if(!close(a,point(active.from)))throw Error('足位置が前の区間とつながっていません。');
      const peers=actors.filter(b=>b!==a);
      let from=a;
      for(const to of points){
        const box=bounds(a,scene);
        if(to.x<box.left || to.x>box.right || to.y<box.top || to.y>box.bottom ||
           !scene.navigation.segmentSafe(from,to,scene.planVisibility(a)) ||
           peers.some(b=>!contactSegmentSafe(from,to,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10)))
          throw Error('次の経路の地形または接触条件が変わりました。');
        from=to;
      }
      debt.clear();for(const b of peers)debt.set(b.key,[b.x,b.y]);
      Object.assign(a,{target:points[0],route:points.slice(1),intentRoute:true,ambientEscape:false,faceKey:null,
        source:a.key===fixture.key?'ambient':'yield',activity:'walk'});
    }
    const a=actor(active.who),from={...a},dt=1/120;
    step(dt,{autonomy:false});
    proc.checked++;
    for(const b of actors){
      if(b===a)continue;
      const [x,y]=debt.get(b.key);
      if(b.x!==x || b.y!==y)throw Error('ほかの住民の足位置が変わりました。');
    }
    const dist=Math.hypot(a.x-from.x,a.y-from.y);
    if(dist>1e-10) {
      if(dist>42*dt+1e-7 || !visible(a,a) || !scene.navigation.segmentSafe(from,a,scene.planVisibility(a)) ||
          actors.some(b=>b!==a && (!contactSegmentSafe(from,a,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10) ||
            (clearance(a,a,b)<1 && !(clearance(a,from,b)<1 && clearance(a,a,b)>clearance(a,from,b)+1e-6)))))
        throw Error('記録を元の歩行条件で再生できません。');
      proc.advanced++;
      if(a.key===fixture.key)proc.distanceCSS+=screenDistance(from,a);
    }
    if(!a.target) {
      if(!close(a,point(active.ends.at(-1))))throw Error('歩行処理が途中で停止しました。');
      proc.reached++; proc.index++; active=null;
      if(proc.index===proc.steps.length)proc.state='arrived';
    }
    return status();
  }
  return Object.freeze({reset,start,startNative,advance,status});
}

function addYieldReplay({add,baseline,modelSource,rendererSource}) {
  const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
  const game=name=>fs.readFileSync(path.join(baseline,'game',name),'utf8');
  const oldModel='home-production-model-mobility-v11-foot-reference.js';
  const oldRenderer='home-production-diorama-mobility-v11.js';
  const newModel='home-production-model-mobility-v12-yield.js';
  const newRenderer='home-production-diorama-mobility-v12-yield.js';
  const model=replaceExact(modelSource,'    return {metrics:',
    '    '+createYieldReplay.toString()+'\n    globalThis.HomeYieldReplay=createYieldReplay();\n    return {metrics:');
  const renderer=replaceExact(rendererSource,'    function sync(){',
    '    globalThis.paintYieldReplay=()=>paint();\n    function sync(){');
  let html=game('mobility-v11-foot-reference.html');
  function replace(name,body,next,newBody) {
    html=replaceExact(html,name+'?v='+digest(body).slice(0,12),next+'?v='+digest(newBody).slice(0,12));
  }
  replace(oldModel,game(oldModel),newModel,model);
  replace(oldRenderer,game(oldRenderer),newRenderer,renderer);
  add('game/'+newModel,model); add('game/'+newRenderer,renderer);
  add('game/mobility-v12-yield.html',html);
  for(const name of ['yield.html','yield.mjs'])add('v12/'+name,read(name));
  add('v12/yield-recording.json',read('evidence/yield-recording.json'));
}

module.exports={addYieldReplay};
