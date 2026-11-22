'use strict';
const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// These adapters are loaded only by the paused 320px historical replay.
function modelReplay(source) {
  return replaceExact(source, '    return {metrics:', `    globalThis.restoreRecordedHousehold = feet => {
      if (actors.length !== feet.length) throw Error('Different household');
      for (const [key,x,y,w,h] of feet) {
        const resident = actor(key);
        if (!resident || resident.w!==w || resident.h!==h) throw Error('Different resident artwork or size');
      }
      for (const [key,x,y] of feet) Object.assign(actor(key), {x,y,route:[],target:null});
    };
    return {metrics:`);
}

function rendererReplay(source) {
  return replaceExact(source, '    function sync(){', `    globalThis.FootReplay = Object.freeze({
      restore(feet) { globalThis.restoreRecordedHousehold(feet); paint(); },
      replacePanda() {
        const key = 'companion:panda';
        const position = () => { const a=model.snapshot().find(a=>a.key===key); return [a.x,a.y]; };
        const before=position(), node=rows.get(key).owner, scale=scene.navigation.intentScale;
        node.replaceWith(node.cloneNode(true));
        sync();
        const after=position();
        return {before,after,distance:Math.hypot((after[0]-before[0])*scale.x,(after[1]-before[1])*scale.y)};
      }
    });
    function sync(){`);
}

module.exports = {modelReplay,rendererReplay};
