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
  1:PILOT.mushroom.stages[1],4:PILOT.mushroom.stages[4],8:PILOT.mushroom.stages[8],
  5:{...PILOT.mushroom.stages[8],cap:{r:.70,h:.57,shape:'flat',spots:[[-.48,.25,.16],[.26,.57,.16],[.59,-.19,.14],[-.18,-.45,.18]]},stem:{h:.53,r:.28},normalEye:'content',colors:{...PILOT.mushroom.stages[8].colors,cap:'#e93b2c',capDark:'#ac2425',spot:'#fff0cd'},attachments:['dirt']},
  2:{...PILOT.mushroom.stages[4],form:'mycelium',core:{r:.28,h:.25,depth:.23},branches:{count:12,reach:.72,r:.027},normalEye:'squeeze',colors:{...PILOT.mushroom.stages[4].colors,branch:'#f9e4c9'},attachments:[]},
  3:{...PILOT.mushroom.stages[4],cap:{r:.48,h:.45,shape:'flat',spots:[[-.32,.1,.18]]},stem:{h:.35,r:.18},face:{capHeight:.50,half:.54},normalEye:'round',colors:{...PILOT.mushroom.stages[4].colors,cap:'#eea18b',capDark:'#cd766c',capFace:'#fff0d2',spot:'#fff8e4'}},
  7:{...PILOT.mushroom.stages[8],cap:{r:.71,h:.43,shape:'flat',roll:.20,spots:[[-.48,.32,.18],[.28,.58,.17],[.57,-.21,.14],[-.18,-.45,.19]]},stem:{h:.64,r:.27,lean:.16},normalEye:'content',colors:{...PILOT.mushroom.stages[8].colors,cap:'#dc4036',capDark:'#a5262a',spot:'#fff1d6'},attachments:['dirt'],sporeCluster:{spec:{...PILOT.mushroom.stages[1],count:3,spread:.60,layout:[[0,.15,.02,.75],[.10,.67,-.03,.80],[.24,1.20,.01,.78]]},at:[.76,.43,.02],scale:.52}},
  6:{...PILOT.mushroom.stages[8],cap:{r:.86,h:.38,shape:'upturned',crown:.98,spots:[[-.48,.40,.16],[.30,.58,.15],[.70,-.08,.13],[-.25,-.42,.16],[.26,-.64,.12]]},stem:{h:.66,r:.21},collar:{r:.30,h:.12,at:.50},normalEye:'squeeze',colors:{...PILOT.mushroom.stages[8].colors,cap:'#ed4a39',capDark:'#be2f30',spot:'#fff2d6'},attachments:['dirt']}
 }},starfish:{why:'Elongated diagonal blue larva, then one young star with a connected translucent larval remnant.',stages:{
  1:PILOT.starfish.stages[1],4:PILOT.starfish.stages[4],8:PILOT.starfish.stages[8],
  5:{...PILOT.starfish.stages[4],r:.66,armR:.27,thick:.19,curl:.04,normalEye:{left:'round',right:'happy'},colors:{base:'#ffd22c',light:'#ffe85a',dark:'#e87519'}},
  6:{...PILOT.starfish.stages[8],r:.65,armR:.32,thick:.25,curl:.23,dotRadius:.028,normalEye:'squeeze',colors:{base:'#f59825',light:'#ffc546',dark:'#dc6620',dot:'#fff2cd'},attachments:[]},
  7:{...PILOT.starfish.stages[4],r:.71,armR:.22,thick:.17,curl:.23,normalEye:{left:'round',right:'squeeze'},colors:{base:'#ee6b80',light:'#f9a8a4',dark:'#ce455e',tip:'#ffe1be'}},
  2:{...PILOT.starfish.stages[1],h:1.05,r:.37,coreProfile:{center:[-.05,.53],radii:[.34,.24,.18],tilt:.28},face:{center:[-.12,.56,.6],half:.68},contour:[[-.32,1.02],[-.58,1],[-.60,.94],[-.52,.89],[-.72,.90],[-.88,.86],[-.92,.78],[-.78,.71],[-.64,.72],[-.60,.62],[-.70,.51],[-.75,.38],[-.62,.28],[-.56,.15],[-.37,.13],[-.20,.20],[.22,.05],[.82,-.05],[1.08,0],[1.05,.10],[.70,.30],[.50,.42],[.78,.43],[.83,.52],[.63,.61],[.47,.63],[.32,.72],[.12,.84],[.32,.88],[.33,.96],[.20,1],[.08,.96],[-.10,.90],[-.16,.99]]},
  3:{...PILOT.starfish.stages[4],r:.50,armR:.28,thick:.21,curl:.08,colors:{base:'#f7c578',light:'#ffe3a2',dark:'#ed7098'},larvalAttachment:{spec:{...PILOT.starfish.stages[1],h:.65,r:.28},at:[-.16,.11,-.12],scale:.85,roll:.22}}
 }}};
});
