// Original-only fish wave candidates. Runtime promotion follows four-view review.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiFishWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const copy=o=>JSON.parse(JSON.stringify(o));
 const fry={archetype:'fish',body:{len:1.3,h:.36,w:.18},tail:{len:.32,h:.39,fork:.62},fins:{dorsal:.17,pectoral:.13},bands:[],hover:.43,
  colors:{base:'#e99678',back:'#c66e5e',belly:'#ffdfb1',fin:'#dd8a73',band:'#fff4d9',edge:'#93695a',spot:'#9a705e'},sideMarks:{spots:18,strength:.42},face:{half:.22,eyeSize:.26}};
 const salmon={why:'Original salmon: yolk sac, long fry with parr bars, silver adult, hooked red mature fish.',designFill:'Opposite flank repeats visible markings; dorsal volume and forked tail follow the original lateral silhouette.',stages:{}};
 salmon.stages[1]={...copy(fry),body:{len:1.1,h:.29,w:.145},tail:{len:.28,h:.34,fork:.58},yolk:{r:.19,at:[0,-.16,.1],color:'#ffc34e'},normalEye:'content',face:{half:.18,eyeSize:.25}};
 salmon.stages[3]={...copy(fry),body:{len:1.45,h:.47,w:.20},sideMarks:{bars:6,color:'#91785a',strength:.7,spots:18},face:{half:.27,eyeSize:.25},normalEye:'happy'};
 salmon.stages[7]={...copy(fry),body:{len:1.55,h:.63,w:.24},tail:{len:.34,h:.52,fork:.62},fins:{dorsal:.30,pectoral:.21},jaw:{length:.16,depth:.085},face:{half:.31,eyeSize:.24},
  colors:{base:'#c45440',back:'#a94639',belly:'#d99e74',head:'#a6a37b',fin:'#777954',band:'#eee8bc',edge:'#5d6049',spot:'#dfb28b'},sideMarks:{spots:32,strength:.6},normalEye:'droop'};
 const clownfish=copy(PILOT.clownfish);
 clownfish.stages[5]={...copy(clownfish.stages[4]),body:{len:1.2,h:.78,w:.38},tail:{len:.35,h:.54},normalEye:'happy',school:[{at:[-.50,.61,-.28],scale:.40,heading:-.12},{at:[.35,-.61,-.18],scale:.37,heading:.13}]};
 return {salmon,clownfish};
});
