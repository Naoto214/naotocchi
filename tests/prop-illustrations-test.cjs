const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');

test('landscape notices gain pictures while generic birds and growth stages stay untouched',()=>{
  const h=harness(),before=JSON.stringify(h.api.state());
  assert.match(h.api.commentTextHTML('🏞️川と🏜️砂漠'),/data-prop-symbol="river"/);
  assert.match(h.api.commentTextHTML('🏞️川と🏜️砂漠'),/data-prop-symbol="desert"/);
  h.api.showStoryEvent({emoji:'🐦',message:'🐦ことりのこえ',environmentMoment:true});
  assert.match(h.get('storyFlashEmoji').innerHTML,/data-prop-symbol="bird"/);
  assert.match(h.get('storyFlashText').innerHTML,/data-prop-symbol="bird"/);
  for(const s of ['🐦とり','🐦‍🔥ひのとり','🐸後脚','🦋ようちゅう','🥚']) assert.equal(h.api.commentTextHTML(s),s);
  assert.equal(JSON.stringify(h.api.state()),before);
});

// Production game commands and input with a substituted Canvas/DOM, not pixels.
function start(id,{loaded=true,propIllustrations=true,reducedMotion=false,seed=73,constantRandom=false,low=false,ageTicks}={}){
  const calls=[],stack=[],state={imageSmoothingEnabled:true,failDraw:false};
  const ctx=new Proxy(state,{get(o,k){
    if(k in o)return o[k];
    if(k==='save')return ()=>stack.push({...state});
    if(k==='restore')return ()=>{const prev=stack.pop();assert.ok(prev);for(const p of Object.keys(state))delete state[p];Object.assign(state,prev);};
    if(k==='createLinearGradient')return ()=>({addColorStop(){}});
    return (...args)=>{if(k==='drawImage'||k==='fillText')calls.push([k,...args]);if(k==='drawImage'&&ctx.failDraw)throw Error('decode failed');};
  }});
  const h=harness({canvasContext:ctx,propIllustrations,reducedMotion});
  vm.runInContext(constantRandom?'Math.random=()=>0.5':`Math.random=(()=>{let s=${seed};return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);})()`,h.sandbox);
  if(ageTicks)h.api.state().ageTicks=ageTicks;
  if(low)for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  const create=h.document.createElement;
  h.document.createElement=(tag)=>{
    const node=create(tag);
    if(tag==='img')Object.assign(node,{complete:loaded,naturalWidth:loaded?128:0,naturalHeight:loaded?128:0});
    return node;
  };
  for(const im of h.document.body.children.filter(e=>e.dataset.iconAtlas))Object.assign(im,{complete:loaded,naturalWidth:loaded?1254:0,naturalHeight:loaded?1254:0});
  const game=h.api.games.find(g=>g.id===id);assert.ok(game);
  h.api.startMinigame(game);
  return {h,ctx,calls};
}

test('road and space props use pictures, keep the player glyph, and fall back on failed images',()=>{
  for(const id of ['road-themed','p3-space','p3-drive','road-city','road-jungle','road-desert']){
    const r=start(id);r.h.advance(1800);
    assert.ok(r.calls.some(c=>c[0]==='drawImage'),id);
    const original=r.calls.filter(c=>c[0]==='fillText').map(c=>c[1]);
    assert.ok(original.includes(id==='p3-space'?'🚀':id==='p3-drive'?'🏎️':'🐕'),id+' player preserved');
    assert.equal(r.ctx.imageSmoothingEnabled,true);
    const failed=start(id,{loaded:false});failed.h.advance(1800);
    assert.equal(failed.calls.some(c=>c[0]==='drawImage'),false,id);
    assert.ok(failed.calls.filter(c=>c[0]==='fillText').length>original.length,id+' original prop glyphs');
  }
});

test('memory cards retain hidden backs and reveal the illustration only after flipping',()=>{
  const r=start('memory-cards'),h=r.h,canvas=h.get('minigameOverlay').querySelector('#mcCanvas');
  h.advance(300);assert.equal(r.calls.some(c=>c[0]==='drawImage'),false,'no face on hidden backs');
  h.dispatch(canvas,'pointerdown',{clientX:30,clientY:30});h.advance(300);
  assert.ok(r.calls.some(c=>c[0]==='drawImage'),'opened card face');
});

test('late loading, malformed atlases and decode errors keep the original prop with no Canvas state leak',()=>{
  const r=start('p3-space',{loaded:false}),{h,ctx,calls}=r;
  assert.ok(h.api.propArt,'optional renderer is connected');
  assert.equal(h.api.propArt.draw(ctx,'☄️',4,5,24),false);
  const im=h.document.body.children.find(e=>e.dataset.propImage==='☄');assert.ok(im);
  Object.assign(im,{complete:true,naturalWidth:128,naturalHeight:128});
  assert.equal(h.api.propArt.draw(ctx,'☄️',4,5,24),true);
  assert.deepEqual(calls.at(-1).slice(2),[4,5,24,24]);
  ctx.failDraw=true;assert.equal(h.api.propArt.draw(ctx,'☄️',4,5,24),false);assert.equal(ctx.imageSmoothingEnabled,true);
  ctx.failDraw=false;assert.equal(h.api.propArt.draw(ctx,'☄️',4,5,24),true);
  assert.equal(h.document.body.children.filter(e=>e.dataset.propImage==='☄').length,1,'cache is reused');
  const atlas=h.document.body.children.find(e=>e.dataset.iconAtlas==='scenery');
  Object.assign(atlas,{complete:true,naturalWidth:10,naturalHeight:10});assert.equal(h.api.propArt.draw(ctx,'🌸',0,0,267),false);
  Object.assign(atlas,{naturalWidth:1254,naturalHeight:1254});assert.equal(h.api.propArt.draw(ctx,'🌸',0,0,267),true);
  assert.deepEqual(calls.at(-1).slice(2),[47,58,259,251,4,8,259,251],'full matching crop from stored atlas');
  assert.equal(h.api.propArt.draw(ctx,'🥚',0,0,24),false,'ambiguous egg is never a prop');
  assert.equal(h.api.propArt.draw(ctx,'🐦‍🔥',0,0,24),false,'whole ZWJ character stays intact');
  assert.equal(h.api.propArt.draw(ctx,'🌸',0,0,NaN),false);
  h.api.retireMinigame();calls.length=0;h.advance(5000);assert.equal(calls.length,0);
});

test('illustrated roads keep input, timing, score and saved rewards identical in normal, reduced and low modes',()=>{
  function play(id,propIllustrations,mode){
    const r=start(id,{propIllustrations,...mode}),h=r.h,c=h.get('minigameOverlay');
    for(const [delay,button] of [[1800,'lrLeft'],[2300,'lrRight'],[1700,'lrRight'],[2200,'lrLeft']]){
      h.advance(delay);h.dispatch(c.querySelector('#'+button),'pointerdown',{pointerId:1});
    }
    h.advance(20000);assert.equal(h.api.state().lifetime.minigamesPlayed,1);
    return {state:JSON.stringify(h.api.state()),message:h.get('message').textContent};
  }
  for(const id of ['road-themed','p3-space','p3-drive','road-city','road-jungle','road-desert']){
    for(const mode of id==='p3-space'?[{},{reducedMotion:true},{low:true}]:[{}])assert.deepEqual(play(id,true,mode),play(id,false,mode),id);
  }
});

test('all memory-card faces stay distinct and full completion keeps the same pairs, score and rewards',()=>{
  function play(propIllustrations,hard){
    const r=start('memory-cards',{propIllustrations,constantRandom:true,ageTicks:hard?1200:500}),h=r.h;
    const c=h.get('minigameOverlay'),canvas=c.querySelector('#mcCanvas'),pairs=hard?10:8;
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:300,height:hard?375:300});
    const tap=(i)=>h.dispatch(canvas,'pointerdown',{clientX:(i%4+.5)*75,clientY:(Math.floor(i/4)+.5)*75});
    h.advance(300);
    for(let i=0;i<pairs;i++){tap(i);h.advance(280);tap(i+pairs);h.advance(380);}
    assert.equal(c.querySelector('#mcPairs').textContent,`ペア${pairs}/${pairs}`);
    assert.equal(c.querySelector('#mcTries').textContent,`めくり${pairs}かい`);
    h.advance(1100);assert.equal(h.api.state().lifetime.minigamesPlayed,1);
    const art=r.calls.filter(c=>c[0]==='drawImage');
    if(propIllustrations){
      const signatures=new Set(art.map(c=>JSON.stringify([c[1].dataset.propImage||c[1].dataset.iconAtlas,...(c.length===10?c.slice(2,6):[])])));
      assert.equal(signatures.size,pairs,'each face has its own source art');
    }
    return {state:JSON.stringify(h.api.state()),message:h.get('message').textContent};
  }
  for(const hard of [false,true])assert.deepEqual(play(true,hard),play(false,hard));
});

test('other pseudo-road games keep their previous renderers and retirement cancels illustrated frames',()=>{
  for(const id of ['downhill-mountain','race-3d','grand-prix-3d']){
    const r=start(id);r.h.advance(100);assert.equal(r.calls.some(c=>c[0]==='drawImage'),false,id);
  }
  for(const options of [{},{reducedMotion:true},{low:true}]){
    const r=start('p3-space',options);r.h.advance(1600);assert.ok(r.calls.some(c=>c[0]==='drawImage'));
    r.h.api.retireMinigame();r.calls.length=0;const before=JSON.stringify(r.h.api.state());
    r.h.advance(25000);assert.equal(r.calls.length,0);assert.equal(JSON.stringify(r.h.api.state()),before);
  }
});

test('missing prop module keeps the complete original game and safe text fallback',()=>{
  const h=harness({propIllustrations:false});
  assert.equal(h.api.commentTextHTML('🏞️🐦'),'🏞️🐦');
  assert.equal(h.api.commentTextHTML('<img onerror=x>🏞️'),'&lt;img onerror=x&gt;🏞️');
  const r=start('p3-space',{propIllustrations:false});r.h.advance(20000);
  assert.equal(r.h.api.state().lifetime.minigamesPlayed,1);
  assert.equal(r.calls.some(c=>c[0]==='drawImage'),false);
});
