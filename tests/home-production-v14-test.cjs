const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},source=fs.readFileSync('home-production-touch.js','utf8');
vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});
const api=window.NaotocchiHomeViewport;
test('V14 reserves a full-height artwork before the existing landscape rail',()=>{
 const args={width:568,height:320,left:16,headerBottom:40,controlsHeight:72};
 assert.equal(typeof api.layoutV14,'function');
 const p=api.layoutV14(args),old=api.layoutV12(args);
 assert.ok(p.railLeft-8>=args.height/1.5);
 assert.equal(p.nativeFrameWidth,old.frameWidth,'native simulation width stays unchanged');
 assert.equal(p.controlsTop,old.controlsTop);assert.equal(p.commentTop,old.commentTop);
 const t=api.landscapePresentation({paneWidth:p.frameWidth,paneHeight:p.frameHeight,nativeWidth:320,nativeHeight:709,stageTop:134,stageHeight:380,frameLeft:16,hostWidth:16+p.frameWidth,hostHeight:320,count:1,fullHeight:true});
 assert.equal(t.art.height,320);assert.equal(t.art.top,0);
 assert.ok(Math.abs((134+t.pad+380-320*1.5*.94-t.scrollTop)*t.scaleY)<1e-8);
});
test('V14 portrait uses actual depth bounds while retaining the V13 body scale',()=>{
 const envelope={left:50,right:293,top:210,bottom:368,above:140,below:12,side:55};
 const args={paneWidth:343,paneHeight:254,nativeWidth:343,stageTop:134,count:1,envelope};
 const old=api.portraitPresentation(args);
 const vertical=[[210,100,8],[290,120,10],[368,140,12]];
 const p=api.portraitPresentation({...args,envelope:{...envelope,vertical}});
 assert.equal(p.bodyScale,old.bodyScale);assert.equal(p.scaleX,old.scaleX);
 assert.ok(p.scaleY>old.scaleY+.15,'recover the excess far-depth reservation');
 const bounds=vertical.map(([y,up,down])=>[(134+p.pad+y-p.scrollTop)*p.scaleY-up*p.bodyScale,(134+p.pad+y-p.scrollTop)*p.scaleY+down*p.bodyScale]);
 assert.ok(Math.abs(Math.min(...bounds.map(b=>b[0]))-3)<1e-5);
 assert.ok(Math.abs(Math.max(...bounds.map(b=>b[1]))-251)<1e-5);
 for(const b of bounds){assert.ok(b[0]>=3-1e-5);assert.ok(b[1]<=251+1e-5);}
 const shrink=api.portraitPresentation({...args,count:3,reserveBodyScale:1,envelope:{...envelope,vertical}});
 for(const [y,up,down]of vertical)for(const size of [1,.98,.92]){
  const foot=(134+shrink.pad+y-shrink.scrollTop)*shrink.scaleY;
  assert.ok(foot-up*size>=3-1e-5);assert.ok(foot+down*size<=251+1e-5);
 }
});
test('V14 landscape paints exactly one full-height image without blur or repeated margins',async()=>{
 const {createHomeWorld}=await import('../home-production-world.mjs');
 for(const [width,height]of [[410,280],[213.34,320]]){
  const contexts=[];const canvas=()=>{const calls=[],ctx={drawImage:(...a)=>calls.push(a),setTransform(){},fillRect(){},save(){},restore(){}};contexts.push({calls,ctx});return {style:{},getContext:()=>ctx,remove(){}};};
  const host={left:0,top:0,width,height},stage={left:16,top:134,width:343,height:380};
  const container={appendChild(){},getBoundingClientRect:()=>host};
  const doc={body:{dataset:{homeViewportVersion:'12',homeTinyOverview:'true',homeDisplayVersion:'14'},style:{setProperty(){}}},
   createElement:tag=>tag==='canvas'?canvas():{style:{},dataset:{}}, getElementById:()=>({getBoundingClientRect:()=>stage})};
  class Image{set src(v){this.onload();}}
  const world=createHomeWorld({container,document:doc,window:{Image,devicePixelRatio:1,NaotocchiHomeViewport:{residentPresentation:()=>({landscape:true})}}});
  world.setEnvironment({region:'home',time:'day',weather:'sunny'});world.draw(0,{reducedMotion:true});
  const paints=contexts[0].calls;
  assert.equal(paints.length,1,'no duplicate background');
  assert.equal(contexts[0].ctx.filter,undefined,'no blur');
  const [,x,y,w,h]=paints[0];assert.equal(y,0);assert.equal(h,height);
  assert.ok(Math.abs(h/w-1.5)<1e-8);assert.ok(x>=0);assert.ok(x+w<=width+.001);
 }
});
test('snail invitation exposes identity and retains both original choice flows',()=>{
 const {harness}=require('./helpers/runtime-harness.cjs');
 const h=harness({homeDiorama:true,productionHome:true}),s=h.api.state();
 Object.assign(s,{stage:'growing',speciesLine:'dog',stageIndex:1,isSleeping:false,isSick:false,companions:[],partner:null,transformOptions:null});
 h.document.body.dataset.homeDisplayVersion='14';
 h.get('lifeCardOverlay').classList.add('hidden');
 s.items.c_friend=3;
 h.api.useConsumableItem('c_friend');h.api.resolvePickerSelection('snail');
 const overlay=h.get('companionInviteOverlay');
 assert.equal(overlay.dataset.companionId,'snail');assert.equal(overlay.classList.contains('hidden'),false);
 assert.equal(h.get('device').dataset.homeFixed,'true','snail must not restore the old composited backdrop');
 assert.equal(h.api.homeDioramaBlocked(),true);assert.match(h.get('companionInviteFlavor').textContent,/まだとなりにいる/);
 h.dispatch(h.get('companionInviteLaterBtn'),'click');assert.equal(overlay.classList.contains('hidden'),true);assert.equal(h.api.pendingCompanion(),null);
 h.api.useConsumableItem('c_friend');h.api.resolvePickerSelection('cat_friend');
 assert.equal(overlay.dataset.companionId,'cat_friend','transparent styling must not leak to the next visitor');
 assert.equal(h.get('device').dataset.homeFixed,'false','other invitation presentation stays unchanged');
 h.dispatch(h.get('companionInviteLaterBtn'),'click');
 h.api.useConsumableItem('c_friend');h.api.resolvePickerSelection('snail');
 h.dispatch(h.get('companionInvitePlayBtn'),'click');
 assert.equal(overlay.classList.contains('hidden'),true);assert.equal(h.api.pendingCompanion(),'snail');
 assert.equal(h.get('screenGame').classList.contains('hidden'),false);
});
test('V14 depth envelope covers continuous sea and jungle boundaries between 8px samples',async()=>{
 const {residentInkBand}=require('../home-production-diorama.js');
 assert.equal(typeof residentInkBand,'function');
 const {selectRecoveredScene}=await import('../home-production-manifest.mjs'),{createRecoveredNavigation}=await import('../home-recovered-navigation.mjs');
 for(const region of ['sea','jungle']){
 const navigation=createRecoveredNavigation(selectRecoveredScene(region),{width:361,height:514},{left:0,top:134,width:361,height:380});
 const b={left:68.1,right:292.9,top:160.9,bottom:368},up=184.8423,down=8,vertical=[];
 for(let y=b.top;y<=b.bottom;y+=8)for(let x=b.left;x<=b.right;x+=8)if(navigation.valid({x,y}))vertical.push(...residentInkBand({x,y,top:b.top,bottom:b.bottom,up,down},navigation));
 const envelope={left:b.left,right:b.right,top:Math.min(...vertical.map(p=>p[0])),bottom:Math.max(...vertical.map(p=>p[0])),above:up*1.2+5,below:down*1.2+3,side:70,vertical};
 const p=api.portraitPresentation({paneWidth:361,paneHeight:430,nativeWidth:361,stageTop:134,envelope,count:1});
 if(region==='sea')assert.equal(navigation.valid({x:255.1,y:233.9}),true);
 let checked=0;
 for(let y=b.top;y<=b.bottom;y+=.5)for(let x=b.left;x<=b.right;x+=4){
  const point={x,y};if(!navigation.valid(point))continue;checked++;
  const foot=(134+p.pad+y-p.scrollTop)*p.scaleY,depth=navigation.depthScale(point)*p.bodyScale;
  assert.ok(foot-up*depth>=3,region+' top: '+(foot-up*depth));
  assert.ok(foot+down*depth<=427,region+' bottom: '+(foot+down*depth));
 }
 assert.ok(checked>1000);
 }
});
test('V14 publishes depth-aware bounds from the same actors without changing saved state',()=>{
 const {harness}=require('./helpers/runtime-harness.cjs'),h=harness({homeDiorama:true,productionHome:true,worldScene:true}),s=h.api.state();
 h.document.body.dataset.homeViewportVersion='12';h.document.body.dataset.homeDisplayVersion='14';
 Object.assign(s,{stage:'growing',speciesLine:'dog',regionId:'home',isSleeping:false,isSick:false});
 for(const id of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(id).classList.add('hidden');
 h.get('screenNormal').classList.remove('hidden');s.companions=[];s.partner=null;
 const before=JSON.stringify(s);h.api.render();
 const e=h.get('castStage').__homeResidentEnvelope;
 assert.ok(e?.vertical?.length>2,'renderer publishes the depth envelope');
 assert.equal(e.count,1);assert.equal(JSON.stringify(s),before);
 for(const [y,up,down]of e.vertical){assert.ok(y>=e.top&&y<=e.bottom);assert.ok(up<=e.above&&down<=e.below);}
});
