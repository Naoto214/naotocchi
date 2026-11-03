import test from 'node:test';import assert from 'node:assert/strict';
import {ForestSession,visualActors} from '../session.mjs';
import {render} from '../render.mjs';
import {contactEffects} from '../contact-motion.mjs';
const a=(id,x,y,level,species='dog')=>({id,x,y,level,species});
const stage=(actors,extra={})=>({id:'komorebi-contact-motion',w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',walls:[],gates:[],spikes:[],exits:[],water:[],events:[],guests:[],actors,...extra});
function gesture(s,id='a',dx=1,dy=0){const q=new ForestSession(s),p=q.state.actors.find(a=>a.id===id);q.begin(id,{x:p.x+.5,y:p.y+.5});q.travel({x:p.x+.5+dx,y:p.y+.5+dy});q.end();assert.ok(q.motion.length);return q;}
const sample=(q,t)=>{q.motion[0].elapsed=q.motion[0].duration*t;return visualActors(q);};
for(const [left,right]of [[3,4],[5,6],[4,8],[8,4],[8,8]])for(const dx of [-1,1])test(`contact-first ${left}+${right}, dx=${dx}`,()=>{
 const q=gesture(stage([a('a',3,3,left),a('b',3+dx,3,right)]),'a',dx);
 const early=sample(q,.12),held=early.find(a=>a.id==='a'),other=early.find(a=>a.id==='b');assert.equal(held.level,left);assert.equal(other.level,right);assert.equal(other.x,3+dx,'target waits for contact');
 const frames=Array.from({length:101},(_,i)=>sample(q,i/100));
 const joined=frames.findIndex(v=>v.filter(a=>a.opacity>0).length===2&&v.every(a=>Math.abs(a.x-(3+dx))<.01));assert.ok(joined>0,'both actually meet');
 if(left+right>8){const departed=frames.findIndex(v=>Math.abs(v.find(a=>a.id==='b').x-(3+dx))>.01);assert.ok(departed>joined,'remainder separates only after meeting');}
 for(const v of frames){const body=v.find(a=>a.id==='a');if(body.level!==left)assert.ok(Math.abs(body.x-(3+dx))<.01,'new number cannot precede contact');}
 const end=sample(q,1).filter(a=>a.opacity>0).map(({id,x,y,level,species})=>({id,x,y,level,species}));assert.deepEqual(end,q.state.actors);
});
test('mixed actors use opposite arcs without number changes',()=>{const q=gesture(stage([a('a',3,3,8),a('b',4,3,4,'fish')])),v=sample(q,.4);assert.ok(v[0].y>3&&v[1].y<3);assert.deepEqual(v.map(a=>a.level),[8,4]);});
test('supported overflow reaches settled coordinates continuously',()=>{const q=gesture(stage([a('a',2,5,8),a('b',3,5,8)],{gravity:true,walls:[[3,6],[2,6]]}));for(let i=0;i<=100;i++){const v=sample(q,i/100);assert.ok(v.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));}assert.deepEqual(sample(q,1).filter(a=>a.opacity>0).map(a=>[a.id,a.x,a.y,a.level]),q.state.actors.map(a=>[a.id,a.x,a.y,a.level]));});

const fallingStage=()=>stage([a('a',3,4,8),a('b',4,7,4)],{gravity:true,walls:[[3,5]],exits:[{x:4,y:7,exact:8}]});
test('falling overflow separates then the remainder falls after the merged body exits',()=>{
 const q=gesture(fallingStage()),events=q.motion[0].events;
 const mergeIndex=events.findIndex(e=>e.type==='merge');
 assert.ok(mergeIndex>0);assert.equal(events[mergeIndex].overflow,4);
 assert.equal(events[mergeIndex].contact.remainderId,'b');
 assert.ok(events.slice(mergeIndex+1).some(e=>e.type==='fall'&&e.id==='b'&&e.from===6&&e.to===7));
 assert.deepEqual(q.state.actors,[a('b',4,7,4)]);assert.equal(q.state.rescued,8);
 const frames=Array.from({length:1001},(_,i)=>sample(q,i/1000));
 const ys=frames.map(v=>v.find(a=>a.id==='b').y),top=Math.min(...ys),peak=ys.indexOf(top);
 assert.ok(top<6.01&&top>=6,'remainder visibly separates one cell above contact');
 assert.ok(ys.slice(peak).some(y=>y>6.2&&y<6.8),'remainder visibly falls through intermediate positions');
 for(let i=1;i<ys.length;i++)assert.ok(Math.abs(ys[i]-ys[i-1])<.05,'no teleport at event boundaries');
 assert.deepEqual(frames.at(-1).filter(a=>a.opacity>0).map(({id,x,y,level,species})=>({id,x,y,level,species})),[a('b',4,7,4)]);
});

test('a late gravity merge ring starts small and grows from its own contact time',()=>{
 const q=gesture(fallingStage()),f=q.motion[0];
 let start;
 for(let i=0;i<=1000;i++){const t=i/1000,e=contactEffects(f,t).find(e=>e.type==='merge');if(e){start=t;break;}}
 assert.ok(start>.3,'fixture must merge late in the operation');
 const paint=t=>{
  f.elapsed=t*f.duration;const radii=[],noop=()=>{},gradient=()=>({addColorStop:noop});
  const c=new Proxy({arc(x,y,r){if(c.strokeStyle==='#bc8c3a')radii.push(r);},createLinearGradient:gradient,createRadialGradient:gradient,measureText:()=>({width:1})},{get:(o,k)=>k in o?o[k]:noop});
  render({getBoundingClientRect:()=>({width:320}),getContext:()=>c},q,{dpr:1});return radii;
 };
 const initial=paint(start);assert.equal(initial.length,1);
 assert.ok(initial[0]>=6&&initial[0]<7.2,`new ring must start small, got ${initial[0]}`);
 const later=paint(start+.03);assert.ok(later[0]>initial[0],'ring expands after contact');
});
