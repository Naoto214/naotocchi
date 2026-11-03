  const qp=new URLSearchParams(location.search),originalLayout=window.NaotocchiHomeDiorama.layoutTerrainCast;
  window.NaotocchiHomeDiorama.layoutTerrainCast=(a,k)=>originalLayout({...a,...(qp.has('scale')?{mainScale:Number(qp.get('scale'))}:{}),formation:qp.get('formation')||'natural'},k);
  window.HomeV13QA={
    live(){window.HomeV13Autonomy=true;},
    freeze(){window.HomeV13Autonomy=false;homeDiorama.interrupt();},
    rerender(){render();},
    prepare(){clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;el.storyFlash.classList.add('hidden');el.lifeCardOverlay.classList.add('hidden');castMotion.clear();state.isSick=false;state.energy=95;state.health=state.hunger=state.happiness=95;render();},
    poop(){this.prepare();state.poopCount=4;render();},
    sleepLeft(){this.prepare();state.energy=40;state.isSleeping=true;render();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
    sleepRight(){this.prepare();state.energy=40;state.isSleeping=true;render();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
    wake(){state.isSleeping=false;render();},
    lower(){const a=homeDiorama.model.snapshot().find(a=>a.kind==='pet'),b=homeDiorama.model.bounds(a);const goal={x:a.x,y:b.bottom-2},sc=homeDiorama.inspectScene();this.lastLower={from:a,b,goal,nearest:sc.navigation?.nearest(goal,b),visible:sc.visible?.(goal,a),selected:homeDiorama.model.select(a.key),moved:homeDiorama.model.move(a.key,goal,'ground')};},
    longNotice(){showStoryEvent({emoji:'⭐',message:'先頭：長文通知の読みやすさ。'.repeat(9)+'末尾：そだち＋41％ ／ げんき＋2'});},
    notice(){showStoryEvent({emoji:'⭐',message:'そだちの変化を確認する長い通知。既存の内容と数値を失わずに表示します。\nそだち＋41％ ／ げんき＋2'});},
    notices(){this.notice();showStoryEvent({emoji:'🌱',message:'次のお知らせ。げんき＋2'});},
    question(){clearConversationTimers();message='';speechActive=false;conversationBusyUntil=0;petBusyUntil=0;if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;castMotion.clear();state.poopCount=0;state.isSleeping=false;state.isSick=false;state.hunger=state.happiness=state.energy=state.health=95;render();return conv2Ask(CONVERSATION_BANTER.QUESTIONS[0]);},
    exchange(){if(individualityDialogOpen)closeIndividualityDialog();individualityDeferred=false;state.isSleeping=false;state.isSick=false;state.individuality.lastExchangeAge=-1;state.individuality.lastCompanion=null;for(const e of INDIVIDUALITY.pending(state.individuality))state.individuality.events[e.age].status='chosen';for(const e of INDIVIDUALITY.data.exchanges)if(e.id!=='shiba-breeze'&&!state.individuality.natural.kindness[e.category].includes(e.id))state.individuality.natural.kindness[e.category].push(e.id);state.individuality.natural.kindness[1]=state.individuality.natural.kindness[1].filter(id=>id!=='shiba-breeze').slice(0,5);if(!state.companions.some(c=>c.id==='shiba'))state.companions.push({id:'shiba',bond:80});render();return maybeIndividualExchange();},
    group(){castMotion.speak({speaker:{kind:'pet'},text:'',event:'clean',primaryBeat:true});},
    map(){const stage=el.castStage,scene=homeDiorama.inspectScene(),old=stage.querySelector('.qa-nav-map');if(old){old.remove();return;}const c=document.createElement('canvas');c.className='qa-nav-map';c.width=scene.width;c.height=scene.height;c.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:1000;opacity:.65';const ctx=c.getContext('2d'),actors=homeDiorama.model.snapshot();for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8){const roles=['pet','companion','partner'].map(kind=>actors.find(a=>a.kind===kind)).filter(Boolean);let valid=0;for(const a of roles){const b=homeDiorama.model.bounds(a);if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom&&(!scene.navigation||scene.navigation.valid({x,y})))valid++;}ctx.fillStyle=valid===roles.length?'#17bb66':valid?'#e9ab24':'#bd354755';ctx.fillRect(x,y,5,5);}stage.appendChild(c);},
    metrics(){return {lastLower:this.lastLower,blocked:{isBlocked:homeDioramaBlocked(),sleeping:state.isSleeping,sick:state.isSick,dying:state.dying,transform:!!state.transformOptions,speechActive,busy:conversationIsBusy(),castResponse:el.castResponse.dataset.reaction,gameActive,meguruActive,menu:isAnyMenuOverlayOpen(),life:!el.lifeCardOverlay.classList.contains('hidden'),story:!el.storyFlash.classList.contains('hidden'),normalHidden:el.screenNormal.classList.contains('hidden'),reactions:homeCastActors().map(a=>a.node.dataset.reaction)},cast:homeDiorama.model.snapshot().map(({key,x,y,w,h,activity,target})=>({key,x,y,w,h,activity,target})),metrics:JSON.parse(el.castStage.dataset.livingMetrics||'{}'),stage:el.castStage.getBoundingClientRect().toJSON(),buttons:[...el.careActions?.children||document.querySelector('#careActions').children].map(b=>({id:b.id,...b.getBoundingClientRect().toJSON()}))};}
  };homeCastLayoutKey='';render();


  const v14Texts={short:'Hey!',medium:'おやすみ。あしたからほんきだす',long:'ここからながめる景色が好き。風が通るたびに、葉っぱの色も少しずつ変わって見えるね。明日もいっしょに歩いてみよう。',english:'I like watching the leaves move in the wind. Shall we walk together tomorrow?'};
  let v14Role='pet';
  const prepareV14=HomeV13QA.prepare;HomeV13QA.prepare=function(){if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;hideHomeChoiceResult();state.poopCount=0;prepareV14.call(this);};
  function v14Say(key){HomeV13QA.prepare();state.isSleeping=false;render();const a=homeCastActors().find(a=>a.kind===v14Role)||homeCastActors()[0];setSpeechBubble(v14Texts[key],{kind:a.kind,id:a.id,label:a.kind==='pet'?currentVisualStage().label:a.kind==='partner'?state.partner.label:allCompanionsById(a.id)?.label||a.id,emoji:'🐶'},{holdMs:600000});pointHomeSpeech();}
  Object.assign(HomeV13QA,{
    short(){v14Say('short')},medium(){v14Say('medium')},long(){v14Say('long')},english(){v14Say('english')},
    pet(){v14Role='pet';v14Say('short')},companion(){v14Role='companion';v14Say('short')},partner(){v14Role='partner';v14Say('short')},
    growth(){this.prepare();showCareFeedback({icon:'growth',text:'せいちょう ↑ 49%'});renderCareNotice();},
    energy(){this.prepare();showCareFeedback({icon:'sleep',text:'げんき +2'});renderCareNotice();},
    reward(){this.prepare();showStoryEvent({emoji:'🏆',message:'実績10こ達成！ コイン +50'});},
    ambient(){this.prepare();showStoryEvent({emoji:'🌞',message:'ひなたぼっこでぽかぽか。げんき+5',environmentMoment:true});},
    both(){this.short();showStoryEvent({emoji:'🏆',message:'実績10こ達成！ コイン +50'});},
    font0(){el.speechBubble.style.fontSize='13px';pointHomeSpeech()},font5(){el.speechBubble.style.fontSize='13.65px';pointHomeSpeech()},font10(){el.speechBubble.style.fontSize='14.3px';pointHomeSpeech()},fontFinal(){el.speechBubble.style.fontSize='';pointHomeSpeech()},
    hidden(){hideSpeechBubble();pointHomeSpeech();},result(){hideSpeechBubble();pointHomeSpeech();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},resultShort(){this.short();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},resultBoth(){this.long();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},
    sleepBefore12(){this.sleepRight();document.getElementById('v14-sleep-compare')?.remove();const css=document.createElement('style');css.id='v14-sleep-compare';css.textContent='#castStage[data-diorama] [data-diorama-actor] .character-visual{scale:var(--diorama-facing,1) 1!important;transform-origin:50% 100%!important} #castStage[data-diorama] [data-diorama-actor] .character-visual>.character-asset{scale:1!important} #castStage[data-diorama] [data-diorama-actor] .pet-expression-accent--sleeping{translate:0 0}';document.head.appendChild(css);},
    sleepBefore13(){this.sleepRight();document.getElementById('v14-sleep-compare')?.remove();const css=document.createElement('style');css.id='v14-sleep-compare';css.textContent='#castStage[data-diorama] [data-diorama-actor] .pet-expression-accent--sleeping{translate:0 0}';document.head.appendChild(css);},
    sleepAfter(){document.getElementById('v14-sleep-compare')?.remove();this.sleepRight();},
    measure(){const rect=e=>e.getBoundingClientRect().toJSON(),css=getComputedStyle(el.speechBubble),a=el.petSprite.querySelector('.pet-expression-accent--sleeping');return {viewport:{width:innerWidth,height:innerHeight},cast:homeDiorama.model.snapshot().length,stage:rect(el.castStage),speech:rect(el.speechBubble),text:rect(el.speechText),actualText:el.speechText.textContent,result:rect(document.getElementById('homeChoiceResult')),resultText:document.getElementById('homeChoiceResult').textContent,textScroll:el.speechText.scrollHeight,font:css.fontSize,slot:rect(el.speechSlot),choices:rect(el.speechChoices),sleep:a?{rect:rect(a),translate:getComputedStyle(a).translate,anchor:a.style.getPropertyValue('--sleep-anchor-x'),facing:el.petSprite.style.getPropertyValue('--diorama-facing'),origin:el.petSprite.style.getPropertyValue('--diorama-origin'),shift:el.petSprite.style.getPropertyValue('--diorama-sleep-shift')}:null,message:el.message.textContent};}
  });
  window.HomeV14QA=HomeV13QA;


window.HomeV15QA=HomeV14QA;
const choiceResult15=showHomeChoiceResult;showHomeChoiceResult=function(text){choiceResult15(text);clearTimeout(homeChoiceResultTimer);homeChoiceResultTimer=null;};
const prepare15=HomeV15QA.prepare;HomeV15QA.prepare=function(){prepare15.call(this);closeCompanionInvite();pendingCompanionId=null;hideHomeChoiceResult();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;clearTimeout(messageTimer);message='';clearCareFeedback();state.deathMeter=0;state.isSleeping=false;render();};
Object.assign(HomeV15QA,{
 async observe(seconds=30){
  this.prepare();this.live();const scene=homeDiorama.inspectScene(),samples=[],frames=[];let previous=performance.now(),running=true;
  const frame=t=>{frames.push(t-previous);previous=t;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
  for(let n=0;n<seconds;n++){await new Promise(r=>setTimeout(r,1000));samples.push({second:n+1,...this.metrics(),sameScene:scene===homeDiorama.inspectScene(),heap:performance.memory?.usedJSHeapSize||null});if(n%6===0)this.both();if(n%6===3){hideSpeechBubble();message='';render();}}
  running=false;frames.sort((a,b)=>a-b);return{seconds,frames:frames.length,medianFrameMs:frames[Math.floor(frames.length*.5)],p95FrameMs:frames[Math.floor(frames.length*.95)],samples};
 },
 sick(){this.prepare();state.isSick=true;render();},
 multiple(){this.sick();state.deathMeter=90;render();},
 sickEvent(){this.sick();showStoryEvent({emoji:'🏆',message:'重要な実績を達成！コイン +50'});},
 cure(){state.isSick=false;state.deathMeter=0;message='';render();},
 deltas(){this.prepare();setMessage('そだち＋1 / おとろえ−2 / げんき＋2');},
 sadLeft(){this.prepare();state.happiness=5;render();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 sadRight(){this.sadLeft();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 sickLeft(){this.sick();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 sickRight(){this.sick();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 happyLeft(){this.prepare();startPetExpression('happy',600000);render();homeDiorama.model.setFacing('pet',-1);homeDiorama.sync();},
 happyRight(){this.happyLeft();homeDiorama.model.setFacing('pet',1);homeDiorama.sync();},
 married(){this.prepare();if(state.partner){state.partner.married=true;state.partner.label='とても長い名前のもりのクマさん';state.partner.affection=98;}state.lifetime.endingTiersReached=[0,1,2,3,4];state.lifetime.clears=1;render();},
 noPartner(){this.prepare();state.partner=null;render();},
 infinite(){this.prepare();state.infinite=true;render();},
 angry(){this.prepare();startPetExpression('strained',600000);render();},
 surprised(){this.prepare();castMotion?.speak({event:'surprise',speaker:petSpeaker()});},
 gauges(){this.prepare();state.hunger=1;state.happiness=100;state.energy=2;state.health=99;state.deathMeter=99;state.decline=100;render();},
});


window.HomeV16QA=HomeV15QA;
HomeV16QA.dispose=()=>homeDiorama.destroy();
const prep16=HomeV16QA.prepare;HomeV16QA.prepare=function(){if(individualityDialogOpen)closeIndividualityDialog();prep16.call(this);this.freeze();hideSpeechBubble();el.speechSlot.scrollTop=0;};
Object.assign(HomeV16QA,{
 sayText(text){this.prepare();setSpeechBubble(text,petSpeaker(),{holdMs:600000});},
 shortJP(){this.sayText('もうむり。ねる');},mediumJP(){this.sayText('あくびに返事とられた');},
 noticeShort(){this.prepare();setMessage('おやすみモード');},
 noticeMedium(){this.prepare();setMessage('びょうきではないのに、くすりを飲ませた');},
 noticeEnglish(){this.prepare();setMessage('A very long English notification, with enough words to wrap safely inside the fixed notice area.');},
 questionLong(){this.question();if(conv2Unit?.question){el.speechText.textContent='長い質問も全文を読むことができます。'.repeat(4);for(const b of el.speechChoices.children)b.textContent+='：この選択肢も省略せずに読むための長い文章です。';}},
 sampleFrame(ms){for(const a of el.petSprite.querySelector('.pet-expression-accent--sleeping')?.getAnimations({subtree:true})||[]){a.pause();a.currentTime=ms;}},
 stage(n){this.prepare();state.ageTicks=stageMinsForLine(state.speciesLine)[n]*AGE_TICKS_PER_YEAR;state.sodachi=10+n*10;state.isSleeping=true;render();homeDiorama.sync();},
 inspect(){const rect=n=>n?.getBoundingClientRect().toJSON();return{state:JSON.stringify(state),scene:homeDiorama.inspectScene(),actors:homeDiorama.model.snapshot().map(a=>({key:a.key,x:a.x,y:a.y})),bounds:homeDiorama.model.snapshot().map(a=>({key:a.key,...homeDiorama.model.bounds(a)})),slots:Object.fromEntries(['homeInformation','homeEventSlot','castStage','speechSlot','careMeters','lifeMeterRow','careActions'].map(id=>[id,rect(document.getElementById(id))]))};}
});

})();