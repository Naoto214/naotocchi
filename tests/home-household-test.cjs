const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
const master=vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
const ids=[...master.companions.normal,...master.companions.rare].map(c=>c.id);
const home=require('../home-diorama.js'),model=require('../home-diorama-model.js'),boxes=require('../cast-bounds.js');
function layoutActors(width,count,overview=false,height=300){
 const paths=['assets/characters/dog/04.png','assets/characters/partners/cat_ceo.png',...ids.slice(0,count-2).map(id=>'assets/characters/companions/'+id+'.png')];
 const layout=home.layoutTerrainCast({width,height,conversationHeight:44,mainAsset:paths[0],partnerAsset:paths[1],hasPartner:true,hasRing:true,companions:paths.slice(2),overview});
 return [layout.main,layout.partner,...layout.companions].map((f,i)=>{const b=boxes[paths[i]]?.box||[0,0,128,128];return {key:i===0?'pet:dog':i===1?'partner:cat_ceo':'companion:'+ids[i-2],kind:i===0?'pet':i===1?'partner':'companion',id:String(i),x:f.x+f.w*(b[0]+b[2])/256,y:f.y+f.h*b[3]/128+(f.artOffsetY||0),w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};});
}
for(const width of [288,343,358,398])test(`crowded terrain layout fits all visible bodies at ${width}px`,()=>{
 for(const count of [6,13,21,27,28]){
 const a=layoutActors(width,count);assert.equal(a.length,count);
 for(const p of a){assert.ok(p.x-p.w/2>=0&&p.x+p.w/2<=width);assert.ok(p.y-p.h>=20&&p.y<=246);assert.ok(Math.max(p.w,p.h)>=22);}
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const p=a[i],q=a[j];assert.ok(Math.abs(p.x-q.x)>=(p.w+q.w)/2||p.y-p.h>=q.y||q.y-q.h>=p.y,'painted bodies do not overlap');}
 const overview=layoutActors(width,count,true);assert.ok(overview[0].w<a[0].w);assert.equal(overview.length,count);
 }
});
test('28 residents retain varied life for ten minutes, with at most two ambient walkers',()=>{
 let seed=17;const m=model.createModel({random:()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296});
 m.sync(layoutActors(358,28),{width:358,height:300,groundTop:24,region:'forest',tags:[{tag:'tree',x:100,y:100}]});
 for(let i=0;i<6000;i++){m.step(.1);const a=m.snapshot();assert.equal(a.length,28);assert.ok(a.filter(x=>x.target&&x.source==='ambient').length<=2);}
 assert.ok(Object.keys(m.metrics().activities).length>=4);assert.ok(m.metrics().distance>0);
 const positions=()=>m.snapshot().map(a=>[a.key,a.x,a.y]);const before=positions();for(let i=0;i<600;i++)m.step(.1,{reducedMotion:true});assert.deepEqual(positions(),before);assert.ok(m.snapshot().every(a=>!a.target));
});
function setup(count,partner=false){
 const h=harness({deterministic:true,homeDiorama:true,worldScene:true}),s=h.api.state();
 Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'forest',isSleeping:false,isSick:false,dying:false,companions:ids.slice(0,count).map((id,i)=>({id,bond:i%2?80:20}))});
 s.partner=partner?{...h.api.partnerCandidates[0],affection:20,married:true}:null;
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');h.get('screenNormal').classList.remove('hidden');h.api.render();return {h,s,c:h.api.homeDiorama()};
}
for(const n of [0,1,5,13,20,26])for(const partner of [false,true])test(`household ${n} companions / partner ${partner} exists before any visit`,()=>{
 const {h,s,c}=setup(n,partner),before=JSON.stringify(s);
 const actors=c.model.snapshot();assert.equal(actors.length,1+n+Number(partner));assert.equal(new Set(actors.map(a=>a.key)).size,actors.length);
 assert.equal(h.api.homeVisitors().companions.length,0);assert.equal(h.api.homeVisitors().partner,null);
 h.api.render();assert.equal(JSON.stringify(s),before);
});
test('visit expiry keeps resident, while relationship departure removes selection and actor',()=>{
 const {h,s,c}=setup(26,true);for(const x of s.companions)x.bond=100;h.api.render();
 h.api.meguruMod.socialSession.advance(300);h.api.render();assert.equal(c.model.snapshot().length,28);
 const visitors=h.api.homeVisitors(),key=visitors.partner?'partner:'+visitors.partner.id:'companion:'+visitors.companions[0].id;
 assert.ok(c.model.select(key));h.api.meguruMod.socialSession.advance(181);h.api.render();assert.equal(c.model.snapshot().length,28);
 if(key.startsWith('partner:'))s.partner=null;else s.companions=s.companions.filter(x=>'companion:'+x.id!==key);
 h.api.render();assert.equal(c.model.snapshot().length,27);assert.equal(c.model.selected(),null);
});
test('duplicate or unknown old-save entries never create additional actors or change the save',()=>{
 const {h,s,c}=setup(1);s.companions.push({...s.companions[0]},{id:'not-a-character',bond:90});const before=JSON.stringify(s.companions);h.api.render();
 assert.equal(c.model.snapshot().length,2);assert.equal(JSON.stringify(s.companions),before);
});
test('terrain seating rejects a position that hides the resident behind scenery',()=>{
 const m=model.createModel();m.sync([{key:'pet:a',kind:'pet',id:'a',x:40,y:150,w:30,h:30}],{region:'forest',width:350,height:300,groundTop:30,visible:p=>p.x>120});
 assert.ok(m.snapshot()[0].x>120);
});

test('short viewports reserve readable household space instead of shrinking bodies to single digits',()=>{for(const height of [150,180,200,240])for(const width of [288,358])for(const overview of [false,true]){const a=layoutActors(width,28,overview,height);for(const p of a)assert.ok(Math.max(p.w,p.h)>=20,`${width}x${height} visible body`);}});
