// Presentation only: no AI, relationship writes, save state or wall-clock timers.
(function(root,factory){
 const api=factory(name=>root['Naotocchi'+name]||(typeof require==='function'?require({'PetExpression':'./pet-expression.js','RelationshipExpression':'./relationship-expression.js','ResidentExpression':'./resident-expression.js'}[name]):null));
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.NaotocchiExpressionPresentation=api;
})(typeof window!=='undefined'?window:globalThis,function(get){
 'use strict';
 const canonical=e=>e==='happy'?'positive':e==='sulky'?'dislike':get('ResidentExpression').canonicalEmotion(e);
 function resolvePlayer(input={}) { return canonical(get('PetExpression').resolve(input.profile,input)); }
 function resolveActor(actor,relationship=null,reaction=null) {
   const X=get('ResidentExpression');
   const life=canonical(actor.emotion||'normal');
   const rel=relationship?get('RelationshipExpression').resolve({kind:actor.kind,id:actor.id,...relationship,normal:X.baseAssetOf(actor)}).expression:'normal';
   let emotion=life;
   if(life==='sleeping'||life==='critical'||life==='dislike') emotion=life;
   else if(reaction?.emotion==='positive'||rel==='positive'||life==='positive') emotion='positive';
   else if(['sick','weak','strained','tired','hungry'].includes(life)) emotion=life;
   else if(rel==='lonely') emotion='lonely';
   const out=X.resolve(actor,emotion);
   if(reaction&&(emotion===reaction.emotion||reaction.emotion===null)&&!['sleeping','critical','dislike'].includes(emotion))out.cue={token:reaction.token,motion:reaction.motion,kind:'greet',targetKey:reaction.targetKey,attention:reaction.attention};
   return out;
 }
 const EVENTS=Object.freeze(['reunion','greeting','visit','affection_interaction','accompany_start','accompany_end','return_to_free_life']);
 function createSession({context='meguru'}={}) {
   let region=null,actors=new Map(),entries=new WeakMap(),lastMotion=new WeakMap(),seen=new Map(),time=0,serial=0;
   function setScene(next,list) {
     if(next!==region){entries=new WeakMap();lastMotion=new WeakMap();region=next;}
     const nextActors=new Map((list||[]).filter(a=>a&&a.key).map(a=>[a.key,a]));
     for(const [key,a] of actors)if(nextActors.get(key)!==a){entries.delete(a);lastMotion.delete(a);}
     actors=nextActors;
   }
   function accept(e) {
     if(!e||e.version!==1||!EVENTS.includes(e.type)||e.context!==context||!Number.isFinite(e.at)||e.at<0||e.regionId!=null&&e.regionId!==region)return false;
     const a=actors.get(e.actorKey);if(!a)return false;
     const stamp=JSON.stringify([e.at,e.type,e.reason||'']);
     let history=seen.get(e.actorKey);
     if(history&&(e.at<history.at||history.stamps.includes(stamp)))return false;
     if(!history){history={at:e.at,stamps:[]};seen.set(e.actorKey,history);if(seen.size>512)seen.delete(seen.keys().next().value);}
     history.at=e.at;history.stamps.push(stamp);if(history.stamps.length>16)history.stamps.shift();
     if(['region_change','exit','relationship_changed'].includes(e.reason)){entries.delete(a);return true;}
     if(e.type==='return_to_free_life'){
       const prior=entries.get(a);
       if(!prior||prior.type!=='accompany_end'||prior.at!==e.at)entries.delete(a);
       return true;
     }
     const motion=time-(lastMotion.get(a)??-Infinity)>=4;
     if(motion)lastMotion.set(a,time);
     entries.set(a,{emotion:e.type==='accompany_start'&&e.reason!=='date'?null:'positive',targetKey:typeof e.targetKey==='string'?e.targetKey:null,token:++serial,motion,started:time,type:e.type,at:e.at,until:time+(context==='home'?2.5:10)});
     return true;
   }
   function read(a){const r=entries.get(a);if(r&&time<r.until)return {...r,motion:r.motion&&time-r.started<.9};entries.delete(a);return null;}
   function advance(dt){if(Number.isFinite(dt)&&dt>0)time+=dt;}
   function clear(a){if(a)entries.delete(a);else{entries=new WeakMap();lastMotion=new WeakMap();actors.clear();}}
   function subscribe(source){return source&&typeof source.subscribe==='function'?source.subscribe(accept):()=>{};}
   function reset(){clear();seen.clear();time=0;region=null;}
   return {setScene,accept,read,advance,clear,reset,subscribe};
 }
 function createViewController({playerInput=()=>null,relationshipInput=()=>null,loadAsset=()=>{}}={}) {
   const session=createSession();let lastWorld=null,lastNow=null,partyReactions=new WeakMap(),lifeCues=new WeakMap(),time=0,lastActors=[];
   function prepare(view,now) {
     if(!view||!view.world)return;
     const changed=lastWorld!==view.world;
     if(changed){suspend();lastWorld=view.world;}
     const dt=lastNow==null?0:Math.max(0,Math.min(.1,(now-lastNow)/1000));
     lastNow=now;time+=dt;session.advance(dt);
     const actors=[...(view.residents||[]),...(view.party||[])];
     session.setScene(view.world.regionId,actors);
     lastActors=actors;
     for(const a of actors){
       if(view.world.expr?.on===false){a.expr=null;session.clear(a);continue;}
       let source=a;
       // Party does not run resident AI. Only its existing presentation timers
       // are interpreted here; movement/energy/behavior are never advanced.
       if((view.party||[]).includes(a)){
         let r=partyReactions.get(a);
         if(!r||r.serial!==a.expressionEventSeq){r={serial:a.expressionEventSeq,joy:a.joy||0,sulk:a.sulk||0};partyReactions.set(a,r);}
         r.joy=Math.max(0,r.joy-dt);r.sulk=Math.max(0,r.sulk-dt);
         const persistent=a.emotionPersistent||'normal';
         source={...a,emotion:['sleeping','critical'].includes(persistent)?persistent:r.sulk>0?'dislike':r.joy>0?'positive':persistent};
       }
       let cue=lifeCues.get(a);
       if(a.expressionEventSeq!=null&&(!cue||cue.serial!==a.expressionEventSeq)){
         const motion=!cue||time-cue.lastMotion>=4;
         cue={serial:a.expressionEventSeq,started:time,until:time+.9,motion,lastMotion:motion?time:cue.lastMotion};lifeCues.set(a,cue);
       }
       const reaction=session.read(a);
       if(reaction?.targetKey){
         const target=reaction.targetKey==='player'?view.player:actors.find(other=>other.key===reaction.targetKey);
         const age=time-reaction.started,weight=Math.max(0,Math.min(1,age/.15,(2.5-age)/.5));
         if(target&&target!==a&&[target.x,target.z,a.x,a.z].every(Number.isFinite)&&Math.hypot(target.x-a.x,target.z-a.z)>.01&&weight>0)
           reaction.attention={heading:Math.atan2(target.x-a.x,target.z-a.z),weight};
       }
       const out=resolveActor(source,relationshipInput(a),reaction);
       if(!out.cue&&out.emotion==='positive'&&cue&&time<cue.until)out.cue={token:'life:'+cue.serial,motion:cue.motion,kind:'greet'};
       if(['sleeping','critical','dislike'].includes(out.emotion))session.clear(a);
       a.expr=out;
       if(out.asset&&out.asset!==out.base)loadAsset(out.asset);
     }
     const input=playerInput();
     if(view.player&&view.world.expr?.on===false)view.player.expr=null;
     else if(input&&view.player){
       const emotion=resolvePlayer(input),base=input.base;
       view.player.expr={emotion,expression:emotion,base,asset:get('PetExpression').assetFor(base,emotion==='positive'?'happy':emotion==='dislike'?'sulky':emotion),fallback:null};
       if(view.player.expr.asset)loadAsset(view.player.expr.asset);
     }
   }
   function suspend(){
     session.clear();lastNow=null;
     for(const a of lastActors){const c=lifeCues.get(a);if(c)c.until=0;const r=partyReactions.get(a);if(r){r.joy=0;r.sulk=0;}}
   }
   function reset(){session.reset();lastWorld=null;lastNow=null;partyReactions=new WeakMap();lifeCues=new WeakMap();time=0;lastActors=[];}
   return {prepare,session,suspend,reset};
 }
 return Object.freeze({resolvePlayer,resolveActor,createSession,createViewController,EVENTS});
});
