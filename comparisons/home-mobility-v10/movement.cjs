'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Ordinary walkers may stop along an already verified route when its final
// steps would close a stationary neighbor's last sampled walking direction.
// Independent accepts and refusals always use the original requested point.
const courtesy=`function considerateEndpoint(a,goal,path) {
  const nav=scene.navigation,s=nav?.intentScale;
  if(actors.length<=15||!nav?.intentAware||!s||!path.length)return null;
  const q=path[path.length-1];
  const distance=(b,c)=>Math.hypot((c.x-b.x)*s.x,(c.y-b.y)*s.y);
  const length=distance(a,q),first=path[0],firstLength=distance(a,first);
  if(length<=10||length>24||firstLength<8)return null;
  const oldDistance=distance(a,goal),oldGain=oldDistance-distance(q,goal);
  if(oldGain<.75)return null;
  const samePlace=new Map(),neighbors=[];
  function newObstacle(b,point) {
    const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
    if(Math.abs(point.x-b.x)>rx+8/s.x||Math.abs(point.y-b.y)>ry+8/s.y)return false;
    const gap=p=>Math.hypot((p.x-b.x)/rx,(p.y-b.y)/ry);
    return gap(point)<gap(a)-.01;
  }
  for(const b of actors)if(b!==a&&!b.target&&(newObstacle(b,q)||newObstacle(b,first)))neighbors.push(b);
  if(!neighbors.length)return null;
  const directions=new Map();
  function closes(b,point) {
    if(!newObstacle(b,point))return false;
    let sample=directions.get(b);
    if(!sample){
      const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
      const candidates=[];
      const pairs=actors.filter(c=>c!==a&&c!==b).map(c=>({c,rx:(c.w+b.w)*.5+10,ry:(c.h+b.h)*.38+10})).filter(({c,rx,ry})=>
        Math.abs(c.x-b.x)<=rx+8/s.x&&Math.abs(c.y-b.y)<=ry+8/s.y);
      const box=bounds(b,scene);
      for(let i=0;i<48;i++){
        const z={x:b.x+8*Math.cos(i*Math.PI/24)/s.x,y:b.y+8*Math.sin(i*Math.PI/24)/s.y};
        if(z.x<box.left||z.x>box.right||z.y<box.top||z.y>box.bottom)continue;
        if(pairs.every(n=>contactSegmentSafe(b,z,n.c,n.rx,n.ry)))candidates.push(z);
      }
      sample={rx,ry,candidates,ink:null};directions.set(b,sample);
    }
    function onGround(z){
      sample.ink??=scene.planVisibility?.(b)||(p=>visible(b,p));
      z.safe??=nav.segmentSafe(b,z,sample.ink);return z.safe;
    }
    const usable=(z,obstacle)=>contactSegmentSafe(b,z,obstacle,sample.rx,sample.ry)&&onGround(z);
    return !sample.candidates.some(z=>usable(z,point))&&sample.candidates.some(z=>usable(z,a));
  }
  if(!neighbors.some(b=>closes(b,q)))return null;
  for(const range of [firstLength-2,firstLength-4,8]){
    if(range<8||range>length||range>firstLength)continue;
    const fraction=range/firstLength,tip={x:a.x+(first.x-a.x)*fraction,y:a.y+(first.y-a.y)*fraction};
    if(oldDistance-distance(tip,goal)<Math.max(.75,oldGain*.5))continue;
    if(!yieldLeg(a,a,tip,samePlace)||neighbors.some(b=>closes(b,tip)))continue;
    return tip;
  }
  return null;
}
`;
function patchMovement(source){
  let result=replaceExact(source,'function localIntentRoute(a,goal,box,ink) {',courtesy+'function localIntentRoute(a,goal,box,ink) {');
  result=replaceExact(result,"      if(source==='ambient'&&!escape&&continuing!==key&&",`      if(source==='ambient'&&!escape&&!intentRoute&&path.length&&
         clock-(a.lastOwnWalk??a.lastWalk)>=70&&Math.hypot((q.x-a.x)*sx,(q.y-a.y)*sy)<8){
        const onward=localIntentRoute(a,p,safeBounds,canSee);
        if(onward){
          const distance=z=>Math.hypot((z.x-p.x)*sx,(z.y-p.y)*sy),end=onward.at(-1);
          if(distance(end)<=distance(q)){path=onward;q=end;intentRoute=true;}
        }
      }
      if(source==='ambient'&& !relieved&&!escape&&path.length){
        const tip=considerateEndpoint(a,p,path);
        if(tip){q=tip;path=[tip];intentRoute=true;}
      }
      if(source==='ambient'&&!escape&&continuing!==key&&`);
  return result;
}
module.exports={patchMovement};
