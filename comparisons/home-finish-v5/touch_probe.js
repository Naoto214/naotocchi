// Loaded only by the evidence runner. All coordinates below are CSS pixels or
// native stage coordinates, as indicated. Targets are chosen before input.
(() => {
  const qa = window.touchQA, stage = document.querySelector('#castStage');
  const masks = new Map();
  function ink(owner) {
    const img = owner.querySelector('img.character-asset'), rect = img.getBoundingClientRect();
    if (!masks.has(img.currentSrc)) {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d', {willReadFrequently:true});
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const pixels = [];
      let x0=c.width, x1=0, y0=c.height, y1=0;
      for (let y=0; y<c.height; y++) for (let x=0; x<c.width; x++) {
        if (data[(y*c.width+x)*4+3]<200) continue;
        pixels.push([x,y]);
        x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y);
      }
      masks.set(img.currentSrc, [[.5,.35],[.35,.6],[.65,.6]].map(([fx,fy])=>{
        const x=x0+(x1-x0)*fx, y=y0+(y1-y0)*fy;
        let best, cost=Infinity;
        for (const v of pixels) {
          const d=(v[0]-x)**2+(v[1]-y)**2;
          if (d<cost) {best=v;cost=d;}
        }
        return [(best[0]+.5)/c.width,(best[1]+.5)/c.height];
      }));
    }
    let flip=false;
    for(let el=img;el;el=el.parentElement) {
      const css=getComputedStyle(el);
      if(parseFloat(css.scale)<0)flip=!flip;
      if(css.transform!=='none' && new DOMMatrix(css.transform).a<0)flip=!flip;
    }
    return masks.get(img.currentSrc).map(([x,y])=>[rect.left+rect.width*(flip?1-x:x),rect.top+rect.height*y]);
  }

  const inputEvents=['pointerdown','pointermove','pointerup','pointercancel'];
  for(const type of inputEvents) document.addEventListener(type,e=>{
    if (!qa.log) return;
    qa.log.pointers.push([e.type, e.pointerType, e.isTrusted, e.clientX, e.clientY, e.timeStamp]);
    qa.log.gates.push({type:e.type,state:qa.gates(),inStage:stage.contains(e.target),target:e.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor||e.target.id});
  }, true);
  stage.addEventListener('naotocchi:home-reaction',e=>{
    if (qa.log && e.detail.actor?.key===qa.key)
      qa.log.reactions.push([+qa.model.metrics().clock.toFixed(3),e.detail.type,e.detail.source,qa.position()]);
  });
  function visualSelection() {
    const owner=stage.querySelector('[data-diorama-selected="true"]'),
      label=stage.querySelector('.diorama-selected-label'), rect=label.getBoundingClientRect();
    return {key:owner?.dataset.dioramaActor||null,label:label.textContent,
      visible:!label.hidden&&rect.width>0&&rect.height>0&&rect.right>0&&rect.left<innerWidth&&rect.bottom>0&&rect.top<innerHeight};
  }
  stage.addEventListener('pointerdown',()=>{
    if(qa.log){qa.log.visualDown=visualSelection();(qa.log.visualPresses||=[]).push(qa.log.visualDown);}
  });
  const cast=()=>HomeCastTrial.inspect();
  const scale=()=>NaotocchiHomeViewport.residentPresentation();
  const cssToModel=(p,a,s)=>({x:a.x+(p[0]-a.foot.x)/s.scaleX,y:a.y+(p[1]-a.foot.y)/s.scaleY});
  const norm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  qa.position=()=>{const a=qa.model.snapshot().find(a=>a.key===qa.key);return [a.x,a.y];};
  qa.opening=()=>cast().map(a=>[a.key,a.x,a.y,a.w,a.h,a.foot.x,a.foot.y]);

  qa.prepare=({index,kind,autonomy,live})=>{
    qa.manual=true;
    qa.restore();qa.paint();qa.live=live;qa.autonomy=autonomy;
    const residents=cast(), a=residents[index], s=scale(), foot=[a.foot.x,a.foot.y];
    const samples=ink(document.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]'));
    const hits=samples.map(p=>qa.hit(...p)), picked=Math.max(0,hits.indexOf(a.key));
    let start=kind==='historical'?samples[picked]:samples[0];
    let goal=foot.slice(), direction=null;
    const nearby=residents.filter(b=>b.key!==a.key).sort((b,c)=>norm(foot,[b.foot.x,b.foot.y])-norm(foot,[c.foot.x,c.foot.y]));
    const cs=(pos)=>qa.classify(a.key,cssToModel(pos,a,s));
    if (kind.startsWith('offset')) {
      direction=Number(kind.slice(6));
      const rad=direction*Math.PI/180, radius=direction%90===0?36:72;
      goal=[foot[0]+radius*Math.cos(rad),foot[1]+radius*Math.sin(rad)];
      const target=document.elementFromPoint(...goal);
      if(!target||!stage.contains(target))return {skip:'outside stage',key:a.key};
    }
    if (kind==='empty') {
      const box=stage.getBoundingClientRect();
      let found=null;
      for(let y=Math.max(2,box.top); y<Math.min(innerHeight-2,box.bottom)&&!found;y+=10) {
        for(let x=Math.max(2,box.left);x<Math.min(innerWidth-2,box.right);x+=10) {
          const el=document.elementFromPoint(x,y),pos=[x,y];
          if(el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')&&cs(pos).terrain&&!qa.hit(x,y)){
            found=pos;break;
          }
        }
      }
      if(!found)return {skip:'no visible ground without a resident hit',key:a.key};
      start=goal=found;
    }
    if (kind==='historical') goal[0]+=(a.foot.x<=innerWidth/2?12:-12);
    if (kind==='tap'||kind==='cancel'||kind==='paused') goal=start.slice();
    if (kind==='jitter' || kind==='threshold') goal=[start[0]+(kind==='jitter'?5:10),start[1]];
    if (kind==='occupied') {
      const b=nearby.find(b=>norm(foot,[b.foot.x,b.foot.y])>22)||nearby[0];
      goal=[b.foot.x,b.foot.y];direction=b.key;
    }
    if (['clear','obstacle','diagonal','detour'].includes(kind)) {
      // Search in a fixed screen-space order. An impossible category is recorded.
      const radii=kind==='detour'?[64,96,128,168,200]:kind==='clear'?[36,52,24,16,10]:kind==='obstacle'?[52,76,96,120]:[68,48,32];
      const bearings=kind==='detour'?[0,90,180,270,45,135,225,315,30,60,120,150,210,240,300,330]:kind==='diagonal'?[45,135,225,315]:[315,135,45,225,180,90,0,270];
      let chosen=null;
      for (const r of radii) {for (const deg of bearings) {
        const angle=deg*Math.PI/180, p=[foot[0]+r*Math.cos(angle),foot[1]+r*Math.sin(angle)];
        const target=document.elementFromPoint(...p);
        if (!target || !stage.contains(target)) continue;
        const c=cs(p);
        if(kind==='clear'&&!(c.insideBounds&&c.terrain&&c.visible&&!c.contacts.length&&c.straightClear))continue;
        if(kind==='obstacle'&&(c.terrain||!c.insideBounds))continue;
        if(kind==='detour'&&!(c.insideBounds&&c.terrain&&c.visible&&!c.contacts.length&&!c.straightClear&&qa.proveDetour(a.key,cssToModel(p,a,s))))continue;
        chosen=p;direction=deg;break;
      } if(chosen)break;}
      if (!chosen) return {skip:'no '+kind+' target in predeclared sample',key:a.key};
      goal=chosen;
    }
    if (kind==='cancel') goal=[start[0]+25,start[1]+16];
    qa.key=a.key;qa.log={gates:[],pointers:[],reactions:[],release:[],plans:[],steps:[],contacts:[],maxStep:0,unsafeSteps:0,sweptContactViolations:0,maxSweptError:0};
    qa.beginClock=qa.model.metrics().clock;qa.origin=[a.x,a.y];qa.last=qa.origin.slice();
    qa.early=null;
    return {key:a.key,role:a.kind,start,foot,goal,modelGoal:cssToModel(goal,a,s),scale:[s.scaleX,s.scaleY],
      hits,picked:kind==='historical'?picked:0,direction,requestClass:cs(goal),startClass:cs(foot)};
  };
  // Choose a live two-finger-in-sequence fixture using a disposable copy of the
  // native opening. The runner repeats BOTH gestures through the browser.
  qa.findPeerPair=()=>{
    const started=performance.now(),r=cast(),s=scale(),directions=[0,45,-45,90,-90,135,-135,180];
    const rawDrop=(key,p)=>{qa.model.select(key);return qa.model.move(key,p,'drag',{pointerDrop:true});};
    const foot=a=>[a.foot.x,a.foot.y];
    let tried=0;
    for(let i=0;i<r.length;i++){
      const p=qa.prepare({index:i,kind:'historical'}), a=r[i],goal=p.modelGoal;
      if(!p.requestClass.contacts.length || p.hits[p.picked]!==a.key)continue;
      for(const k of p.requestClass.contacts){
        const b=r.find(c=>c.key===k), points=ink(document.querySelector('[data-diorama-actor="'+CSS.escape(k)+'"]'));
        const press=points.find(v=>qa.hit(...v)===k);
        if(!press)continue;
        const angle=Math.atan2(b.foot.y-a.foot.y,b.foot.x-a.foot.x);
        for(const radius of [14,24,40,64]) for(const degrees of directions){
          const az=angle+degrees*Math.PI/180;
          const target=[b.foot.x+radius*Math.cos(az),b.foot.y+radius*Math.sin(az)];
          if(!stage.contains(document.elementFromPoint(...target)))continue;
          qa.log=null;qa.restore();
          if(rawDrop(a.key,goal))break;
          if(!rawDrop(b.key,cssToModel(target,b,s)))continue;
          tried++;
          let sawArrival=false;
          const listener=e=>{if(e.detail.actor?.key===a.key&&e.detail.type==='arrive'&&e.detail.source==='drag')sawArrival=true;};
          stage.addEventListener('naotocchi:home-reaction',listener);
          for(let n=0;n<85&&!sawArrival;n++)qa.step(.05,{blocked:false,reducedMotion:false,autonomy:false});
          stage.removeEventListener('naotocchi:home-reaction',listener);
          if(sawArrival){qa.restore();qa.paint();return {index:i,key:a.key,peer:k,peerFoot:foot(b),press,target,tried};}
          if(performance.now()-started>30000){qa.restore();qa.paint();return {skip:'30s fixture search budget',tried};}
        }
      }
    }
    qa.log=null;qa.restore();qa.paint();return {skip:'no pair in declared search',tried};
  };
  qa.advance=(seconds,allowAmbient)=>{
    const steps=Math.round(seconds/.05);
    for(let i=0;i<steps;i++) qa.step(.05,{blocked:false,reducedMotion:false,autonomy:allowAmbient});
    qa.paint();
  };
  qa.result=()=>{
    const a=cast().find(a=>a.key===qa.key);
    const r={...qa.log,clock:qa.model.metrics().clock-qa.beginClock,end:[a.x,a.y],endFoot:[a.foot.x,a.foot.y],
      selected:qa.model.selected(),visual:visualSelection(),expectedLabel:a.label,activeTarget:a.target,early:qa.early};
    qa.log=null;qa.manual=true;
    return r;
  };
})();
