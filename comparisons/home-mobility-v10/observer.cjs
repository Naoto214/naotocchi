const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// Observe only native ambient requests that actually reached the planner. A
// drag or a helper's walk cannot end another resident's run of rejections.
function patchObserver(source) {
  let result = replaceExact(source, 'goalWalks:0,',
    'goalWalks:0,strictDistanceCss:0,ownRejections:0,ownRecoveries:0,firstRejectedAt:null,longestRejected:0,');
  result = replaceExact(result, "      if(accepted){\n        if(prefix==='ambient'){", `      if(prefix==='ambient'){
        const t=relative(clock);
        if(!accepted && r.firstRejectedAt===null){r.firstRejectedAt=t;r.ownRejections++;}
        if(accepted && r.firstRejectedAt!==null){
          r.longestRejected=Math.max(r.longestRejected,t-r.firstRejectedAt);
          r.firstRejectedAt=null;r.ownRecoveries++;
        }
      }
      if(accepted){
        if(prefix==='ambient'){`);
  return replaceExact(result,
    'if(pixels(a.x-g.x,a.y-g.y)>=8 && pixels(g.gx-g.x,g.gy-g.y)-pixels(g.gx-a.x,g.gy-a.y)>.75)r.goalWalks++;',
    `const displacement=pixels(a.x-g.x,a.y-g.y);
        if(displacement>=8 && pixels(g.gx-g.x,g.gy-g.y)-pixels(g.gx-a.x,g.gy-a.y)>.75){
          r.goalWalks++;r.strictDistanceCss+=displacement;
        }`);
}
module.exports={patchObserver};
