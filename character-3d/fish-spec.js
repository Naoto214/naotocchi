// Original-only fish wave candidates. Runtime promotion follows four-view review.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiFishWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const copy=o=>JSON.parse(JSON.stringify(o));
 const fry={archetype:'fish',body:{len:1.3,h:.36,w:.18,roundHead:true},tail:{len:.32,h:.39,fork:.62},fins:{dorsal:.17,pectoral:.13,dorsalRange:[.12,-.2]},bands:[],hover:.43,
  colors:{base:'#e99678',back:'#c66e5e',belly:'#ffdfb1',fin:'#dd8a73',band:'#fff4d9',edge:'#93695a',spot:'#9a705e'},sideMarks:{spots:18,strength:.42},face:{half:.22,eyeSize:.26}};
 const salmon={why:'Original salmon: yolk sac, long fry with parr bars, silver adult, hooked red mature fish.',designFill:'Opposite flank repeats visible markings; dorsal volume and forked tail follow the original lateral silhouette.',stages:{}};
 salmon.stages[1]={...copy(fry),body:{len:1.1,h:.29,w:.145,roundHead:true},tail:{len:.28,h:.34,fork:.58},yolk:{r:.145,at:[0,-.155,.1],color:'#ffc34e'},normalEye:'content',face:{half:.18,eyeSize:.25}};
 salmon.stages[3]={...copy(fry),body:{len:1.45,h:.47,w:.20,roundHead:true},sideMarks:{bars:6,color:'#91785a',strength:.7,spots:18},face:{half:.27,eyeSize:.25},normalEye:'happy'};
 salmon.stages[7]={...copy(fry),body:{len:1.55,h:.63,w:.24,roundHead:true},tail:{len:.34,h:.52,fork:.62},fins:{dorsal:.30,pectoral:.21,dorsalRange:[.12,-.2]},jaw:{length:.16,depth:.085},face:{half:.31,eyeSize:.24},
  colors:{base:'#c45440',back:'#a94639',belly:'#d99e74',head:'#a6a37b',fin:'#777954',band:'#eee8bc',edge:'#5d6049',spot:'#dfb28b'},sideMarks:{spots:32,strength:.6},normalEye:'droop'};
 salmon.stages[2]={...copy(fry),body:{len:1.28,h:.40,w:.19,roundHead:true},fins:{dorsal:.20,pectoral:.14,dorsalRange:[.12,-.2]},sideMarks:null,face:{half:.245,eyeSize:.29}};
 salmon.stages[4]={...copy(fry),body:{len:1.58,h:.47,w:.195,roundHead:true},tail:{len:.34,h:.43,fork:.62},fins:{dorsal:.20,pectoral:.17,dorsalRange:[.12,-.2]},face:{half:.26,eyeSize:.27},sideMarks:{spots:32,strength:.5},colors:{base:'#a8b8c5',back:'#77899a',belly:'#e6e7df',fin:'#a1aebe',band:'#eee9dd',edge:'#647581',spot:'#e9eeed'}};
 salmon.stages[5]={...copy(salmon.stages[4]),body:{len:1.64,h:.59,w:.24,roundHead:true},tail:{len:.38,h:.55,fork:.64},fins:{dorsal:.27,pectoral:.22,dorsalRange:[.12,-.2]},face:{half:.31,eyeSize:.26},sideMarks:{spots:40,strength:.55}};
 salmon.stages[6]={...copy(salmon.stages[5]),body:{len:1.66,h:.65,w:.27,roundHead:true},tail:{len:.39,h:.60,fork:.64},fins:{dorsal:.28,pectoral:.24,dorsalRange:[.12,-.2]},face:{half:.34,eyeSize:.26},colors:{...copy(salmon.stages[5].colors),back:'#70818f',belly:'#ecede5'}};
 salmon.stages[8]={...copy(salmon.stages[7]),body:{len:1.50,h:.58,w:.24,roundHead:true},tail:{len:.35,h:.50,fork:.58},jaw:{length:.14,depth:.075},face:{half:.29,eyeSize:.235},colors:{base:'#945743',back:'#734839',belly:'#be8e67',head:'#a48b61',fin:'#79574a',band:'#e8d1a9',edge:'#60483b',spot:'#d8a781'},sideMarks:{spots:22,strength:.5}};
 salmon.stages[1].colors.tail='#84929f';
 for(const sp of Object.values(salmon.stages))sp.fins.spread=.85;
 const clownfish=copy(PILOT.clownfish);
 clownfish.stages[2]={...copy(clownfish.stages[1]),body:{len:1.04,h:.46,w:.255},tail:{len:.31,h:.40},fins:{dorsal:.20,pectoral:.17,spread:.8},translucent:null,normalEye:'round',face:{half:.28,eyeSize:.28},colors:{base:'#f4b174',belly:'#f7d5a3',fin:'#f3ba85',band:'#fff6df',edge:'#f0ad76'}};
 clownfish.stages[3]={...copy(clownfish.stages[4]),body:{len:1.09,h:.60,w:.31},tail:{len:.32,h:.45},fins:{dorsal:.28,pectoral:.24,spread:.8},bands:[.29,.79],bandEdge:false,normalEye:'happy'};
 clownfish.stages[6]={...copy(clownfish.stages[4]),body:{len:1.13,h:.62,w:.33},tail:{len:.34,h:.47},fins:{dorsal:.31,pectoral:.27,spread:.8},normalEye:'happy'};
 clownfish.stages[7]={...copy(clownfish.stages[8]),body:{len:1.25,h:.81,w:.41},tail:{len:.37,h:.57},fins:{dorsal:.40,pectoral:.33,spread:.8},normalEye:'round'};
 clownfish.stages[5]={...copy(clownfish.stages[4]),body:{len:1.2,h:.78,w:.38},tail:{len:.35,h:.54},fins:{dorsal:.37,pectoral:.29,spread:.8},normalEye:'happy',school:[{at:[-.50,.61,-.28],scale:.40,heading:-.12},{at:[.35,-.61,-.18],scale:.37,heading:.13}]};
 return {salmon,clownfish};
});
