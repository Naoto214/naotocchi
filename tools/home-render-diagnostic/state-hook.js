// Diagnostic page only. A separate save key is installed by build.cjs.
window.HomeRenderDiagnostic={
 seed(sleeping=false){
  const p=homeV11Presentation();clearTimeout(p.upperTimer);clearTimeout(p.lowerTimer);p.upper=null;p.upperQueue=[];p.lowerQueue=[];p.lowerUntil=0;homeV11ClearUpper();delete document.body.dataset.homeUpper;
  conv2Abort('diagnostic');clearConversationTimers();hideSpeechBubble();castMotion.clear();petBusyUntil=0;
  Object.assign(state,{stage:STAGE.GROWING,speciesLine:'woman',stageIndex:3,ageTicks:44*AGE_TICKS_PER_YEAR,regionId:'home',hunger:12,happiness:19,energy:74,health:54,isSleeping:sleeping,isSick:false,poopCount:0,partner:null,companions:[]});
  Object.assign(state.lifetime,{timeMode:'evening',weatherMode:'cloudy',seasonMode:'autumn'});
  homeCastLayoutKey='';render();homeDiorama.sync();
 },
 hold(){const m=homeDiorama.model;if(!m.diagnosticStep){m.diagnosticStep=m.step;m.step=(dt,flags)=>m.diagnosticStep(dt,{...flags,autonomy:false});}m.cancel();},
 snapshot(){return {version:document.body.dataset.homeDisplayVersion,actors:homeDiorama.model.snapshot().map(a=>({key:a.key,x:a.x,y:a.y,target:a.target,activity:a.activity})),stage:el.castStage.getBoundingClientRect().toJSON(),presentation:window.NaotocchiHomeViewport?.residentPresentation?.()};}
};
