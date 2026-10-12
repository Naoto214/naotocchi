// Original-derived topology stages. Only explicitly reviewed families are promoted by rollout-spec.
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory;
 if(root)root.NaotocchiTopologyWave=factory;
})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const flower=PILOT.dandelion.stages[6];
 const turtle={archetype:'quadruped',idlePose:'stand',body:{len:.85,r:.30,hip:1,chest:1},neck:.06,head:{r:.27,squash:.96,width:1.05,flatFace:true},ears:{type:'none'},legs:{len:.12,r:.105,splay:.15},tail:{type:'short',len:.18,r:.035},shell:{width:.47,length:.55,height:.45,cell:.30},colors:{base:'#a2bc55',belly:'#d7d98e',muzzle:'#bfd17d',paw:'#a0b454',ear:'#a2bc55',nose:'#879b42',shell:'#73872d',seam:'#465820',scute:'#acb052'}};
 const frogColors={base:'#579d40',belly:'#d8f5a7',fin:'#92ca6c',eyeRing:'#c9ed8b'};
 return {frog:{why:'Explicit tadpole-to-adult limb/tail transition, folded haunches and raised eye-bearing lobes.',stages:{
  1:{archetype:'quadruped',crouch:true,body:{width:.18,height:.18,depth:.22,y:.28},head:{width:.33,height:.34,depth:.29,at:[0,.075,.12]},fore:null,hind:null,tail:{len:.72,height:.15,r:.09,lift:.17},normalEye:'flat',colors:{...frogColors,base:'#527c37',belly:'#c2df91'}},
  2:{archetype:'quadruped',crouch:true,body:{width:.17,height:.17,depth:.23,y:.26},head:{width:.30,height:.28,depth:.27,at:[0,.045,.11]},fore:null,hind:null,tail:{len:1.0,height:.17,r:.075,lift:.25},colors:{...frogColors,base:'#5b9947'}},
  4:{archetype:'quadruped',crouch:true,body:{width:.24,height:.24,depth:.27,y:.30},head:{width:.36,height:.31,depth:.30,at:[0,.13,.13]},fore:{at:[.20,.02,.16],r:.045,path:[[0,0,0],[.02,-.13,.06],[.035,-.27,.16]]},hind:{at:[.18,-.035,-.10],r:.07,haunch:{at:[.06,.01,-.015],size:[.095,.105,.085]},path:[[0,0,0],[.13,.015,-.02],[.08,-.18,-.10],[.18,-.25,.13]]},tail:{len:.90,height:.17,r:.08,lift:.20},colors:frogColors},
  6:{archetype:'quadruped',crouch:true,body:{width:.27,height:.31,depth:.24,y:.35},head:{width:.41,height:.23,depth:.28,at:[0,.35,.025],lobes:{x:.23,y:.20,z:.03,r:.155}},fore:{at:[.24,.10,.13],r:.065,path:[[0,0,0],[.09,-.13,.10],[.13,-.40,.20]]},hind:{at:[.22,-.025,-.08],r:.105,haunch:{at:[.12,.055,-.04],size:[.16,.205,.15]},path:[[0,0,0],[.22,.10,-.07],[.26,-.20,-.07],[.34,-.29,.15]]},tail:null,normalEye:'happy',colors:{...frogColors,base:'#5ca644'}},
  8:{archetype:'quadruped',crouch:true,body:{width:.35,height:.29,depth:.28,y:.34},head:{width:.46,height:.235,depth:.31,at:[0,.29,.045],lobes:{x:.27,y:.18,z:.02,r:.155}},fore:{at:[.27,.055,.16],r:.08,path:[[0,0,0],[.025,-.16,.08],[.045,-.33,.19]]},hind:{at:[.28,-.035,-.09],r:.115,haunch:{at:[.09,.025,-.04],size:[.18,.18,.165]},path:[[0,0,0],[.20,.035,-.03],[.13,-.19,-.13],[.24,-.285,.15]]},tail:null,normalEye:'happy',mottle:{color:'#a6b361',scale:13,threshold:.75},colors:{base:'#7a9244',belly:'#dbe8a0',fin:'#9daf65',eyeRing:'#d6e69a'}},
  3:{archetype:'quadruped',crouch:true,body:{width:.24,height:.23,depth:.28,y:.30},head:{width:.37,height:.34,depth:.30,at:[0,.12,.15]},fore:null,hind:{at:[.16,-.07,-.10],r:.055,path:[[0,0,0],[.09,-.08,-.03],[.10,-.19,.11]]},tail:{len:.94,height:.17,r:.085,lift:.20},colors:frogColors},
  5:{archetype:'quadruped',crouch:true,body:{width:.26,height:.31,depth:.24,y:.34},head:{width:.43,height:.32,depth:.30,at:[0,.32,.08]},fore:{at:[.21,.10,.12],r:.065,path:[[0,0,0],[.04,-.19,.10],[.04,-.37,.21]]},hind:{at:[.21,-.02,-.07],r:.105,haunch:{at:[.085,.025,-.025],size:[.16,.21,.15]},path:[[0,0,0],[.18,.025,-.02],[.13,-.24,-.10],[.23,-.29,.14]]},tail:{len:.35,height:.075,r:.05,lift:.12},normalEye:{left:'round',right:'happy'},colors:frogColors},
  7:{archetype:'quadruped',crouch:true,body:{width:.29,height:.35,depth:.24,y:.38},head:{width:.43,height:.24,depth:.30,at:[0,.36,.02],lobes:{x:.25,y:.22,z:.025,r:.17}},fore:{at:[.22,.12,.15],r:.062,path:[[0,0,0],[.015,-.21,.09],[.03,-.44,.20]]},hind:{at:[.24,-.03,-.08],r:.12,haunch:{at:[.10,.045,-.035],size:[.18,.25,.17]},path:[[0,0,0],[.19,.09,-.02],[.12,-.24,-.15],[.23,-.33,.14]]},tail:null,colors:frogColors}
 }},dandelion:{why:'Closed yellow bud and rooted white seed head, distinct from open flower and dispersed seed cluster.',stages:{
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
  5:{...PILOT.mushroom.stages[8],cap:{r:.70,h:.57,shape:'flat',tilt:-.55,spots:[[-.48,.25,.16],[.26,.57,.16],[.59,-.19,.14],[-.18,-.45,.18]]},stem:{h:.53,r:.28},normalEye:'content',colors:{...PILOT.mushroom.stages[8].colors,cap:'#e93b2c',capDark:'#ac2425',spot:'#fff0cd'},attachments:['dirt']},
  2:{...PILOT.mushroom.stages[4],form:'mycelium',core:{r:.28,h:.25,depth:.23},branches:{count:12,reach:.72,r:.027},normalEye:'squeeze',colors:{...PILOT.mushroom.stages[4].colors,branch:'#f9e4c9'},attachments:[]},
  3:{...PILOT.mushroom.stages[4],cap:{r:.48,h:.45,shape:'flat',spots:[[-.32,.1,.18]]},stem:{h:.35,r:.18},face:{capHeight:.50,half:.54},normalEye:'round',colors:{...PILOT.mushroom.stages[4].colors,cap:'#eea18b',capDark:'#cd766c',capFace:'#fff0d2',spot:'#fff8e4'}},
  7:{...PILOT.mushroom.stages[8],cap:{r:.71,h:.43,shape:'flat',tilt:-.55,roll:.20,spots:[[-.48,.32,.18],[.28,.58,.17],[.57,-.21,.14],[-.18,-.45,.19]]},stem:{h:.64,r:.27,lean:.16},normalEye:'content',colors:{...PILOT.mushroom.stages[8].colors,cap:'#dc4036',capDark:'#a5262a',spot:'#fff1d6'},attachments:['dirt'],sporeCluster:{spec:{...PILOT.mushroom.stages[1],count:3,spread:.60,layout:[[0,.15,.02,.75],[.10,.67,-.03,.80],[.24,1.20,.01,.78]]},at:[.76,.43,.02],scale:.52}},
  6:{...PILOT.mushroom.stages[8],cap:{r:.86,h:.38,shape:'upturned',tilt:-.32,crown:.98,spots:[[-.48,.40,.16],[.30,.58,.15],[.70,-.08,.13],[-.25,-.42,.16],[.26,-.64,.12]]},stem:{h:.66,r:.21},collar:{r:.30,h:.12,at:.61},normalEye:'squeeze',colors:{...PILOT.mushroom.stages[8].colors,cap:'#ed4a39',capDark:'#be2f30',spot:'#fff2d6'},attachments:['dirt']}
 }},starfish:{why:'Elongated diagonal blue larva, then one young star with a connected translucent larval remnant.',stages:{
  1:PILOT.starfish.stages[1],4:PILOT.starfish.stages[4],8:PILOT.starfish.stages[8],
  5:{...PILOT.starfish.stages[4],r:.66,armR:.27,thick:.19,curl:.04,normalEye:{left:'round',right:'happy'},colors:{base:'#ffd22c',light:'#ffe85a',dark:'#e87519'}},
  6:{...PILOT.starfish.stages[8],r:.65,armR:.32,thick:.25,curl:.23,dotRadius:.028,normalEye:'squeeze',colors:{base:'#f59825',light:'#ffc546',dark:'#dc6620',dot:'#fff2cd'},attachments:[]},
  7:{...PILOT.starfish.stages[4],r:.71,armR:.22,thick:.17,curl:.23,normalEye:{left:'round',right:'squeeze'},colors:{base:'#ee6b80',light:'#f9a8a4',dark:'#ce455e',tip:'#ffe1be'}},
  2:{...PILOT.starfish.stages[1],h:1.05,r:.37,coreProfile:{center:[-.05,.53],radii:[.34,.24,.18],tilt:.28},face:{center:[-.12,.56,.6],half:.68},contour:[[-.32,1.02],[-.58,1],[-.60,.94],[-.52,.89],[-.72,.90],[-.88,.86],[-.92,.78],[-.78,.71],[-.64,.72],[-.60,.62],[-.70,.51],[-.75,.38],[-.62,.28],[-.56,.15],[-.37,.13],[-.20,.20],[.22,.05],[.82,-.05],[1.08,0],[1.05,.10],[.70,.30],[.50,.42],[.78,.43],[.83,.52],[.63,.61],[.47,.63],[.32,.72],[.12,.84],[.32,.88],[.33,.96],[.20,1],[.08,.96],[-.10,.90],[-.16,.99]]},
  3:{...PILOT.starfish.stages[4],r:.50,armR:.28,thick:.21,curl:.08,colors:{base:'#f7c578',light:'#ffe3a2',dark:'#ed7098'},larvalAttachment:{spec:{...PILOT.starfish.stages[1],h:.65,r:.28},at:[-.16,.11,-.12],scale:.85,roll:.22}}
 }},turtle:{why:'Original05 high olive scuted dome, small forward head and four short splayed feet; no mammalian ears or nose.',stages:{
  1:{...turtle,body:{len:.50,r:.19,hip:1,chest:1},neck:.005,head:{r:.25,squash:.90,width:1.07,flatFace:true},legs:{len:.045,r:.068,splay:.10},shell:{width:.28,length:.32,height:.22,cell:.35},tail:{type:'short',len:.10,r:.025},normalEye:'droop'},
  2:{...turtle,body:{len:.59,r:.23,hip:1,chest:1},neck:.035,head:{r:.30,squash:.97,width:1.04,flatFace:true},legs:{len:.075,r:.078,splay:.11},shell:{width:.34,length:.38,height:.29,cell:.32},tail:{type:'short',len:.12,r:.028}},
  3:{...turtle,body:{len:.67,r:.25,hip:1,chest:1},neck:.045,head:{r:.30,squash:.96,width:1.05,flatFace:true},legs:{len:.09,r:.09,splay:.13},shell:{width:.39,length:.43,height:.32,cell:.32},normalEye:{left:'round',right:'happy'},poseProfile:{pawLift:'legFL',pawLiftAngle:-.70}},
  4:{...turtle,body:{len:.88,r:.27,hip:1,chest:1},neck:.15,head:{r:.255,squash:1.02,width:1.0,flatFace:true},legs:{len:.14,r:.095,splay:.16},shell:{width:.43,length:.57,height:.39,cell:.30}},
  5:turtle,
  6:{...turtle,body:{len:.90,r:.31,hip:1,chest:1},neck:0,head:{r:.245,squash:.93,width:1.04,flatFace:true},shell:{width:.49,length:.58,height:.55,cell:.30},normalEye:'droop'},
  7:{...turtle,body:{len:.94,r:.32,hip:1,chest:1},neck:-.025,head:{r:.24,squash:.93,width:1.07,flatFace:true},shell:{width:.51,length:.61,height:.59,cell:.31,moss:[{u:-.26,v:-.25,r:.09,h:.025},{u:.52,v:.20,r:.065,h:.02}]},normalEye:'droop',colors:{...turtle.colors,base:'#a7b35a',shell:'#737c31',scute:'#a7a449',moss:'#839930'}},
  8:{...turtle,body:{len:.96,r:.32,hip:1,chest:1},neck:-.085,head:{r:.24,squash:.83,width:1.12,flatFace:true,forward:-.04},legs:{len:.10,r:.105,splay:.18},shell:{width:.52,length:.62,height:.57,cell:.31,moss:[{u:0,v:0,r:.13,h:.055},{u:-.48,v:.3,r:.13,h:.04},{u:.53,v:-.18,r:.12,h:.035},{u:.22,v:.67,r:.10,h:.03},{u:-.25,v:-.68,r:.11,h:.03},{u:-.7,v:-.15,r:.08,h:.025}]},normalEye:'content',colors:{...turtle.colors,base:'#a9b05c',shell:'#727929',scute:'#a0a34b',moss:'#8fa92c'}}
 }}};
});
