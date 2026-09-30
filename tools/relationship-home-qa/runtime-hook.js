(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 else root.installRelationshipQa=factory;
})(typeof window!=='undefined'?window:globalThis,function install(api,config,env){
 'use strict';
 env=env||window;
 let ran=false,running=false,heldTimer;
 const positive=()=>{api.startRelationshipPositive('partner',api.state().partner);api.render();};
 if(config.mode==='held'){positive();heldTimer=env.setInterval(positive,1000);}
 const qa={
  run(){
   if(ran||!['play','return'].includes(config.mode))return false;
   ran=true;
   if(config.mode==='return')positive();
   else {
    // QA-only deterministic draw: representative is the first companion.
    // Both low-bond companions still react through the ORIGINAL rescue rule.
    const random=env.Math.random;env.Math.random=()=>0;
    running=true;
    try {api.play();} finally {running=false;env.Math.random=random;}
   }
   return true;
  },
  get ran(){return ran;},
  get running(){return running;},
  stop(){if(heldTimer)env.clearInterval(heldTimer);}
 };
 return qa;
});
