'use strict';

const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// The relative ink extents are measured by the existing painter. The shape
// and projection stamps are only used when a DOM owner is replaced.
function measurementScope() {
  const p=env.NaotocchiHomeViewport?.residentPresentation?.();
  const frame=stage.closest?.('.screen-frame');
  if (!p || !frame || !scene.navigation) return null;
  const r=displayRect(stage),safe=frame.getBoundingClientRect();
  return JSON.stringify([
    scene.region,scene.width,scene.height,world?.stats().projectionRevision,
    env.innerWidth,env.innerHeight,env.devicePixelRatio,env.visualViewport?.scale,
    doc.body.dataset.homeDisplayVersion,doc.body.dataset.homeViewportVersion,
    p.x,p.y,p.scaleX,p.scaleY,p.bodyScale,p.bodyScaleLimit,p.landscape,
    p.safeLeft,p.safeRight,p.safeTop,p.safeBottom,
    r.left,r.top,r.width,r.height,safe.left,safe.top,safe.right,safe.bottom
  ]);
}

function bareCompanionShape(row) {
  if (row.kind !== 'companion' || row.attachments?.length) return null;
  const host=row.owner, visual=host.firstElementChild, image=visual?.firstElementChild;
  if (host.dataset.companionId!==row.id || row.key!=='companion:'+row.id ||
      host.children.length!==1 || !visual?.matches('.character-visual.character-companion.has-asset') ||
      visual.children.length!==2 || !visual.lastElementChild.matches('.character-emoji-fallback') ||
      !image?.matches('img.character-asset') || image.hasAttribute('srcset') || image.hasAttribute('sizes') ||
      !row.asset || !image.getAttribute('src') || image.src!==new URL(row.asset,doc.baseURI).href ||
      (image.currentSrc && image.currentSrc!==image.src)) return null;
  const e=row.extent;
  if (!e || e.left!==row.w/2 || e.right!==row.w/2 || e.top!==row.h || e.bottom!==0) return null;
  const geometryStyle=el=>[el.className,...['width','height','object-fit','object-position','transform','scale','rotate']
    .map(name=>el.style.getPropertyValue(name))];
  return JSON.stringify([row.key,row.id,row.asset,image.src,row.x,row.y,row.w,row.h,row.originX,
    host.style.width,host.style.height,host.style.left,host.style.top,geometryStyle(visual),geometryStyle(image)]);
}

function bodyChanged(old, next) {
  const a=old.extent,b=next.extent;
  return old.kind!==next.kind || old.id!==next.id || old.asset!==next.asset || old.w!==next.w ||
    old.h!==next.h || old.x!==next.x || old.y!==next.y || old.originX!==next.originX ||
    a?.top!==b?.top || a?.bottom!==b?.bottom || a?.left!==b?.left || a?.right!==b?.right;
}

function patchFoot(source) {
  // Lift the native paint measurement out of the full camera-envelope scan.
  // It can now run before a retained resident is subjected to model.bounds().
  const start="        let up=Math.max(a.extent?.top||a.h";
  const end="        let maxDepth=1;";
  const first=source.indexOf(start), last=source.indexOf(end,first);
  if(first<0 || first!==source.lastIndexOf(start) || last<first)throw Error("Native ink measurement is missing");
  const calculation=source.slice(first,last);
  const helper='    function measureCurrentBody(row,a,v15,h,foot){\n'+calculation+
    '      return {up,down,wide,paint};\n    }\n';
  let result=replaceExact(source,calculation,`        const {up,down,wide,paint}=measureCurrentBody(row,a,v15,h,foot);
        row.inkShape=bareCompanionShape(row);
        row.inkScope=row.inkShape ? currentScope() : null;
        row.inkNavigation=scene.navigation;
`);
  result=replaceExact(result,'    function sync(){',[
    measurementScope.toString(),bareCompanionShape.toString(),bodyChanged.toString(),helper,'    function sync(){'
  ].join('\n'));
  const scope='let scope; const currentScope=()=>scope===undefined?(scope=measurementScope()):scope;';
  result=replaceExact(result,'      const list=getActors(),next=new Map();',
    '      const list=getActors(),next=new Map();\n      '+scope);
  result=replaceExact(result,'        let row=rows.get(a.key);',`        let row=rows.get(a.key);
        const replacing=!!row && row.owner!==a.owner;
        const refresh=!!row && (replacing || bodyChanged(row,a));
        let cached=null;
        if (replacing && row.inkShape && row.paintExtent && row.inkNavigation===scene.navigation &&
            row.inkScope!==null && row.inkScope===currentScope() && row.inkShape===bareCompanionShape(a)) {
          const e=row.paintExtent;
          if(e.up===Math.max(a.h+12,a.h*1.08+a.w*.12) && e.down===8 &&
             e.left===a.w/2 && e.right===a.w/2 && e.side===a.w/2)
            cached={paintExtent:e,inkShape:row.inkShape,inkScope:row.inkScope,inkNavigation:row.inkNavigation};
        }`);
  result=replaceExact(result,"        next.set(a.key,row);",`        if (cached) Object.assign(row,cached);
        else if (refresh && stage.__homeResidentEnvelope) {
          const adjusted={...a,extent:{...a.extent,top:Math.max(a.extent?.top||a.h,a.h)+12}};
          measureCurrentBody(row,adjusted,['15','16','17','18'].includes(doc.body.dataset.homeDisplayVersion),
            parseFloat(row.owner.style.height)||row.h,row.y-(parseFloat(row.owner.style.top)||0));
          row.inkShape=bareCompanionShape(row);
          row.inkScope=row.inkShape ? currentScope() : null;
          row.inkNavigation=scene.navigation;
        }
        next.set(a.key,row);`);
  return replaceExact(result,'      if(key===residentEnvelopeKey)return;residentEnvelopeKey=key;',
    '      if(key===residentEnvelopeKey)return;residentEnvelopeKey=key;\n      '+scope);
}

// Attached only to the experiment's model. Ordinary and performance frames
// don't enumerate any extra resident data when the readout is switched off.
function createFootLog() {
  const counts=new Map(),events=[];
  function read(key) {
    const residents=Object.fromEntries([...counts].map(([id,item])=>[id,{...item}]));
    return key ? {...(residents[key]||{changes:0,stableLayoutChanges:0}),events:events.filter(e=>e.key===key)} :
      {residents,events:events.slice()};
  }
  function sync(clock,before,after,oldScene,scene,arrange) {
    if (globalThis.HomeCastTrial && !globalThis.HomeCastTrial.ready) return;
    const scale=scene.navigation?.intentScale||{x:1,y:1};
    const sameScene=oldScene.region===scene.region && oldScene.width===scene.width &&
      oldScene.height===scene.height && oldScene.navigation===scene.navigation;
    for (const a of after) {
      const old=before.find(b=>b.key===a.key);
      if (!old || (Math.abs(old.x-a.x)<1e-6 && Math.abs(old.y-a.y)<1e-6)) continue;
      const distanceCSS=Math.hypot((a.x-old.x)*scale.x,(a.y-old.y)*scale.y);
      if (distanceCSS<1e-4) continue;
      const body=old.w!==a.w || old.h!==a.h ||
        ['left','right','top','bottom'].some(k=>old.extent?.[k]!==a.extent?.[k]);
      const reason=oldScene.region!==scene.region?'region':!sameScene?'projection':
        before.length!==after.length?'population':body?'body':arrange?'arrangement':'stable-layout-sync';
      const event={clock,key:a.key,reason,from:[old.x,old.y],to:[a.x,a.y],
        distanceCSS};
      const counter=counts.get(a.key)||{changes:0,stableLayoutChanges:0};
      counter.changes++;
      if(reason==='stable-layout-sync')counter.stableLayoutChanges++;
      counts.set(a.key,counter);
      events.push(event);
      if(events.length>256)events.shift();
    }
  }
  return {read,sync};
}

function patchFootDiagnostics(source) {
  const marker='    function sync(list,next){';
  let result=replaceExact(source,marker,createFootLog.toString()+`
    const footLog=typeof location!=='undefined' && new URLSearchParams(location.search).get('footLog')==='1'
      ? createFootLog() : null;
    if(footLog)globalThis.HomeFootDiagnostics=Object.freeze({read:footLog.read});
`+marker);
  const hook='      if(arrange){clearRelief();';
  return replaceExact(result,hook,'      footLog?.sync(clock,previousActors,actors,previousScene,scene,arrange);\n'+hook);
}

module.exports={patchFoot,patchFootDiagnostics};
