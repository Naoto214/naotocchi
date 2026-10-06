// Original-derived adult shell representatives; not runtime-promoted.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory;if(root)root.NaotocchiArmoredWave=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const legs=[
  {at:[.20,-.015,.28],path:[[0,0,0],[.20,-.10,.10],[.34,-.27,.26],[.42,-.28,.30]],r:.032},
  {at:[-.20,-.015,.28],path:[[0,0,0],[-.20,-.10,.10],[-.34,-.27,.26],[-.42,-.28,.30]],r:.032},
  {at:[.25,-.02,.00],path:[[0,0,0],[.23,-.08,-.05],[.37,-.27,-.01],[.43,-.28,.05]],r:.035},
  {at:[-.25,-.02,.00],path:[[0,0,0],[-.23,-.08,-.05],[-.37,-.27,-.01],[-.43,-.28,.05]],r:.035},
  {at:[.23,-.03,-.28],path:[[0,0,0],[.21,-.10,-.17],[.33,-.26,-.29],[.39,-.27,-.24]],r:.038},
  {at:[-.23,-.03,-.28],path:[[0,0,0],[-.21,-.10,-.17],[-.33,-.26,-.29],[-.39,-.27,-.24]],r:.038}
 ];
 const beetle={archetype:'armored_insect',body:{width:.30,height:.22,length:.46,y:.32},shell:{width:.17,height:.22,length:.40,y:.065,z:-.17},thorax:{width:.25,height:.20,length:.21,z:.22},head:{width:.22,height:.18,depth:.21,at:[0,.045,.43]},legs,
  colors:{body:'#673109',shell:'#9c4b0c',light:'#e09738',thorax:'#8d420d',head:'#a25317',limb:'#733610',tip:'#c58a3d'},
  horn:{r:.067,path:[[0,.13,.06],[0,.34,.13],[0,.47,.26],[0,.61,.28]],forks:[[[0,.45,.23],[-.12,.56,.28],[-.13,.65,.28]],[[0,.45,.23],[.12,.56,.28],[.13,.65,.28]]]},mandibles:[]};
 const stag={archetype:'armored_insect',body:{width:.30,height:.19,length:.45,y:.32},shell:{width:.17,height:.19,length:.39,y:.055,z:-.18},thorax:{width:.24,height:.17,length:.20,z:.20},head:{width:.24,height:.17,depth:.21,at:[0,.015,.42]},legs:legs.map(l=>({...l,r:l.r*.88})),
  colors:{body:'#182330',shell:'#283445',light:'#64778b',thorax:'#243243',head:'#263444',limb:'#25303c',tip:'#677784'},horn:null,
  mandibles:[{r:.048,path:[[-.13,-.11,.11],[-.27,-.13,.31],[-.23,-.12,.48],[-.12,-.115,.55]],teeth:[[-.23,-.12,.34],[-.13,-.12,.34]]},{r:.048,path:[[.13,-.11,.11],[.27,-.13,.31],[.23,-.12,.48],[.12,-.115,.55]],teeth:[[.23,-.12,.34],[.13,-.12,.34]]}]};
 return {beetle:{why:'07 domed brown split elytra, six angular legs and upright forked horn.',stages:{7:beetle}},stagbeetle:{why:'07 low blue-black paired elytra, six angular legs and two curved toothed forward mandibles; no rhinoceros horn.',stages:{7:stag}}};
});
