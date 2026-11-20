'use strict';

function patchModel(source) {
  function replace(before, after) {
    if (source.split(before).length !== 2) throw Error('Unexpected V6 movement source at ' + before.slice(0, 85));
    source = source.replace(before, () => after);
  }

  replace('    function move(key,p,source=', `    // When a crowded autonomous route cannot reach a completely free endpoint,
    // one ordinary walking turn can still open space. Evaluate the local feet
    // first; the real terrain and visible sprite bounds decide the entire leg.
    function ambientEscape(a,goal,box,canSee){
      const nav=scene.navigation,s=nav?.intentScale;
      if(actors.length<=15||!nav?.intentAware||!s||clock-a.lastWalk<15)return null;
      const radius=24,near=actors.filter(b=>a!==b).map(b=>({
        b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10,
      })).filter(({b,rx,ry})=>Math.abs(b.x-a.x)<=rx*1.4+radius/s.x&&Math.abs(b.y-a.y)<=ry*1.4+radius/s.y);
      const debt=q=>near.reduce((sum,{b,rx,ry})=>{
        const gap=Math.hypot((q.x-b.x)/rx,(q.y-b.y)/ry);
        return sum+Math.max(0,1.25-gap)**2;
      },0);
      const startDebt=debt(a);
      if(startDebt<.001)return null;
      const dx=(goal.x-a.x)*s.x,dy=(goal.y-a.y)*s.y,heading=Math.atan2(dy,dx);
      const options=[];
      for(let j=0;j<32;j++){
        const angle=heading+j*Math.PI/16,ux=Math.cos(angle),uy=Math.sin(angle);
        for(const r of [24,18,12,8]){
          const q={x:a.x+r*ux/s.x,y:a.y+r*uy/s.y};
          if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom)continue;
          if(!near.every(({b,rx,ry})=>contactSegmentSafe(a,q,b,rx,ry)))continue;
          const gain=startDebt-debt(q),forward=r*Math.cos(angle-heading);
          if(gain<.001&&forward<r*.4)continue;
          if(a.escapeFrom&&clock-a.escapeFrom.at<45){
            const last=a.escapeFrom;
            if(Math.hypot((q.x-last.x)*s.x,(q.y-last.y)*s.y)<Math.hypot((a.x-last.x)*s.x,(a.y-last.y)*s.y)-2)continue;
          }
          options.push({q,score:gain*32+r*.15+forward*.2});
        }
      }
      options.sort((u,v)=>v.score-u.score);
      return options.find(({q})=>nav.segmentSafe(a,q,canSee))?.q||null;
    }
    function move(key,p,source=`);

  replace('      if(!path.length||(!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){', `      let escape=false;
      if(source==='ambient'&&!path.length){
        const next=ambientEscape(a,p,safeBounds,canSee);
        if(next){q=next;path=[next];escape=true;}
      }
      if(!path.length||(!drag&&Math.hypot(q.x-a.x,q.y-a.y)<3)){`);
  replace('      a.pointerDrop=pointerDrop;', `      a.ambientEscape=escape;
      if(escape){a.escapeFrom={x:a.x,y:a.y,at:clock};a.faceKey=null;a.visualTarget=null;a.visualReaction=undefined;a.after='look';}
      a.pointerDrop=pointerDrop;`);
  replace('pointerDrop:!!old?.pointerDrop,yieldFor:', 'pointerDrop:!!old?.pointerDrop,ambientEscape:!!old?.ambientEscape,escapeFrom:old?.escapeFrom,yieldFor:');
  replace('if(dist<(a.pointerDrop?1e-7:.5)){','if(dist<(a.pointerDrop||a.ambientEscape?1e-7:.5)){');
  replace('const liveDrop=a.pointerDrop&&scene.navigation?.intentAware;', 'const liveDrop=!!scene.navigation?.intentAware;');
  replace('    function offerYield(a,request){', `    function meetsDropFloor(request,q,scale){
      if(!request?.floor)return true;
      return ['x','y'].every(axis=>(q[axis]-request.floor[axis])*request.direction[axis]*scale[axis]>=-.75);
    }
    function offerYield(a,request){`);
  replace('if(r<3||gain<Math.min(3,length/4)', 'if(!meetsDropFloor(request,q,scale)||r<3||gain<Math.min(3,length/4)');
  replace('      const drag=pointerDrop&&', `      if(request&&pointerDrop&&source==='drag'&&retryingKey!==key){
        if(Math.abs(dx)<1)request.direction.x=0;
        if(Math.abs(dy)<1)request.direction.y=0;
      }
      const drag=pointerDrop&&`);
  replace("if(request?.floor&&['x','y'].some(axis=>(q[axis]-request.floor[axis])*request.direction[axis]<-1e-7))return false;",
    "if(request?.floor&&(drag?!meetsDropFloor(request,q,{x:sx,y:sy}):['x','y'].some(axis=>(q[axis]-request.floor[axis])*request.direction[axis]<-1e-7)))return false;");
  replace('    function meetsDropFloor(request,q,scale){', `    function canYield(b){
      return !b.target&&b.key!==selected&&clock>=b.manualUntil&&clock>=(b.yieldAfter||0)&&!manualGoals.has(b.key);
    }
    function yieldLeg(b,from,to,at){
      const box=bounds(b,scene),nav=scene.navigation;
      if(to.x<box.left||to.x>box.right||to.y<box.top||to.y>box.bottom)return false;
      for(const other of actors){
        if(other===b)continue;
        if(!contactSegmentSafe(from,to,at.get(other.key)||other,(b.w+other.w)*.5+10,(b.h+other.h)*.38+10))return false;
      }
      return nav.segmentSafe(from,to,scene.planVisibility?.(b)||(q=>visible(b,q)));
    }
    // The initial single-neighbor check has already failed. Consider two short,
    // sequential straight walks only for a still-unserved nearby finger drop.
    // Yield bounded work between frames; commit nothing until a complete plan
    // has been checked, then recheck each stage with live feet.
    function* pairPlan(a,goal){
      const nav=scene.navigation,s=nav.intentScale,origin={x:a.x,y:a.y};
      const members=actors.map(b=>({key:b.key,x:b.x,y:b.y,w:b.w,h:b.h,box:bounds(b,scene),canHelp:b!==a&&canYield(b)}));
      const owner=members.find(b=>b.key===a.key);
      const distance=(u,v)=>Math.hypot((u.x-v.x)*s.x,(u.y-v.y)*s.y);
      const length=distance(origin,goal),heading=Math.atan2((goal.y-a.y)*s.y,(goal.x-a.x)*s.x);
      const inside=(q,b)=>q.x>=b.left&&q.x<=b.right&&q.y>=b.top&&q.y<=b.bottom;
      function canPass(b,p,other,at=other){
        const rx=(b.w+other.w)*.5+10,ry=(b.h+other.h)*.38+10;
        if(!contactSegmentSafe(b,p,at,rx,ry))return false;
        const start=((b.x-at.x)/rx)**2+((b.y-at.y)/ry)**2;
        const finish=((p.x-at.x)/rx)**2+((p.y-at.y)/ry)**2;
        // A planned handoff must have room for floating-point step rounding
        // where a fresh endpoint approaches the outside of a contact ellipse.
        return start<1||finish>=start||finish>1.00001;
      }
      function blockers(b,p,max){
        const blocked=[];
        for(const other of members)if(other!==b&&!canPass(b,p,other)){
          if(!other.canHelp||blocked.length>=max)return null;
          blocked.push(other);
        }
        return blocked;
      }
      const visibility=new Map();
      function onGround(b,p){
        if(!visibility.has(b)){
          const who=actor(b.key);
          if(!who)return false;
          visibility.set(b,scene.planVisibility?.(who)||(q=>visible(who,q)));
        }
        return nav.segmentSafe(b,p,visibility.get(b));
      }
      const goals=[];
      for(const ratio of [1,.75,2/3,.5])for(let step=-4;step<=4;step++){
        const angle=heading+step*Math.PI/12,r=length*ratio;
        const q={x:origin.x+r*Math.cos(angle)/s.x,y:origin.y+r*Math.sin(angle)/s.y};
        const miss=distance(q,goal);
        if(!inside(q,owner.box)||r*Math.cos(angle-heading)<4||miss>Math.min(24,length*.8)||length-miss<3)continue;
        const blocked=blockers(owner,q,2);
        if(blocked?.length&&onGround(owner,q))goals.push({q,miss,blocked});
      }
      goals.sort((u,v)=>u.miss-v.miss);
      const choices=new Map();
      function* moves(b){
        if(choices.has(b))return choices.get(b);
        const points=[];
        for(const r of [4,8,12,16,20,24])for(let angle=0;angle<24;angle++){
          if(angle%8===0)yield;
          const p={x:b.x+r*Math.cos(angle*Math.PI/12)/s.x,y:b.y+r*Math.sin(angle*Math.PI/12)/s.y};
          if(!inside(p,b.box))continue;
          const blocked=blockers(b,p,1);
          if(blocked)points.push({p,blocked});
        }
        choices.set(b,points);return points;
      }
      let comparisons=0;
      for(const {q,blocked} of goals)for(const second of blocked){
        const mustMove=blocked.find(b=>b!==second);
        for(const next of yield* moves(second)){
          if(++comparisons%48===0)yield;
          const first=mustMove||next.blocked[0];
          if(!first||next.blocked.some(b=>b!==first)||!canPass(owner,q,second,next.p))continue;
          next.ground??=onGround(second,next.p);
          if(!next.ground)continue;
          for(const start of yield* moves(first)){
            if(++comparisons%48===0)yield;
            if(start.blocked.length||!canPass(second,next.p,first,start.p)||!canPass(owner,q,first,start.p))continue;
            start.ground??=onGround(first,start.p);
            if(start.ground)return {origin,q,stages:[{key:first.key,from:{x:first.x,y:first.y},to:start.p},{key:second.key,from:{x:second.x,y:second.y},to:next.p}]};
          }
        }
      }
      return null;
    }
    function sameFoot(a,b){return !!a&&Math.hypot(a.x-b.x,a.y-b.y)<1e-6;}
    function beginPairStage(a,request,pair,stage){
      if(!sameFoot(a,pair.origin)||actors.some(b=>b.target&&b.source==='yield'))return false;
      const predicted=new Map();
      for(let i=0;i<pair.stages.length;i++){
        const leg=pair.stages[i],b=actor(leg.key);
        if(i<stage){if(!sameFoot(b,leg.to))return false;continue;}
        if(!b||!sameFoot(b,leg.from)||!canYield(b)||!yieldLeg(b,b,leg.to,predicted))return false;
        predicted.set(b.key,leg.to);
      }
      if(!yieldLeg(a,a,pair.q,predicted))return false;
      const leg=pair.stages[stage],b=actor(leg.key);
      b.faceKey=null;b.visualTarget=null;b.visualReaction=undefined;b.pointerDrop=true;
      b.route=[];b.target=leg.to;b.source='yield';b.yieldFor=a.key;b.yieldAfter=clock+3;
      activity(b,'walk');b.lastWalk=clock;defer(b,2);stats.moves++;
      request.yieldPeer=b.key;request.nextAt=clock+.15;request.handoff=pair.q;return true;
    }
    function meetsDropFloor(request,q,scale){`);
  replace('      if(!best)return false;', `      if(!best){
        if(!request.floor&&actors.length>15&&length>=6&&length<=32){
          request.pairSearch=pairPlan(a,request.point);
        }
        return false;
      }`);
  replace("        if(!a.target&&a.key!==flags.heldActor&&clock>=request.nextAt){", `        if(request.pairSearch&&clock>=request.nextAt&&(!request.peers||request.peers.some(([id,x,y])=>{
          const peer=actor(id);return !peer||peer.x!==x||peer.y!==y;
        })))request.pairSearch=null;
        if(!a.target&&a.key!==flags.heldActor&&request.pairSearch){
          // At most four batches per tick. Existing expiry bounds total work.
          let result;
          for(let i=0;i<4;i++){result=request.pairSearch.next();if(result.done)break;}
          if(!result.done)continue;
          request.pairSearch=null;
          if(result.value&&beginPairStage(a,request,result.value,0)){request.pairNext=result.value;continue;}
        }
        if(!a.target&&a.key!==flags.heldActor&&clock>=request.nextAt){`);
  replace("          if(helper?.yieldFor===key&&helper.target)continue;", `          if(helper?.yieldFor===key&&helper.target)continue;
          if(request.pairNext){
            const pair=request.pairNext;request.pairNext=null;
            if(beginPairStage(a,request,pair,1))continue;
            request.handoff=null;
          }`);
  return source;
}

module.exports = {patchModel};
