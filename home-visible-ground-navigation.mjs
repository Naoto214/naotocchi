import {createTerrainNavigation} from './home-route-navigation.mjs';
import {insidePolygon} from './home-art-navigation.mjs';
import {VISIBLE_GROUND_RULES} from './home-ground-expansion.mjs';

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
 const origin=legacy.project({x:0,z:0});
 const union=createTerrainNavigation({width:legacy.width,height:legacy.height,cell:8,gridOrigin:origin,project:q=>q,unproject:q=>({...q,z:q.y}),walkable:q=>legacy.valid(q)||paintedValid(q)});
 const route=(from,to,bounds,predicate=()=>true)=>{
  // An old route is reusable only when it really reaches the requested point;
  // legacy.route may otherwise silently correct an added-ground destination.
  if(legacy.valid(to)){const old=legacy.route(from,to,bounds,predicate);if(old.length&&Math.hypot(old.at(-1).x-to.x,old.at(-1).y-to.y)<1e-6)return old;}
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
  valid:union.valid,segmentSafe:union.segmentSafe,nearest:union.nearest,route,reachable,
  visibleGround:{point:paintedPoint,valid:paintedValid,rule}};
}
