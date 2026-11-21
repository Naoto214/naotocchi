'use strict';

// Insert inside the released comparison model so that planning and walking use
// the same contact ellipses, bounds, foreground mask and terrain segment test.
function* intentPlan(a, goal) {
  const nav=scene.navigation, scale=nav.intentScale;
  const distance=(p,q)=>Math.hypot((q.x-p.x)*scale.x,(q.y-p.y)*scale.y);
  const origin={x:a.x,y:a.y}, length=distance(a,goal);
  if(length<8)return yield* pairPlan(a,goal,true);
  const cast=actors.map(who=>({key:who.key,x:who.x,y:who.y,w:who.w,h:who.h,
    box:bounds(who,scene),available:who!==a&&canHelpAmbient(who),neighbors:[]}));
  const owner=cast.find(b=>b.key===a.key);
  for(const b of cast)for(const other of cast) {
    if(other===b)continue;
    const rx=(b.w+other.w)*.5+10, ry=(b.h+other.h)*.38+10;
    if(Math.abs(b.x-other.x)<=rx+24/scale.x && Math.abs(b.y-other.y)<=ry+24/scale.y)
      b.neighbors.push({other,rx,ry});
  }
  function fits(b,p) {
    return p.x>=b.box.left&&p.x<=b.box.right&&p.y>=b.box.top&&p.y<=b.box.bottom;
  }
  function blockers(b,p,limit) {
    const list=[];
    for(const {other,rx,ry} of b.neighbors) {
      if(contactSegmentSafe(b,p,other,rx,ry))continue;
      if(!other.available||list.length===limit)return null;
      list.push(other);
    }
    return list;
  }
  // Moving a helper can bring an originally distant foot into the owner's
  // corridor. Check the changed foot explicitly even when absent in neighbors.
  function clears(b,p,other,to) {
    return contactSegmentSafe(b,p,to,(b.w+other.w)*.5+10,(b.h+other.h)*.38+10);
  }
  function ground(b,option) {
    if(option.ground===undefined){
      const live=actor(b.key);if(!live)return false;
      b.ink??=scene.planVisibility?.(live)||(q=>visible(live,q));
      option.ground=nav.segmentSafe(b,option.p,b.ink);
    }
    return option.ground;
  }
  function point(b,r,angle) {
    return {x:b.x+r*Math.cos(angle)/scale.x,y:b.y+r*Math.sin(angle)/scale.y};
  }
  let work=0;
  const heading=Math.atan2((goal.y-a.y)*scale.y,(goal.x-a.x)*scale.x);
  const options=[],radii=[...new Set([Math.min(24,length),18,12,8].filter(r=>r<=length))];
  for(const r of radii)for(let i=0;i<=72;i++) {
    if(++work%96===0)yield;
    const p=point(owner,r,i===72?heading:i*Math.PI/36);
    const gain=length-distance(p,goal);
    if(gain<.75||!fits(owner,p))continue;
    const blocked=blockers(owner,p,2);
    if(blocked)options.push({p,blocked,gain});
  }
  options.sort((u,v)=>u.blocked.length-v.blocked.length||v.gain-u.gain);
  const goals=[];
  for(const o of options) {
    if(++work%48===0)yield;
    if(!ground(owner,o))continue;
    if(!o.blocked.length)return {origin,q:o.p,stages:[]};
    goals.push(o);
  }
  const cache=new Map();
  function* moves(b) {
    if(cache.has(b))return cache.get(b);
    const list=[];
    for(const r of [4,8,12,16,20,24])for(let i=0;i<72;i++) {
      if(++work%96===0)yield;
      const p=point(b,r,i*Math.PI/36);
      if(!fits(b,p))continue;
      const blocked=blockers(b,p,1);
      if(blocked){const opt={p,blocked};if(ground(b,opt))list.push(opt);}
    }
    const choices={list,solo:list.filter(m=>!m.blocked.length)};
    cache.set(b,choices);return choices;
  }
  const stage=(b,to)=>({key:b.key,from:{x:b.x,y:b.y},to});
  for(const o of goals) {
    if(o.blocked.length!==1)continue;
    const [b]=o.blocked;
    for(const m of (yield* moves(b)).solo){
      if(++work%160===0)yield;
      if(!m.blocked.length&&clears(owner,o.p,b,m.p)&&ground(b,m))
        return {origin,q:o.p,stages:[stage(b,m.p)]};
    }
  }
  for(const o of goals)for(const second of o.blocked) {
    const required=o.blocked.find(b=>b!==second);
    for(const m of (yield* moves(second)).list) {
      if(++work%160===0)yield;
      const first=required||m.blocked[0];
      if(!first||m.blocked.some(b=>b!==first)||!clears(owner,o.p,second,m.p)||!ground(second,m))continue;
      for(const n of (yield* moves(first)).solo) {
        if(++work%160===0)yield;
        if(!n.blocked.length&&clears(owner,o.p,first,n.p)&&clears(second,m.p,first,n.p)&&ground(first,n))
          return {origin,q:o.p,stages:[stage(first,n.p),stage(second,m.p)]};
      }
    }
  }
  return null;
}
// The normal grid requires a fully clear endpoint. A crowded foot may need
// one short turn while it is still leaving an existing contact. Commit the
// turn only after a second, checked leg actually advances the original intent.
function localIntentRoute(a,goal,box,ink) {
  const nav=scene.navigation, s=nav?.intentScale;
  if(actors.length<=15||!nav?.intentAware||!s||clock-(a.lastOwnWalk??a.lastWalk)<15)return null;
  const distance=(p,q)=>Math.hypot((p.x-q.x)*s.x,(p.y-q.y)*s.y);
  const length=distance(a,goal);
  if(length<8)return null;
  const near=[];
  for(const b of actors)if(b!==a){
    const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
    if(Math.abs(b.x-a.x)<=rx+32/s.x&&Math.abs(b.y-a.y)<=ry+32/s.y)near.push({b,rx,ry});
  }
  if(!near.length)return null;
  const inside=p=>p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom;
  const clear=(p,q)=>near.every(({b,rx,ry})=>contactSegmentSafe(p,q,b,rx,ry));
  function options(from,radii,turning) {
    const heading=Math.atan2((goal.y-from.y)*s.y,(goal.x-from.x)*s.x);
    const list=[];
    for(const r of radii)for(let i=0;i<=24;i++){
      const angle=i===24?heading:i*Math.PI/12;
      const q={x:from.x+r*Math.cos(angle)/s.x,y:from.y+r*Math.sin(angle)/s.y};
      if(!inside(q))continue;
      const gain=length-distance(q,goal);
      if(!turning&&(gain<.75||distance(q,a)<8-1e-7))continue;
      if(!clear(from,q))continue;
      list.push({q,gain});
    }
    list.sort((u,v)=>v.gain-u.gain);return list;
  }
  const radii=[...new Set([Math.min(24,length),16,12,8].filter(r=>r<=length))];
  const direct=options(a,radii,false).find(o=>nav.segmentSafe(a,o.q,ink));
  if(direct)return [direct.q];
  const turns=options(a,[5,3,8],true);
  const tried=[];
  for(const {q} of turns) {
    if(tried.some(p=>distance(p,q)<2)||!nav.segmentSafe(a,q,ink))continue;
    tried.push(q);
    const onward=options(q,radii,false).find(o=>nav.segmentSafe(q,o.q,ink));
    if(onward)return [q,onward.q];
    if(tried.length>=12)break;
  }
  return null;
}

function patchMovement(source) {
  function change(before,after) {
    if(source.split(before).length!==2)throw Error('Unexpected V8 model anchor '+before.slice(0,85));
    source=source.replace(before,()=>after);
  }
  change('function rememberBlocked(a, p) {',localIntentRoute.toString()+'\n'+intentPlan.toString()+'\nfunction rememberBlocked(a, p) {');
  change('relief={owner:a.key,bit,expires:clock+12,search:pairPlan(a,goal,true)};',
    'relief={owner:a.key,bit,point:{x:p.x,y:p.y},expires:clock+12,search:intentPlan(a,p)};');
  change('r.ready=true;move(a.key,r.pair.q,\'ambient\')','r.ready=true;move(a.key,r.point,\'ambient\')');
  change('sameFoot(p,relief.pair.q)','sameFoot(p,relief.point)');
  change('const result=relieved?{point:p,path:[p]}','const result=relieved?{point:relief.pair.q,path:[relief.pair.q]}');
  change('a.ambientEscape=escape;','a.intentRoute=!!relieved;a.ambientEscape=escape&&!relieved;');
  change('if(escape){a.escapeFrom=', 'if(escape&&!relieved){a.escapeFrom=');
  change('a.pointerDrop||a.ambientEscape?1e-7','a.pointerDrop||a.ambientEscape||a.intentRoute?1e-7');
  change('ambientEscape:!!old?.ambientEscape,','ambientEscape:!!old?.ambientEscape,intentRoute:!!old?.intentRoute,');
  change('const p=limit(a,{x,y},scene);candidates.push',
    'const p={x:clamp(x,b.left,b.right),y:clamp(y,b.top,b.bottom)};candidates.push');
  change('if(relief || manualGoals.size || clock-a.lastWalk<70)return;',
    `const pending=waiting.get(a.key);
  if(!pending||pending.attempted||relief||manualGoals.size||clock-(a.lastOwnWalk??a.lastWalk)<15)return;
  pending.attempted=true;`);
  change('clock<a.manualUntil || clock-a.lastWalk<15) return;', 'clock<a.manualUntil || clock-(a.lastOwnWalk??a.lastWalk)<15) return;');
  change('if(earlyKey!==a.key)waiting.set(a.key,','if(earlyKey!==a.key && !resuming)waiting.set(a.key,');
  change('let relief=null,nextRecovery=0,earlyKey=null;', 'let relief=null,nextRecovery=0,earlyKey=null,resuming=false;');
  change('    if(flags.heldActor===key||!differentFeet(', `    if(!w.attempted){
      resuming=true;
      try{rememberBlocked(a,w.point);}finally{resuming=false;}
      if(relief)return;
    }
    if(flags.heldActor===key||!differentFeet(`);
  change('for(const [key,w] of waiting){',
    'for(const [key,w] of [...waiting].sort(([a],[b])=>(actor(a)?.lastOwnWalk??actor(a)?.lastWalk??0)-(actor(b)?.lastOwnWalk??actor(b)?.lastWalk??0))){');
  change('const goal={x:a.x+dx/length*r/s.x,y:a.y+dy/length*r/s.y};','');
  change('expires:clock+12,search:intentPlan(a,p)', 'expires:pending.expires,search:intentPlan(a,p)');
  change("if(source==='ambient'&&(clock<a.manualUntil||a.target&&a.source!=='ambient'))return false;",
    `if(source==='ambient'&&(clock<a.manualUntil||a.target&&a.source!=='ambient'))return false;
      if(source==='ambient'&&relief?.owner===key&&!sameFoot(p,relief.point))clearRelief();`);
  change("activity(b,'walk');b.lastWalk=clock;defer(b,2);", "activity(b,'walk');b.lastOwnWalk??=b.lastWalk;b.lastWalk=clock;defer(b,2);");
  change("b.yieldAfter=clock+3;activity(b,'walk');b.lastWalk=clock;", "b.yieldAfter=clock+3;activity(b,'walk');b.lastOwnWalk??=b.lastWalk;b.lastWalk=clock;");
  change('lastWalk:old?.lastWalk??clock-12,','lastWalk:old?.lastWalk??clock-12,lastOwnWalk:old?.lastOwnWalk,');
  change('a.intentRoute=!!relieved;',`a.lastOwnWalk??=a.lastWalk;
      if(source!=='ambient'||!escape||relieved)a.lastOwnWalk=clock;
      a.intentRoute=!!relieved;`);
  change('      let escape=!!relieved;', `      let intentRoute=!!relieved;
      let escape=!!relieved;
      if(source==='ambient'&&!escape&&(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)){
        const onward=localIntentRoute(a,p,safeBounds,canSee);
        if(onward){path=onward;q=path.at(-1);intentRoute=true;}
      }`);
  change('a.intentRoute=!!relieved;a.ambientEscape=', 'a.intentRoute=intentRoute;a.ambientEscape=');
  change('let relief=null,nextRecovery=0,earlyKey=null,resuming=false;', 'let relief=null,nextRecovery=0,earlyKey=null,resuming=false,continuing=null;');
  change("      if(source==='ambient'&&!escape&&(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)){\n        const next=ambientEscape",
    "      if(source==='ambient'&&!escape&&continuing!==key&&(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)){\n        const next=ambientEscape");
  change('a.intentRoute=intentRoute;a.ambientEscape=escape&&!relieved;', `a.intentRoute=intentRoute;a.ambientEscape=escape&&!relieved;
      a.escapeIntent=a.ambientEscape&&Math.hypot((q.x-a.x)*sx,(q.y-a.y)*sy)<8-1e-7?
        {point:{x:p.x,y:p.y},expires:clock+12,after:a.after,faceKey:a.faceKey}:null;`);
  change('escapeFrom:old?.escapeFrom,','escapeFrom:old?.escapeFrom,escapeIntent:old?.escapeIntent,');
  change("          if(a.source==='ambient'&&a.visualTarget)", `          if(a.source==='ambient'&&a.escapeIntent){
            const intent=a.escapeIntent;a.escapeIntent=null;
            if(clock<intent.expires)waiting.set(a.key,{...intent,feet:nearbyFeet(a),resume:true});
          }
          if(a.source==='ambient'&&a.visualTarget)`);
  change('    if(!w.attempted){',`    if(w.resume){
      if(actors.filter(b=>b.target&&b.source==='ambient').length>=2)return;
      w.resume=false;continuing=key;earlyKey=key;
      const oldAfter=a.after,oldFace=a.faceKey;
      a.after=w.after;a.faceKey=w.faceKey;
      try{if(!move(key,w.point,'ambient')){a.after=oldAfter;a.faceKey=oldFace;}}
      finally{continuing=null;earlyKey=null;}
      return;
    }
    if(!w.attempted){`);
  change("        if(flags.reducedMotion&&a.source==='ambient')", `        if(flags.heldActor===a.key&&a.source==='ambient'&&a.intentRoute){
          a.target=null;a.route=[];a.escapeIntent=null;waiting.delete(a.key);
        }
        if(flags.reducedMotion&&a.source==='ambient')`);
  change('if(flags.heldActor===key||!differentFeet(', 'if(w.retried||flags.heldActor===key||!differentFeet(');
  change("waiting.delete(key);earlyKey=key;", "w.retried=true;w.attempted=false;w.feet=nearbyFeet(a);earlyKey=key;");
  change('if(memo&&sameHelpState(memo.feet,feet))memo.tried|=request.bit;',
    'if(memo&&sameFoot(memo.point,request.point)&&sameHelpState(memo.feet,feet))memo.tried|=request.bit;');
  change('helpedAt.set(a.key,{feet,tried:request.bit})', 'helpedAt.set(a.key,{feet,point:request.point,tried:request.bit})');
  change('if(memo&&(memo.tried&bit)&&sameHelpState', 'if(memo&&sameFoot(memo.point,p)&&(memo.tried&bit)&&sameHelpState');
  return source;
}
module.exports={patchMovement};
