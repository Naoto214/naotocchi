const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),window={};const source=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});const viewport=window.NaotocchiHomeViewport;
test('portrait redistribution preserves UI sizes while reaching both V17 cumulative targets',()=>{
 const p=viewport.layoutV18({width:375,height:667,left:16,headerBottom:46,controlsHeight:103});
 const header=viewport.portraitHeader({headerTop:6,titleHeight:21.59375,infoTop:49,labelsRight:193,actionsLeft:254,seasonRight:276,moneyLeft:326});
 const footer=viewport.portraitFooter(p,{contentHeight:70,safeBottom:0});
 assert.equal(header.infoTop,32.59375);assert.equal(header.titleTop,9);
 assert.equal(footer.commentTop,405);assert.equal(footer.commentHeight,76);assert.equal(footer.controlsTop,556);assert.equal(footer.controlsHeight,103);
 assert.equal(footer.metersHeight,70);assert.ok(footer.commentTop+76< footer.metersTop);assert.ok(footer.metersTop+70<footer.controlsTop);
 const frameTop=header.infoTop+40+3+42+2,frameBottom=footer.commentTop-2;
 const e={left:48.717,right:294.283,top:80,bottom:376,above:169.770632,below:11,side:84.53495,fitVertical:[[80,129.864150,9.4],[376,159.635147,10.925934]]};
 const fit=viewport.portraitPresentation({paneWidth:343,paneHeight:frameBottom-frameTop,nativeWidth:343,stageTop:0,envelope:e,count:1,edgeGap:1});
 const foot=y=>frameTop+(fit.pad+y-fit.scrollTop)*fit.scaleY;
 assert.equal(fit.bodyScale,1);assert.ok(275.923099-foot(88.480374)>=20);assert.ok(foot(376)-375.975862>=15);
 assert.ok(foot(88.480374)-130.560622>=frameTop);assert.ok(foot(376)+10.925934<=frameBottom);
});
test('portrait position reuse declines crowded header space and respects safe-area bottom',()=>{
 const args={headerTop:6,titleHeight:21.59375,infoTop:49,labelsRight:253,actionsLeft:254,seasonRight:276,moneyLeft:326};
 assert.equal(viewport.portraitHeader(args).infoTop,49);
 assert.equal(viewport.portraitHeader({...args,labelsRight:193,moneyLeft:270}).infoTop,49);
 const p=viewport.layoutV18({width:375,height:667,left:16,headerBottom:46,controlsHeight:103});
 const f=viewport.portraitFooter(p,{contentHeight:70,safeBottom:34});
 assert.equal(f.controlsTop+f.controlsHeight,633);assert.equal(f.metersHeight,70);assert.equal(f.commentHeight,76);
});
test('V18 extends only home portrait floor bounds, retaining native nav',()=>{
 const d=require('../home-production-diorama.js'),b={left:48,right:295,top:151,bottom:368};
 assert.deepEqual(d.portraitWalkingBounds(b,{region:'forest',height:380},false),b);
 assert.deepEqual(d.portraitWalkingBounds(b,{region:'home',height:380},true),b);
 assert.deepEqual(d.portraitWalkingBounds(b,{region:'home',height:380},false),{...b,top:24,bottom:376});
});
test('landscape notification lanes use actual height-fitted artwork bounds',()=>{
 const p=viewport.layoutV18({width:820,height:216,left:16,headerBottom:46,controlsHeight:72});
 assert.equal(p.artWidth,144);assert.equal(p.artLeft,(p.railLeft-8-144)/2);
 assert.equal(p.noticeHeight,42);assert.equal(p.commentHeight,76);
});
test('choice prose stays in the normal queue for 4200ms despite overlay cleanup and next notice',()=>{
 const s=fs.readFileSync('script.js','utf8'),choice=s.slice(s.indexOf('  function showHomeChoiceResult('),s.indexOf('  function prepareIndividualityPopup('));
 const queue=s.slice(s.indexOf('  function homeV11Upper('),s.indexOf('  function homeV11SpeechBlocked('));
 let now=0,serial=0,display=null;const timers=new Map(),p={upper:null,upperQueue:[],running:false};
 const context={document:{body:{dataset:{homeDisplayVersion:'18'}}},MESSAGE_DURATION_MS:4200,homeUIV11:()=>true,
  homeV11Presentation:Object.assign(()=>p,{current:p}),homeV11ClearUpper:()=>{display=null;},pageVisible:()=>true,gameActive:false,meguruActive:false,isAnyMenuOverlayOpen:()=>false,
  setTimeout(fn,ms){const id=++serial;timers.set(id,{at:now+ms,fn});return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);vm.runInContext(queue+choice+`;function showMessage(text,duration,speaker){if(homeV11Upper('message',2,duration,()=>showMessage(text,duration,speaker)))return;record(text,duration,speaker);}`,Object.assign(context,{record:(text,duration,speaker)=>{display={text,duration,speaker};}}));
 context.showHomeChoiceResult('その気持ちを、思い出にしまった。',null);
 assert.equal(p.upper.kind,'message');assert.equal(context.document.body.dataset.homeUpper,'message');assert.equal(p.upper.priority,4);
 context.showMessage('次のお知らせ',4200,null);
 // The stale overlay can be cleared without touching the ordinary message.
 assert.equal(display.text,'その気持ちを、思い出にしまった。');assert.equal(p.upperQueue.length,1);
 const advance=t=>{for(;;){const next=[...timers].filter(([,v])=>v.at<=t).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=t;};
 advance(4199);assert.equal(display.text,'その気持ちを、思い出にしまった。');
 advance(4200);assert.equal(display.text,'次のお知らせ');assert.equal(display.duration,4200);
 advance(8399);assert.equal(display.text,'次のお知らせ');advance(8400);assert.equal(display,null);
});
test('176px landscape stacks the existing information, meters and unchanged controls',()=>{
 const p=viewport.layoutV18({width:820,height:176,left:26,headerBottom:46,controlsHeight:72});
 assert.equal(p.metersTop,49);assert.equal(p.metersHeight,48);assert.equal(p.controlsTop,100);assert.equal(p.controlsHeight,72);
 assert.ok(p.metersTop+p.metersHeight<p.controlsTop);assert.ok(p.controlsTop+p.controlsHeight<=176);
});
test('compact CSS follows the same visual-viewport decision as geometry',()=>{
 const css=fs.readFileSync('home-production-layout.css','utf8');
 assert.ok(!css.includes('max-height:199px'));assert.match(css,/data-home-compact-v18="true"/);
 assert.match(source,/if\(v18&&p.landscape&&p.compact\)doc.body.dataset.homeCompactV18='true'/);
 assert.match(source,/function restore\(\)\{delete doc.body.dataset.homeCompactV18/);
});
test('landscape safe area moves only controls and meters by the missing clearance',()=>{
 for(const [height,safeBottom,delta] of [[390,21,13],[390,0,0],[390,8,0],[390,9,1],[176,21,17]]){
  const args={width:844,height,left:59,headerBottom:46,controlsHeight:72,offsetTop:7};
  const before=viewport.layoutV18(args),after=viewport.layoutV18({...args,safeBottom});
  assert.equal(after.controlsTop,before.controlsTop-delta);
  assert.equal(after.metersTop,before.metersTop-delta);
  assert.ok(after.controlsTop+after.controlsHeight<=7+height-safeBottom);
  for(const key of Object.keys(before))if(!['controlsTop','metersTop'].includes(key))assert.deepEqual(after[key],before[key],key);
 }
 const portrait={width:390,height:844,left:16,headerBottom:46,controlsHeight:103};
 assert.deepEqual(viewport.layoutV18({...portrait,safeBottom:34}),viewport.layoutV18(portrait));
});
