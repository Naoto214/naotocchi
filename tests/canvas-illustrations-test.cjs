const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function setup({loaded=true,resolve=emoji=>({asset:`art/${emoji}.png`})}={}) {
  const images=[], calls=[], stack=[];
  const document={createElement(tag) {
    assert.equal(tag,'img');
    const listeners=new Map();
    const image={complete:loaded,naturalWidth:loaded?128:0,naturalHeight:loaded?128:0,
      addEventListener(type,fn){listeners.set(type,fn);},
      removeEventListener(type){listeners.delete(type);},
      emit(type){this.complete=true; if(type==='load'){this.naturalWidth=128;this.naturalHeight=128;} listeners.get(type)?.();this['on'+type]?.();},
    };
    images.push(image);return image;
  }};
  const sandbox={document,setTimeout(){assert.fail('illustration loading must not schedule work');}};
  vm.createContext(sandbox);
  if(fs.existsSync('canvas-illustrations.js'))vm.runInContext(fs.readFileSync('canvas-illustrations.js','utf8'),sandbox);
  assert.equal(typeof sandbox.NaotocchiCanvasIllustrations?.create,'function','canvas illustration adapter is available');
  const art=sandbox.NaotocchiCanvasIllustrations.create({document,resolve});
  const ctx={font:'20px sans-serif',textAlign:'center',textBaseline:'middle',direction:'ltr',imageSmoothingEnabled:true,fillStyle:'#fff',
    save(){stack.push({font:this.font,textAlign:this.textAlign,textBaseline:this.textBaseline,direction:this.direction,imageSmoothingEnabled:this.imageSmoothingEnabled,fillStyle:this.fillStyle});calls.push(['save']);},
    restore(){assert.ok(stack.length,'balanced save/restore');Object.assign(this,stack.pop());calls.push(['restore']);},
    measureText(text){return {width:[...String(text)].reduce((n,c)=>n+(c==='A'?6:c==='B'?7:c===' '?3:20),0),actualBoundingBoxAscent:10,actualBoundingBoxDescent:10};},
    fillText(...args){calls.push(['fillText',...args]);},drawImage(...args){calls.push(['drawImage',...args]);if(this.failDraw)throw Error('draw failed');},
    translate(...args){calls.push(['translate',...args]);},scale(...args){calls.push(['scale',...args]);},
    fillRect(...args){calls.push(['fillRect',...args]);},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){calls.push(['fill']);},stroke(){},arc(){},
  };
  return {art,ctx,canvas:art.canvas(ctx),images,calls,stack};
}

test('ordinary text keeps native arguments and receiver with no illustration state changes',()=>{
  const {art,ctx,canvas,calls}=setup();
  canvas.fillText('AB',10,30,25);
  assert.deepEqual(calls,[['fillText','AB',10,30,25]]);
  assert.equal(art.canvas(ctx),canvas);
  assert.equal(art.canvas(canvas),canvas);
  assert.equal(ctx.textAlign,'center');
});

test('mixed text draws art in the original glyph advance and keeps center/baseline/state',()=>{
  const {ctx,canvas,images,calls,stack}=setup();
  canvas.fillText('A⭐B',100,50);
  assert.deepEqual(calls.filter(c=>c[0]==='fillText'),[['fillText','A',0,50],['fillText','B',26,50]]);
  assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',83.5,0]);
  assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',images[0],6,40,20,20]);
  assert.equal(ctx.textAlign,'center');assert.equal(ctx.textBaseline,'middle');assert.equal(ctx.imageSmoothingEnabled,true);
  assert.equal(stack.length,0);
});

test('maxWidth compresses the whole decorated run and RTL start alignment keeps the right edge',()=>{
  const {ctx,canvas,calls}=setup();ctx.textAlign='start';ctx.direction='rtl';
  canvas.fillText('⭐',100,50,10);
  assert.deepEqual(calls.find(c=>c[0]==='translate'),['translate',90,0]);
  assert.deepEqual(calls.find(c=>c[0]==='scale'),['scale',0.5,1]);
  assert.equal(ctx.textAlign,'start');assert.equal(ctx.direction,'rtl');
  calls.length=0;canvas.fillText('⭐',100,50,0);assert.equal(calls.length,0);
});

test('pending, missing and failed images never draw an emoji and settle without scheduling a canvas redraw',async()=>{
  const {art,canvas,images,calls}=setup({loaded:false});
  canvas.fillText('💣',0,0);
  assert.equal(calls.some(c=>c[0]==='fillText'),false);
  assert.equal(calls.some(c=>c[0]==='drawImage'),false);
  assert.ok(calls.some(c=>c[0]==='fill'||c[0]==='fillRect'));
  const beforeVersion=art.version, beforeCalls=calls.length;
  const prepared=art.prepare(['💣']);images[0].emit('error');await prepared;
  assert.ok(art.version>beforeVersion);assert.equal(calls.length,beforeCalls);
  calls.length=0;canvas.fillText('💣',0,0);assert.equal(calls.some(c=>c[0]==='fillText'),false);
  const missing=setup({resolve:()=>null});missing.canvas.fillText('👻',0,0);assert.equal(missing.calls.some(c=>c[0]==='fillText'),false);
});

test('loaded image replaces a pending placeholder on the next caller frame and draw errors stay contained',async()=>{
  const {art,ctx,canvas,images,calls,stack}=setup({loaded:false});
  const ready=art.prepare(['⭐']);images[0].emit('load');await ready;
  canvas.fillText('⭐',0,0);assert.ok(calls.some(c=>c[0]==='drawImage'));
  calls.length=0;ctx.failDraw=true;canvas.fillText('⭐',0,0);
  assert.equal(calls.some(c=>c[0]==='fillText'),false);assert.ok(calls.some(c=>c[0]==='fill'||c[0]==='fillRect'));
  assert.equal(stack.length,0);assert.equal(ctx.imageSmoothingEnabled,true);
});

test('atlas crops reuse supplied images and actor markers remain separate from bonus symbols',()=>{
  const atlas={complete:true,naturalWidth:1254,naturalHeight:1254};
  const seen=[];
  const {art,ctx,canvas,calls}=setup({resolve(e){seen.push(e);return e==='\uE000'?{asset:'pet.png'}:{image:atlas,frame:[20,30,40,40]};}});
  art.drawSymbol(ctx,'⭐',2,3,24);
  assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',atlas,20,30,40,40,2,3,24,24]);
  calls.length=0;canvas.fillText('\uE000⭐',0,0);
  assert.ok(seen.includes('\uE000'));assert.ok(seen.includes('⭐'));
  assert.equal(calls.some(c=>c[0]==='fillText'),false);
});

test('a malformed atlas cannot sample neighboring or absent artwork',()=>{
  const atlas={complete:true,naturalWidth:10,naturalHeight:10};
  const {art,ctx,calls}=setup({resolve:()=>({image:atlas,frame:[20,30,40,40]})});
  art.drawSymbol(ctx,'⭐',0,0,24);
  assert.equal(calls.some(c=>c[0]==='drawImage'),false);
  assert.ok(calls.some(c=>c[0]==='fillRect'));
});

test('scenery clip bounds preserve the original frame scale and transparent margins',()=>{
  const atlas={complete:true,naturalWidth:1254,naturalHeight:1254};
  const {art,ctx,calls}=setup({resolve:()=>({image:atlas,frame:[28.5,353,289,289],clipBounds:[36,357,310,638]})});
  art.drawSymbol(ctx,'🌳',10,20,144.5);
  assert.deepEqual(calls.find(c=>c[0]==='drawImage'),['drawImage',atlas,36,357,274,281,13.75,22,137,140.5]);
});

test('out-of-frame clip bounds cannot expose neighboring atlas illustrations',()=>{
  const atlas={complete:true,naturalWidth:1254,naturalHeight:1254};
  const {art,ctx,calls}=setup({resolve:()=>({image:atlas,frame:[20,30,40,40],clipBounds:[0,0,70,80]})});
  art.drawSymbol(ctx,'🌳',0,0,24);
  assert.equal(calls.some(c=>c[0]==='drawImage'),false);
  assert.ok(calls.some(c=>c[0]==='fillRect'));
});

test('ordinary copyright and registered marks keep native text while explicit emoji variants use art',async()=>{
  const seen=[];const {art,canvas,calls}=setup({resolve(e){seen.push(e);return {asset:'symbol.png'};}});
  canvas.fillText('© 2026 ®\uFE0E',10,20);
  assert.deepEqual(calls,[['fillText','© 2026 ®\uFE0E',10,20]]);
  await art.prepare('© ®\uFE0E');assert.deepEqual(seen,[]);
  calls.length=0;canvas.fillText('©\uFE0F ®\uFE0F',10,20);
  assert.deepEqual(seen,['©\uFE0F','®\uFE0F']);
  assert.deepEqual(calls.filter(c=>c[0]==='fillText').map(c=>c[1]),[' ']);
});

test('joined emoji, flags and keycaps are replaced as whole symbols',()=>{
  const seen=[];const {canvas,calls}=setup({resolve(emoji){seen.push(emoji);return {asset:'symbol.png'};}});
  canvas.fillText('🧑‍🍳🇯🇵1️⃣',0,0);
  assert.deepEqual(seen,['🧑‍🍳','🇯🇵','1️⃣']);
  assert.equal(calls.some(c=>c[0]==='fillText'),false);
});

test('tagged flags stay one complete symbol in live text and preloading',async()=>{
  const flag='🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
  const seen=[];const {art,canvas,calls}=setup({resolve(e){seen.push(e);return {asset:'flag.png'};}});
  canvas.fillText(flag,0,0);assert.deepEqual(seen,[flag]);
  assert.equal(calls.some(c=>c[0]==='fillText'),false);
  seen.length=0;await art.prepare(flag);assert.deepEqual(seen,[flag]);
});

// Run the production game with the existing input/session harness. Canvas and
// image loading are substituted; scoring, callbacks and retirement are real.
function gameFixture(id,{illustrated=true}={}) {
  const {harness}=require('./helpers/runtime-harness.cjs');
  const records=[],images=[];
  function context() {
    const calls=[],state={font:'20px sans-serif',textAlign:'left',textBaseline:'alphabetic',direction:'ltr',imageSmoothingEnabled:true,ctxRecorder:true},stack=[];
    const ctx=new Proxy(state,{get(o,k){
      if(k in o)return o[k];
      if(k==='save')return ()=>stack.push({...state});
      if(k==='restore')return ()=>{const old=stack.pop();assert.ok(old);for(const p of Object.keys(state))delete state[p];Object.assign(state,old);};
      if(k==='measureText')return t=>({width:[...String(t)].length*12,actualBoundingBoxAscent:10,actualBoundingBoxDescent:3});
      if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});
      return (...args)=>{if(k==='fillText'||k==='drawImage'||k==='fillRect')calls.push([k,...args]);};
    }});
    records.push({ctx,calls});return ctx;
  }
  const main=context(),h=harness({canvasContext:main});
  vm.runInContext('Math.random=()=>0.5',h.sandbox);
  vm.runInContext(fs.readFileSync('canvas-illustrations.js','utf8'),h.sandbox);
  h.sandbox.HTMLCanvasElement=class {static [Symbol.hasInstance](node){return node?.tagName==='CANVAS';}};
  h.sandbox.CanvasRenderingContext2D=class {static [Symbol.hasInstance](ctx){return !!ctx?.ctxRecorder;}};
  const create=h.document.createElement;
  h.document.createElement=tag=>{
    const node=create(tag);node.tagName=tag.toUpperCase();
    if(tag==='canvas'){const ctx=context();node.getContext=()=>ctx;}
    if(tag==='img'){Object.assign(node,{complete:false,naturalWidth:0,naturalHeight:0});images.push(node);}
    return node;
  };
  const art=h.sandbox.NaotocchiCanvasIllustrations.create({document:h.document,resolve:e=>({asset:`art/${e}.png`,emoji:e==='\uE000'?'🐶':e})});
  const pool=h.sandbox.installNaotocchiMinigames({canvasIllustrations:illustrated?art:undefined,
    currentSprite:()=> '🐶',ageDifficulty:()=>0.5,minigameEase:()=>0,mgDuration:ms=>ms,
    createMgCanvas:(_canvas,height)=>({ctx:main,W:300,H:typeof height==='function'?height(300):height,dpr:1}),
    clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),lerp:(a,b,t)=>a+(b-a)*t,
    SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'},
    MG_ACTION_START_GRACE_MS:800,MG_SWIPE_MIN:16,bindHeldButton:h.api.bindHeldButton,
    mgPointerPos:(_cv,e)=>({x:e.clientX||0,y:e.clientY||0,nx:(e.clientX||0)/300,ny:(e.clientY||0)/300}),
  });
  const game=pool.MINIGAMES.find(g=>g.id===id);assert.ok(game,id);h.api.startMinigame(game);
  const load=()=>{for(const im of images){Object.assign(im,{complete:true,naturalWidth:128,naturalHeight:128});for(const l of [...im.listeners])if(l.type==='load')l.fn();}};
  return {h,art,records,images,load};
}

test('slide puzzle refreshes cached art on its normal frame after loading and never after retirement',()=>{
  const {h,records,load}=gameFixture('slide-puzzle');h.advance(32);
  assert.equal(records.flatMap(r=>r.calls).some(c=>c[0]==='fillText'&&/\p{Extended_Pictographic}|\uE000/u.test(c[1])),false);
  const off=records[1];assert.ok(off);
  const before=off.calls.length;load();assert.equal(off.calls.length,before,'image loading cannot redraw');
  h.advance(32);assert.ok(off.calls.slice(before).some(c=>c[0]==='drawImage'),'the active game frame refreshes the picture');
  assert.equal(h.get('minigameOverlay').querySelector('#spScore').textContent,'手数0');
  h.api.retireMinigame();const retired=records.map(r=>r.calls.length);load();h.advance(5000);
  assert.deepEqual(records.map(r=>r.calls.length),retired);
});

test('road offscreen sprite caches replace placeholders after loading without drawing raw emoji',()=>{
  const {h,records,load}=gameFixture('p3-space');h.advance(32);
  assert.equal(records.flatMap(r=>r.calls).some(c=>c[0]==='fillText'&&/\p{Extended_Pictographic}|\uE000/u.test(c[1])),false);
  const previous=records.length;load();h.advance(32);
  assert.ok(records.length>previous,'settled illustration assets invalidate cached placeholder canvases');
  assert.ok(records.slice(previous).some(r=>r.calls.some(c=>c[0]==='drawImage')));
  h.api.retireMinigame();
});

test('illustrated road play retains input results, rewards and completion timing',()=>{
  function play(illustrated) {
    const {h,load}=gameFixture('p3-space',{illustrated}),view=h.get('minigameOverlay');
    load();h.advance(900);h.dispatch(view.querySelector('#lrLeft'),'pointerdown',{pointerId:1});
    h.advance(1600);h.dispatch(view.querySelector('#lrRight'),'pointerdown',{pointerId:1});
    h.advance(25000);
    assert.equal(h.api.state().lifetime.minigamesPlayed,1);
    return {state:JSON.stringify(h.api.state()),message:h.get('message').textContent};
  }
  assert.deepEqual(play(true),play(false));
});
