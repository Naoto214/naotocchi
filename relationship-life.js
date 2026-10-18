// Session-only relationship encounters. No save data, DOM or renderer dependencies.
(function(root){
  'use strict';
  const POLICY=Object.freeze({gap:90, encounterMin:180, encounterMax:360, invitationMin:1200, invitationMax:2400, partyMax:2, durationMin:60, durationMax:180});
  function createSession({random=Math.random}={}) {
    let now=0, next=180, invite=1200, visit=300;
    const history=[], listeners=new Set();
    const span=(lo,hi)=>lo+Math.max(0,Math.min(1,Number(random())||0))*(hi-lo);
    function attempt(kind,key) {
      if(!key || !['reunion','greeting','affection_interaction','invitation','visit'].includes(kind))return false;
      while(history.length && now-history[0].at>=600)history.shift();
      if(now<next || (kind==='invitation'&&now<invite) || (kind==='visit'&&now<visit))return false;
      const category=kind==='visit'&&String(key).startsWith('partner:')?'affection_interaction':kind;
      const cap=category==='greeting'?2:category==='affection_interaction'?1:3;
      if(history.filter(e=>e.category===category).length>=cap)return false;
      history.push({category,key,at:now});
      next=now+span(POLICY.encounterMin,POLICY.encounterMax);
      if(kind==='invitation')invite=now+span(POLICY.invitationMin,POLICY.invitationMax);
      if(kind==='visit')visit=now+span(300,600);
      return true;
    }
    return {get now(){return now;}, advance(dt){if(Number.isFinite(dt)&&dt>0)now+=dt;}, attempt,
      duration:()=>span(POLICY.durationMin,POLICY.durationMax),
      chooseVisitor(relations) {
        const friends=relations.filter(r=>!r.key.startsWith('partner:')),partners=relations.filter(r=>r.key.startsWith('partner:'));
        const pool=partners.length&&(!friends.length||span(0,1)>=.5)?partners:friends;
        return pool[Math.min(pool.length-1,Math.floor(span(0,pool.length)))];
      },
      emit(type,actorKey,meta={}) {
        const event=Object.freeze({...meta,version:1,type,actorKey,at:now});
        for(const fn of [...listeners])try{fn(event);}catch(_){} // observers cannot break gameplay
        return event;
      },
      subscribe(fn){if(typeof fn!=='function'||listeners.size>=32)return ()=>{}; listeners.add(fn); return ()=>listeners.delete(fn);}
    };
  }
  function createVisits(session) {
    let visitor=null, candidate=null;
    const leave=(reason)=>{if(visitor)session.emit('return_to_free_life',visitor.key,{context:'home',reason});visitor=null;};
    return {get current(){return visitor;},clear:leave,
      update(dt,relations) {
        session.advance(dt);
        if(visitor && (session.now>=visitor.until || !relations.some(r=>r.key===visitor.key)))leave('visit_end');
        if(!visitor && relations.length) {
          if(!candidate||!relations.some(r=>r.key===candidate.key))candidate=session.chooseVisitor(relations);
          const r=candidate;
          if(session.attempt('visit',r.key)) {
            candidate=null; visitor={key:r.key,until:session.now+session.duration()};
            session.emit('visit',r.key,{context:'home'});
          }
        }
        return visitor;
      }
    };
  }
  const api={createSession,createVisits,POLICY};
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.NaotocchiRelationshipLife=api;
})(typeof globalThis!=='undefined'?globalThis:window);
