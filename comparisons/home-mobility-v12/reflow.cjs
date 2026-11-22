'use strict';
const {replaceExact}=require('../home-finish-v5/native-hooks.cjs');

// Built once per native navigation projection. Host height alone is not a
// terrain input: both affine maps and the real viewport crop are included.
function projectionStamp(nav,spec,stage,stableGrid,addVisible,real,p,doc,win) {
  const floor=[{x:0,z:0},{x:1,z:0},{x:0,z:1}].map(q=>nav.project(q));
  const extra=[{x:0,y:0},{x:1,y:0},{x:0,y:1}].map(q=>nav.visibleGround?.point(q)||null);
  const crop=r=>r?[r.left,r.top,r.width,r.height]:null;
  return JSON.stringify([spec.region,spec.candidate,spec.ground,spec.exclude,spec.foreground,spec.depth,
    stage.width,stage.height,stableGrid,!!addVisible,nav.visibleGround?.rule||null,floor,extra,crop(real),
    crop(doc.querySelector('.screen-frame')?.getBoundingClientRect()),crop(doc.getElementById('castStage')?.getBoundingClientRect()),
    p&&[p.x,p.y,p.scaleX,p.scaleY,p.bodyScale,p.safeLeft,p.safeTop,p.safeRight,p.safeBottom],
    win.innerWidth,win.innerHeight,win.devicePixelRatio,win.visualViewport?.scale,
    doc.body.dataset.homeDisplayVersion,doc.body.dataset.homeViewportVersion,doc.body.dataset.homeTinyOverview]);
}

function patchReflowWorld(source) {
  const create='export function createHomeWorld(options){';
  const refresh="   revision++;lastPaint='';";
  let result=replaceExact(source,create,projectionStamp.toString()+'\n'+create);
  return replaceExact(result,refresh,"   nav.reflowGeometry=projectionStamp(nav,spec,stage,stableGrid,addVisible,real,p,doc,win);\n"+refresh);
}

function patchReflowPainter(source, paths) {
  let result=source;
  for (const kind of ['finish','mobility']) {
    const pattern=new RegExp("'\\./home-production-world-"+kind+"\\.mjs\\?v=[0-9a-f]+'",'g');
    const matches=[...result.matchAll(pattern)];
    if(matches.length!==1)throw Error('Expected one native world import for '+kind);
    const replacement=paths?.[kind] || 'home-production-world-v12-'+kind+'.mjs';
    if(!/^[a-zA-Z0-9._-]+\.mjs(?:\?v=[0-9a-f]+)?$/.test(replacement))throw Error('Invalid replay world import');
    result=replaceExact(result,matches[0][0],"'./"+replacement+"'");
  }
  const row='({key,kind,id,x,y,w,h,extent,temperament})=>({key,kind,id,x,y,w,h,extent:';
  if(result.split(row).length!==3)throw Error('Expected both native actor descriptions');
  return result.split(row).join(`({key,kind,id,x,y,w,h,extent,temperament,asset,attachments,paintExtent})=>({key,kind,id,x,y,w,h,
        reflowArt:asset,reflowInk:paintExtent,reflowGear:attachments?.length?attachments.map(n=>
          n.getAttribute('src')||n.querySelector('img')?.getAttribute('src')||n.className).join('|'):'',extent:`);
}

// Same geometry and the same complete household imply the set of legal
// directions remains identical if every resident stays on that foot. A live
// route is also checked against today's participants, segment by segment.
function assessReflow(list,next,old,people) {
  const nav=next.navigation;
  if(!nav?.reflowGeometry||nav.reflowGeometry!==old.navigation?.reflowGeometry ||
      next.region!==old.region||old.width!==next.width||old.height!==next.height||
      next.fiveResidentExit!==old.fiveResidentExit||!nav.intentAware||list.length!==people.length||
      !people.length)return {held:false,reason:'geometry-or-population'};
  const inBox=(p,b)=>p.x>=b.left-1e-7&&p.x<=b.right+1e-7&&p.y>=b.top-1e-7&&p.y<=b.bottom+1e-7;
  const safe=(a,p)=>!next.visible||next.visible(p,a);
  const clear=(a,from,to)=>people.every(peer=>peer===a||
    contactSegmentSafe(from,to,peer,(a.w+peer.w)*.5+10,(a.h+peer.h)*.38+10));
  let liveSegments=0;
  for(let i=0;i<people.length;i++){
    const a=people[i],row=list[i];
    if(!a.reflowArt||a.reflowArt!==row.reflowArt||a.reflowGear!==row.reflowGear||
      !a.reflowInk||!row.reflowInk||['up','down','left','right','side'].some(k=>a.reflowInk[k]!==row.reflowInk[k])||
      a.key!==row.key||a.kind!==row.kind||a.id!==row.id||a.w!==row.w||a.h!==row.h||
      ['left','right','top','bottom'].some(k=>a.extent?.[k]!==row.extent?.[k]))return {held:false,reason:'resident-geometry'};
    const b=bounds(row,next);
    if(!inBox(a,b)||!nav.valid(a)||!safe(row,a))return {held:false,reason:'invalid-foot'};
    for(let j=0;j<i;j++)if(!separated(a,a,people[j]))return {held:false,reason:'existing-contact'};
    if(a.target){
      let from=a;
      for(const to of [a.target,...(a.route||[])]){
        if(++liveSegments>48||!inBox(to,b)||!clear(a,from,to)||!nav.segmentSafe(from,to,p=>safe(row,p)))
          return {held:false,reason:'route-or-budget'};
        from=to;
      }
    }
  }
  const lead=people.find(a=>a.kind==='pet');
  if(!lead||!(people.length>5||next.fiveResidentExit))return {held:true,reason:'same-ground',liveSegments};
  // The reserved corridor is an existing native layout requirement. Prefer
  // its eight headings, then inspect intermediate headings at the same length.
  const length=Math.max(40,lead.w*1.2);
  let terrainChecks=0;
  for(let offset=0;offset<12;offset++)for(let axis=0;axis<8;axis++){
    const angle=(axis*12+offset)*Math.PI/48;
    const end=limit(lead,{x:lead.x+length*Math.cos(angle),y:lead.y+length*Math.sin(angle)},next);
    if(Math.hypot(end.x-lead.x,end.y-lead.y)<length*.8||!clear(lead,lead,end))continue;
    if(++terrainChecks>24)return {held:false,reason:'corridor-budget'};
    if(nav.segmentSafe(lead,end,p=>safe(lead,p)))return {held:true,reason:'reserved-exit-open',bearing:angle*180/Math.PI,liveSegments};
  }
  return {held:false,reason:'reserved-exit-closed'};
}

function patchReflow(source) {
  const marker='    function sync(list,next){';
  const changed='      const changed=next.region!==scene.region||next.width!==scene.width||next.height!==scene.height||next.navigation!==scene.navigation;';
  let result=replaceExact(source,marker,assessReflow.toString()+`
    const reflowRecords=new Map();
    const reflowObserved=typeof location!=='undefined' && /(?:^|[?&])(?:footLog|diagnostics)=1(?:&|$)/.test(location.search);
    if(reflowObserved)globalThis.HomeV12Reflow=Object.freeze({read:key=>key?reflowRecords.get(key)||null:Object.fromEntries(reflowRecords)});
`+marker);
  result=replaceExact(result,changed,`      const distinctNavigation=next.navigation!==scene.navigation;
      const reflowChoice=distinctNavigation && scene.navigation && next.navigation && next.region===scene.region ?
        assessReflow(list,next,scene,actors):null;
      const changed=next.region!==scene.region||next.width!==scene.width||next.height!==scene.height||(distinctNavigation&&!reflowChoice?.held);`);
  const finish='      if(arrange){clearRelief();';
  return replaceExact(result,finish,`      if(reflowObserved && reflowChoice){
        const s=scene.navigation.intentScale||{x:1,y:1};
        for(const a of actors){
          const old=previousActors.find(p=>p.key===a.key);if(!old)continue;
          const amount=Math.hypot((a.x-old.x)*s.x,(a.y-old.y)*s.y);
          const prior=reflowRecords.get(a.key);
          reflowRecords.set(a.key,{...reflowChoice,clock,events:(prior?.events||0)+1,
            moves:(prior?.moves||0)+(amount>1e-4?1:0),distanceCSS:amount,from:[old.x,old.y],to:[a.x,a.y]});
        }
      }
`+finish);
}
module.exports={patchReflow,patchReflowWorld,patchReflowPainter};
