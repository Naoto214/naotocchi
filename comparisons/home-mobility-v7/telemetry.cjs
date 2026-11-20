'use strict';

// Add observation points only to the three owner-comparison aliases.
function once(source, before, after) {
  if(source.split(before).length!==2)throw Error('Unexpected native observation anchor: '+before.slice(0,80));
  return source.replace(before,()=>after);
}
function patchTelemetry(name,source,arm){
  if(!['v5','v6','v7'].includes(arm))throw Error('Unknown mobility trial arm: '+arm);
  if(name.includes('production-model')){
    const edit=(a,b)=>{source=once(source,a,b);};
    const marker='const manualGoals=new Map();';
    edit(marker,`let mobility=null;function bindMobility(){mobility=globalThis.HomeMobilityDiagnostics;
      mobility?.bindModel('${arm}',()=>({actors,clock,manualGoals,scene,selected,paused}));}
    `+marker);
    edit(',sync,select,selected:()=>selected,move,step,cancel,',',bindMobility,sync,select,selected:()=>selected,move,step,cancel,');
    const signature="function move(key,p,source='tap',{pointerDrop=false}={}){";
    edit(signature,signature+`
      if(!mobility?.enabled)return executeMove(key,p,source,{pointerDrop});
      const report=mobility.request(key,source,p,retryingKey===key,clock);
      const result=executeMove(key,p,source,{pointerDrop},report);
      mobility.result(report,result,actor(key),actors,clock,()=>({box:bounds(actor(key),scene),terrain:!scene.navigation||scene.navigation.valid(p),visible:visible(actor(key),p)}));
      return result;
    }
    function executeMove(key,p,source,{pointerDrop},mobilityRequest){`);
    const planning='const canSee=scene.planVisibility?.(a)';
    edit(planning,'if(mobilityRequest)mobilityRequest.planned=true;'+planning);
    const atStep='stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);';
    edit(atStep,"if(mobility?.enabled)mobility.hop(a,p,clock);"+atStep);
    const reach="emit('arrive',a,a.source);";
    edit(reach,"if(mobility?.enabled)mobility.arrival(a,clock);"+reach);
    const veto='if(!safe){a.target=null;a.route=[];';
    edit(veto,"if(!safe){if(mobility?.enabled)mobility.veto(a,p,actors,clock,visible(a,p),!scene.navigation||scene.navigation.segmentSafe(a,p),liveDrop);a.target=null;a.route=[];");
    const tick='clock+=dt;';
    edit(tick,tick+'if(mobility?.enabled)mobility.tick(dt,clock,actors,manualGoals,flags);');
    const paused='if(paused){cancel();return;}';
    edit(paused,'if(paused){if(mobility?.enabled)mobility.blockedTick(dt);cancel();return;}');
    const idle="const duration=(dense?9:medium?5:night?6:3)";
    edit(idle,"if(mobility?.enabled)mobility.choice(a,name);"+idle);
    const budget="if(actors.filter(b=>b.target&&b.source==='ambient').length>=budget)name=['rest','look','sit','turn'][Math.floor(random()*4)];";
    if(source.includes(budget))edit(budget,budget.replace(')name=',"){if(mobility?.enabled)mobility.wait(a,'ambient-budget');name=")+'}');
    const missing="if(!p||!move(a.key,p,'ambient'))";
    if(source.includes(missing))edit(missing,"if(!p&&mobility?.enabled)mobility.wait(a,'no-candidate');"+missing);
    const retry='request.nextAt=clock+1;continue;';
    if(source.split(retry).length===2)edit(retry,"if(mobility?.enabled)mobility.wait(a,'unchanged-peers');"+retry);
    const single='request.yieldPeer=b.key;request.handoff=best.q;';
    if(source.includes(single))edit(single,"if(mobility?.enabled)mobility.yielded(a,b,clock,'single',1);"+single);
    const pair='request.yieldPeer=b.key;request.nextAt=clock+.15;request.handoff=pair.q;';
    if(source.includes(pair))edit(pair,"if(mobility?.enabled)mobility.yielded(a,b,clock,'sequential',stage+1);"+pair);
    const arrived="if(a.source==='yield'){a.yieldFor=null;defer(a,3);continue;}";
    if(source.includes(arrived))edit(arrived,arrived.replace("{","{if(mobility?.enabled)mobility.arrival(a,clock);"));
    return source;
  }
  if(name.includes('production-diorama')){
    const model='const model=modelAPI.createModel({random:env.HomeBeauty.actorRandom,onEvent:emit});';
    source=once(source,model,model+'model.bindMobility?.();');
    const anchor='const busy=blocked();stage.dataset.dioramaPaused=String(busy);';
    return once(source,anchor,anchor+"if(env.HomeMobilityDiagnostics?.enabled)env.HomeMobilityDiagnostics.frame(busy,env.HomeCastTrial.settings.paused,pendingResidentPresentation,!!media?.matches);");
  }
  if(name.startsWith('script-')){
    const start='  function homeDioramaBlocked(';
    const observes=`  globalThis.HomeMobilityDiagnostics?.bindGates(()=>{
    const list=[],passive=document.body.dataset.homeProduction==='true'&&document.body.dataset.homeViewportVersion==='12';
    if(birthCelebration)list.push('hatch');if(gameActive||meguruActive)list.push('other-game');
    if(document.visibilityState==='hidden')list.push('hidden');if(isAnyMenuOverlayOpen())list.push('menu');
    if(state.isSleeping)list.push('sleep');if(state.isSick)list.push('illness');if(state.dying)list.push('dying');if(state.transformOptions)list.push('growth-choice');
    if(individualityDialogOpen)list.push('dialog');
    if(passive&&conv2Unit&&conv2Unit.kind!=='banter'||!passive&&(speechActive||conversationIsBusy()))list.push('conversation');
    if(passive&&homeV11Presentation().lowerUntil>Date.now())list.push('lower-notice');
    if(!el.lifeCardOverlay.classList.contains('hidden')||!passive&&!el.storyFlash.classList.contains('hidden')||el.screenNormal.classList.contains('hidden'))list.push('other-screen');
    if(document.body.classList.contains('movie-active'))list.push('movie');
    if(el.castResponse.dataset.reaction)list.push('group-'+el.castResponse.dataset.reaction);
    const idle=passive&&speechActive&&el.speechBubble.dataset.reactionEvent==='idle';
    for(const item of homeCastActors()){
      const r=item.node.dataset.reaction;
      if(r&&!['look','curious','nod','breathe','sway','posture'].includes(r)&&!(idle&&['bounce','settle','shy','wiggle'].includes(r)))list.push('resident-'+r);
    }
    return [...new Set(list)];});
`;
    return once(source,start,observes+start);
  }
  return source;
}
module.exports={patchTelemetry};
