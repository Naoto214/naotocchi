const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');

test('current layout stability tolerates only subpixel browser rounding',()=>{
 const {assertStableRect}=require('./helpers/home-production-current-browser.cjs');
 const before={x:9,y:138,left:9,top:138,right:310.99365234375,width:301.99365234375,bottom:303.9997863769531,height:165.99978637695312};
 const rounded={...before,bottom:303.9996643066406,height:165.99966430664062};
 assert.doesNotThrow(()=>assertStableRect(rounded,before,'observed Chromium rounding'));
 for(const key of Object.keys(before)){
  assert.throws(()=>assertStableRect({...before,[key]:before[key]+.1},before,key),/layout moved/);
  assert.throws(()=>assertStableRect({...before,[key]:NaN},before,key),/layout moved/);
 }
});

test('historical production fixtures select one layout while the current entry preserves the shipped body',()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'home-production-fixtures-'));
 const source=fs.readFileSync('index.html','utf8'),body=html=>html.match(/<body\b[^>]*>/)[0];
 try{
  cp.execFileSync(process.execPath,['tools/home-production-qa.cjs',out]);
  assert.equal(body(fs.readFileSync(path.join(out,'current-production-qa.html'),'utf8')),body(source),'the region/input generator also emits the current production entry');
  assert.doesNotMatch(body(fs.readFileSync(path.join(out,'release-qa.html'),'utf8')),/data-home-(?:viewport|display)-version=/,'historical release entry stays explicit');
  cp.execFileSync(process.execPath,['tools/home-production-v7-qa.cjs',out]);
  assert.doesNotMatch(body(fs.readFileSync(path.join(out,'v7-qa.html'),'utf8')),/data-home-(?:viewport|display)-version=/,'V7 must not inherit the shipped V18 layout');
  assert.equal(body(fs.readFileSync(path.join(out,'current-production-qa.html'),'utf8')),body(source),'current production keeps the exact shipped layout flags');
  for(const version of [8,9,10]){
   cp.execFileSync(process.execPath,[`tools/home-production-v${version}-qa.cjs`,out]);
   const html=fs.readFileSync(path.join(out,`v${version}-qa.html`),'utf8'),tag=body(html);
   assert.deepEqual([...tag.matchAll(/data-home-viewport-version="([^"]+)"/g)].map(m=>m[1]),[String(version)],'one explicit historical viewport');
   assert.doesNotMatch(tag,/data-home-display-version=/,'no modern display geometry in historical viewport');
   assert.equal(body(fs.readFileSync(path.join(out,'current-production-qa.html'),'utf8')),body(source));
  }
  assert.equal(fs.readFileSync('index.html','utf8'),source,'generators never alter the shipped entry');
 }finally{fs.rmSync(out,{recursive:true,force:true});}
});

test('physical pointer targets account for current presentation scale and independent resident size',()=>{
 const vm=require('node:vm'),select=fs.readFileSync('tests/helpers/home-production-pointer-target.cjs','utf8');
 const actor={key:'pet:dog',x:100,y:100,w:20,h:40},bounds={left:100,right:160,top:100,bottom:104};
 const stage={contains:()=>false},native={left:30,top:60};
 for(const current of [false,true]){
  const context={module:{exports:{}},performance:{now:()=>0},window:{NaotocchiHomeViewport:current?{
   residentPresentation:()=>({x:10,y:20,scaleX:.5,scaleY:.25,bodyScale:1}),presentationRect:()=>native
  }:undefined},document:{getElementById:()=>stage,elementFromPoint:()=>stage,querySelector:()=>({getBoundingClientRect:()=>({left:0,top:0,right:500,bottom:500})})},
  HomeReleaseQA:{detail:()=>({actors:[actor],slots:{castStage:current?{x:20,y:30}:{x:30,y:60}}}),inspect:()=>({bounds:[bounds],scene:{visible:()=>true,navigation:{valid:()=>true,route:(_,p)=>[p]}}})}};
  vm.runInNewContext(select,context);
  for(const kind of ['tap','drag']){
   const target=context.module.exports(kind);
   // Current ground: (10+(30+148-10)/2, 20+(60+100-20)/4).
   // Body height stays 40px, independent of the quarter-height world.
   assert.deepEqual(JSON.parse(JSON.stringify(target.p)),{x:148,y:100});
   assert.deepEqual(JSON.parse(JSON.stringify(target.from)),current?{x:70,y:39}:{x:130,y:144});
   assert.deepEqual(JSON.parse(JSON.stringify(target.to)),current?{x:94,y:55}:{x:178,y:160});
  }
 }
});
