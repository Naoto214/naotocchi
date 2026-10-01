const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../relationship-expression.js');
test('reaction exposes an ephemeral start token and expiry without persisting entity fields',()=>{
 let now=0;const entity={id:'otter'},r=R.createReactions({now:()=>now,schedule:()=>1,cancel(){}});
 r.start(entity);assert.equal(r.info(entity).startedAt,0);assert.equal(r.info(entity).until,2500);
 now=2500;assert.equal(r.info(entity),null);assert.deepEqual(entity,{id:'otter'});
});
test('heart remains immediately above its owner even if a neighbour occupies that space',()=>{
 const f={x:50,y:45,w:40,h:40};
 const p=R.heartAnchor(f,{width:300,height:160});
 const q=R.heartAnchor(f,{width:300,height:160,obstacles:[{x:0,y:0,w:300,h:45}]});
 assert.deepEqual(q,p);assert.equal(p.x+p.w/2,f.x+f.w/2);
 assert.ok(f.y-(p.y+p.h)>=2 && f.y-(p.y+p.h)<=4);
 for(const x of [0,270]){const a=R.heartAnchor({...f,x},{width:310,height:160});assert.ok(a.x>=0&&a.x+a.w<=310);}
});
test('positive companion layer is raised locally so neighbours cannot hide its owner-attached heart',()=>{
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../ui.css'),'utf8');
 assert.match(css,/#pet \.companion-chip-small\[data-relationship-state="positive"\]\s*\{\s*z-index:1\s*\}/);
 assert.doesNotMatch(css,/#pet \.companion-chip-small\[data-relationship-state="(?:normal|lonely)"\]\s*\{\s*z-index:/);
});
test('only partner positive heart grows 1.2 times; anchor keeps face gap and stage bounds',()=>{
 for(const width of [32,52,64,90])for(const kind of ['partner','companion'])for(const state of ['normal','lonely','positive']){
  const before=state==='positive'?Math.max(16,Math.min(26,width*.4)):Math.max(10,Math.min(15,width*.22));
  const size=R.heartSize(kind,state,width);
  assert.equal(size,before*(kind==='partner'&&state==='positive'?1.2:1));
  assert.equal(R.heartSize(kind,state,width,1),size,'retired comparison argument cannot change approved size');
  for(const x of [0,140,280]){
   const box=R.heartAnchor({x,y:60,w:width,h:width},{width:320,height:160,size});
   assert.equal(box.y+box.h,57);assert.ok(box.x>=0&&box.x+box.w<=320);
  }
  const top=R.heartAnchor({x:5,y:18,w:width,h:width},{width:320,height:160,size});
  assert.ok(top.y>=0&&top.y+top.h<=15);
 }
});

test('approved marriage ring uses fixed scale and tone without comparison overrides',()=>{
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../ui.css'),'utf8');
 const rule=css.match(/#pet \.partner-ring \{([^}]+)\}/)[1];
 assert.match(rule,/transform:scale\(1\.2\)/);
 assert.match(rule,/filter:saturate\(\.25\) brightness\(1\.18\)/);
 assert.match(rule,/transform-origin:center/);
 assert.doesNotMatch(rule,/var\(/);
});
