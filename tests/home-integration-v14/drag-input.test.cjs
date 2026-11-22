const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');

const controller=fs.readFileSync(path.join(__dirname,'../../home-production-diorama.js'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'../../script.js'),'utf8');
function section(src,a,b){
  const start=src.indexOf(a),end=src.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'missing native section '+a);
  return src.slice(start,end);
}
const productionGate=section(game,'  function homeDioramaBlocked(','  window.addEventListener');
function gate(states={}){
  const visible={classList:{contains:()=>false}},hidden={classList:{contains:n=>n==='hidden'}};
  const context={document:{body:{dataset:{homeProduction:'true',homeViewportVersion:'12'},classList:{contains:()=>false}},visibilityState:'visible'},
    speechActive:false,individualityDialogOpen:false,conv2Unit:null,birthCelebration:null,gameActive:false,meguruActive:false,
    isAnyMenuOverlayOpen:()=>false,state:{},homeV11Presentation:()=>({lowerUntil:0}),
    el:{speechBubble:{dataset:{}},lifeCardOverlay:hidden,storyFlash:hidden,screenNormal:visible,castResponse:{dataset:{}}},
    homeCastActors:()=>[],conversationIsBusy:()=>false,...states};
  return vm.runInNewContext(productionGate+';homeDioramaBlocked',context);
}
test('only passive lower-lane notices and bounce can accept a direct touch during an ordinary home pause',()=>{
  for(const state of [{homeV11Presentation:()=>({lowerUntil:Infinity})},{homeCastActors:()=>[{node:{dataset:{reaction:'bounce'}}}]}]){
    const blocked=gate(state);assert.equal(blocked(),true);assert.equal(blocked(true),false);
  }
  const hard=[{birthCelebration:{}},{gameActive:true},{meguruActive:true},{individualityDialogOpen:true},
    {conv2Unit:{kind:'answer'}},{isAnyMenuOverlayOpen:()=>true},...['isSick','isSleeping','dying','transformOptions'].map(k=>({state:{[k]:true}})),
    {homeCastActors:()=>[{node:{dataset:{reaction:'shake'}}}]}];
  for(const state of hard){const blocked=gate({...state,homeV11Presentation:()=>({lowerUntil:Infinity})});assert.equal(blocked(true),true);}
  for(const reaction of ['bounce','clean','positive']){
    for(const overlayOpen of [false,true]){
      const blocked=gate({isAnyMenuOverlayOpen:()=>overlayOpen,el:{speechBubble:{dataset:{}},castResponse:{dataset:{reaction}},
        lifeCardOverlay:{classList:{contains:()=>true}},screenNormal:{classList:{contains:()=>false}}}});
      assert.equal(blocked(),true);assert.equal(blocked(true),overlayOpen||reaction!=='bounce');
    }
  }
});

function inputs(){
  const origin={},calls=[],selected={value:null},mode={value:'soft'},clock={value:0};
  const actor={key:'friend',kind:'companion',id:'friend',x:34,y:45},marker={hidden:true,style:{}};
  const state={enabled:true,pendingResidentPresentation:false,doc:{visibilityState:'visible'},flags:{},sceneKey:'forest',
    scene:{navigation:{}},env:{performance:{now:()=>clock.value}},
    point:e=>({x:e.clientX,y:e.clientY}),hit:(p,el)=>el===origin?'friend':null,rows:new Map([['friend',{owner:origin}]]),
    marker,stage:{setPointerCapture(){},releasePointerCapture(){}},onGesture:()=>{},selectedLabel:{animate(){}},
    guide:{visible:()=>false,drag(){}},showGuide(){},paint(){},resume(){},media:{matches:false},
    isBlocked:direct=>mode.value==='hard'||(mode.value==='soft'&&!direct),
    model:{snapshot:()=>[actor],bounds:()=>({left:0,right:150,top:0,bottom:150}),selected:()=>selected.value,
      select:key=>{selected.value=key;calls.push(['select',key]);return true;},move:(key,p,source)=>{calls.push([source,key,p.x,p.y]);return true;},cancel(){}}};
  const code='let gesture=null,waitingDrop=null,refusedDrop=null,guideWalk=null,wasBlocked=false;'+
    section(controller,'    const blocked=','    function clearStage(')+
    section(controller,'    function down(e){','    function keydown(e){')+
    section(controller,'    function cancelPointer(e){','    const listeners=')+
    ';({down,move,up,service:serviceWaitingDrop,cancel:clearInput,applyHomeBlock,cancelPointer,lostCapture,freshInput,paintMarker:a=>paintDropMarker(a,[a])})';
  const handlers=vm.runInNewContext(code,state);
  const pointer=(x,trusted=true)=>({clientX:x,clientY:45,button:0,isPrimary:true,isTrusted:trusted,pointerId:1,target:origin,preventDefault(){this.prevented=true;}});
  return {calls,mode,state,clock,handlers,pointer,marker};
}
test('a trusted drag released during a soft pause reaches the same actor and exact point once the game is ready',()=>{
  const h=inputs(),{down,move,up,service}=h.handlers;
  down(h.pointer(34));move(h.pointer(46));up(h.pointer(46));
  assert.equal(h.marker.hidden,false);assert.deepEqual(h.calls,[]);
  service();assert.deepEqual(h.calls,[]);
  h.mode.value='open';h.clock.value=150;service();service();
  assert.deepEqual(h.calls,[['select','friend'],['drag','friend',46,45]]);
});
test('a soft-blocked tap remains a tap and a synthetic soft gesture does not queue a move',()=>{
  for(const [dx,trusted] of [[5,true],[12,false]]){
    const h=inputs(),press=h.pointer(34,trusted),release=h.pointer(34+dx,trusted);
    h.handlers.down(press);h.handlers.up(release);h.mode.value='open';h.handlers.service();
    assert.equal(!!press.prevented,false);assert.equal(!!release.prevented,false);assert.deepEqual(h.calls,[]);
  }
});
test('hard blockers, pause, hidden state, expiry, a new tap or a substituted resident cancel an acknowledged intent',()=>{
  for(const reason of ['hard','paused','hidden','expired','tap','owner','scene','cancel']){
    const h=inputs(),{down,up,service,cancel}=h.handlers;
    down(h.pointer(34));up(h.pointer(48));assert.equal(h.marker.hidden,false);
    if(reason==='hard')h.mode.value='hard';
    else if(reason==='paused')h.state.flags.paused=true;
    else if(reason==='hidden')h.state.doc.visibilityState='hidden';
    else if(reason==='expired')h.clock.value=3000;
    else if(reason==='tap'){down(h.pointer(34));up(h.pointer(34));}
    else if(reason==='owner')h.state.rows.set('friend',{owner:{}});
    else if(reason==='scene')h.state.scene.navigation={};
    else cancel();
    service();h.mode.value='open';h.state.flags.paused=false;h.state.doc.visibilityState='visible';service();
    assert.deepEqual(h.calls,[],reason);
  }
});
test('a notice that starts during a real drag holds it through the native pause transition',()=>{
  const h=inputs(),{down,up,applyHomeBlock,service}=h.handlers;
  h.mode.value='open';down(h.pointer(34));assert.deepEqual(h.calls,[['select','friend']]);
  h.mode.value='soft';applyHomeBlock(true);up(h.pointer(52));
  assert.equal(h.marker.hidden,false);assert.deepEqual(h.calls,[['select','friend']]);
  h.mode.value='open';applyHomeBlock(false);service();
  assert.deepEqual(h.calls.at(-1),['drag','friend',52,45]);
});
test('normal taps select on press, 8px is a drag and a refused drop requests a gentle actor reaction',()=>{
  const h=inputs();h.mode.value='open';
  h.state.model.move=(key,p,source)=>{h.calls.push([source,key,p.x,p.y]);return false;};
  h.state.onGesture=(a,mood)=>h.calls.push(['gesture',a.key,mood]);
  h.handlers.down(h.pointer(34));assert.deepEqual(h.calls,[['select','friend']]);
  h.handlers.up(h.pointer(41));assert.deepEqual(h.calls,[['select','friend']]);
  h.handlers.down(h.pointer(34));h.handlers.up(h.pointer(42));
  assert.deepEqual(h.calls.slice(-2),[['drag','friend',42,45],['gesture','friend','curious']]);
});
test('a canceled held pointer or an input elsewhere cannot deliver a late command',()=>{
  for(const reason of ['cancel during hold','new input after release']){
    const h=inputs(),{down,move,up,service,cancelPointer,freshInput}=h.handlers;
    down(h.pointer(34));move(h.pointer(51));
    if(reason==='cancel during hold')cancelPointer(h.pointer(51));
    up(h.pointer(51));
    if(reason==='new input after release')freshInput();
    h.mode.value='open';service();assert.deepEqual(h.calls,[]);
  }
});
test('an unrouteable foot keeps the clamped, stationary ring for 480ms and yields to live targets and new input',()=>{
  for(const stop of ['timeout','accepted','new input','interruption']){
    const h=inputs(),{down,up,paintMarker,freshInput,cancel}=h.handlers;h.mode.value='open';
    h.state.model.move=()=>false;
    down(h.pointer(34));up(h.pointer(180));
    const actor={...h.state.model.snapshot()[0],target:null};
    h.clock.value=400;paintMarker(actor);
    assert.equal(h.marker.hidden,false);assert.deepEqual(h.marker.style,{left:'150px',top:'45px'});
    if(stop==='accepted')actor.target={x:92,y:45};
    if(stop==='new input')freshInput();
    if(stop==='timeout')h.clock.value=480;
    if(stop==='interruption')cancel();
    paintMarker(actor);
    assert.equal(h.marker.hidden,stop!=='accepted',stop);
    if(stop==='accepted')assert.equal(h.marker.style.left,'92px');
  }
});
test('a sprite-to-stage pointer capture transfer preserves the gesture and an actual stage loss cancels it',()=>{
  for(const isTransfer of [true,false]){
    const h=inputs(),{down,move,up,lostCapture,service}=h.handlers;
    h.state.stage.hasPointerCapture=()=>isTransfer;
    down(h.pointer(34));move(h.pointer(44));
    lostCapture({pointerId:1,target:isTransfer?{}:h.state.stage});
    move(h.pointer(48));up(h.pointer(50));h.mode.value='open';service();
    assert.deepEqual(h.calls,isTransfer?[['select','friend'],['drag','friend',50,45]]:[]);
  }
});
