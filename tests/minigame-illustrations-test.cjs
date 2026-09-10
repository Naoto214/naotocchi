const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const vm = require('node:vm');
const {harness} = require('./helpers/runtime-harness.cjs');
const atlas = require('../assets/ui/season-region-atlas-v1.json');

const themes = [
  ['stack-harvest', '🌾', 'wheat'],
  ['stack-sakura', '🌸', 'cherry_blossom'],
  ['stack-leaves', '🍁', 'maple_leaf'],
];

// The real game supplies every draw call; this recorder is not a browser and
// does not establish image appearance, font metrics, touch delivery or FPS.
function canvasRecorder() {
  const calls = [], states = [], hash = createHash('sha256');
  const styles = {imageSmoothingEnabled:true,failDraw:false};
  const ignoredEmoji = new Set(themes.map(t=>t[1]));
  const record = (name, args) => {
    if (calls.length < 10000) calls.push([name, ...args]);
    if (name !== 'drawImage' && !(name === 'fillText' && ignoredEmoji.has(args[0]))) {
      hash.update(JSON.stringify([name, ...args]) + '\n');
    }
  };
  const ctx = new Proxy(styles, {get(target, key) {
    if (key in target) return target[key];
    if (key === 'save') return () => states.push({...styles});
    if (key === 'restore') return () => {
      const previous = states.pop();
      assert.ok(previous, 'balanced Canvas save/restore');
      for (const k of Object.keys(styles)) delete styles[k];
      Object.assign(styles, previous);
    };
    if (key === 'createLinearGradient') return (...args) => {
      record(key, args); return {addColorStop:(...stops)=>record('addColorStop',stops)};
    };
    return (...args) => {
      record(key, args);
      if (key === 'drawImage' && ctx.failDraw) throw new Error('image decode unavailable');
    };
  }});
  return {ctx, calls, signature:()=>hash.digest('hex')};
}

function start(id, {loaded=true, reducedMotion=false, low=false} = {}) {
  const recorder = canvasRecorder();
  const h = harness({canvasContext:recorder.ctx,reducedMotion});
  vm.runInContext('Math.random=()=>0.5',h.sandbox);
  const image = h.document.body.children.find(el=>el.dataset.iconAtlas==='scenery');
  Object.assign(image,{complete:loaded,naturalWidth:loaded?atlas.width:0,naturalHeight:loaded?atlas.height:0});
  if (low) for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  const game = h.api.games.find(g=>g.id===id);
  assert.ok(game,id);
  h.api.startMinigame(game);
  return {h,image,...recorder};
}

for (const [id,emoji,key] of themes) test(id+' uses the existing atlas crop within the original block decoration box',()=>{
  const {h,image,calls,ctx}=start(id); h.advance(32);
  const draws=calls.filter(c=>c[0]==='drawImage');
  assert.ok(draws.length>=2,'both the standing and suspended block need an illustration');
  const [fx,fy,fw]=atlas.frames[key].frame;
  const [left,top,right,bottom]=atlas.frames[key].clipBounds;
  for(const [,actual,sx,sy,sw,sh,dx,dy,dw,dh] of draws){
    assert.equal(actual,image,'reuse the already-observed image without another loader');
    assert.deepEqual([sx,sy,sw,sh],[left,top,right-left,bottom-top]);
    const scale=15/fw;
    assert.deepEqual([dx,dy,dw,dh],[-7.5+(left-fx)*scale,1-7.5+(top-fy)*scale,sw*scale,sh*scale]);
    assert.ok(dx>=-7.5&&dx+dw<=7.5&&dy>=-6.5&&dy+dh<=8.5,'keep the full motif inside its existing 15px box');
  }
  assert.equal(calls.some(c=>c[0]==='fillText'&&c[1]===emoji),false);
  assert.equal(ctx.imageSmoothingEnabled,true,'sprite sampling must not leak into later Canvas drawing');
});

test('pending, failed, wrong-size and drawing-error atlases retain the original emoji and recover on load',()=>{
  const {h,image,calls,ctx}=start('stack-sakura',{loaded:false});
  const frame=()=>{calls.length=0;h.advance(32);return calls.filter(c=>c[0]==='fillText'&&c[1]==='🌸').length;};
  assert.ok(frame()>0,'pending image');
  Object.assign(image,{complete:true});assert.ok(frame()>0,'failed image with zero natural size');
  Object.assign(image,{naturalWidth:10,naturalHeight:10});assert.ok(frame()>0,'unexpected atlas cannot be cropped safely');
  Object.assign(image,{naturalWidth:atlas.width,naturalHeight:atlas.height});assert.equal(frame(),0,'late successful load');
  assert.ok(calls.some(c=>c[0]==='drawImage'));
  ctx.failDraw=true;assert.ok(frame()>0,'drawImage exception');
  assert.equal(ctx.imageSmoothingEnabled,true);
  ctx.failDraw=false;assert.equal(frame(),0);
  Object.assign(image,{naturalWidth:0,naturalHeight:0});assert.ok(frame()>0,'existing QA image-failure control');
  assert.equal(h.document.body.children.filter(el=>el.dataset.iconAtlas==='scenery').length,1);
});

test('unmapped stack themes keep their own symbols instead of a different illustration',()=>{
  for(const [id,emoji] of [['stack-acorn','🌰'],['stack-snowman','⚪'],['stack-themed','🥞']]){
    const {h,calls}=start(id);h.advance(32);
    assert.equal(calls.some(c=>c[0]==='drawImage'),false,id);
    assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]===emoji),id);
  }
});

test('illustrated play keeps all other Canvas commands, score, rewards and timing identical to emoji fallback',()=>{
  function play(id,loaded){
    const run=start(id,{loaded}),{h}=run;
    const view=h.get('minigameOverlay');
    // Exercise real drops and landings, then allow the original finish path.
    for(const delay of [1364,1536,1728,1872,1536]){
      h.advance(delay);h.dispatch(view.querySelector('#stDrop'),'pointerdown',{pointerId:1});
    }
    h.advance(65000);
    assert.equal(h.api.state().lifetime.minigamesPlayed,1,id+' completes once');
    const result={signature:run.signature(),state:JSON.stringify(h.api.state()),message:h.get('message').textContent};
    return result;
  }
  for(const [id] of themes) assert.deepEqual(play(id,true),play(id,false),id);
});

test('reduced motion and lightweight mode retain the motif; retirement prevents late image work',()=>{
  for(const options of [{reducedMotion:true},{low:true}]){
    const {h,image,calls}=start('stack-harvest',options);h.advance(32);
    assert.ok(calls.some(c=>c[0]==='drawImage'));
    h.api.retireMinigame();calls.length=0;
    const before=JSON.stringify(h.api.state());
    image.listeners.find(l=>l.type==='load').fn();
    image.listeners.find(l=>l.type==='error').fn();
    h.advance(5000);
    assert.equal(calls.length,0,'no image callback schedules another game frame');
    assert.equal(h.get('minigameOverlay').innerHTML,'');
    assert.equal(JSON.stringify(h.api.state()),before);
  }
});
