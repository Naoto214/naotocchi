const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');

test('every achievement has an illustration without changing its definition or saved state',()=>{
  const h=harness(),before=JSON.stringify(h.api.state());
  assert.equal(h.api.achievements.length,87);
  for(const ach of h.api.achievements){
    const html=h.api.achievementIconHTML(ach);
    assert.match(html,/data-(?:care-icon|ui-icon|comment-symbol)=|class="comment-asset"/,ach.id);
    assert.ok(html.includes(ach.emoji),`${ach.id}: original fallback`);
  }
  assert.equal(JSON.stringify(h.api.state()),before);
  assert.equal(h.api.achievementIconHTML({id:'unknown',emoji:'<x>'}),'&lt;x&gt;');
});

test('achievement grid, recent list, goals and unlock flash share artwork and preserve locks',()=>{
  const h=harness(),s=h.api.state(),ach=h.api.achievements.find(a=>a.id==='sick-cured-1');
  s.achievementsUnlocked=[ach.id];s.lifetime.achievementUnlockedAt={[ach.id]:1000};
  h.api.renderAchievements();
  const html=h.get('achGrid').innerHTML;
  assert.match(html,/data-comment-symbol="lock"/);
  assert.match(html,/ach-cell known/);assert.match(html,/ach-cell locked/);
  assert.ok(html.includes(h.api.achievementIconHTML(ach)));
  assert.match(html,/NEW/);assert.equal(h.get('achProgress').textContent,'1 / 87');
  s.achievementsUnlocked=h.api.achievements.filter(a=>a.id!==ach.id).map(a=>a.id);
  s.lifetime.sicknessCured=1;h.api.checkAchievements();
  assert.equal(h.get('storyFlashEmoji').innerHTML,h.api.achievementIconHTML(ach));
  assert.match(h.get('storyFlashText').textContent,/じっせきたっせい!「はじめてのかんびょう」/);
  assert.ok(s.achievementsUnlocked.includes(ach.id));
});

test('environment notices use matching whole animal PNGs and keep unknown birds intact',()=>{
  const h=harness();
  for(const [emoji,path] of [['🐌','companions/snail.png'],['🐸','frog/05.png'],['⛄','partners/snowman.png'],
    ['🦋','butterfly/07.png'],['🦇','companions/bat.png'],['🦉','companions/owl.png']]){
    h.api.showStoryEvent({emoji,message:emoji+'をみつけた',environmentMoment:true});
    const html=h.get('storyFlashEmoji').innerHTML;
    assert.ok(html.includes(`src="assets/characters/${path}"`));
    assert.ok(fs.existsSync(`assets/characters/${path}`));
    assert.match(html,/class="icon-fallback"/);
  }
  assert.equal(h.api.commentTextHTML('🐦ことり'),'🐦ことり');
});

test('form-change notices and generic butterfly comments do not assume an adult growth stage',()=>{
  const h=harness();
  const s=h.api.state();s.infinite=true;s.discoveredStages.push('frog:2');
  Object.assign(s,{hunger:100,energy:100,health:100,happiness:100});
  const grid=h.get('dexGrid');grid.closest=()=>({dataset:{line:'frog',stage:'2'}});
  h.dispatch(grid,'click');h.dispatch(h.get('dexDetailTransformBtn'),'click');
  assert.equal(s.infiniteForm.line,'frog');assert.equal(s.infiniteForm.stageIndex,2);
  assert.match(h.get('message').textContent,/後ろ足が出たおたまにすがたをかえた!/);
  assert.doesNotMatch(h.get('message').innerHTML,/assets\/characters\/frog\/05\.png/);
  assert.equal(h.api.commentTextHTML('🐸後脚にすがたをかえた!'),'🐸後脚にすがたをかえた!');
  assert.equal(h.api.commentTextHTML('🦋ようちゅう'),'🦋ようちゅう');
});

test('food illustrations distinguish onigiri and cooked egg from care rice and hatching egg',()=>{
  const h=harness();
  for(const [key,emoji,label] of [['rice','🍙','おにぎり'],['egg','🥚','ゆでたまご'],['shrimp','🍤','エビフライ'],
    ['broccoli','🥦','ブロッコリー'],['strawberry','🍓','いちご'],['choco','🍫','チョコ'],['cherry','🍒','さくらんぼ'],
    ['slice','🍰','ショートケーキ'],['bento','🍱','おべんとう']]){
    const html=h.api.minigameFoodHTML(key,emoji);
    assert.match(html,new RegExp(`data-food-symbol="${key}"`));assert.ok(html.includes(`aria-label="${label}"`));
    assert.ok(html.includes(emoji));assert.doesNotMatch(html,/data-care-icon="food"|assets\/characters\/egg/);
  }
  assert.equal(h.api.minigameFoodHTML('__proto__','<🥚>'),'&lt;🥚&gt;');
  assert.equal(h.api.commentTextHTML('🥚'), '🥚','generic egg still has no food/hatching assumption');
});

// Actual game callbacks and input listeners, with a substituted DOM/clock and
// explicit rectangles. These checks are not browser or physical touch evidence.
function start(id,options={}){
  const h=harness(options),game=h.api.games.find(g=>g.id===id),scores=[];
  if(options.low)for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  h.api.startMinigame({id:game.id,start(container,done){
    game.start(container,score=>{scores.push(score);done(score);});
  }});
  const container=h.get('minigameOverlay'),items=container.querySelectorAll('.mg-drag-item'),targets=container.querySelectorAll('.mg-drop-target');
  assert.equal(items.length,id.endsWith('cake')?3:4);
  targets.forEach((t,i)=>t.getBoundingClientRect=()=>({left:20+i*60,right:66+i*60,top:20,bottom:66,width:46,height:46}));
  items.forEach(i=>i.getBoundingClientRect=()=>({left:0,right:46,top:180,bottom:226,width:46,height:46}));
  function drop(key,targetKey,cancel=false){
    const item=items.find(i=>i.dataset.key===key),target=targets.find(t=>t.dataset.key===targetKey);
    const x=target.getBoundingClientRect().left+23;
    h.dispatch(item,'pointerdown',{pointerId:5,clientX:23,clientY:203});
    h.dispatch(item,cancel?'pointercancel':'pointerup',{pointerId:5,clientX:x,clientY:43});
    return item;
  }
  return {h,container,items,targets,scores,drop};
}

test('cake preserves order, retry and completion while the placed item keeps its illustration',()=>{
  const g=start('dragDecorate-cake');
  assert.match(g.container.innerHTML,/data-food-symbol="slice"/);
  const rejected=g.drop('choco','choco');
  assert.equal(rejected.style.pointerEvents,undefined);assert.equal(rejected.style.width,'');
  assert.equal(g.targets.filter(t=>t.classList.contains('filled')).length,0);
  g.drop('strawberry','strawberry',true);assert.equal(g.scores.length,0);
  assert.equal(g.targets[0].innerHTML,'');
  for(const key of ['strawberry','choco','cherry']){
    g.drop(key,key);const t=g.targets.find(t=>t.dataset.key===key);
    assert.match(t.innerHTML,new RegExp(`data-food-symbol="${key}"`));
  }
  assert.deepEqual(g.scores,[100]);g.h.advance(30000);assert.deepEqual(g.scores,[100]);
});

test('bento retains its preview interval and shows the actual food even in a wrong slot',()=>{
  const g=start('dragDecorate-bento'),previews=g.container.querySelectorAll('.mg-bento-preview');
  assert.equal(previews.length,4);assert.ok(previews.every(p=>/data-food-symbol=/.test(p.innerHTML)));
  g.h.advance(2199);assert.ok(previews.every(p=>p.isConnected));
  g.h.advance(1);assert.ok(previews.every(p=>!p.isConnected));
  assert.equal(g.container.querySelector('#mgTray').classList.contains('hidden'),false);
  g.drop('rice','egg');g.drop('egg','rice');g.drop('shrimp','shrimp');g.drop('broccoli','broccoli');
  const wrong=g.targets.find(t=>t.dataset.key==='egg');
  assert.ok(wrong.classList.contains('wrong'));assert.match(wrong.innerHTML,/data-food-symbol="rice"/);
  assert.doesNotMatch(wrong.innerHTML,/data-food-symbol="egg"/);
  assert.deepEqual(g.scores,[50]);
});

test('food decoration keeps timeout scoring and retires without late score changes',()=>{
  for(const id of ['dragDecorate-cake','dragDecorate-bento']){
    const g=start(id,{reducedMotion:true});if(id.endsWith('bento'))g.h.advance(2200);
    const key=g.items[0].dataset.key;g.drop(key,key);g.h.advance(30000);
    assert.deepEqual(g.scores,[id.endsWith('cake')?33:25]);
    const retired=start(id);retired.h.api.retireMinigame();retired.h.advance(30000);
    assert.deepEqual(retired.scores,[]);
  }
});

test('bento completion retains all food and text in normal, reduced-motion, low and fallback modes',()=>{
  for(const options of [{},{reducedMotion:true},{low:true},{foodIllustrations:false}]){
    const g=start('dragDecorate-bento',options),hint=g.container.querySelector('#mgHint');
    g.h.advance(2200);
    for(const key of ['rice','egg','shrimp','broccoli'])g.drop(key,key);
    assert.deepEqual(g.scores,[100]);
    assert.equal(hint.textContent,'ぜんぶつめて、おべんとうができた!🍱');
    for(const target of g.targets){
      if(options.foodIllustrations===false)assert.doesNotMatch(target.innerHTML,/<svg/);
      else assert.match(target.innerHTML,new RegExp(`data-food-symbol="${target.dataset.key}"`));
    }
    if(options.foodIllustrations===false)assert.equal(g.targets[0].textContent,'🍙');
  }
});
