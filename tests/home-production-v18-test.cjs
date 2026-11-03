const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),window={};const source=fs.readFileSync('home-production-touch.js','utf8');vm.runInNewContext(source.slice(source.indexOf('/* V8 viewport:')),{window});const viewport=window.NaotocchiHomeViewport;
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
