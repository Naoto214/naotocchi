// Original-only human representatives; not registered for gameplay yet.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiHumanoidWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(PILOT){
 const copy=o=>JSON.parse(JSON.stringify(o)),man={why:'Original age-specific clothes, proportions, pose and hand-held props.',stages:{}};
 man.stages[2]={archetype:'humanoid',idlePose:'stand',head:{r:.46},body:{h:.40,r:.24},legs:{len:.27,r:.10},arms:{len:.29,r:.082},hair:{style:'spiky'},clothing:'overalls',wardrobe:{sleeve:.38,shorts:.48,socks:.2},poseProfile:{armSpread:1.0},
  colors:{skin:'#f8d8b0',hair:'#865442',top:'#417cae',sleeve:'#f3eee4',bottom:'#376c9b',shoe:'#715045',accent:'#f3eee4',socks:'#f4ece2',badge:'#ca9857'},attachments:['chestBadge']};
 man.stages[6]={...copy(PILOT.man.stages[4]),head:{r:.405},body:{h:.57,r:.27},legs:{len:.44,r:.11},arms:{len:.44,r:.09},normalEye:'happy',attachments:['tie','briefcase'],
  colors:{skin:'#f8d8b4',hair:'#78503e',top:'#2e3e61',bottom:'#384253',shoe:'#3f3031',accent:'#f6eee7',tie:'#995048',bag:'#68473f'}};
 return {man};
});
