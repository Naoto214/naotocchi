'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');
const {patchCareModel}=require('./foot-care.cjs');

// This experiment changes only the opt-in, paused growth check. A peer whose
// entire contact ellipse is outside the 16-CSS-pixel search rectangle cannot
// touch any of the tested segments. Ground/occlusion is evaluated only after
// the inexpensive exact contact test passes.
function patchFastCareModel(source) {
  let code=patchCareModel(source);
  const start='  function legalDirections(a) {',end='  function bodySignature(a) {';
  const i=code.indexOf(start),j=code.indexOf(end,i);
  if(i<0||j<i)throw Error('Missing original growth exit inspector');
  code=replaceExact(code,code.slice(i,j),`  const bearings=[];
  for(const distance of [3,8,16]){
    for(let direction=0;direction<48;direction++){
      const angle=Math.PI*direction/24;
      bearings.push([Math.cos(angle)*distance,Math.sin(angle)*distance]);
    }
  }
  let measured=null;
  function legalDirections(a,required=null){
    const nav=scene.navigation,scale=nav.intentScale,b=bounds(a,scene);
    const dx=16/scale.x,dy=16/scale.y;
    const near=[];
    for(const other of actors){
      if(other===a)continue;
      const rx=(a.w+other.w)*.5+10,ry=(a.h+other.h)*.38+10;
      if(Math.abs(a.x-other.x)>dx+rx+1e-6||Math.abs(a.y-other.y)>dy+ry+1e-6)continue;
      near.push({other,rx,ry});
    }
    const mask=new Array(bearings.length).fill(false);
    for(let k=0;k<bearings.length;k++){
      if(required && !required[k])continue;
      const [sx,sy]=bearings[k],to={x:a.x+sx/scale.x,y:a.y+sy/scale.y};
      if(to.x<b.left||to.x>b.right||to.y<b.top||to.y>b.bottom)continue;
      if(near.every(({other,rx,ry})=>contactSegmentSafe(a,to,other,rx,ry)))
        mask[k]=nav.segmentSafe(a,to,p=>visible(a,p));
    }
    return mask;
  }
`);
  code=replaceExact(code,'    for (const a of actors) {\n      const previousMask=before.people.get(a.key).directions,currentMask=legalDirections(a);',
    `    const finalCheck=steps.length===2;
    record.completeCurrentMask=!finalCheck;
    measured=finalCheck?null:{nav:scene.navigation,people:new Map()};
    for (const a of actors) {
      const previousMask=before.people.get(a.key).directions,currentMask=legalDirections(a,finalCheck?previousMask:null);
      if(measured)measured.people.set(a.key,{x:a.x,y:a.y,body:bodySignature(a),directions:currentMask});`);
  code=replaceExact(code,"    record.accepted=!record.lost;","    if(finalCheck){record.retainedExits=record.currentExits;record.currentExits=null;}\n    record.accepted=!record.lost;");
  return replaceExact(code,'    else capture();','    else if(record.accepted && measured){before=measured;measured=null;}\n    else capture();');
}
module.exports={patchFastCareModel};
