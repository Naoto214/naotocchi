const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},source=fs.readFileSync('home-production-touch.js','utf8');
vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});
test('landscape overview retains the complete 2:3 artwork and native stage in the fixed pane',()=>{
 const api=window.NaotocchiHomeViewport;
 assert.equal(typeof api.landscapeOverview,'function');
 for(const [paneWidth,paneHeight,nativeWidth]of [[187.2,312,320],[384,272,672]]){
  const p=api.landscapeOverview({paneWidth,paneHeight,nativeWidth,nativeHeight:530,stageTop:80,stageHeight:380});
  const artTop=80+p.pad+380-nativeWidth*1.5*.94;
  assert.ok(artTop>=-1e-8);
  assert.ok((artTop+nativeWidth*1.5)*p.scale<=paneHeight+1e-8);
  assert.ok((80+p.pad+380)*p.scale<=paneHeight);
  assert.ok(Math.abs(p.viewWidth*p.scale-paneWidth)<1e-8);
  assert.ok(Math.abs(p.viewHeight*p.scale-paneHeight)<1e-8);
  const t={x:16,y:0,scale:p.scale};
  const stage=api.unscalePoint({x:16+p.inset*p.scale,y:(80+p.pad)*p.scale},t);
  const point=api.unscalePoint({x:16+(p.inset+150)*p.scale,y:(80+p.pad+200)*p.scale},t);
  assert.ok(Math.abs(point.x-stage.x-150)<1e-8);
  assert.ok(Math.abs(point.y-stage.y-200)<1e-8);
 }
});
