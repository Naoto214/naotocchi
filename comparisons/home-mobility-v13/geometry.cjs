'use strict';
const {tryBaySeat} = require('./geometry-seat.cjs');
const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// Normalized coordinates on the visible, cover-cropped 1024 x 1536 painting.
// Both patches overlap the old path at their mouths. The excluded island and
// the foreground silhouettes remain hard borders for newly awarded cells.
const shoulder = [[.604,.558],[.638,.552],[.662,.558],[.665,.573],
  [.650,.588],[.617,.597],[.603,.586]];
const refuge = [[.616,.581],[.650,.568],[.681,.558],[.714,.562],
  [.731,.575],[.728,.592],[.703,.606],[.666,.618],[.627,.616],[.613,.601]];
const polygons = {a:[], b:[shoulder], c:[shoulder,refuge], d:[shoulder,refuge]};

// A terrain-only grid edge can later carry any member of the household. Compile
// all distinct native nine-point ink probes into painted-image coordinates.
function paintedObstacles(spec, bodies, sx, sy, cuts, inside) {
  const bounds = poly => ({
    poly, left:Math.min(...poly.map(v=>v[0])), right:Math.max(...poly.map(v=>v[0])),
    top:Math.min(...poly.map(v=>v[1])), bottom:Math.max(...poly.map(v=>v[1]))
  });
  const feet = [...(spec.exclude||[]), ...(spec.foreground||[])].map(bounds);
  const ink = (spec.foreground||[]).map(bounds);
  const probes = new Map();
  for (const body of bodies) {
    if (!(body.w>0 && body.h>0 && Number.isFinite(body.w+body.h))) return ()=>false;
    for (const x of [-.3,0,.3]) for (const y of [.22,.5,.8]) {
      const dx=x*body.w*sx, dz=-y*body.h*sy;
      probes.set(dx+','+dz,[dx,dz]);
    }
  }
  const epsilon=1e-12;
  function touches(a,b,shape) {
    const {poly,left,right,top,bottom}=shape;
    if (Math.max(a.x,b.x)<left-epsilon || Math.min(a.x,b.x)>right+epsilon ||
        Math.max(a.z,b.z)<top-epsilon || Math.min(a.z,b.z)>bottom+epsilon) return false;
    if (inside(a.x,a.z,poly) || inside(b.x,b.z,poly)) return true;
    // Include tangencies and the case where both endpoints are on the same
    // collinear edge, whose vertices may lie outside this segment.
    for (let i=0;i<poly.length;i++) {
      const c=poly[i],d=poly[(i+1)%poly.length];
      for(const q of [a,b]) if (q.x>=Math.min(c[0],d[0])-epsilon && q.x<=Math.max(c[0],d[0])+epsilon &&
          q.z>=Math.min(c[1],d[1])-epsilon && q.z<=Math.max(c[1],d[1])+epsilon &&
          Math.abs((q.x-c[0])*(d[1]-c[1])-(q.z-c[1])*(d[0]-c[0]))<=epsilon) return true;
    }
    const hits=[];
    cuts(hits,a,b,[poly]);
    return hits.length>0;
  }
  const offsets=[...probes.values()];
  const dx=Math.max(0,...offsets.map(q=>Math.abs(q[0]))), dz=Math.max(0,...offsets.map(q=>-q[1]));
  return (a,b)=>{
    if (!offsets.length || feet.some(s=>touches(a,b,s))) return false;
    for (const shape of ink) {
      if (Math.max(a.x,b.x)+dx<shape.left-epsilon || Math.min(a.x,b.x)-dx>shape.right+epsilon ||
          Math.max(a.z,b.z)<shape.top-epsilon || Math.min(a.z,b.z)-dz>shape.bottom+epsilon) continue;
      for (const [x,z] of offsets) if(touches({x:a.x+x,z:a.z+z},{x:b.x+x,z:b.z+z},shape))return false;
    }
    return true;
  };
}

function patchNavigation(source) {
  let out = replaceExact(source, 'presentation:p,cover}={}', 'presentation:p,cover,patches=[],inkBodies=[],opening=null}={}');
  const predicate = 'const paintedValid=q=>{const s=paintedPoint(q);return s.z>=rule.minZ&&insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly));};';
  out = replaceExact(out,predicate,`const patchContains=s=>patches.some(poly=>insidePolygon(s.x,s.z,poly)) &&
  ![...(spec.exclude||[]),...(spec.foreground||[])].some(poly=>insidePolygon(s.x,s.z,poly));
 const oldPaint=s=>s.z>=rule.minZ&&insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly));
 const paintedValid=q=>{const s=paintedPoint(q);return oldPaint(s)||(s.z>=rule.minZ&&patchContains(s));};
 const clearAdded=patches.length && (${paintedObstacles.toString()})(spec,inkBodies,p.scaleX/cover.width,p.scaleY/cover.height,polygonCuts,insidePolygon);`);
  out = replaceExact(out,'polygonCuts(cuts,paintedA,paintedB,polygons);',
    'polygonCuts(cuts,paintedA,paintedB,polygons);\n  if(patches.length)polygonCuts(cuts,paintedA,paintedB,patchEdges);');
  out = replaceExact(out,' const segmentWalkable=', ' const patchEdges=[...patches,...(spec.foreground||[])];\n const segmentWalkable=');
  out = replaceExact(out,'const at=t=>valid({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});',`let added=false;
  const at=t=>{
    const q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
    if(!patches.length)return valid(q);
    if(legacy.valid(q))return true;
    const s=paintedPoint(q);
    if(oldPaint(s))return true;
    if(s.z<rule.minZ||!patchContains(s))return false;
    added=true;return true;
  };`);
  out = replaceExact(out,'  return true;\n };\n const origin=',`  if(added && !clearAdded(paintedA,paintedB)){
   opening??=extendVisibleGroundNavigation(legacy,{spec,stage,presentation:p,cover});
   return opening.segmentSafe(a,b);
  }
  return true;
 };
 const origin=`);
  return out;
}

function patchWorld(source,arm,navigationRef) {
  const shapes=polygons[arm];
  if(!shapes)throw Error('Unknown terrain arm '+arm);
  if(!shapes.length)return source;
  let out=replaceExact(source,"'./home-visible-ground-navigation-finish.mjs?v=881f4643a2c9'",
    "'./"+navigationRef+"'");
  const anchor='   nav.reflowGeometry=projectionStamp(';
  return replaceExact(out,anchor,`   if(addVisible && spec.region==='forest'){
    const opening=nav;
    const patches=${JSON.stringify(shapes)};
    const withRoster=inkBodies=>extendVisibleGroundNavigation(legacy,{spec,stage:rect,presentation:p,cover,patches,inkBodies,opening});
    let dimensions='';
    const setInkBodies=list=>{
     const sizes=new Map(list.filter(b=>['pet','companion','partner'].includes(b.kind)).map(b=>[b.w+','+b.h,{w:b.w,h:b.h}]));
     const signature=[...sizes.keys()].sort().join('|');
     if(signature===dimensions)return;
     dimensions=signature;
     // Rebuild the static edge cache when aging, equipment or the cast changes the ink probes.
     Object.assign(nav,withRoster([...sizes.values()]),{initialPoint:opening.initialPoint.bind(opening)});
    };
    nav={...withRoster([]),initialPoint:opening.initialPoint.bind(opening),v13Opening:opening,v13Patches:patches,v13Width:win.innerWidth,v13SetInkBodies:setInkBodies};
   }
`+anchor);
}

function patchModel(source,arm) {
  if(!polygons[arm])throw Error('Unknown terrain arm '+arm);
  if(arm==='a')return source;
  const anchor='      // Centre first seating';
  let out=replaceExact(source,anchor,`      // Compare geometry from identical opening feet, including the legacy V9 seat option.
      const v13Navigation=scene.navigation;
      const v13Opening=!previousActors.length && !clock && v13Navigation?.v13Opening;
      if(v13Navigation?.v13Opening)v13Navigation.v13SetInkBodies(list);
      if(v13Opening)scene.navigation=v13Opening;
`+anchor);
  const finish='      if(arrange){clearRelief();';
  const seat = arm==='d' ? `      if(v13Opening && !selected && actors.length===28 && scene.region==='forest'){
        scene.navigation.v13SeatReceipt=(${tryBaySeat.toString()})(actors,v13Navigation,
          a=>bounds(a,scene),a=>scene.planVisibility?.(a)||(q=>visible(a,q)),clearance,contactSegmentSafe,
          b=>exit.every(q=>separated(lead,q,b)));
      }
` : '';
  out=replaceExact(out,finish,`      if(v13Opening)scene.navigation=v13Navigation;
`+seat+finish);
  return out;
}
module.exports={patchNavigation,patchWorld,patchModel,polygons};
