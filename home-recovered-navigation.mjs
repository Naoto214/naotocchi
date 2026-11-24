import {createArtNavigation,insidePolygon} from './home-art-navigation.mjs?v=ce7a115739f0';
// Relative native feet of the 375px V13-D forest opening, in roster order.
// Keep the established lead anchor and adapt the reference to the current width.
const referenceOffsets = [
  [0.0, 0.0], [0.12766, 0.04636], [0.05944, -0.37868], [-0.02287, -0.22776],
  [-0.07749, 0.11913], [0.08689, 0.14268], [-0.03137, -0.11614], [0.14177, -0.47747],
  [-0.03485, -0.32949], [-0.13595, -0.15847], [-0.17863, 0.09342], [-0.00796, 0.19411],
  [-0.20028, -0.08079], [0.22467, -0.416], [0.06342, -0.28801], [-0.24739, 0.01304],
  [0.16094, 0.22145], [0.24872, -0.50097], [-0.11474, 0.20444], [-0.11648, -0.24415],
  [0.05639, -0.20465], [0.01191, 0.11853], [0.07738, 0.22145], [0.07738, -0.43576],
  [0.15228, -0.39408], [0.20699, 0.11483], [-0.24296, 0.11665], [-0.26428, -0.0964],
];
function forestOpening(nav, spec, host, index, count, mode) {
 if (!index || count < 2 || spec.region !== 'forest') return null;
 const anchor = nav.project({x:spec.seats[0][0], z:spec.seats[0][1]});
 if (mode === 'D') {
   const offset = referenceOffsets[index];
   return offset && {x:anchor.x + offset[0]*host.width, y:anchor.y + offset[1]*host.width};
 }
 const n = count-1;
 if (mode === 'B' || mode==='BEST') {
   // On this 27-seat ellipse the sixth seat is closest to the lead.
   // Exchange the two roles, preserving every position around the ring.
   if(mode==='BEST'&&count===28){
     if(index===1)index=6;else if(index===6)index=1;
   }
   const angle = -Math.PI/4 + (index-1)*2*Math.PI/n;
   return nav.project({x:.49 + .17*Math.cos(angle), z:.71 + .205*Math.sin(angle)});
 }
 if (mode === 'C') {
   // Stagger the seats along the bends in the painted path. The normal solver
   // corrects each proposed foot using the resident's actual bounds and peers.
   const bands = [[.48,.59,.55], [.30,.54,.68], [.29,.61,.78], [.39,.66,.89]];
   const row=(index-1)%bands.length, col=Math.floor((index-1)/bands.length);
   const [left,right,z]=bands[row], columns=Math.ceil((n-row)/bands.length);
   const fraction=columns===1?.5:col/(columns-1);
   return nav.project({x:left+(right-left)*fraction,z:z+.02*Math.sin((col+row)*2)});
 }
 return null;
}
// Pick separated seed points on the intersection of native and painted ground.
// The ordinary solver still owns clearance, measured ink and the lead's exit.
function paintedForestSeats(nav,spec,stage,projection,count) {
 const seats=[nav.project({x:spec.seats[0][0],z:spec.seats[0][1]})];
 const candidates=[],obstacles=[...spec.exclude,...spec.foreground];
 for(let y=8;y<stage.height;y+=8)for(let x=8;x<stage.width;x+=8){
   const p={x,y},art=projection(p);
   if(nav.valid(p)&&insidePolygon(art.x,art.z,spec.ground)&&
      !obstacles.some(poly=>insidePolygon(art.x,art.z,poly))){
     candidates.push({...p,nearest:Infinity});
   }
 }
 const minimum=Math.min(stage.width,stage.height)/Math.sqrt(count)*.62;
 for(let i=1;i<count;i++){
   const prev=seats[i-1];let best=null;
   for(const c of candidates){
     c.nearest=Math.min(c.nearest,Math.hypot(c.x-prev.x,(c.y-prev.y)*1.15));
     if(!best||c.nearest>best.nearest)best=c;
   }
   if(!best||best.nearest<minimum)break;
   seats.push({x:best.x,y:best.y});
 }
 // The maximum household has a partner at index 1. Use the nearest
 // selected seat for that partner before the usual clearance solver runs.
 if(seats.length>2){
   const lead=seats[0],distance=p=>Math.hypot(p.x-lead.x,p.y-lead.y);
   let nearest=1;
   for(let i=2;i<seats.length;i++)if(distance(seats[i])<distance(seats[nearest]))nearest=i;
   [seats[1],seats[nearest]]=[seats[nearest],seats[1]];
 }
 return seats;
}
export function createRecoveredNavigation(spec,host,stage,options){
 const nav=createArtNavigation(spec,host,stage,options),[far,near,min,max]=spec.depth;
 let seeds=null,lastCount=0;
 return {...nav,depthScale:p=>Math.max(min,Math.min(max,min+(nav.unproject(p).z-far)/(near-far)*(max-min))),
 initialPoint(index,count){
 const requested=globalThis.homeForestLayout;
 const mode=requested===undefined||requested==='BEST'?(count===28&&options?.stableGrid?'BEST':'A'):requested;
 if(spec.region==='forest'&&mode==='BEST'&&count>=10&&options?.paintedProjection){
   if(lastCount!==count){seeds=paintedForestSeats(nav,spec,stage,options.paintedProjection,count);lastCount=count;}
   if(seeds[index])return seeds[index];
 }
 const proposed=forestOpening(nav,spec,host,index,count,mode);if(proposed)return proposed;const seat=spec.seats[index%spec.seats.length];if(count<=6||index===0)return nav.project({x:seat[0],z:seat[1]});
 // Stagger the existing safe-seat solver along the actual path, including depth.
 const row=Math.floor(index/spec.seats.length),x=seat[0]+(row%2?-.035:.035),z=seat[1]+(row-2)*.018;return nav.project({x,z});}};
}
