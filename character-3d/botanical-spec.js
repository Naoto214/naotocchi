// Original-derived rooted botanical candidates; isolated from runtime rollout.
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
 return {sakura:{why:'Flowering rooted tree04 representative with physical five-petal canopy and one trunk face; other stages pending.',stages:{3:leafy,4:bloom,7:cherries}}};
});
