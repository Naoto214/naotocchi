const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const home=require('../home-diorama.js'),model=require('../home-diorama-model.js'),boxes=require('../cast-bounds.js');
const master=vm.runInNewContext(fs.readFileSync('character-world-master.v1.js','utf8')+';NAOTOCCHI_CHARACTER_WORLD_MASTER_V1');
const paths=[...master.companions.normal,...master.companions.rare].map(c=>c.asset);
function setup(n,width=358,height=360,partner=n===28){
 const args={width,height,mainAsset:'assets/characters/dog/06.png',hasPartner:partner,partnerAsset:'assets/characters/partners/forest_bear.png',hasRing:partner,companions:paths.slice(0,n-1-Number(partner))};
 const l=home.layoutTerrainCast(args),ps=[args.mainAsset,...(partner?[args.partnerAsset]:[]),...args.companions];
 const actors=[l.main,...(partner?[l.partner]:[]),...l.companions].map((f,i)=>{const b=boxes[ps[i]].box;return {key:i===0?'pet:dog':partner&&i===1?'partner:bear':'companion:'+i,kind:i===0?'pet':partner&&i===1?'partner':'companion',id:String(i),x:f.x+f.w*(b[0]+b[2])/256,y:f.y+f.h*b[3]/128+(f.artOffsetY||0),w:f.w*(b[2]-b[0])/128,h:f.h*(b[3]-b[1])/128};});return {args,l,actors};
}
for(const width of [288,343,358,398])test(`central household and lower seats at ${width}`,()=>{
 for(const n of [1,2,3,6,13,20,28])for(const height of [300,360])for(const partner of n===2?[false,true]:[n===28]){
  const {actors,args,l}=setup(n,width,height,partner),pet=actors[0],legacy=home.layoutTerrainCast({...args,formation:'arc'});
  assert.equal(actors.length,n);assert.ok(Math.abs(pet.x-width/2)<width*.16);assert.ok(pet.y>height*.35&&pet.y<height*.72,`central pet ${n}: ${pet.y}`);
  assert.equal(l.main.w,legacy.main.w,'v12 body-size budget');
  if(n>=6){const others=actors.slice(1);for(const side of ['left','right','above','below'])assert.ok(others.some(a=>side==='left'?a.x<pet.x-10:side==='right'?a.x>pet.x+10:side==='above'?a.y<pet.y-10:a.y>pet.y+10),`${n} ${side}`);assert.ok(Math.max(...actors.map(a=>a.y))>height-40);}
  for(const a of actors){assert.ok(a.x-a.w/2>=0&&a.x+a.w/2<=width);assert.ok(a.y-a.h>=8&&a.y<=height-12);}
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=actors[i],b=actors[j];assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||a.y-a.h>=b.y||b.y-b.h>=a.y,`no painted overlap ${n} ${i}/${j}`);}
 }
});
test('shared role bounds permit ground/drag moves into lower strip and no UI overflow',()=>{
 for(const kind of ['pet','companion','partner']){const a={key:kind+':a',id:'a',kind,x:160,y:160,w:30,h:40};const m=model.createModel();m.sync([a],{region:'forest',width:350,height:300,groundTop:24});assert.equal(m.bounds(a).bottom,288);for(const source of ['ground','drag']){assert.ok(m.move(a.key,{x:source==='drag'?220:200,y:284},source));for(let i=0;i<100;i++)m.step(.1,{autonomy:false});assert.ok(m.snapshot()[0].y>280);}}
});
test('facing belongs to image children, not the expression SVG wrapper',()=>{
 const css=fs.readFileSync('home-diorama.css','utf8');
 const mirrored=[...css.matchAll(/([^{}]+)\{([^{}]*scale:var\(--diorama-facing[^{}]*)\}/g)];
 assert.ok(mirrored.length);for(const m of mirrored)assert.match(m[1],/character-asset|character-emoji-fallback/,'no mirrored parent containing Zzz');
});
module.exports={setup};
test('speaker overlays remain within the stage including choices at each edge',()=>{
 assert.equal(typeof home.speechPlacement,'function');
 for(const width of [288,343,358,398])for(const x of [12,width/2,width-12])for(const y of [45,150,285])for(const choicesHeight of [0,100]){const r=home.speechPlacement({speaker:{x,y,h:35},width,height:300,bubbleWidth:270,bubbleHeight:55,choicesHeight});assert.ok(r.x>=6&&r.x+r.w<=width-6);assert.ok(r.y>=6&&r.y+55<=294);assert.ok(r.y-choicesHeight>=6);}
});
test('poop seats on unoccupied safe terrain near the protagonist, without save coordinates',()=>{
 assert.equal(typeof home.placeGroundProps,'function');
 const pet={key:'pet:a',kind:'pet',x:170,y:220,w:55,h:65},actors=[pet,{key:'companion:b',x:110,y:225,w:30,h:40}],scene={width:350,height:300,navigation:{valid:p=>p.x>50&&p.x<290&&p.y>140&&p.y<288},visible:()=>true};
 const before=JSON.stringify(actors),points=home.placeGroundProps(4,actors,scene);
 assert.equal(points.length,4);assert.equal(JSON.stringify(actors),before);
 for(const p of points){assert.ok(scene.navigation.valid(p));assert.ok(Math.hypot(p.x-pet.x,p.y-pet.y)<125);for(const a of actors)assert.ok(Math.abs(p.x-a.x)>a.w/2+10||p.y<a.y-a.h-2||p.y-18>a.y+2);}
 assert.deepEqual(home.placeGroundProps(0,actors,scene),[]);
 assert.deepEqual(home.placeGroundProps(4,actors,{...scene,navigation:{valid:()=>false}}),[],'never fake a safe ground position when terrain is unavailable');
});
test('short stages return the actual choices cap and keep result narration sized',()=>{
 const p=home.speechPlacement({speaker:{x:150,y:80,h:35},width:288,height:150,bubbleWidth:270,bubbleHeight:55,choicesHeight:165});assert.ok(p.choicesMaxHeight<=78);assert.ok(p.y-p.choicesMaxHeight-5>=6);
 const css=fs.readFileSync('home-diorama.css','utf8');assert.match(css,/#homeChoiceResult\{[^}]*position:relative/);
});
test('initial terrain centering respects safe ground band without recentering manual actors',()=>{
 const m=model.createModel(),actors=[{key:'pet:a',kind:'pet',id:'a',x:150,y:160,w:40,h:45}];
 const scene={width:350,height:390,groundTop:24,region:'river_lake',centerInitialCast:true,navigation:{project:p=>({x:p.x,y:p.z}),unproject:p=>({x:p.x,y:0,z:p.y}),valid:p=>p.y>=220,nearest:p=>({...p,y:Math.max(220,p.y)}),route:(a,p)=>[p],segmentSafe:()=>true}};
 m.sync(actors,scene);assert.ok(m.snapshot()[0].y>280);m.move('pet:a',{x:90,y:345});for(let i=0;i<100;i++)m.step(.1,{autonomy:false});const before=m.snapshot()[0];m.sync(actors,scene);assert.equal(m.snapshot()[0].y,before.y);assert.equal(m.snapshot()[0].x,before.x);
});
