// Original-derived botanical families; runtime promotion is explicit in rollout-spec.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiBotanicalWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const roots=[
  {path:[[0,.27,0],[-.12,.13,.02],[-.38,.025,.16]],r:.075,taper:.80},
  {path:[[0,.26,.01],[.14,.12,.03],[.39,.025,.16]],r:.072,taper:.80},
  {path:[[0,.25,0],[-.10,.12,-.07],[-.24,.025,-.26]],r:.065,taper:.80},
  {path:[[0,.25,0],[.12,.11,-.09],[.27,.025,-.27]],r:.065,taper:.80},
  {path:[[0,.21,.02],[0,.08,.18],[.02,.025,.32]],r:.068,taper:.82}
 ];
 const crown=[
  [[0,.43,0],[-.21,.60,0],[-.48,.77,-.015]],
  [[0,.47,0],[-.13,.76,-.015],[-.28,1.00,-.025]],
  [[0,.50,0],[.025,.78,-.025],[.015,1.12,-.03]],
  [[0,.45,0],[.19,.71,0],[.37,.96,-.02]],
  [[0,.44,0],[.27,.60,.015],[.54,.74,.01]],
  [[0,.43,-.015],[.02,.70,-.19],[.10,.91,-.32]],
  [[0,.45,.02],[-.06,.70,.18],[-.18,.92,.30]]
 ];
 const positions=[[-.50,.77,-.01,.105],[-.40,.83,.01,.115],[-.29,.99,-.025,.12],[-.18,.94,.02,.11],[-.08,1.08,-.02,.12],[.035,1.12,-.03,.11],[.15,1.04,0,.12],[.27,1.01,-.01,.115],[.38,.95,-.02,.12],[.47,.84,.005,.11],[.54,.73,.01,.105],[-.31,.76,.08,.11],[-.12,.79,.11,.12],[.09,.82,.09,.12],[.31,.78,.10,.115],[-.19,.93,.30,.11],[.10,.92,-.32,.12],[-.10,.89,-.25,.11],[.29,.85,-.21,.105]];
 positions.push([-.42,.82,.23,.105],[.44,.82,.23,.105],[-.38,.91,-.26,.11],[.39,.90,-.26,.11],[-.16,.84,.37,.115],[.15,.91,.36,.11],[-.13,.86,-.38,.115],[.16,.83,-.37,.11],[-.34,.76,.31,.10],[.34,.73,-.31,.105]);
 const tips=positions.map(([x,y,z])=>{const end=[x,y,z],near=crown.flat().reduce((a,b)=>Math.hypot(...a.map((v,i)=>v-end[i]))<Math.hypot(...b.map((v,i)=>v-end[i]))?a:b);return {path:[near,end],r:.023,taper:.6,sides:5,steps:3};}).filter(t=>Math.hypot(...t.path[0].map((v,i)=>v-t.path[1][i]))>.001);
 const bloom={archetype:'branch_organism',body:{width:.17,height:.29,depth:.14,y:.31},branches:[...roots,...crown.map(path=>({path,r:.06,taper:.72})),...tips],stones:[],colors:{body:'#a66a2b',light:'#db9b4a',branch:'#995d27',tip:'#d69b51',stones:[],blush:'#ee946a'},normalEye:'round',blossoms:positions.map(([x,y,z,r],i)=>({at:[x,y,z],r,rotation:(i%5)*.36,tilt:[y>.98?-.25:.12,x<-.3?-1.05:x>.3?1.05:z<-.2?Math.PI:z>.2?.35:0,0],petal:i%3===0?'#ffb4d5':i%3===1?'#f48ac0':'#ffd2e1',center:'#f7d56d'}))};
 const copy=o=>JSON.parse(JSON.stringify(o));
 const leaf=(at,width,length,tilt,color='#429b20')=>({at,width,length,tilt,depth:.018,color,light:'#a6d84b',vein:'#c0d348'});
 const leafy={...copy(bloom),body:{width:.165,height:.27,depth:.14,y:.29},blossoms:[],branches:[...copy(roots),...crown.map(path=>({path:path.map(([x,y,z])=>[x*.94,y*.93,z]),r:.047,taper:.78}))],foliage:[
  leaf([-.45,.71,0],.065,.24,[.1,-.3,.85]),leaf([-.45,.71,0],.06,.20,[.2,.3,-.15]),leaf([-.26,.93,-.025],.065,.22,[.1,-.2,.45]),leaf([-.26,.93,-.025],.06,.19,[0,.2,-.6]),
  leaf([.014,1.04,-.03],.07,.24,[-.1,.1,-.45]),leaf([.014,1.04,-.03],.055,.19,[0,-.4,.7]),leaf([.35,.89,-.02],.07,.23,[.1,.3,-.8]),leaf([.35,.89,-.02],.06,.20,[0,-.1,.4]),
  leaf([.51,.69,.01],.065,.24,[.2,.4,-1.1]),leaf([.51,.69,.01],.055,.20,[0,-.2,.15]),leaf([-.17,.86,.30],.065,.23,[-.1,.65,.2]),leaf([.093,.85,-.32],.07,.22,[.2,-.8,-.3]),
  leaf([-.20,.56,.02],.055,.20,[.2,.2,1.2]),leaf([.25,.56,.04],.06,.21,[.2,-.3,-1.1]) ]};
 // Explicit paired leaves face outward around the front/back branches.
 leafy.foliage.push(
  leaf([-.17,.86,.30],.07,.23,[.15,1.35,-.60]),
  leaf([.093,.85,-.32],.065,.22,[.12,-1.35,.65]),
  leaf([-.34,.76,.23],.065,.23,[.18,1.25,.50]),
  leaf([-.34,.76,.23],.06,.20,[-.12,1.45,-.70]),
  leaf([.32,.78,-.25],.07,.24,[.16,-1.25,-.45]),
  leaf([.32,.78,-.25],.06,.20,[-.12,-1.45,.70])
 );
 leafy.branches.push(
  {path:[[-.12,.64,.10],[-.25,.71,.18],[-.34,.76,.23]],r:.03,taper:.65},
  {path:[[.14,.63,-.08],[.25,.71,-.18],[.32,.78,-.25]],r:.03,taper:.65}
 );
 const fruitUnits=[{at:[-.26,.51,-.01],r:.23,eye:{left:'happy',right:'happy'}},{at:[0,.25,.15],r:.25,eye:'round'},{at:[.29,.43,-.015],r:.225,eye:'round'}];
 const cherries={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:fruitUnits.map((u,i)=>({at:u.at,scale:1,spec:{archetype:'branch_organism',body:{width:u.r,height:u.r*.96,depth:u.r*.88,y:0},stones:[],normalEye:u.eye,colors:{body:i===0?'#e82b3f':i===1?'#e51d38':'#db2634',light:'#ff9382',branch:'#657816',tip:'#b1ad32',stones:[],blush:'#ff8891'},branches:[{path:[[0,u.r*.86,0],[.03-u.at[0],.83-u.at[1],-u.at[2]],[.06-u.at[0],.95-u.at[1],-u.at[2]]],r:.036,taper:.18}],foliage:i===2?[leaf([.06-u.at[0],.95-u.at[1],-u.at[2]],.12,.41,[.06,-.15,-.62])]:[]}}))};
 const seed={archetype:'branch_organism',body:{width:.22,height:.32,depth:.14,y:.33,taper:.6},normalEye:'content',stones:[],colors:{body:'#a6692d',light:'#e2ae67',branch:'#79941f',tip:'#bed044',stones:[],blush:'#dc7952'},branches:[{path:[[0,.57,0],[.04,.69,0],[.085,.78,0]],r:.028,taper:.4}],foliage:[leaf([.04,.67,0],.035,.12,[0,.2,-.7]),leaf([.07,.73,0],.03,.11,[0,-.4,.65])],blossoms:[]};
 const sprout={archetype:'branch_organism',body:{width:.26,height:.205,depth:.19,y:.235},normalEye:'round',stones:[[-.30,.035,0,.10,.06],[.30,.035,.02,.09,.055],[-.19,.035,.19,.09,.05],[.12,.03,.21,.08,.05]],colors:{body:'#f4dfac',light:'#fff5d3',branch:'#62951c',tip:'#8cc334',stones:['#a96b24','#dba149'],blush:'#e99970'},branches:[{path:[[0,.40,0],[0,.54,0],[-.01,.64,0]],r:.032,taper:.3}],foliage:[leaf([0,.55,0],.13,.44,[.12,-.25,.90]),leaf([-.005,.58,0],.145,.53,[-.10,.3,-.74])],blossoms:[]};
 const budPositions=[[-.27,.77,-.015,.13,.23,'round'],[0,.64,.07,.115,.20,'round'],[.29,.87,-.03,.14,.24,{left:'happy',right:'round'}],[-.42,.42,.05,.13,.15,'content'],[.43,.43,.025,.14,.16,{left:'round',right:'happy'}]];
 const budUnit=(p,face=true)=>{const [x,y,z,w,h,eye]=p;return {at:[x,y,z],scale:1,face,spec:{archetype:'branch_organism',body:{width:w,height:h,depth:w*.78,y:0,taper:.62},normalEye:eye,stones:[],colors:{body:'#ef8daf',light:'#ffe8e9',branch:'#668919',tip:'#a3bd3e',stones:[],blush:'#e76891'},branches:[{path:[[-x,.035-y,-z],[-x*.38,-y*.42,-z*.35],[0,-h*.65,0]],r:.023,taper:.15}],foliage:[leaf([-.02,-h*.70,.025],w*.47,h*.78,[.08,-.15,.50]),leaf([.02,-h*.70,-.01],w*.45,h*.75,[.05,.55,-.55])],blossoms:[]}};};
 const buds={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:budPositions.map(p=>budUnit(p))};
 const flowerUnits=[[-.23,.72,.04,.30],[.27,.70,-.015,.28]].map(([x,y,z,r],i)=>({at:[x,y,z],scale:1,spec:{archetype:'branch_organism',body:{width:.09,height:.09,depth:.065,y:0},normalEye:i===0?'round':'happy',stones:[],colors:{body:'#ffd657',light:'#fff6a1',branch:'#62841b',tip:'#a1bb35',stones:[],blush:'#eaaa45'},branches:[{path:[[-x,.035-y,-z],[-x*.35,-y*.42,-z*.35],[0,-.07,0]],r:.029,taper:.25}],foliage:[leaf([-x*.35,-y*.42,-z*.35],.07,.28,[.1,.3,.9]),leaf([-x*.2,-y*.28,-z*.2],.07,.26,[.1,-.4,-.9])],blossoms:[{at:[0,0,-.10],r,rotation:i*.22,tilt:[0,i===0?-.18:.18,0],petal:i===0?'#ffc2d9':'#ffaacb',center:'#ffcf47'}]}}));
 const flowers={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:[...flowerUnits,budUnit([-.39,.98,-.08,.055,.095,'round'],false),budUnit([-.04,1.02,-.08,.058,.10,'round'],false),budUnit([.21,1.01,-.10,.055,.085,'round'],false),budUnit([.42,.24,.08,.078,.09,'round'],false)]};
 const bare={...copy(leafy),body:{width:.18,height:.28,depth:.155,y:.30},normalEye:'content',foliage:[leaf([-.48,.77,-.015],.035,.12,[.15,.6,.9],'#b75014'),leaf([.37,.96,-.02],.035,.12,[.12,-.5,-.6],'#d57513'),leaf([.10,.91,-.32],.03,.11,[.2,1.3,-.4],'#aa4b15')],blossoms:[],branches:[...copy(roots),...crown.map(path=>({path,r:.042,taper:.85})),
 {path:[[-.21,.60,0],[-.35,.66,.06],[-.58,.65,.07]],r:.023,taper:.9},{path:[[-.13,.76,-.015],[-.20,.95,.06],[-.19,1.15,.07]],r:.025,taper:.9},
 {path:[[.025,.78,-.025],[.17,.96,.05],[.23,1.12,.07]],r:.022,taper:.9},{path:[[.19,.71,0],[.40,.83,.06],[.57,.86,.08]],r:.023,taper:.9},
 {path:[[.27,.60,.015],[.45,.60,-.05],[.59,.54,-.06]],r:.022,taper:.9},{path:[[.02,.70,-.19],[-.07,.88,-.28],[-.12,1.02,-.40]],r:.024,taper:.9},
 {path:[[-.06,.70,.18],[-.18,.76,.34],[-.31,.86,.40]],r:.022,taper:.9}]};
 // Winter crown: blunt woody tips and small orange terminal buds from08.
 bare.colors={...bare.colors,tip:'#d28a37'};
 for(const b of bare.branches)if(b.path.at(-1)[1]>.4){b.taper=.50;b.bulb=2.15;}
 const winterTwigs=[
 [[-.21,.60,0],[-.37,.58,.02],[-.51,.54,.03]],
 [[-.35,.66,.06],[-.45,.74,.065],[-.51,.78,.07]],
 [[-.35,.66,.06],[-.45,.65,.08],[-.55,.69,.085]],
 [[-.13,.76,-.015],[-.34,.84,-.005],[-.42,.89,0]],
 [[-.20,.95,.06],[-.30,1.04,.07],[-.33,1.12,.075]],
 [[.025,.78,-.025],[.11,.88,-.015],[.18,.89,-.01]],
 [[.025,.78,-.025],[-.06,.98,-.04],[-.07,1.13,-.045]],
 [[.19,.71,0],[.34,.75,.02],[.43,.76,.025]],
 [[.40,.83,.06],[.44,.94,.065],[.52,1.01,.07]],
 [[.45,.60,-.05],[.52,.67,-.055],[.61,.69,-.06]],
 [[.27,.60,.015],[.35,.51,.02],[.49,.49,.025]],
 [[.02,.70,-.19],[.18,.78,-.25],[.29,.83,-.29]],
 [[-.07,.88,-.28],[-.21,.94,-.34],[-.29,1.00,-.37]],
 [[-.18,.76,.34],[-.27,.92,.35],[-.28,1.04,.36]]
 ];
 bare.branches.push(...winterTwigs.map(path=>({path,r:.025,taper:.45,bulb:2.2,sides:7,steps:7})));
 const venusRosette={archetype:'branch_organism',body:{width:.19,height:.16,depth:.14,y:.18},normalEye:'round',stones:[],branches:[],colors:{body:'#f7dfac',light:'#fff7d4',branch:'#469719',tip:'#bbd745',stones:[],blush:'#f39264'},foliage:[
 leaf([0,.12,-.10],.11,.62,[.06,0,.02]),leaf([-.04,.11,-.09],.13,.57,[.1,-.2,.91]),leaf([.03,.12,-.08],.14,.65,[.08,.2,-.82]),
 leaf([-.08,.09,-.05],.115,.50,[.18,-.35,1.26]),leaf([.08,.09,-.04],.12,.55,[.16,.4,-1.23]),
 leaf([-.10,.075,.015],.105,.44,[.18,-.25,1.58]),leaf([.10,.075,.015],.11,.47,[.20,.35,-1.56]),
 leaf([-.08,.06,.06],.095,.34,[.8,-.5,1.76]),leaf([.08,.06,.06],.10,.36,[.8,.5,-1.76]),
 leaf([0,.09,-.11],.11,.48,[-.65,.8,.5]),leaf([.015,.09,-.10],.10,.47,[-.65,-.8,-.5])
 ]};
 venusRosette.foliage.push(
 leaf([-.25,.10,-.06],.11,.42,[.12,1.25,1.20]),leaf([.25,.10,-.06],.11,.44,[.12,-1.25,-1.20]),
 leaf([-.10,.10,-.08],.105,.39,[-.10,-1.30,1.15]),leaf([.10,.10,-.08],.11,.40,[-.10,1.30,-1.15])
 );
 venusRosette.branches.push({path:[[-.10,.10,-.04],[-.18,.10,-.05],[-.25,.10,-.06]],r:.025,taper:.20},{path:[[.10,.10,-.04],[.18,.10,-.05],[.25,.10,-.06]],r:.025,taper:.20});
 const trapUnit=(at,w,h,eye)=>({at,scale:1,spec:{archetype:'branch_organism',body:{width:w,height:h,depth:.075,y:0},normalEye:eye,trap:{teeth:22,rim:.019,length:.050},stones:[],colors:{body:'#ed352b',light:'#ff9470',branch:'#62ad16',tip:'#dce54c',stones:[],blush:'#ffb568'},branches:[{path:[[-at[0],.035-at[1],-at[2]],[-at[0]*.6,-at[1]*.48,-at[2]*.7],[0,-h*.75,-.025]],r:.025,taper:.15}],foliage:[]}});
 const venusTraps={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:[
 trapUnit([0,1.04,-.04],.24,.20,'happy'),trapUnit([-.41,.76,.015],.185,.17,'round'),trapUnit([.42,.73,-.015],.19,.175,'round'),trapUnit([-.26,.38,.12],.15,.13,'happy'),trapUnit([.32,.37,.13],.155,.135,'round')
 ]};
 for(const [i,tilt]of [[0,[0,0,0]],[1,[0,-.60,.25]],[2,[0,.65,-.25]],[3,[0,-.45,.45]],[4,[0,.50,-.40]]]){
  const sp=venusTraps.colony[i].spec;sp.trap.tilt=tilt;
  sp.branches[0].path[2]=[-.055*Math.sin(tilt[1]),-sp.body.height*.45,-.055*Math.cos(tilt[1])];
 }
 venusTraps.colony[0].spec.branches.push(...roots.map(r=>({...r,color:'#a77320',tip:'#d3a554',path:r.path.map(([x,y,z])=>[x,y-1.04,z+.04])})));
 venusTraps.colony[0].spec.foliage=[leaf([0,-.96,.08],.09,.32,[.40,.3,1.05]),leaf([0,-.96,.08],.09,.34,[.4,-.3,-1.05])];
 // Remaining Venus stages use the accepted rooted plant, cup and flower builders.
 // Source faces remain on their own units; all units share one actor clock.
 const venusSeed={...copy(seed),body:{width:.27,height:.38,depth:.19,y:.40,taper:.45,lean:.13},normalEye:'round',branches:[],foliage:[],colors:{...copy(seed.colors),body:'#63352d',light:'#b87e56',blush:'#e76c79'}};
 const venusBase=()=>({...copy(venusRosette),foliage:copy(venusRosette.foliage).map(q=>({...q,at:[q.at[0],q.at[1]+.02,q.at[2]],length:q.length*.65,width:q.width*.82})),branches:[]});
 const venusHead=(at,w,h,eye,tilt=[0,0,0],face=true)=>{const u=trapUnit(at,w,h,eye);u.face=face;u.spec.trap.tilt=tilt;u.spec.branches[0].path[2]=[-.04*Math.sin(tilt[1]),-h*.45,-.04*Math.cos(tilt[1])];return u;};
 const rootedVenus=(base,heads,stones=[])=>({archetype:'branch_organism',suspended:true,stones,stoneColors:['#a56b26','#d89a40'],colony:[{at:[0,0,0],scale:1,spec:base},...heads]});
 const venusYoungBase=venusBase();venusYoungBase.foliage=[leaf([0,.29,-.04],.06,.26,[0,0,.06])];
 const venusYoungHeads=[venusHead([-.28,.51,-.01],.16,.085,'round',[0,-.3,.30],false),venusHead([.29,.53,-.01],.16,.085,'round',[0,.3,-.30],false)];
 for(const u of venusYoungHeads){u.spec.trap.teeth=0;u.spec.trap.rim=.014;u.spec.colors.body='#93ba25';u.spec.colors.light='#ecc74b';}
 const venusYoung=rootedVenus(venusYoungBase,venusYoungHeads,[[-.28,.04,.10,.11,.04],[.27,.045,.10,.10,.045],[-.14,.04,.19,.10,.04],[.12,.04,.20,.10,.04],[-.35,.035,-.03,.08,.035],[.35,.035,-.03,.08,.035]]);
 const venusTwo=rootedVenus(venusBase(),[venusHead([-.27,.77,-.03],.235,.17,'round',[0,-.3,.23]),venusHead([.29,.60,.01],.145,.145,'content',[0,.55,-.3])]);
 venusTwo.colony[2].spec.colors.body='#a2c42c';venusTwo.colony[2].spec.colors.light='#e2e95c';
 const venusThree=rootedVenus(venusBase(),[venusHead([0,1.02,-.04],.245,.195,'happy'),venusHead([-.37,.62,.015],.18,.15,'round',[0,-.5,.23]),venusHead([.37,.60,.015],.18,.15,'happy',[0,.5,-.23])]);
 const giantCup=venusHead([0,.36,0],.47,.28,'round',[-.18,0,0],false);giantCup.spec.body.depth=.20;giantCup.spec.trap.teeth=24;giantCup.spec.trap.length=.09;giantCup.spec.trap.rim=.027;giantCup.spec.branches=[];
 const insect={archetype:'branch_organism',body:{width:.135,height:.12,depth:.08,y:0},normalEye:'round',branches:[{path:[[-.06,.07,0],[-.09,.15,.005],[-.11,.19,0]],r:.009,taper:.3},{path:[[.06,.07,0],[.09,.15,.005],[.11,.19,0]],r:.009,taper:.3}],foliage:[],stones:[],colors:{body:'#7560d1',light:'#bbaaed',branch:'#584486',tip:'#a287e5',stones:[],blush:'#e5809e'}};
 const venusCup={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:[giantCup,{at:[0,.35,.065],scale:1,spec:insect}]};
 const flowerPositions=[[-.36,.86,.025,.22,true,'round'],[0,1.24,-.02,.28,true,'happy'],[.39,.74,.05,.21,true,{left:'happy',right:'round'}],[.35,1.17,-.09,.13,false,'round'],[-.47,.43,.08,.13,false,'round'],[.47,.36,.09,.12,false,'round']];
 const venusFlowers=flowerPositions.map(([x,y,z,r,face,eye])=>({at:[x,y,z],scale:1,face,spec:{archetype:'branch_organism',body:{width:r*.34,height:r*.34,depth:r*.24,y:0},normalEye:eye,stones:[],colors:{body:'#ffe044',light:'#fff6a0',branch:'#469b1b',tip:'#a1cf38',stones:[],blush:'#f39c6c'},branches:[{path:[[-x,.05-y,-z],[-x*.4,-y*.45,-z*.4],[0,-r*.25,0]],r:.023,taper:.2}],foliage:[],blossoms:[{at:[0,0,-r*.25],r,rotation:.1,tilt:[0,0,0],petal:'#fff7e6',center:'#ffd83b'}]}}));
 const flowerBase=venusBase();flowerBase.body={...flowerBase.body,width:.07,height:.06,depth:.06,y:.10};flowerBase.foliage=copy(venusRosette.foliage).map(q=>({...q,at:[q.at[0],q.at[1]+.045,q.at[2]]}));
 const venusBloom={archetype:'branch_organism',suspended:true,stones:[],stoneColors:[],colony:[{at:[0,0,0],scale:1,face:false,spec:flowerBase},...venusFlowers,venusHead([-.30,.27,.08],.15,.09,'round',[0,-.35,.5],false),venusHead([.31,.27,.08],.15,.09,'round',[0,.35,-.5],false)]};
 const treeRoot=(path,r)=>({path,r,taper:.91,steps:14,sides:9});
 const treeBranch=(path,r)=>({path,r,taper:.67,steps:14,sides:9});
 const crownMass=(at,size,color='#379519',light='#b4dd28')=>({at,size,color,light});
 const world3={archetype:'branch_organism',normalEye:'round',body:{width:.22,height:.40,depth:.19,y:.43,taper:.20},stones:[],colors:{body:'#bb732b',light:'#efb84d',branch:'#a65c23',tip:'#e7a240',stones:[],blush:'#ed8e64'},branches:[
 treeRoot([[0,.23,0],[-.22,.12,.04],[-.49,.065,.10],[-.77,.025,.17]],.14),treeRoot([[0,.22,.04],[-.11,.11,.25],[-.24,.06,.43],[-.37,.028,.59]],.14),treeRoot([[0,.22,.04],[.10,.11,.25],[.24,.06,.43],[.38,.028,.58]],.14),treeRoot([[0,.24,0],[.23,.12,.025],[.51,.055,.10],[.77,.025,.14]],.135),treeRoot([[0,.22,-.05],[-.23,.11,-.27],[-.44,.035,-.48]],.125),treeRoot([[0,.22,-.05],[.19,.11,-.28],[.43,.035,-.45]],.12),
 treeBranch([[0,.56,0],[-.18,.82,-.02],[-.37,1.06,-.02],[-.57,1.17,-.055]],.105),treeBranch([[0,.68,-.035],[-.04,1.04,-.06],[.03,1.39,-.09],[.04,1.59,-.11]],.10),treeBranch([[0,.57,-.03],[.22,.83,-.04],[.40,1.00,-.09],[.62,1.06,-.10]],.10),treeBranch([[-.10,.60,.015],[-.35,.72,.12],[-.64,.78,.14]],.078),treeBranch([[.09,.62,.01],[.38,.75,.14],[.66,.84,.15]],.082),treeBranch([[0,.72,-.06],[-.14,1.02,-.29],[-.31,1.22,-.43]],.075),treeBranch([[.04,.71,-.075],[.24,.95,-.34],[.44,1.18,-.45]],.075)
 ],canopy:[
 crownMass([0,1.57,-.05],[.24,.22,.25]),crownMass([-.24,1.45,-.015],[.25,.20,.27]),crownMass([.25,1.42,-.045],[.26,.21,.26]),crownMass([-.44,1.23,.025],[.27,.21,.25]),crownMass([.47,1.20,-.015],[.27,.22,.27]),crownMass([-.65,.98,.11],[.26,.22,.25]),crownMass([.66,1.00,.11],[.27,.23,.25]),crownMass([-.34,.94,.19],[.22,.19,.25]),crownMass([.33,.95,.21],[.23,.18,.24]),crownMass([-.04,1.20,.13],[.23,.20,.25]),crownMass([-.32,1.30,-.38],[.29,.22,.25],'#257e20','#79b936'),crownMass([.31,1.29,-.39],[.30,.23,.25],'#2c8520','#85bd32'),crownMass([0,1.50,-.36],[.26,.22,.26],'#2c8922','#8ec83b'),crownMass([-.58,1.07,-.27],[.26,.21,.27],'#277c26','#80b737'),crownMass([.57,1.06,-.28],[.28,.21,.25],'#287c22','#91be37')
 ],fruit:[]};
 const golden=(at,stem)=>({at,r:.082,stem,color:'#ffc123',light:'#fff588',stemColor:'#796524'});
 const world7={...copy(world3),normalEye:'content',body:{width:.245,height:.42,depth:.205,y:.45,taper:.17},canopy:[
 crownMass([0,1.64,-.055],[.25,.23,.26]),crownMass([-.26,1.49,-.015],[.24,.20,.25]),crownMass([.27,1.48,-.025],[.26,.20,.24]),crownMass([-.50,1.30,.015],[.25,.18,.24]),crownMass([.50,1.29,-.005],[.25,.18,.25]),crownMass([-.73,1.11,.015],[.22,.18,.22]),crownMass([.73,1.10,.035],[.22,.19,.24]),crownMass([-.22,1.20,.15],[.19,.17,.19]),crownMass([.21,1.20,.155],[.20,.16,.21]),crownMass([0,1.41,.14],[.22,.19,.22]),crownMass([-.32,1.38,-.38],[.27,.21,.25],'#317d22','#8bbd33'),crownMass([.32,1.38,-.38],[.28,.22,.25],'#2a8222','#93c43c'),crownMass([0,1.56,-.35],[.27,.22,.25],'#2d8523','#93c839'),crownMass([-.59,1.18,-.30],[.24,.19,.25],'#2b7a24','#8fc53a'),crownMass([.60,1.17,-.30],[.25,.19,.24],'#2d7e23','#90bf34')
 ],branches:[...copy(world3.branches),treeBranch([[-.24,.94,-.02],[-.51,1.08,.02],[-.74,1.12,.015]],.061),treeBranch([[.24,.95,-.02],[.51,1.07,.035],[.74,1.13,.01]],.061)],fruit:[
 golden([-.79,.79,.16],[[-.72,1.10,.02],[-.80,1.00,.11],[-.79,.865,.16]]),golden([-.57,.64,.26],[[-.52,1.02,.035],[-.56,.88,.17],[-.57,.715,.26]]),golden([-.39,1.04,.21],[[-.37,1.26,.01],[-.40,1.18,.12],[-.39,1.115,.21]]),golden([.56,.86,.25],[[.52,1.18,.055],[.57,1.06,.16],[.56,.935,.25]]),golden([.81,.66,.15],[[.72,1.08,.03],[.83,.92,.10],[.81,.735,.15]])
 ]};
 const world1={archetype:'branch_organism',normalEye:'round',body:{width:.25,height:.40,depth:.17,y:.43,taper:.45,lean:.20},branches:[],stones:[],colors:{body:'#eaa008',light:'#fff389',branch:'#dc8b04',tip:'#fff0a0',stones:[],blush:'#ff9292'}};
 const world2={archetype:'branch_organism',normalEye:'round',body:{width:.18,height:.14,depth:.14,y:.215},stones:[[-.25,.08,.01,.11,.07],[.22,.075,.02,.12,.06],[-.12,.065,.15,.10,.05],[.11,.06,.17,.09,.045]],colors:{body:'#f9d65e',light:'#fff5bd',branch:'#3a9b3b',tip:'#71c266',stones:['#926427','#b58939'],blush:'#f69a87'},branches:[{path:[[0,.32,0],[.02,.51,0],[.04,.73,-.01]],r:.025,taper:.4},{path:[[0,.45,0],[-.14,.57,0],[-.23,.59,.015]],r:.018,taper:.5},{path:[[-.13,.16,0],[-.28,.20,.02],[-.35,.12,.07],[-.40,.16,.10]],r:.025,taper:.65,color:'#9b6d2c'},{path:[[.13,.16,0],[.28,.20,0],[.32,.11,.06],[.39,.16,.09]],r:.026,taper:.65,color:'#9b6d2c'}],foliage:[leaf([-.23,.59,.015],.135,.37,[.16,-.25,1.0],'#16894e'),leaf([.03,.66,-.01],.16,.58,[-.1,.28,-.48],'#159766')]};
 const world4={...copy(world3),faceHalf:.16,body:{width:.135,height:.42,depth:.12,y:.45,taper:.12},branches:[...world3.branches.slice(0,6).map(q=>({...copy(q),r:q.r*.70,path:q.path.map(([x,y,z])=>[x*.63,y,z*.68])})),treeBranch([[0,.56,0],[.015,.98,-.025],[.09,1.40,-.04],[.09,1.67,-.04]],.08),treeBranch([[0,.70,0],[-.22,1.00,.02],[-.43,1.14,.04]],.065),treeBranch([[.02,.82,-.01],[.25,1.04,.05],[.48,1.24,.04]],.063)],canopy:[crownMass([.08,1.69,-.025],[.25,.20,.24]),crownMass([.10,1.62,-.19],[.22,.16,.23]),crownMass([-.43,1.18,.02],[.27,.18,.25]),crownMass([-.40,1.14,-.17],[.22,.17,.22]),crownMass([.49,1.28,.03],[.25,.19,.24]),crownMass([.43,1.25,-.16],[.23,.17,.22])],fruit:[]};
 const blueFruit=(at,stem,r=.075)=>({at,r,stem,color:'#20c7f0',light:'#ccffff',stemColor:'#69943c'});
 const world5={...copy(world3),body:{width:.245,height:.40,depth:.215,y:.43,taper:.15},fruit:[blueFruit([-.73,.68,.18],[[-.64,1.0,.11],[-.73,.85,.15],[-.73,.75,.18]]),blueFruit([-.48,.51,.24],[[-.40,.96,.15],[-.49,.75,.22],[-.48,.58,.24]],.085),blueFruit([.46,.53,.25],[[.34,.95,.20],[.46,.74,.24],[.46,.60,.25]],.085),blueFruit([.72,.72,.14],[[.64,1.01,.11],[.72,.91,.12],[.72,.79,.14]])]};
 const world6={...copy(world3),normalEye:'happy',body:{width:.30,height:.35,depth:.25,y:.38,taper:.13},branches:[...world3.branches.slice(0,6).map(q=>({...copy(q),r:q.r*1.12,path:q.path.map(([x,y,z])=>[x*1.15,y,z*1.08])})),...world3.branches.slice(6).map(q=>({...copy(q),r:q.r*1.15,path:q.path.map(([x,y,z])=>[x*1.27,.36+(y-.36)*.68,z*1.06])}))],canopy:world3.canopy.map(q=>({...copy(q),at:[q.at[0]*1.30,.38+(q.at[1]-.38)*.68,q.at[2]*1.08],size:[q.size[0]*1.15,q.size[1]*.75,q.size[2]*1.1]})),fruit:[blueFruit([-.80,.56,.16],[[-.78,.87,.12],[-.80,.76,.15],[-.80,.63,.16]]),blueFruit([-.57,.44,.24],[[-.49,.88,.18],[-.55,.68,.22],[-.57,.51,.24]]),blueFruit([0,.77,.30],[[0,1.0,.14],[.01,.90,.25],[0,.84,.30]],.072),blueFruit([.56,.45,.24],[[.48,.89,.18],[.56,.68,.22],[.56,.52,.24]]),blueFruit([.81,.60,.15],[[.79,.88,.10],[.81,.76,.13],[.81,.67,.15]])]};
 const world8={...copy(world6),normalEye:'content',body:{width:.245,height:.38,depth:.21,y:.41,taper:.18},colors:{...copy(world3.colors),body:'#e6ae43',light:'#fff4a9',branch:'#c69031',tip:'#ffe190'},fruit:[],orbits:[{rx:1.08,rz:.64,y:.27,tilt:.035,r:.009,color:'#66e8ff'},{rx:1.14,rz:.61,y:1.04,tilt:.025,r:.009,color:'#79efff'}]};
 return {world_tree:{why:'Accepted03/07representatives. Explicit golden seed01,two-leaf02,sparse crown04,cyanfruit05,broad tiered06,goldenfruit07,two cyanorbits08; full candidate gate pending.',stages:{1:world1,2:world2,3:world3,4:world4,5:world5,6:world6,7:world7,8:world8}},venus_flytrap:{why:'Accepted03/07 unchanged. Explicit seed01,two young cups02,two heads04,three heads05,insect in giant cup06,six white flowers and two lower traps08. All8 image gate pending.',stages:{1:venusSeed,2:venusYoung,3:venusRosette,4:venusTwo,5:venusThree,6:venusCup,7:venusTraps,8:venusBloom}},sakura:{why:'Explicit seed01,sprout02,leafy03,flowering-tree04,five buds05,two flowers06,three cherries07,bare tree08; candidate gates required before runtime promotion.',stages:{1:seed,2:sprout,3:leafy,4:bloom,5:buds,6:flowers,7:cherries,8:bare}}};
});
