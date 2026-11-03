const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},source=fs.readFileSync('home-production-touch.js','utf8');
vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});
test('portrait uses the maximum uniform fit of a fixed paint envelope without compounding crowd size',()=>{
 const fit=window.NaotocchiHomeViewport.portraitFit;assert.equal(typeof fit,'function');
 for(const paneHeight of [155,254,430])for(const envelope of [{top:20,bottom:400},{top:60,bottom:380}]){
  const input={paneWidth:343,paneHeight,nativeWidth:343,stageTop:134,stageHeight:380,envelope};
  const p=fit(input),expected=Math.min(1,paneHeight/(envelope.bottom-envelope.top));
  assert.ok(Math.abs(p.scale-expected)<1e-9);
  assert.ok((134+envelope.top+p.pad-p.scrollTop)*p.scale>=-1e-8);
  assert.ok((134+envelope.bottom+p.pad-p.scrollTop)*p.scale<=paneHeight+1e-8);
  assert.deepEqual(fit(input),p);
  const t={x:16,y:136,scale:p.scale},a=window.NaotocchiHomeViewport.unscalePoint({x:16,y:136},t),b=window.NaotocchiHomeViewport.unscalePoint({x:16+120*p.scale,y:136+200*p.scale},t);
  assert.ok(Math.abs(b.x-a.x-120)<1e-9);assert.ok(Math.abs(b.y-a.y-200)<1e-9);
 }
});
