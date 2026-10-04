// Original-derived topology stages. Only explicitly reviewed families are promoted by rollout-spec.
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
 }},butterfly:{why:'Emergence: partly unfolded blue wings beside an opened green casing under the source twig; one butterfly face.',stages:{
  1:PILOT.butterfly.stages[1],
  2:{...PILOT.butterfly.stages[1],segments:6,len:1.30,r:.21,head:{r:.31},foreRise:1.60,feetPerSection:2,normalEye:'round'},
  3:{...PILOT.butterfly.stages[1],segments:7,len:1.42,r:.25,head:{r:.39},foreRise:2.20,feetPerSection:2,normalEye:{left:'round',right:'happy'},colors:{...PILOT.butterfly.stages[1].colors,base:'#b1dd32',spot:'#78b22e'}},
  4:PILOT.butterfly.stages[4],
  5:PILOT.butterfly.stages[5],
  7:{...PILOT.butterfly.stages[8],body:{len:.52,r:.095},head:{r:.24},wings:{span:1.42,h:.82,vertical:1.05},normalEye:{left:'round',right:'happy'}},
  8:PILOT.butterfly.stages[8],
  6:{...PILOT.butterfly.stages[8],body:{len:.34,r:.085},head:{r:.21},antenna:.28,bodyOffset:[-.17,.015,.04],wings:{span:.66,h:.62,vertical:1.55,foreScale:.32,hindScale:1.20},legs:{radius:.015,pairs:[[.01,.13,-.07,.10,-.14],[-.07,.14,-.16,.14,-.23],[-.15,.13,-.25,.11,-.32]]},normalEye:'round',emergence:{h:.66,r:.17,at:[.40,.01,-.02],branchY:.77,colors:{base:'#93cd35',inside:'#d9ed8e',dark:'#4d9429'}}}
 }},mushroom:{why:'Mycelium branching centre, young cap-face and upturned mature cap with scalloped collar.',stages:{
  2:{...PILOT.mushroom.stages[4],form:'mycelium',core:{r:.28,h:.25,depth:.23},branches:{count:12,reach:.72,r:.027},normalEye:'happy',colors:{...PILOT.mushroom.stages[4].colors,branch:'#f9e4c9'},attachments:[]},
  3:{...PILOT.mushroom.stages[4],cap:{r:.55,h:.43,shape:'flat',spots:[[-.32,.1,.18]]},stem:{h:.25,r:.19},normalEye:'content',colors:{...PILOT.mushroom.stages[4].colors,cap:'#eea18b',capDark:'#cd766c',capFace:'#fff0d2',spot:'#fff8e4'}},
  6:{...PILOT.mushroom.stages[8],cap:{r:.86,h:.28,shape:'upturned',spots:[[-.48,.40,.16],[.30,.58,.15],[.70,-.08,.13],[-.25,-.42,.16],[.26,-.64,.12]]},stem:{h:.66,r:.21},collar:{r:.30,h:.12,at:.50},normalEye:'round',colors:{...PILOT.mushroom.stages[8].colors,cap:'#ed4a39',capDark:'#be2f30',spot:'#fff2d6'},attachments:['dirt']}
 }}};
});
