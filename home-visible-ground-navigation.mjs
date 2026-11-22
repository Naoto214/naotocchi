import {createTerrainNavigation} from './home-route-navigation.mjs?v=32b7d6ca27bb';
import {insidePolygon} from './home-art-navigation.mjs?v=aac392aafc95';
import {VISIBLE_GROUND_RULES} from './home-ground-expansion.mjs?v=886c97b278c4';

// Polygon membership can change only at an edge intersection. Split the native
// segment at those exact parameters, including collinear edge endpoints. This
// catches arbitrarily thin gaps which fixed-distance route samples can skip.
function polygonCuts(cuts,a,b,polygons){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 if(!length)return;
 const add=t=>{if(t>=0&&t<=1)cuts.push(t);};
 for(const poly of polygons)for(let i=0;i<poly.length;i++){
  const c=poly[i],d=poly[(i+1)%poly.length],ex=d[0]-c[0],ez=d[1]-c[1],cx=c[0]-a.x,cz=c[1]-a.z,den=dx*ez-dz*ex;
  if(den){const t=(cx*ez-cz*ex)/den,u=(cx*dz-cz*dx)/den;if(u>=0&&u<=1)add(t);}
  else if(cx*dz-cz*dx===0){add((cx*dx+cz*dz)/length);add(((d[0]-a.x)*dx+(d[1]-a.z)*dz)/length);}
 }
}

// Add only visible painted ground; retain the old foot/depth/camera coordinate
// system. The caller still supplies individual ink bounds and strict contacts.
export function extendVisibleGroundNavigation(legacy,{spec,stage,presentation:p,cover}={}){
 const rule=VISIBLE_GROUND_RULES[spec?.region];
 if(!legacy||!rule?.enabled||!Array.isArray(spec.ground)||!stage||!p||!cover)return legacy;
 const values=[stage.left,stage.top,p.x,p.y,p.scaleX,p.scaleY,cover.left,cover.top,cover.width,cover.height];
 if(values.some(n=>!Number.isFinite(n))||Math.min(p.scaleX,p.scaleY,cover.width,cover.height)<=0)return legacy;
 const screen=q=>({x:p.x+(stage.left+q.x-p.x)*p.scaleX,y:p.y+(stage.top+q.y-p.y)*p.scaleY});
 const paintedPoint=q=>{const s=screen(q);return {x:(s.x-cover.left)/cover.width,z:(s.y-cover.top)/cover.height};};
 const paintedValid=q=>{const s=paintedPoint(q);return s.z>=rule.minZ&&insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly));};
 const valid=q=>legacy.valid(q)||paintedValid(q);
 const polygons=[spec.ground,...(spec.exclude||[])];
 const legacyPolygons=spec.region==='city'?[...polygons,spec.ground.map(([x,z])=>[x,x===.7&&z===.57?.55:z])]:polygons;
 const segmentWalkable=(a,b)=>{
  const cuts=[0,1],paintedA=paintedPoint(a),paintedB=paintedPoint(b);
  polygonCuts(cuts,legacy.unproject(a),legacy.unproject(b),legacyPolygons);
  polygonCuts(cuts,paintedA,paintedB,polygons);
  if(paintedA.z!==paintedB.z){const t=(rule.minZ-paintedA.z)/(paintedB.z-paintedA.z);if(t>0&&t<1)cuts.push(t);}
  cuts.sort((u,v)=>u-v);
  const at=t=>valid({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  for(let i=0;i<cuts.length;i++){if(!at(cuts[i]))return false;if(i&&cuts[i]>cuts[i-1]&&!at((cuts[i]+cuts[i-1])/2))return false;}
  return true;
 };
 const origin=legacy.project({x:0,z:0});
 const union=createTerrainNavigation({staticGeometry:legacy.staticGeometry===true,width:legacy.width,height:legacy.height,cell:8,gridOrigin:origin,project:q=>q,unproject:q=>({...q,z:q.y}),walkable:valid,segmentWalkable});
 const safePath=(from,path,predicate)=>path.every((to,i)=>union.segmentSafe(i?path[i-1]:from,to,predicate));
 const route=(from,to,bounds,predicate=()=>true)=>{
  // An old route is reusable only when it really reaches the requested point;
  // legacy.route may otherwise silently correct an added-ground destination.
  if(legacy.valid(to)){const old=legacy.route(from,to,bounds,predicate);if(old.length&&Math.hypot(old.at(-1).x-to.x,old.at(-1).y-to.y)<1e-6&&safePath(from,old,predicate))return old;}
  return union.route(from,to,bounds,predicate);
 };
 const referenceRoute=(from,to,bounds,predicate=()=>true)=>{
  const old=legacy.referenceRoute?.(from,to,bounds,predicate)||[];
  if(old.length&&Math.hypot(old.at(-1).x-to.x,old.at(-1).y-to.y)<1e-6&&safePath(from,old,predicate))return old;
  return union.route(from,to,bounds,predicate);
 };
 const reachable=(from,requested,bounds,predicate=()=>true,accept=()=>true)=>{
  const target={x:Math.max(bounds.left,Math.min(bounds.right,requested.x)),y:Math.max(bounds.top,Math.min(bounds.bottom,requested.y))};
  if(accept(target)&&union.segmentSafe(from,target,predicate))return [target];
  const path=union.reachable(from,requested,bounds,predicate,accept);if(!path.length)return path;
  // Refine the last grid point continuously toward the pointer. Every candidate
  // must keep its complete connecting segment safe; no jumping across gaps.
  const last=path.at(-1);let lo=0,hi=1;
  for(let i=0;i<18;i++){const t=(lo+hi)/2,q={x:last.x+(target.x-last.x)*t,y:last.y+(target.y-last.y)*t};if(accept(q)&&union.segmentSafe(last,q,predicate))lo=t;else hi=t;}
  const q={x:last.x+(target.x-last.x)*lo,y:last.y+(target.y-last.y)*lo};
  if(Math.hypot(q.x-last.x,q.y-last.y)>1e-5)path.push(q);return path;
 };
 return {...legacy,layoutNavigation:legacy.layoutNavigation||legacy,intentAware:true,intentScale:{x:p.scaleX,y:p.scaleY},
  valid:union.valid,segmentSafe:union.segmentSafe,nearest:union.nearest,route,referenceRoute,reachable,
  visibleGround:{point:paintedPoint,valid:paintedValid,rule}};
}
