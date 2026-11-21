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
function patchOwnerObserver(source) {
  let result = replaceExact(source, 'ownRecoveries:0,',
    'ownRecoveries:0,ownIdleEnds:0,ownBudgetEnds:0,_budgetChoice:false,');
  result = replaceExact(result,
    "wait(a,reason){const r=row(a.key);r.waits++;add(r.waitReasons,reason);},",
    `wait(a,reason){
      const r=row(a.key);
      r.waits++;add(r.waitReasons,reason);
      if(reason==='ambient-budget')r._budgetChoice=true;
    },`);
  result = replaceExact(result, 'choice(a,name){add(row(a.key).choices,name);},',
    `choice(a,name){
      const r=row(a.key);
      add(r.choices,name);
      if(r.firstRejectedAt!==null && ['look','turn','sit','rest'].includes(name)){
        const t=relative(model().clock);
        r.longestRejected=Math.max(r.longestRejected,t-r.firstRejectedAt);
        r.firstRejectedAt=null;
        if(r._budgetChoice)r.ownBudgetEnds++;
        else r.ownIdleEnds++;
      }
      r._budgetChoice=false;
    },`);
  // An analytically 8 CSS px waypoint may round just below eight after projection.
  return replaceExact(result, 'if(displacement>=8 &&', 'if(displacement>=8-1e-7 &&');
}
module.exports={patchObserver,patchOwnerObserver};
