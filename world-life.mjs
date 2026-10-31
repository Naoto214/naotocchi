// Presentation-only active-time population. Routes are habitat contracts, not game AI.
const air=(kind,z,y,speed,gap=[5,12])=>({kind,domain:'air',z,y,speed,gap});
export const HOME_ROUTES = Object.freeze({
 countryside:[air('bird',2100,400,80),air('butterfly',900,90,28)],
 sea:[air('bird',2200,370,90)],
 snow:[air('snow',1100,300,28,[1,3])],
 mountain:[air('cloud',2800,650,24,[8,16]),air('bird',2300,500,95)],
 jungle:[air('butterfly',1200,150,25),air('mote',2200,230,18)],
 desert:[air('sand',1600,30,55,[2,5])],
 deepsea:[air('glow',1450,160,18,[2,5]),air('mote',2300,300,10,[3,6])],
 star_stop:[air('star',2200,550,12,[3,7])],
 memory_lake:[air('mist',2300,140,12,[5,10]),air('glow',1600,75,14,[5,11])],
 home:[air('butterfly',1100,90,25),air('bird',2300,380,80,[14,28])],
 forest:[{kind:'bird',domain:'air',z:1500,y:370,speed:125,gap:[9,21]},{kind:'butterfly',domain:'air',z:1050,y:95,speed:32,gap:[5,12]}],
 river_lake:[{kind:'fish',domain:'water',z:1650,y:-17,speed:70,gap:[2,4]},{kind:'bird',domain:'air',z:1700,y:330,speed:120,gap:[14,28]}],
 city:[{kind:'car',domain:'road',z:1400,y:5,speed:175,gap:[10,24]},{kind:'pedestrian',domain:'pavement',z:1150,y:0,speed:46,gap:[6,16]}]
});
function privateRandom(){const bytes=new Uint32Array(1);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(bytes);let seed=bytes[0]||Date.now()>>>0||1;return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
export function createWorldLife(region,random=privateRandom()){
 const routes=HOME_ROUTES[region]||[],actors=[],deadlines=routes.map((_,i)=>1+i*2);let clock=0,serial=0,spawned=0,distance=0;
 function spawn(r){const direction=random()<.5?-1:1;actors.push({id:++serial,kind:r.kind,domain:r.domain,x:r.kind==='fish'?(spawned<3?-400+spawned*300:-direction*1150):-direction*1300,y:r.y,z:r.z,originZ:r.z,originY:r.y,direction,speed:r.speed*(.75+random()*.5),phase:random()*6.28,age:0});spawned++;}
 function step(dt,env={}){if(env.paused||env.reducedMotion||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.1,dt);clock+=dt;
  routes.forEach((r,i)=>{if(clock<deadlines[i])return;const quiet=env.time==='night'?2.2:1,wet=env.weather==='rain'||env.weather==='snow';
   if(actors.length<8&&!(r.kind==='car'&&actors.some(a=>a.kind==='car'))&&!(wet&&r.domain==='air')&&!(env.time==='night'&&r.kind==='butterfly'))spawn(r);
   deadlines[i]=clock+(r.gap[0]+random()*(r.gap[1]-r.gap[0]))*quiet*(wet?1.4:1);
  });
  for(let i=actors.length-1;i>=0;i--){const a=actors[i];a.age+=dt;const dx=a.speed*dt*a.direction*(a.kind==='car'?1:.85+.15*Math.sin(a.age*.8+a.phase));a.x+=dx;distance+=Math.abs(dx);
   if(a.kind==='fish'){a.z=a.originZ+120*Math.sin(a.age*.5+a.phase);a.y=-17+Math.sin(a.age*.9)*1.2;}
   if(a.domain==='air'){a.z=a.originZ+70*Math.sin(a.age*.22+a.phase);a.y=a.originY+35*Math.sin(a.age*.8+a.phase);}
   if(Math.abs(a.x)>1400)actors.splice(i,1);
  }
 }
 return {step,snapshot:()=>actors.map(a=>({...a})),metrics:()=>({clock,spawned,distance,active:actors.length,capacity:8})};
}
