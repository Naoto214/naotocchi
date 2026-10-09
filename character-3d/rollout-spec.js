// Exact, original-derived rollout candidates. No nearest-stage or generic species filling.
// Pilot reference stages are reused unchanged. Promotion to runtime follows wave visual QA.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  if (root) root.NaotocchiCharacter3DRollout = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(PILOT) {
  'use strict';
  const copy = o => JSON.parse(JSON.stringify(o));
  const extend = (base, patch) => {
    const out = copy(base);
    for (const [k,v] of Object.entries(patch)) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? {...out[k],...v} : v;
    return out;
  };
  const dog = copy(PILOT.dog);
  const pup = dog.stages[1], adult = dog.stages[4], elder = dog.stages[8];
  dog.stages[2] = extend(pup, {
    idlePose:'sit', body:{len:.79,r:.34,chest:1.05,hip:1.08},head:{r:.44,squash:.98,snout:.11,snoutR:.15},legs:{len:.34,r:.10},neck:.12,
    ears:{type:'floppy',len:.40,w:.30,tilt:-.08},tail:{type:'raised',len:.34,r:.095},normalEye:'round',
  });
  dog.stages[3] = extend(adult, {
    idlePose:'stand',body:{len:.95,r:.30,chest:1.06,hip:1.04},head:{r:.40,squash:1.02,snout:.12,snoutR:.14},legs:{len:.38,r:.095},neck:.14,
    ears:{len:.33,w:.25,tilt:.08},tail:{type:'hook',len:.44,r:.09},poseProfile:{pawLift:'legFL',pawLiftAngle:-.95},
  });
  dog.stages[5] = extend(adult, {
    idlePose:'stand',body:{len:1.23,r:.29,chest:1.12,hip:.94},head:{r:.35,squash:1.04,snout:.20,snoutR:.14},legs:{len:.57,r:.09},neck:.21,
    ears:{len:.35,w:.23,tilt:.03},tail:{type:'hook',len:.61,r:.085},
  });
  dog.stages[6] = extend(adult, {
    idlePose:'stand',body:{len:1.18,r:.34,chest:1.18,hip:1.04},head:{r:.38,squash:1.0,snout:.18,snoutR:.16},legs:{len:.52,r:.11},neck:.18,
    ears:{len:.35,w:.25,tilt:.02},tail:{type:'hook',len:.60,r:.115},normalEye:'happy',
  });
  dog.stages[7] = extend(elder, {
    body:{len:1.0,r:.36,chest:1.16,hip:1.1},head:{r:.40,squash:.95,snout:.15,snoutR:.16},legs:{len:.40,r:.11},neck:.13,
    ears:{len:.34,w:.28,tilt:-.1,sides:{left:{type:'pointy',len:.34,w:.25},right:{type:'floppy',len:.33,w:.29}}},tail:{type:'short',len:.36,r:.13},fluff:null,
    colors:{base:'#dfa04f',belly:'#f5ce91',muzzle:'#f5d7a0',ear:'#a76632',nose:'#392218',paw:'#d99a48'},
  });

  // Player cat is the grey growing line, not the calico companion. Its shorter muzzle,
  // cheek mask, light feet and curled resting silhouette come from cat/01..08.png.
  const catBase = {
    archetype:'quadruped',idlePose:'stand',body:{len:1.09,r:.28,chest:.96,hip:1.05},head:{r:.37,width:1.04,squash:.91,snout:.035,snoutR:.095,eyeX:28,eyeSize:.29},
    legs:{len:.45,r:.077},neck:.11,ears:{type:'pointy',len:.40,w:.32,tilt:.04},tail:{type:'hook',len:.70,r:.072},
    colors:{base:'#89818f',belly:'#c9c3cd',muzzle:'#e6e0e5',ear:'#897781',nose:'#ad777d',paw:'#d8d2d8'},
    patchMap:{head:[{at:[0,-.06,.68],size:[.96,.91,.62],color:'muzzle'}]},
  };
  const cat = {why:'Original grey cat: curl / sit / lifted paw / stretched play / adult / elder.',designFill:'Rear coat continues visible grey; no invented calico or stripes. Tail curls remain three-dimensional.',stages:{}};
  cat.stages[1] = extend(catBase,{idlePose:'lie',body:{len:.70,r:.30,chest:.97,hip:1.1},head:{r:.34,squash:.86},legs:{len:.20,r:.078},neck:.045,ears:{len:.24,w:.24},tail:{type:'wrap',len:.86,r:.10},normalEye:'happy'});
  cat.stages[2] = extend(catBase,{idlePose:'sit',body:{len:.77,r:.29,chest:1.0,hip:1.12},head:{r:.41,squash:.97,eyeSize:.30},legs:{len:.29,r:.09},neck:.08,ears:{len:.40,w:.31},tail:{type:'hook',len:.58,r:.075}});
  cat.stages[3] = extend(catBase,{body:{len:.91,r:.28},head:{r:.39,squash:.95},legs:{len:.34,r:.08},neck:.10,tail:{type:'hook',len:.71,r:.072},poseProfile:{pawLift:'legFL',pawLiftAngle:-1.0}});
  cat.stages[4] = extend(catBase,{idlePose:'stretchPlay',body:{len:1.23,r:.245,chest:.92,hip:1.08},head:{r:.34,squash:.91},legs:{len:.45,r:.07},tail:{type:'hook',len:.78,r:.07},poseProfile:{stretch:.95},normalEye:'happy'});
  cat.stages[5] = copy(catBase);
  cat.stages[6] = extend(catBase,{idlePose:'sit',body:{len:1.03,r:.33,chest:1.09,hip:1.11},head:{r:.39,squash:.97},legs:{len:.40,r:.09},tail:{type:'hook',len:.76,r:.085}});
  cat.stages[7] = extend(catBase,{idlePose:'sit',body:{len:1.04,r:.34,chest:1.08,hip:1.16},head:{r:.38,squash:.93,eyeSize:.28},legs:{len:.37,r:.095},tail:{type:'long',len:.76,r:.09},normalEye:'droop',colors:{base:'#817b86',muzzle:'#ddd6de',paw:'#cfc7d1'}});
  cat.stages[8] = extend(catBase,{idlePose:'lie',body:{len:.98,r:.38,chest:1.10,hip:1.16},head:{r:.42,squash:.90},legs:{len:.28,r:.11},neck:.06,ears:{len:.38,w:.34},tail:{type:'wrap',len:1.08,r:.12},normalEye:'happy',colors:{base:'#98929d',belly:'#ded8e0',muzzle:'#eee9ee',paw:'#e3dce5'}});

  const penguin = copy(PILOT.penguin), chick = penguin.stages[1], grown = penguin.stages[8];
  penguin.stages[2] = extend(chick,{idlePose:'stand',body:{h:.91,r:.46,belly:.66},head:{r:.43,merge:.65},wing:{len:.36,w:.15},feet:{len:.17},fluff:.85});
  penguin.stages[3] = extend(chick,{idlePose:'stand',body:{h:1.0,r:.45,belly:.69},head:{r:.43,merge:.62},wing:{len:.47,w:.16},feet:{len:.17},fluff:.72,raisedWing:true,wingPose:{left:-2.15,right:2.15},normalEye:'happy'});
  penguin.stages[5] = extend(grown,{body:{h:1.12,r:.43,belly:.68},head:{r:.41,merge:.62},wing:{len:.56,w:.135},feet:{len:.18},attachments:[],normalEye:'round'});
  penguin.stages[6] = extend(grown,{body:{h:1.25,r:.47,belly:.68},head:{r:.42,merge:.58},wing:{len:.63,w:.14},feet:{len:.20},attachments:[],normalEye:'round',colors:{base:'#303946',back:'#272f3a'}});
  penguin.stages[7] = extend(grown,{body:{h:1.22,r:.49,belly:.69},head:{r:.43,merge:.58},wing:{len:.64,w:.15},feet:{len:.20},attachments:[],normalEye:'round'});
  const fishFactory=typeof module==='object'&&module.exports?require('./fish-spec.js'):globalThis.NaotocchiFishWave;
  const humanFactory=typeof module==='object'&&module.exports?require('./humanoid-spec.js'):globalThis.NaotocchiHumanoidWave;
  const topologyFactory=typeof module==='object'&&module.exports?require('./topology-spec.js'):globalThis.NaotocchiTopologyWave;
  const aquaticFactory=typeof module==='object'&&module.exports?require('./aquatic-spec.js'):globalThis.NaotocchiAquaticWave;
  const armoredFactory=typeof module==='object'&&module.exports?require('./armored-spec.js'):globalThis.NaotocchiArmoredWave;
  const botanicalFactory=typeof module==='object'&&module.exports?require('./botanical-spec.js'):globalThis.NaotocchiBotanicalWave;
  const mythicFactory=typeof module==='object'&&module.exports?require('./mythic-spec.js'):globalThis.NaotocchiMythicWave;
  return {dog,cat,penguin,...fishFactory(PILOT),...humanFactory(PILOT),dandelion:topologyFactory(PILOT).dandelion,butterfly:topologyFactory(PILOT).butterfly,mushroom:topologyFactory(PILOT).mushroom,starfish:topologyFactory(PILOT).starfish,turtle:topologyFactory(PILOT).turtle,frog:topologyFactory(PILOT).frog,coral:aquaticFactory(PILOT).coral,jellyfish:aquaticFactory(PILOT).jellyfish,beetle:armoredFactory(PILOT).beetle,stagbeetle:armoredFactory(PILOT).stagbeetle,sakura:botanicalFactory(PILOT).sakura,cicada:armoredFactory(PILOT).cicada,antlion:armoredFactory(PILOT).antlion,hermit_crab:armoredFactory(PILOT).hermit_crab,world_tree:botanicalFactory(PILOT).world_tree,plush:mythicFactory(PILOT).plush,dragon:mythicFactory(PILOT).dragon,phoenix:mythicFactory(PILOT).phoenix,venus_flytrap:botanicalFactory(PILOT).venus_flytrap};
});
