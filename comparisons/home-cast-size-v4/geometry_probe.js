// Browser-only measurement. The production hit closure is exposed by the runner.
(() => {
  const stage = document.getElementById('castStage');
  const rect = el => {
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  };
  const flip = img => {
    let value = false;
    for (let el=img; el; el=el.parentElement) {
      const css = getComputedStyle(el);
      if (parseFloat(css.scale)<0) value=!value;
      if (css.transform!=='none' && new DOMMatrix(css.transform).a<0) value=!value;
    }
    return value;
  };
  function hints(layout, policy, curve) {
    const settings=HomeCastTrial.settings, count=HomeCastTrial.inspect().length;
    const nav={initialPoint:()=>null, project:p=>[p.x,p.z],valid:()=>true};
    const query=new URLSearchParams(location.search);
    Object.entries({layout,policy,curve,count}).forEach(([k,v])=>query.set(k,v));
    const result=HomePopulationSeats.withOpeningSeats(nav,{region:HomeBeauty.settings.region},
      innerWidth,innerHeight,'?'+query);
    return Array.from({length:count},(_,i)=>result.initialPoint(i,count));
  }
  window.qaPlans = () => {
    const result={};
    for (const layout of ['fixed','optimized'])
      for (const curve of ['linear','step']) for (const policy of ['current','A','B','C'])
        result[[layout,curve,policy].join('/')]=hints(layout,policy,curve);
    return result;
  };
  const events={};
  stage.addEventListener('naotocchi:home-reaction',e=>{
    if(e.detail?.type) events[e.detail.type]=(events[e.detail.type]||0)+1;
  });
  // Route through the same read-cache wrapper as the V3 hit measurement.
  window.qaTapHits = () => [...stage.querySelectorAll('[data-diorama-actor]')].map(owner=>{
    const pts=qaTapPoints(owner);
    return [owner.dataset.dioramaActor,...pts.map(([x,y])=>qaNativeHit(x,y))];
  });
  window.qaAdvance=steps=>{
    HomeCastTrial.apply({policy:'current',paused:false});
    for(let i=0;i<steps;i++) qaNative.step(.1,{blocked:false,reducedMotion:false});
    HomeCastTrial.apply({paused:true});
    document.getAnimations().forEach(a=>{a.pause();a.currentTime=0;});
  };
  const gear=()=>[...stage.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')]
    .map(el=>[el.id||el.className,rect(el)]).filter(([,r])=>r[2]>0);
  window.qaPhase = (pairs) => {
    HomeCastTrial.apply({policy:'current',curve:'linear',paused:true});
    document.getAnimations().forEach(a=>{a.pause();a.currentTime=0;});
    const origin=HomeCastTrial.inspect(), shadows=[...stage.querySelectorAll('.diorama-shadow')];
    const actors=origin.map(a=>{
      const owner=stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
      const img=owner.querySelector('img.character-asset');
      const shadow=shadows.find(el=>Math.abs(parseFloat(el.style.left)-a.x)<.01 && Math.abs(parseFloat(el.style.top)-a.y)<.01);
      return {key:a.key,kind:a.kind,asset:img.currentSrc.split('/game/').pop(),flip:flip(img),
        foot:[a.foot.x,a.foot.y],frame:rect(img),native:[a.x,a.y,a.w,a.h],depth:a.depth,
        z:Number(owner.style.zIndex),shadow:shadow?rect(shadow):null};
    });
    const pose=()=>JSON.stringify(HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.foot.x,a.foot.y,a.depth]));
    const original=pose(),baselineGear=gear(), gains={},settings={};
    for(const [curve,policy] of pairs) {
      const s=HomeCastTrial.apply({curve,policy});
      const gain=String(s.extra);
      if(!Number.isFinite(s.extra)||s.count!==actors.length)throw Error('Incorrect native scale/count '+JSON.stringify(s));
      settings[curve+'/'+policy]=[gain,s.hero,s.partner,s.companions];
      if(Object.hasOwn(gains,gain))continue;
      const frames=origin.map(a=>rect(stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"] img.character-asset')));
      gains[gain]={frames,hits:qaTapHits(),gear:gear()};
      if(pose()!==original)throw Error('Native feet, dimensions or depth changed during synchronized paint sweep');
    }
    HomeCastTrial.apply({policy:'current',curve:'linear'});
    const nav=qaLastScene.navigation;
    return {p:{clip:rect(stage.closest('.screen-frame')),viewport:[innerWidth,innerHeight],
      region:HomeBeauty.settings.region,art:HomeBeauty.paintRect},actors,baselineGear,settings,gains,
      modelStats:qaNative.metrics(),events:{...events},populationFitRecoveries:Number(stage.dataset.populationFitRecoveries||0),actualInitialPoints:actors.map((_,i)=>{
        const q=nav.unproject(nav.initialPoint(i,actors.length));return [q.x,q.z];
      })};
  };
})();
