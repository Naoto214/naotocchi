const test=require('node:test'),assert=require('node:assert/strict');
const {createModel}=require('../home-production-model.js');
async function setup(mode='all',roles=['pet','companion'],options={}){
 const {createTerrainNavigation}=await import('../home-route-navigation.mjs');
 const valid=p=>p.x>=24&&p.x<=216&&(p.y>=95&&p.y<=105||!options.noAlcove&&p.x>=105&&p.x<=140&&p.y>=52&&p.y<=105);
 const nav=createTerrainNavigation({width:240,height:160,project:p=>p,unproject:p=>({...p,z:p.y}),walkable:valid,cell:8,gridOrigin:{x:0,y:0}});nav.intentAware=true;nav.intentScale={x:1,y:1};
 const model=createModel({random:()=>.5});model.setYieldMode(mode);model.sync([{key:'a',kind:roles[0],id:'a',x:60,y:100,w:20,h:20},{key:'b',kind:roles[1],id:'b',x:120,y:100,w:20,h:20}],{width:240,height:160,region:'city',time:'day',navigation:nav,actorBounds:()=>({left:24,right:216,top:52,bottom:105}),visible:p=>valid(p),tags:[]});
 return model;
}
function run(m,seconds=14,flags={autonomy:false}){let old=m.snapshot();for(let i=0;i<seconds*20;i++){m.step(.05,flags);const now=m.snapshot();for(let j=0;j<now.length;j++){assert.ok(Math.hypot(now[j].x-old[j].x,now[j].y-old[j].y)<=2.10001,'no teleport');for(let k=j+1;k<now.length;k++)assert.ok(Math.hypot((now[j].x-now[k].x)/((now[j].w+now[k].w)*.5+10),(now[j].y-now[k].y)/((now[j].h+now[k].h)*.38+10))>=1-1e-6,'no contact');}old=now;}return m.snapshot();}
test('manual common yield opens blocked corridor without teleport/contact',async()=>{const m=await setup('manual');m.move('a',{x:200,y:100},'drag');const a=run(m).find(a=>a.key==='a');assert.ok(a.x>195);assert.equal(m.yieldStatus().counters.started,1);assert.equal(m.yieldStatus().counters.passages,1);});
test('off retains blocked route and never moves blocker',async()=>{const m=await setup('off');m.move('a',{x:200,y:100},'drag');const a=run(m);assert.ok(a[0].x<100);assert.equal(a[1].y,100);assert.equal(m.yieldStatus().counters.started,0);});
test('all roles may request manual priority',async()=>{for(const roles of [['partner','pet'],['companion','partner']]){const m=await setup('manual',roles);m.move('a',{x:200,y:100},'drag');assert.ok(run(m)[0].x>195);}});
test('no safe retreat means no yield',async()=>{const m=await setup('all',undefined,{noAlcove:true});m.move('a',{x:200,y:100},'drag');run(m);assert.equal(m.yieldStatus().counters.started,0);});
test('selection and cancel stop pending yield',async()=>{const m=await setup('manual');m.move('a',{x:200,y:100},'drag');m.cancel();run(m);assert.equal(m.yieldStatus().counters.started,0);assert.equal(m.yieldStatus().active,null);});
test('self detour exists: no retreat necessary',async()=>{const m=await setup('manual');m.move('a',{x:80,y:100},'drag');run(m);assert.equal(m.yieldStatus().counters.started,0);});
