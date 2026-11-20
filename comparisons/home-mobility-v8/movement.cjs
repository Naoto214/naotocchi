// Extend the exact comparison model; the shipped V7 and production stay independently replayable.
'use strict';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Unexpected pinned model anchor: ' + before.slice(0, 85));
  return source.replace(before, () => after);
}

// Small optically meaningful walking turns for a resident who could not find
// V7's longer escape. Contacts and painted terrain still approve the full leg.
function shortEscape(a, box, nav, s, near, debt, startDebt, heading, clock, canSee) {
  const turn = 2 * Math.PI;
  const wrap = angle => (angle % turn + turn) % turn;
  const edges = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  for (const {b, rx, ry} of near) {
    const x = (a.x - b.x) / rx, y = (a.y - b.y) / ry;
    if (x * x + y * y >= 1) continue;
    // A ray out of all existing contacts must lie in the intersection of the
    // outward half-planes. Test an interior ray even for a very narrow cone.
    const normal = Math.atan2(y / (ry * s.y), x / (rx * s.x));
    edges.push(wrap(normal - Math.PI / 2), wrap(normal + Math.PI / 2));
  }
  edges.sort((u, v) => u - v);
  const angles = edges.map((angle, i) => (angle + (edges[i + 1] ?? edges[0] + turn)) / 2);
  for (let i = 0; i < 32; i++) angles.push(heading + i * Math.PI / 16);
  const latest = a.escapeFrom;
  const distance = (from, to) => Math.hypot((from.x - to.x) * s.x, (from.y - to.y) * s.y);
  let best = null;
  for (const angle of angles) {
    const vx = Math.cos(angle), vy = Math.sin(angle);
    for (const r of [6, 4.5, 3]) {
      const q = {x: a.x + r * vx / s.x, y: a.y + r * vy / s.y};
      if (q.x < box.left || q.x > box.right || q.y < box.top || q.y > box.bottom) continue;
      if (latest && clock - latest.at < 45 && distance(q, latest) <= distance(a, latest)) continue;
      const safe = near.every(({b, rx, ry}) => contactSegmentSafe(a, q, b, rx, ry));
      if (!safe) continue;
      const gain = startDebt - debt(q);
      if (gain < .001) continue;
      const score = 32 * gain + r * (.16 + .06 * Math.cos(angle - heading));
      if ((!best || score > best.score) && nav.segmentSafe(a, q, canSee)) best = {q, score};
    }
  }
  return best?.q || null;
}

function nearbyFeet(a) {
  const s = scene.navigation.intentScale;
  return actors.filter(b => b !== a &&
    Math.abs(b.x-a.x) < (a.w+b.w)*.7+12+24/s.x &&
    Math.abs(b.y-a.y) < (a.h+b.h)*.6+12+24/s.y)
    .map(b => ({key:b.key,x:b.x,y:b.y}));
}

function differentFeet(before, now, scale) {
  return before.length !== now.length || now.some((b,i) => {
    const old=before[i];
    return old.key!==b.key || Math.hypot((b.x-old.x)*scale.x,(b.y-old.y)*scale.y)>=3;
  });
}

function rememberBlocked(a, p) {
  if (actors.length<=15 || !scene.navigation?.intentScale || !scene.navigation?.intentAware ||
      a.target || clock<a.manualUntil || clock-a.lastWalk<15 || earlyKey===a.key) return;
  const feet=nearbyFeet(a);
  if(!feet.length)return;
  waiting.set(a.key,{point:{x:p.x,y:p.y},feet,expires:clock+12});
  // An otherwise ordinary failed walk is eligible only after the existing
  // dense-room overdue timer. Repeated requests at unchanged feet share one
  // attempted help. A later physical opening can make another attempt useful.
  if(relief || manualGoals.size || clock-a.lastWalk<70)return;
  const previous=helpedAt.get(a.key),s=scene.navigation.intentScale;
  if(previous&&!differentFeet(previous,feet,s))return;
  const dx=(p.x-a.x)*s.x,dy=(p.y-a.y)*s.y,length=Math.hypot(dx,dy);
  if(length<3)return;
  helpedAt.set(a.key,feet);
  const r=Math.min(12,length);
  const goal={x:a.x+dx/length*r/s.x,y:a.y+dy/length*r/s.y};
  relief={owner:a.key,expires:clock+12,search:pairPlan(a,goal,true)};
}

function clearRelief() {
  if(!relief)return;
  const b=actor(relief.yieldPeer);
  if(b&&b.yieldFor===relief.owner&&b.source==='yield')releaseHelper(b);
  relief=null;
}

function stepRelief(flags) {
  if(flags.reducedMotion || flags.autonomy===false || manualGoals.size || flags.heldActor!=null) {
    clearRelief();return;
  }
  if(relief){
    const r=relief,a=actor(r.owner);
    if(!a||a.target||clock<a.manualUntil||clock>=r.expires||flags.heldActor===r.owner){
      clearRelief();return;
    }
    if(r.search){
      let result;
      // Less background work per frame than a player's active drop.
      for(let i=0;i<2;i++){result=r.search.next();if(result.done)break;}
      if(!result.done)return;
      r.search=null;r.pair=result.value;r.stage=0;
      if(!r.pair){clearRelief();return;}
    }
    if(r.yieldPeer&&actor(r.yieldPeer)?.target)return;
    if(r.stage<r.pair.stages.length){
      if(!beginPairStage(a,r,r.pair,r.stage)){clearRelief();return;}
      r.stage++;return;
    }
    // A helper may have been interrupted by a new touch. Recheck its actual
    // arrival and the full owner leg rather than assuming a predicted opening.
    if(!r.pair.stages.every(leg=>sameFoot(actor(leg.key),leg.to))||
       !sameFoot(a,r.pair.origin)||!yieldLeg(a,a,r.pair.q,new Map())){clearRelief();return;}
    if(actors.filter(b=>b.target&&b.source==='ambient').length>=2)return;
    r.ready=true;move(a.key,r.pair.q,'ambient');clearRelief();return;
  }
  if(waiting.size===0||clock<nextRecovery)return;
  nextRecovery=clock+1;
  for(const [key,w] of waiting){
    const a=actor(key);
    if(!a||a.target||clock>=w.expires||clock<a.manualUntil||clock>=a.nextAt){
      waiting.delete(key);continue;
    }
    if(flags.heldActor===key||!differentFeet(w.feet,nearbyFeet(a),scene.navigation.intentScale))continue;
    if(actors.filter(b=>b.target&&b.source==='ambient').length>=2)return;
    // One early retry of this failed intention, only after a nearby 3px foot
    // change. Never add a new idle choice, turn a rest into a forced walk, or
    // resubmit an identical refusal every frame.
    waiting.delete(key);earlyKey=key;
    try{move(key,w.point,'ambient');}finally{earlyKey=null;}
    break;
  }
}

function patchMovement(source) {
  source = replaceOnce(source, '    function ambientEscape(', shortEscape.toString() + '\n    function ambientEscape(');
  source = replaceOnce(source,
    'return options.find(({q})=>nav.segmentSafe(a,q,canSee))?.q||null;',
    'return options.find(({q})=>nav.segmentSafe(a,q,canSee))?.q||shortEscape(a,box,nav,s,near,debt,startDebt,heading,clock,canSee);');
  source = replaceOnce(source, "if(source==='ambient'&&!path.length){",
    "if(source==='ambient'&&!escape&&(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)){");
  source = replaceOnce(source, 'if(!path.length||(!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){',
    'if(!path.length||(!escape&&!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){');
  // A distant foot cannot invalidate a geometric proof about this corridor.
  // V7's beginPairStage rechecks every predicted leg against every live foot,
  // the current bounds, terrain, occupancy, visibility and helper availability.
  // Continue its bounded generator while a distant resident walks. If a foot
  // actually clears the exact finger path, the direct command takes precedence.
  source = replaceOnce(source,
    `        if(request.pairSearch&&clock>=request.nextAt&&(!request.pairPeers||request.pairPeers.length!==actors.length-1||request.pairPeers.some(([id,x,y])=>{
          const peer=actor(id);return !peer||peer.x!==x||peer.y!==y;
        })))request.pairSearch=null;`,
    `        if(request.pairSearch&&clock>=request.nextAt){
          request.nextAt=clock+1;
          const changed=!request.pairPeers||request.pairPeers.length!==actors.length-1||request.pairPeers.some(([id,x,y])=>{
            const peer=actor(id);return !peer||peer.x!==x||peer.y!==y;
          });
          if(changed&&yieldLeg(a,a,request.point,new Map())){
            request.pairSearch=null;request.peers=null;request.nextAt=clock;
          }
        }`);
  const localRecovery = [nearbyFeet,differentFeet,rememberBlocked,clearRelief,stepRelief].map(fn=>fn.toString()).join('\n');
  source = replaceOnce(source, '    const manualGoals=new Map();',
    '    const waiting=new Map(),helpedAt=new Map();let relief=null,nextRecovery=0,earlyKey=null;\n'+localRecovery+'\n    const manualGoals=new Map();');
  source = replaceOnce(source, 'function cancel(){manualGoals.clear();',
    'function cancel(){clearRelief();waiting.clear();helpedAt.clear();manualGoals.clear();');
  source = replaceOnce(source, 'if(!actor(selected))selected=null;',
    'if(arrange){clearRelief();waiting.clear();helpedAt.clear();}if(!actor(selected))selected=null;');
  source = replaceOnce(source, 'if(!a||paused)return false;releaseHelper(a);stopYield(key);',
    'if(!a||paused)return false;clearRelief();waiting.delete(key);releaseHelper(a);stopYield(key);');
  source = replaceOnce(source, "if(source!=='ambient'&&retryingKey!==key){releaseHelper(a);",
    "if(source!=='ambient'&&retryingKey!==key){clearRelief();waiting.delete(key);releaseHelper(a);");
  source = replaceOnce(source, 'function* pairPlan(a,goal){','function* pairPlan(a,goal,ambient=false){');
  // Reuse the same geometry, order and bounded generator for one or two
  // autonomous helpers. User drops keep the original single-first search.
  source = replaceOnce(source,'canHelp:b!==a&&canYield(b)',"canHelp:b!==a&&canYield(b)&&(!ambient||!['together','approach'].includes(b.activity))");
  source = replaceOnce(source,'!sameFoot(b,leg.from)||!canYield(b)||!yieldLeg',"!sameFoot(b,leg.from)||!canYield(b)||(request.owner&&['together','approach'].includes(b.activity))||!yieldLeg");
  source = replaceOnce(source, '      let comparisons=0;',
    `      let comparisons=0;
      if(ambient)for(const {q,blocked} of goals){
        if(blocked.length!==1)continue;
        const b=blocked[0];
        for(const next of yield* moves(b)){
          if(++comparisons%48===0)yield;
          if(next.blocked.length||!canPass(owner,q,b,next.p))continue;
          next.ground??=onGround(b,next.p);
          if(next.ground)return {origin,q,stages:[{key:b.key,from:{x:b.x,y:b.y},to:next.p}]};
        }
      }`);
  source = replaceOnce(source, "if(mobility?.enabled)mobility.yielded(a,b,clock,'sequential',stage+1);",
    `if(mobility?.enabled){
        if(request.owner)mobility.ambientYield?.(a,b,clock,pair.stages.length,stage+1);
        else mobility.yielded(a,b,clock,'sequential',stage+1);
      }`);
  source = replaceOnce(source, '      const fullSearch=!drag||(!drag.closest&&!drag.verifiedHandoff);',
    `      const relieved=source==='ambient'&&relief?.ready&&relief.owner===key&&sameFoot(p,relief.pair.q);
      const fullSearch=!relieved&&(!drag||(!drag.closest&&!drag.verifiedHandoff));`);
  source = replaceOnce(source,'const result=fullSearch?plan(scene.navigation):drag;',
    'const result=relieved?{point:p,path:[p]}:fullSearch?plan(scene.navigation):drag;');
  source = replaceOnce(source,'      let escape=false;', '      let escape=!!relieved;');
  source = replaceOnce(source,"        if(pointerDrop){\n          if(Math.abs(dx)>.3)",
    "        if(source==='ambient')rememberBlocked(a,p);\n        if(pointerDrop){\n          if(Math.abs(dx)>.3)");
  source = replaceOnce(source,'      a.ambientEscape=escape;',
    '      waiting.delete(key);helpedAt.delete(key);a.ambientEscape=escape;');
  source = replaceOnce(source,'    function idle(a){', '    function idle(a){\n      waiting.delete(a.key);if(relief?.owner===a.key)clearRelief();');
  source = replaceOnce(source,'      if(!flags.reducedMotion&&flags.autonomy!==false)for(const a of actors)',
    '      stepRelief(flags);\n      if(!flags.reducedMotion&&flags.autonomy!==false)for(const a of actors)');
  return source;
}

module.exports = {patchMovement};
