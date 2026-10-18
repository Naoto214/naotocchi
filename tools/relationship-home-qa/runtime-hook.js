(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.installRelationshipQa=factory;
})(typeof window!=='undefined'?window:globalThis,function install(api,config,env){
 'use strict';
 env=env||window;
 let ran=false,running=false,heldTimer;
 const renew=()=>api.startRelationshipPositive(config.targetKind||'partner',config.targetKind==='companion'?api.state().companions[0]:api.state().partner);
 const positive=()=>{renew();api.render();};
 if(config.mode==='held')positive();
 const qa={
  run(){
   if(ran||!['play','return'].includes(config.mode))return false;
   ran=true;
   if(config.mode==='return')positive();
   else {
    // QA-only deterministic draw: representative is the first companion.
    // Both low-bond companions still react through the ORIGINAL rescue rule.
    const resolver=env.NaotocchiRelationshipExpression;
    const original=resolver.companionPositiveIds;
    resolver.companionPositiveIds=(before,after)=>original(before,after,()=>0);
    running=true;
    try {api.play();} finally {running=false;resolver.companionPositiveIds=original;}
   }
   return true;
  },
  get ran(){return ran;},
  get running(){return running;},
  stop(){if(heldTimer)env.clearInterval(heldTimer);}
 };
 // Fixed comparisons use real production transitions and freeze their result.
 // Animation snapshots pause the actual animations, never QA replacement CSS.
 const freeze=()=>{for(const a of env.document?.getAnimations?.()||[]){a.pause();a.currentTime=450;}};
 if(config.phase==='positive'||config.phase==='after')qa.run();
 if(config.mode==='held'||config.phase==='positive'||config.phase==='after'){
  api.snapshot?.(config.phase==='after'?'after':'positive');freeze();
 }else if(config.phase==='before')ran=true;
 return qa;
});
