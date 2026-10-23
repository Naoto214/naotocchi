import test from 'node:test';
import {Session} from '../session.mjs';import {stages} from '../stages.mjs';import {mass,validState} from '../engine.mjs';
test('1080 seeded paths conserve valid state and match 1/40 sample subdivisions',()=>{
let seed=20261022;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);let count=0;
for(const stage of stages)for(let run=0;run<60;run++){const actor=stage.actors[0],points=[{x:actor.x+.5,y:actor.y+.5}];for(let j=0;j<5;j++)points.push({x:rand()*6.99,y:rand()*6.99});function go(n){const s=new Session(stage);s.begin(actor.id,points[0]);for(let i=1;i<points.length;i++)for(let j=1;j<=n;j++)s.travel({x:points[i-1].x+(points[i].x-points[i-1].x)*j/n,y:points[i-1].y+(points[i].y-points[i-1].y)*j/n});s.end();if(!validState(stage,s.state))throw Error('Invalid state');return s.state}const a=go(1),b=go(40);if(JSON.stringify(a)!==JSON.stringify(b)){throw Error(JSON.stringify({stage:stage.id,run,points,a,b}))}count++}console.log({seed:20261022,samples:count,subdivisions:[1,40],pass:true});

});
