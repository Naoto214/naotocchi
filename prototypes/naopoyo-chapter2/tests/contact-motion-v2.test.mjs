import test from 'node:test';import assert from 'node:assert/strict';
import {ForestSession,visualActors} from '../session.mjs';
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
test('overflow then falling remainder reaches settled coordinates continuously',()=>{const q=gesture(stage([a('a',2,5,8),a('b',3,5,8)],{gravity:true,walls:[[3,6],[2,6]]}));for(let i=0;i<=100;i++){const v=sample(q,i/100);assert.ok(v.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)));}assert.deepEqual(sample(q,1).filter(a=>a.opacity>0).map(a=>[a.id,a.x,a.y,a.level]),q.state.actors.map(a=>[a.id,a.x,a.y,a.level]));});
