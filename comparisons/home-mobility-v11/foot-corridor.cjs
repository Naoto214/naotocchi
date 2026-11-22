'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Only the dedicated replay model exposes these operations. It holds an
// independent household and never reads/writes a player's gameplay save.
function corridorHooks() {
  let source=null,atStart=null,originalNav=null,travel=null,locked=false;
  let policy=null,bearing=null;
  const feet=()=>actors.map(a=>[a.key,a.x,a.y]);
  function load(record) {
    if(!scene.navigation?.intentAware||actors.length!==record.actors.length)throw Error('記録の地形を開けません。');
    for(const saved of record.actors) {
      const a=actor(saved.key);
      if(!a||a.kind!==saved.kind||a.id!==saved.id||Math.abs(a.w-saved.w)>1e-5||Math.abs(a.h-saved.h)>1e-5)
        throw Error('この表示条件では記録の体格を一致させられません。');
    }
    actors=record.actors.map(a=>structuredClone(a));
    clock=record.clock;idleAt=record.idleAt;selected=record.selected;paused=false;
    cooldown.clear();for(const [id,time] of record.cooldown)cooldown.set(id,time);
    source=feet();originalNav=scene.navigation;
    atStart=geometryExitAudit(scene,actors);
    if(atStart.invalid.length)throw Error('この表示条件では元の足位置を再現できません。');
    return {feet:source,clock,size:actors.length};
  }
  function apply(mode,list) {
    if(!atStart||locked||!['native','guard'].includes(mode))throw Error('場面を読み込み直してください。');
    locked=true;
    // This comparison triggers replacement of the nav object with the exact
    // same native functions, static terrain, projection, bounds and visibility.
    const same=originalNav===scene.navigation && JSON.stringify(source)===JSON.stringify(feet());
    const next={...scene,navigation:{...scene.navigation}};
    const now=geometryExitAudit(next,actors);
    const holds=same&&!now.invalid.length&&!now.contacts.length&&now.routeChecks.every(r=>r.safe)&&
      Object.keys(atStart.masks).every(k=>atStart.masks[k].every((valid,i)=>!valid||now.masks[k][i]));
    // The same native corridor length and swept-contact predicate apply at every angle.
    const canHold=mode==='guard'&&holds&&now.otherLong.length>0;
    if(!canHold)sync(list,next);
    const after=canHold?now:geometryExitAudit(scene,actors);
    const preferred=after.long.find(i=>after.otherLong.includes(i*45));
    bearing=preferred===undefined?after.otherLong[0]:preferred*45;
    const sc=scene.navigation.intentScale;
    const change=actors.map((a,i)=>({key:a.key,css:Math.hypot((a.x-source[i][1])*sc.x,(a.y-source[i][2])*sc.y)}));
    policy={mode,held:canHold,oldRays:now.otherLong.length,rays:after.otherLong.length,
      retained:holds,canWalk:Number.isFinite(bearing),bearing:bearing??null,change,
      oldDirections:now.long.length,activeRoutes:now.routeChecks.length};
    return policy;
  }
  function begin() {
    if(!policy?.canWalk||travel)throw Error('場面を読み込み直してください。');
    const a=actors.find(p=>p.kind==='pet'),angle=bearing*Math.PI/180,length=Math.max(40,a.w*1.2);
    const end=limit(a,{x:a.x+length*Math.cos(angle),y:a.y+length*Math.sin(angle)},scene);
    const accepted=move(a.key,end,'ambient');
    travel={accepted,arrived:false,done:!accepted,start:{x:a.x,y:a.y},end,clock,steps:0,walked:0};
    return {...travel};
  }
  function advance() {
    if(!travel||travel.done)return travel;
    const a=actors.find(p=>p.kind==='pet'),prior={x:a.x,y:a.y},s=scene.navigation.intentScale;
    step(.05,{blocked:false,reducedMotion:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,autonomy:true});
    const moved=Math.hypot((a.x-prior.x)*s.x,(a.y-prior.y)*s.y);
    if(moved>1e-7){travel.steps++;travel.walked+=moved;}
    travel.arrived=Math.hypot(a.x-travel.end.x,a.y-travel.end.y)<1e-5;
    travel.done=travel.arrived||!a.target||clock-travel.clock>12;
    return {...travel};
  }
  return {load,apply,begin,advance};
}

function corridorModel(source,diagnostic) {
  const start=diagnostic.indexOf('function geometryExitAudit(');
  const end=diagnostic.indexOf('function compareGeometrySync(',start);
  if(start<0||end<0)throw Error('Missing verified native geometry audit');
  return replaceExact(source,'    return {metrics:',diagnostic.slice(start,end)+'\n'+corridorHooks.toString()+
    '\n    return {corridor:corridorHooks(),metrics:');
}

function corridorPainter(source) {
  const hook='    function paint(){';
  return replaceExact(source,hook,`    let corridorRoom=null, originalList=null, recordedView=null;
    function checkCorridorView(){
      const nav=scene.navigation,live=env.NaotocchiHomeViewport.residentPresentation();
      const rect=stage.getBoundingClientRect();
      const crop=el=>{const b=el?.getBoundingClientRect();return b?[b.left,b.top,b.width,b.height]:null;};
      return JSON.stringify([scene.region,env.innerWidth,env.innerHeight,env.devicePixelRatio,
        env.visualViewport?.scale,rect.left,rect.top,rect.width,rect.height,crop(stage.closest('.screen-frame')),
        live.x,live.y,live.scaleX,live.scaleY,live.bodyScale,live.safeLeft,live.safeRight,live.safeTop,live.safeBottom,
        ...[{x:0,z:0},{x:1,z:0},{x:0,z:1}].map(p=>nav.project(p)),
        ...[{x:0,y:0},{x:1,y:0},{x:0,y:1}].map(p=>nav.visibleGround?.point(p)||null)]);
    }
    function requireCorridorView(){
      if(!corridorRoom||recordedView!==checkCorridorView())throw Error('投影が変わりました。「記録位置に戻す」で再開できます。');
    }
    const activeHome=model;
    globalThis.FootCorridorReplay={
      restore(record){
        if(!HomeCastTrial.ready||!HomeCastTrial.settings.paused||!scene.navigation||scene.region!==record.region)
          throw Error('記録の地域を読み込んでいます。');
        let seed=record.seed;
        const replica=env.NaotocchiHomeDioramaModel.createModel({random:()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}});
        originalList=activeHome.snapshot();
        replica.sync(originalList,scene);
        seed=record.seed;
        const ready=replica.corridor.load(record);
        corridorRoom=replica;paint();recordedView=checkCorridorView();return ready;
      },
      apply(mode){requireCorridorView();const result=corridorRoom.corridor.apply(mode,originalList);paint();return result;},
      begin(){requireCorridorView();return corridorRoom.corridor.begin();},
      step(){const r=corridorRoom.corridor.advance();paint();return r;},
      footprints(){return corridorRoom.snapshot().map(a=>[a.key,a.x,a.y]);},
    };
`+hook+'\n      const model=corridorRoom || activeHome;');
}
module.exports={corridorModel,corridorPainter};
