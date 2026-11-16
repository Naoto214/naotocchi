const {test}=require('node:test'),assert=require('node:assert/strict');
const d=require('../home-production-diorama.js'),m=require('../home-production-model.js');
const base={left:70,right:230,top:140,bottom:368};
const args={base,ink:{up:90,down:8,left:30,right:60},presentation:{x:0,y:0,scaleX:.5,scaleY:1,bodyScale:1,bodyScaleLimit:1},stage:{left:100,top:0},safe:{left:0,right:300,top:0,bottom:400},navigation:{depthScale:()=>1}};
test('individual visible-foot bounds reclaim room without fitting or resizing the actor',()=>{
 assert.equal(typeof d.displayWalkingBounds,'function');const b=d.displayWalkingBounds(args);
 assert.deepEqual(b,{left:-30,right:370,top:95,bottom:389});
 assert.equal(args.presentation.bodyScale,1);assert.deepEqual(args.base,base);
});
test('asymmetric fixed attachment reserves its own side, not both sides',()=>{
 const b=d.displayWalkingBounds(args),plain=d.displayWalkingBounds({...args,ink:{...args.ink,right:30}});
 assert.equal(b.left,plain.left);assert.equal(plain.right-b.right,60);
});
test('depth, nonuniform camera, scroll origin and body-scale reservation remain safe throughout interval',()=>{
 const a={...args,presentation:{...args.presentation,scaleY:.6,bodyScale:.9,bodyScaleLimit:1},navigation:{depthScale:p=>Math.max(.8,Math.min(1,.8+p.y/1800))}};
 const b=d.displayWalkingBounds(a);assert.ok(b.top<b.bottom);
 for(let y=b.top;y<=b.bottom;y+=.25){const depth=a.navigation.depthScale({x:0,y});assert.ok(y*.6-(90*depth+5)>=-.001);assert.ok(y*.6+(8*depth+3)<=400.001);}
});
test('missing, non-finite, inverted or impossible geometry conservatively retains original bounds',()=>{
 for(const change of [{ink:null},{safe:{...args.safe,right:NaN}},{presentation:{...args.presentation,scaleX:0}},{safe:{...args.safe,bottom:20}},{ink:{...args.ink,up:Infinity}},{navigation:{depthScale:()=>NaN}}])assert.deepEqual(d.displayWalkingBounds({...args,...change}),base);
});
test('drag and autonomous movement route into the expanded bounds through the same model',()=>{
 const b=d.displayWalkingBounds(args),actor={key:'pet:test',kind:'pet',x:150,y:250,w:60,h:90};
 for(const source of ['drag','ambient']){const model=m.createModel({random:()=>.5});model.sync([actor],{region:'city',width:300,height:380,groundTop:24,actorBounds:()=>b});assert.equal(model.move(actor.key,{x:340,y:385},source),true);const a=model.snapshot()[0];assert.equal(a.target.x,340);assert.equal(a.target.y,385);}
});
test('idle autonomy actually visits reclaimed space without an explicit move command',()=>{
 let seed=521;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const b=d.displayWalkingBounds(args),model=m.createModel({random});
 model.sync([{key:'pet:test',kind:'pet',x:150,y:250,w:30,h:45,temperament:{curiosity:5,boldness:5,sociability:3,persistence:3}}],{region:'city',width:400,height:400,groundTop:24,actorBounds:()=>b});
 let outside=false;for(let i=0;i<24000;i++){model.step(.05);const a=model.snapshot()[0];if(a.x<base.left||a.x>base.right||a.y<base.top||a.y>base.bottom)outside=true;assert.ok(a.x>=b.left&&a.x<=b.right&&a.y>=b.top&&a.y<=b.bottom);}
 assert.ok(outside,'seeded idle decisions use the expanded actorBounds');
});
