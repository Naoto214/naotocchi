// Original-only human representatives; not registered for gameplay yet.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiHumanoidWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const copy=o=>JSON.parse(JSON.stringify(o)),man={why:'Original age-specific clothes, proportions, pose and hand-held props.',stages:{}};
 man.stages[2]={archetype:'humanoid',idlePose:'stand',head:{r:.46},body:{h:.40,r:.24},legs:{len:.27,r:.10,spread:.58},arms:{len:.29,r:.082},hair:{style:'spiky'},clothing:'overalls',wardrobe:{sleeve:.38,shorts:.48,socks:.2},poseProfile:{armSpread:1.68},
  colors:{skin:'#f8d8b0',hair:'#865442',top:'#417cae',sleeve:'#f3eee4',bottom:'#376c9b',shoe:'#715045',accent:'#f3eee4',socks:'#f4ece2',badge:'#ca9857'},attachments:['chestBadge']};
 man.stages[6]={...copy(PILOT.man.stages[4]),head:{r:.405},body:{h:.57,r:.27},legs:{len:.44,r:.11,spread:.55},arms:{len:.44,r:.09},normalEye:'happy',attachments:['tie','briefcase'],
  colors:{skin:'#f8d8b4',hair:'#78503e',top:'#2e3e61',bottom:'#384253',shoe:'#3f3031',accent:'#f6eee7',tie:'#995048',bag:'#68473f'}};
 const woman={why:'Long hair, school blouse/bow and pleated skirt, held shoulder bag from the original.',stages:{}};
 woman.stages[4]={archetype:'humanoid',idlePose:'stand',head:{r:.425},body:{h:.46,r:.235},legs:{len:.33,r:.084,spread:.58},arms:{len:.36,r:.075},hair:{style:'soft',length:1.65},clothing:'shirt',wardrobe:{skirt:{length:.24,flare:1.55,pleats:12},sleeve:.92,socks:.3,shorts:.12},attachments:['bow','shoulderBag'],colors:{skin:'#f8d7b2',hair:'#704638',top:'#f4ece7',bottom:'#416080',shoe:'#48343a',accent:'#f5eee9',bow:'#b64c51',bag:'#294768',socks:'#eee9e0'}};
 const ren={why:'Asymmetric swept dark hair and age-specific sports/layered clothing; not a recoloured man.',stages:{}};
 ren.stages[3]={archetype:'humanoid',idlePose:'stand',head:{r:.43},body:{h:.39,r:.23},legs:{len:.31,r:.085,spread:.60},arms:{len:.29,r:.072},hair:{style:'swept'},clothing:'shirt',wardrobe:{sleeve:.35,shorts:.42,socks:.25},poseProfile:{armSpread:.42},attachments:['playBall'],colors:{skin:'#f3c7a0',hair:'#382e37',top:'#193650',bottom:'#193650',shoe:'#28394f',accent:'#eeeae5',socks:'#eeeae5'}};
 ren.stages[5]={...copy(man.stages[6]),normalEye:null,head:{r:.405},hair:{style:'swept'},attachments:['backpack','hood'],colors:{skin:'#f3c7a0',hair:'#382e37',top:'#29384c',bottom:'#282b35',shoe:'#303542',accent:'#e6e8e6'}};
 return {man,woman,ren};
});
