// Original-derived transition representatives; not promoted to production coverage.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 if(root)root.NaotocchiTopologyWave=factory;
})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const flower=PILOT.dandelion.stages[6];
 return {dandelion:{why:'Closed yellow bud and rooted white seed head, distinct from open flower and dispersed seed cluster.',stages:{
  1:PILOT.dandelion.stages[1],
  2:{...PILOT.dandelion.stages[4],form:'sprout',bulb:.30,cotyledons:{len:.56,width:.16,lift:.67},colors:{leaf:'#65bd24',leafDark:'#177526',vein:'#c6e943',bulb:'#eaa64d',foot:'#a77940'}},
  3:{...PILOT.dandelion.stages[4],leaves:9,leafLen:.94,bulb:.19,colors:{...PILOT.dandelion.stages[4].colors,leaf:'#5ab927',leafDark:'#237922'}},
  4:PILOT.dandelion.stages[4],
  6:PILOT.dandelion.stages[6],
  8:PILOT.dandelion.stages[8],
  5:{...flower,form:'bud',leaves:7,leafLen:.49,stem:.34,head:.28,leafLift:.12,normalEye:'content',bud:{height:.69,depth:.25,sepals:5},colors:{...flower.colors,face:'#ffe454',petalDark:'#eda622',leaf:'#359b26'}},
  7:{...flower,form:'seedHead',leaves:7,leafLen:.56,stem:.29,head:.39,leafLift:.12,normalEye:{left:'happy',right:'round'},seedHead:{lobes:24,depth:.27},colors:{...flower.colors,face:'#fff0d6',pappus:'#fffdf4'}}
 }}};
});
