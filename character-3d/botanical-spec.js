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
 const bloom={archetype:'branch_organism',body:{width:.17,height:.29,depth:.14,y:.31},branches:[...roots,...crown.map(path=>({path,r:.06,taper:.72}))],stones:[],colors:{body:'#a66a2b',light:'#db9b4a',branch:'#995d27',tip:'#d69b51',stones:[],blush:'#ee946a'},normalEye:'round',blossoms:positions.map(([x,y,z,r],i)=>({at:[x,y,z],r,rotation:(i%5)*.36,petal:i%3===0?'#ffb4d5':i%3===1?'#f48ac0':'#ffd2e1',center:'#f7d56d'}))};
 return {sakura:{why:'Flowering rooted tree04 representative with physical five-petal canopy and one trunk face; other stages pending.',stages:{4:bloom}}};
});
