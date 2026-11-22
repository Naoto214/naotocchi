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

function patchNavigation(source) {
  let out = replaceExact(source, 'presentation:p,cover}={}', 'presentation:p,cover,patches=[]}={}');
  const predicate = 'const paintedValid=q=>{const s=paintedPoint(q);return s.z>=rule.minZ&&insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly));};';
  out = replaceExact(out,predicate,`const patchContains=s=>patches.some(poly=>insidePolygon(s.x,s.z,poly)) &&
  ![...(spec.exclude||[]),...(spec.foreground||[])].some(poly=>insidePolygon(s.x,s.z,poly));
 const paintedValid=q=>{const s=paintedPoint(q);return s.z>=rule.minZ&&((insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly)))||patchContains(s));};`);
  out = replaceExact(out,'polygonCuts(cuts,paintedA,paintedB,polygons);',
    'polygonCuts(cuts,paintedA,paintedB,polygons);\n  if(patches.length)polygonCuts(cuts,paintedA,paintedB,patchEdges);');
  out = replaceExact(out,' const segmentWalkable=', ' const patchEdges=[...patches,...(spec.foreground||[])];\n const segmentWalkable=');
  return out;
}

function patchWorld(source,arm) {
  const shapes=polygons[arm];
  if(!shapes)throw Error('Unknown terrain arm '+arm);
  if(!shapes.length)return source;
  let out=replaceExact(source,"'./home-visible-ground-navigation-finish.mjs?v=881f4643a2c9'",
    "'./home-visible-ground-navigation-v13.mjs'");
  const anchor='   nav.reflowGeometry=projectionStamp(';
  return replaceExact(out,anchor,`   if(addVisible && spec.region==='forest'){
    const opening=nav;
    const patches=${JSON.stringify(shapes)};
    nav=extendVisibleGroundNavigation(legacy,{spec,stage:rect,presentation:p,cover,patches});
    nav={...nav,initialPoint:opening.initialPoint.bind(opening),v13Opening:opening,v13Patches:patches,v13Width:win.innerWidth};
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
