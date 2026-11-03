const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},source=fs.readFileSync('home-production-touch.js','utf8');
vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});
const api=window.NaotocchiHomeViewport;
test('V13 separates body size from foot-space fitting and fills the safe portrait pane',()=>{
 assert.equal(typeof api.portraitPresentation,'function');
 const envelope={left:50,right:293,top:210,bottom:368,above:112,below:8,side:45};
 for(const paneHeight of [155,254,430]){
  const p=api.portraitPresentation({paneWidth:343,paneHeight,stageTop:134,nativeWidth:343,envelope,count:1});
  assert.ok(p.bodyScale>=.9,'single resident retains almost native size');
  const top=(134+p.pad+envelope.top-p.scrollTop)*p.scaleY-envelope.above*p.bodyScale;
  const bottom=(134+p.pad+envelope.bottom-p.scrollTop)*p.scaleY+envelope.below*p.bodyScale;
  assert.ok(Math.abs(top-3)<.01);assert.ok(Math.abs(bottom-(paneHeight-3))<.01);
  const left=(p.inset+envelope.left)*p.scaleX-envelope.side*p.bodyScale;
  const right=(p.inset+envelope.right)*p.scaleX+envelope.side*p.bodyScale;
  assert.ok(Math.abs(left-3)<.01);assert.ok(Math.abs(right-(343-3))<.01);
 }
});
test('V13 count bands reduce body size without changing artwork',()=>{
 assert.equal(typeof api.residentScale,'function');
 const sizes=[1,2,3,5,6,10,11,18,19,28].map(api.residentScale);
 assert.equal(sizes[0],sizes[1]);assert.ok(sizes[0]>=.95);
 for(let i=1;i<sizes.length;i++)assert.ok(sizes[i]<=sizes[i-1]);
 assert.ok(sizes[0]>sizes.at(-1));
});
test('V13 anisotropic foot presentation has an exact inverse for pointer input',()=>{
 const t={x:16,y:136,scale:1,scaleX:1.2,scaleY:.4};
 const p=api.unscalePoint({x:16+120*1.2,y:136+200*.4},t);
 assert.equal(p.x,136);assert.equal(p.y,336);
});
test('V13 landscape aligns the native artwork to a complete unstretched image',()=>{
 assert.equal(typeof api.landscapePresentation,'function');
 for(const [paneWidth,paneHeight,nativeWidth]of [[384,272,672],[187.2,312,480]]){
  const p=api.landscapePresentation({paneWidth,paneHeight,nativeWidth,nativeHeight:530,stageTop:80,stageHeight:380,frameLeft:26,hostWidth:paneWidth+26,hostHeight:paneHeight+8,count:1});
  const imageTop=(80+p.pad+380-nativeWidth*1.5*.94-p.scrollTop)*p.scaleY;
  const imageLeft=26+p.inset*p.scaleX;
  assert.ok(Math.abs(imageTop-p.art.top)<1e-8);assert.ok(Math.abs(imageLeft-p.art.left)<1e-8);
  assert.ok(p.art.top>=0&&p.art.left>=0);
  assert.ok(p.art.top+p.art.height<=paneHeight+8+1e-8);
  assert.ok(p.art.left+p.art.width<=paneWidth+26+1e-8);
  assert.equal(p.scaleX,p.scaleY);assert.ok(Math.abs(p.art.height/p.art.width-1.5)<1e-12);
  assert.ok(p.bodyScale>p.scaleX,'small casts enlarged separately');
 }
});
test('V13 reserves the prior body during a shrink transition, so edge marks remain inside',()=>{
 const e={left:50,right:293,top:210,bottom:368,above:112,below:8,side:45};
 const p=api.portraitPresentation({paneWidth:343,paneHeight:254,nativeWidth:343,stageTop:134,envelope:e,count:3,reserveBodyScale:1});
 for(const body of [1,.98,.95,.92]){
  const top=(134+p.pad+e.top-p.scrollTop)*p.scaleY-e.above*body;
  const bottom=(134+p.pad+e.bottom-p.scrollTop)*p.scaleY+e.below*body;
  assert.ok(top>=3-1e-8);assert.ok(bottom<=251+1e-8);
 }
 assert.equal(p.bodyScale,.92);
});
test('V13 controller publishes the actual resident count without changing save state',()=>{
 const {harness}=require('./helpers/runtime-harness.cjs'),h=harness({homeDiorama:true,productionHome:true,worldScene:true}),s=h.api.state();
 h.document.body.dataset.homeViewportVersion='12';h.document.body.dataset.homeDisplayVersion='13';
 Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'home',isSleeping:false,isSick:false});
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.get('screenNormal').classList.remove('hidden');
 for(const count of [2,3,2]){
  s.companions=h.api.normalCompanions.slice(0,count-1).map(c=>({id:c.id,bond:80}));s.partner=null;
  const before=JSON.stringify(s);h.api.render();
  assert.equal(h.get('castStage').__homeResidentEnvelope.count,count);
  assert.equal(JSON.stringify(s),before);
 }
});
