'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {digest, replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// This entry only presents saved frames. The official painter reads the same
// actor records used for body size, facing, depth, equipment and shadows.
function narrowPlayback() {
  let keys;
  function prepare(roster, scale) {
    const current = scene.navigation?.intentScale;
    if (!globalThis.HomeCastTrial?.settings.paused || scene.region!=='forest' ||
        !current || Math.abs(current.x-scale.x)>1e-6 || Math.abs(current.y-scale.y)>1e-6 ||
        roster.length!==28 || actors.length!==28) throw Error('記録と森の投影条件が一致しません。');
    const rendered = new Map(globalThis.HomeCastTrial.inspect().map(a=>[a.key,a]));
    keys = roster.map(([key,w,h,asset])=>{
      const a=actor(key), paint=rendered.get(key);
      if(!a || a.w!==w || a.h!==h || !paint?.asset?.endsWith(asset))throw Error('記録の住民・画像・体格が一致しません。');
      return key;
    });
  }
  function frame(rows, time) {
    if(!keys || rows.length !== keys.length || !globalThis.HomeCastTrial.settings.paused) throw Error('記録を表示できません。');
    clock=time;
    for(let i=0;i<keys.length;i++){
      const a=actor(keys[i]);
      const [x,y,direction,activity,source,moving,after,faceKey,visualReaction,visualTarget,yieldFor]=rows[i];
      Object.assign(a,{x,y,direction,activity,source,after,faceKey,visualReaction,visualTarget,yieldFor,
        target:moving?{x,y}:null,route:[]});
    }
  }
  return {prepare,frame};
}

function addNarrowReplay({add,files}) {
  const model='home-production-model-mobility-v12-yield-short.js';
  const base=files.get('game/'+model), template=files.get('game/mobility-v12-yield-short.html');
  if(!base||!template)throw Error('Build the protected V12 comparison before the narrow-exit recording');
  const name='home-production-model-mobility-v12-narrow.js';
  const output=replaceExact(base,'    return {metrics:', '    '+narrowPlayback.toString()+'\n    globalThis.HomeNarrowPlayback=narrowPlayback();\n    return {metrics:');
  const html=replaceExact(template,model+'?v='+digest(base).slice(0,12),name+'?v='+digest(output).slice(0,12));
  add('game/'+name,output);add('game/mobility-v12-narrow.html',html);
  for(const key of ['narrow.html','narrow.mjs'])add('v12/'+key,fs.readFileSync(path.join(__dirname,key),'utf8'));
  add('v12/narrow-recording.json',fs.readFileSync(path.join(__dirname,'evidence/narrow-recording.json'),'utf8'));
}
module.exports={addNarrowReplay};
