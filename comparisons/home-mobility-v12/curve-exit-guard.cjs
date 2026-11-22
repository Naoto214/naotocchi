'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Keep each comparison within the same probe budget. When a resident cannot
// walk 8 CSS pixels, the short-distance policy checks its last 3-pixel exit.
function patchExitGuard(s, mode='all'){
  if(!['short','all'].includes(mode))throw Error('Unknown guard mode');
  s=replaceExact(s,'const opening=new Map();','const opening=new Map();\n  const openingsByRadius=new Map();');
  s=replaceExact(s,'function* hasExit(b,at,first=-1){','function* hasExit(b,at,first=-1,radius=8){');
  s=replaceExact(s,'Math.abs(pos.x-from.x)<=(b.w+peer.w)*.5+10+8/s.x &&\n        Math.abs(pos.y-from.y)<=(b.h+peer.h)*.38+10+8/s.y;',
    'Math.abs(pos.x-from.x)<=(b.w+peer.w)*.5+10+radius/s.x &&\n        Math.abs(pos.y-from.y)<=(b.h+peer.h)*.38+10+radius/s.y;');
  s=replaceExact(s,'const n=i<0?first:i,to=point(from,rays[n],8);','const n=i<0?first:i,to=point(from,rays[n],radius);');
  const horizon=mode==='all'?16:8;
  s=replaceExact(s,'const near=p=>Math.abs(p.x-foot.x)<=(b.w+moved.w)*.5+10+8/s.x &&\n                          Math.abs(p.y-foot.y)<=(b.h+moved.h)*.38+10+8/s.y;',
    'const near=p=>Math.abs(p.x-foot.x)<=(b.w+moved.w)*.5+10+'+horizon+'/s.x &&\n                          Math.abs(p.y-foot.y)<=(b.h+moved.h)*.38+10+'+horizon+'/s.y;');
  s=replaceExact(s,'          if(old<0)continue;\n          const current=yield* hasExit(b,at,old);\n          if(current===null)return false;\n          if(current<0){stats.protected++;protectedBy[b.key]=(protectedBy[b.key]||0)+1;return false;}',`          const distances=${mode==='all'?'[8,3,16]':'old<0?[3]:[8]'};
          for(const radius of distances){
            const id=b.key+'@'+radius;
            if(!openingsByRadius.has(id))openingsByRadius.set(id,radius===8?old:yield* hasExit(b,empty,-1,radius));
            const startRay=openingsByRadius.get(id);
            if(startRay===null)return false;
            if(startRay<0)continue;
            const current=yield* hasExit(b,at,startRay,radius);
            if(current===null)return false;
            if(current<0){stats.protected++;protectedBy[id]=(protectedBy[id]||0)+1;return false;}
          }`);
  s=replaceExact(s,'            if(++stats.probes%96===0)yield;\n            if(stats.probes>=maxProbes)break outer;',
    '            if(stats.probes>=maxProbes)break outer;\n            if(++stats.probes%96===0)yield;');
  return s;
}
module.exports={patchExitGuard};
