// Localhost-only observer inserted inside createController, before its first update.
window.pairStages = [];
function observePair(label, input) {
  const actors = model.snapshot().filter(a => a.kind === 'pet' || a.kind === 'partner');
  const stageRect = displayRect(stage), p = env.NaotocchiHomeViewport?.residentPresentation?.();
  const host = worldHost?.getBoundingClientRect();
  const width = host && Math.max(host.width, host.height / 1.5);
  const height = width * 1.5;
  function position(a) {
    const x = (p?.x || 0) + (stageRect.left + a.x - (p?.x || 0)) * (p?.scaleX || 1);
    const y = (p?.y || 0) + (stageRect.top + a.y - (p?.y || 0)) * (p?.scaleY || 1);
    const image = rows.get(a.key)?.owner.querySelector('.character-asset');
    const box = image?.getBoundingClientRect();
    const compact = values => values.map(n => Math.round(n * 10000) / 10000);
    const canvas = window.pairCanvas;
    return {key:a.key, stage:compact([a.x,a.y]), screen:compact([x,y]),
      artwork:canvas?.region===scene?.region ? compact([(x-canvas.left)/canvas.width,(y-canvas.top)/canvas.height]):null,
      centeredCover:width ? compact([(x-host.left-(host.width-width)/2)/width,(y-host.top-(host.height-height)/2)/height]):null,
      image:box ? compact([box.x,box.y,box.width,box.height]):null,
      imageFile:image?.getAttribute('src'), destination:a.target&&compact([a.target.x,a.target.y]),source:a.source,
      navigation:scene?.navigation?.valid(a), visible:scene?.navigation ? visibleAt(a,a):null};
  }
  return {label,region:scene?.region,ms:Math.round(performance.now()),clock:model.metrics().clock,
    navigation:!!scene?.navigation,projection:world?.stats()?.projectionRevision,
    drawn:window.pairCanvas,viewport:[env.innerWidth,env.innerHeight],loaded:world?.stats()?.loaded,
    pending:pendingResidentPresentation,bodyScale:p?.bodyScale, camera:p&&[p.scaleX,p.scaleY],
    seating:stage.dataset.dioramaSeating||null,stageVisibility:env.getComputedStyle(stage).visibility,
    input:input?.filter(a=>a.kind==='pet'||a.kind==='partner').map(a=>[a.key,a.x,a.y,a.w,a.h]),
    actors:actors.map(position)};
}
window.pairSample=observePair;
window.pairReady=count=>!!world?.stats().loaded && !!scene.navigation && !pendingResidentPresentation && rows.size===count && stage.dataset.dioramaSeating!=='pending' && window.pairPaintedRegion===scene.region && env.NaotocchiHomeViewport?.residentPresentation?.()?.landscape===false;
const originalSync=model.sync;
model.sync=function(input,...rest){
  if(window.pairStages.length<90)window.pairStages.push(observePair('before-sync',input));
  const result=originalSync.call(this,input,...rest);
  if(window.pairStages.length<90)window.pairStages.push(observePair('after-sync',input));
  return result;
};
if (model.finishSeating) {
  const originalFinish=model.finishSeating;
  model.finishSeating=function(...args) {
    const pending=model.seatingPending();
    const result=originalFinish.apply(this,args);
    if(pending && !model.seatingPending())window.pairStages.push(observePair('completed-pair-seating'));
    return result;
  };
}
let firstTick=true,firstWalk=true,firstNavigatedWalk=true,firstAmbientWalk=true;
const originalStep=model.step;
model.step=function(dt,...rest) {
  // Optional still photograph. World loading, paint, sizing and seating remain native.
  if(window.pairHoldOpening && dt>0 && scene?.navigation) return;
  const result=originalStep.call(this,dt,...rest);
  if(dt>0 && firstTick){firstTick=false;window.pairStages.push(observePair('first-clock-tick'));}
  if(dt>0 && firstWalk && model.snapshot().some(a=>['pet','partner'].includes(a.kind)&&a.target)){
    firstWalk=false;window.pairStages.push(observePair('first-pair-target'));
  }
  if(dt>0 && firstAmbientWalk && scene?.navigation) {
    const walker=model.snapshot().find(a=>a.target&&a.source!=='drag');
    if(walker) {
      firstAmbientWalk=false;
      window.pairStages.push({...observePair('first-autonomous-resident'),walker:walker.key});
    }
  }
  if(dt>0 && firstNavigatedWalk && scene?.navigation && model.snapshot().some(a=>['pet','partner'].includes(a.kind)&&a.target)){
    firstNavigatedWalk=false;window.pairStages.push(observePair('first-navigated-pair-target'));
  }
  return result;
};
