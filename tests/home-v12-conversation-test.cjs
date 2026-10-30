const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

function boot() {
  const h = harness({deterministic:true});
  const s = h.api.state();
  Object.assign(s,{regionId:'home',partner:null,companions:[],isSleeping:false,isSick:false,hunger:95,happiness:95,energy:95,health:100});
  h.api.setPresentCastFixture();
  h.api.render();
  h.get('device').classList.add('ui-home-active');
  return h;
}
function free(h) {
  for(let n=0;n<240&&!h.api.conv2.canStart();n++) h.advance(250);
  assert.ok(h.api.conv2.canStart());
}
function ask(h,id='q-cloud-seat') {
  free(h);
  const q=h.api.conv2.data.QUESTIONS.find(q=>q.id===id);
  assert.ok(h.api.conv2.ask(q));
  return q;
}
// The shared harness deliberately omits ancestor bubbling/closest. Supply only
// those DOM mechanics; every listener and question/reply below is production code.
function choiceEvent(h,button,type='click') {
  button.closest=selector=>selector==='[data-choice]'||selector==='button'?button:null;
  const e={type,target:button,bubbles:true,stopped:false,preventDefault(){},stopPropagation(){this.stopped=true;}};
  for(const l of h.document.listeners) if(l.type===type&&l.capture)l.fn(e);
  for(const l of h.get('speechChoices').listeners) if(l.type===type&&!l.capture)l.fn(e);
  return e;
}
test('Home choice DOM input consumes exactly once and presents the existing reply/reaction',()=>{
  for(const index of [0,1,2]) {
    const h=boot(),q=ask(h),button=h.get('speechChoices').children[index];
    const shown=[];
    let text=h.get('speechText').textContent;
    Object.defineProperty(h.get('speechText'),'textContent',{configurable:true,get:()=>text,set:v=>{text=String(v);shown.push(text);}});
    const down=choiceEvent(h,button,'pointerdown');
    assert.ok(down.stopped,'choice pointer cannot reach terrain');
    const click=choiceEvent(h,button);
    assert.ok(click.stopped,'choice click cannot reach the Home behind it');
    assert.equal(h.api.conv2.unit().awaiting,false);
    assert.ok(h.get('speechChoices').classList.contains('hidden'));
    choiceEvent(h,button);
    h.advance(h.api.conv2.config.replyDelayMs+1);
    assert.equal(h.get('speechText').textContent,q.choices[index].reply[0].text);
    assert.equal(h.get('speechBubble').classList.contains('hidden'),false);
    assert.equal(h.get('speechBubble').dataset.kind,q.choices[index].reply[0].role==='pet'?'pet':'companion');
    assert.ok(h.get('petSprite').classList.contains('cast-speaking'),'existing Motion v2 reaction is attached to the speaker');
    h.advance(10000);
    assert.deepEqual(shown,q.choices[index].reply.map(b=>b.text),'the existing beats play once in order');
  }
});
test('timed-out and scene-hidden choices cannot replay; non-Home choices keep native bubbling',()=>{
  const h=boot();ask(h);
  const timedOut=h.get('speechChoices').children[0];
  h.advance(h.api.conv2.config.answerWaitMs+5000);
  choiceEvent(h,timedOut);
  assert.equal(h.api.conv2.unit(),null);
  ask(h);
  const hidden=h.get('speechChoices').children[0];
  h.api.conv2.leaveScene('hidden');
  choiceEvent(h,hidden);
  assert.equal(h.api.conv2.unit(),null);
  const q=ask(h);
  h.get('device').classList.remove('ui-home-active');
  const e=choiceEvent(h,h.get('speechChoices').children[1]);
  assert.equal(e.stopped,false,'non-Home event propagation is unchanged');
  h.advance(h.api.conv2.config.replyDelayMs+1);
  assert.equal(h.get('speechText').textContent,q.choices[1].reply[0].text);
});
test('a detached choice cannot answer a later question, even when its index is valid',()=>{
  const h=boot();ask(h);
  const stale=h.get('speechChoices').children[0];
  h.api.conv2.leaveScene('test');
  const q=ask(h,'q-tomorrow');
  choiceEvent(h,stale);
  assert.equal(h.api.conv2.unit().awaiting,true,'old DOM is not the current question');
  assert.equal(h.get('speechText').textContent,q.ask);
});
test('Home selected pet uses its official current stage name',()=>{
  const h=boot();
  h.api.renderHomeCast();
  const pet=h.api.dioramaActors().find(a=>a.kind==='pet');
  assert.ok(pet);
  assert.equal(pet.label,h.api.currentStageLabel());
});
test('sleep action label, tooltip and presentation state follow sleep/wake',()=>{
  const h=boot(),button=h.get('sleepBtn');
  for(const sleeping of [true,false]) {
    h.api.state().isSleeping=sleeping;h.api.render();
    assert.equal(button.querySelector('span').textContent,sleeping?'おきる':'ねる');
    assert.equal(button.title,sleeping?'おきる':'ねる');
    assert.equal(button.dataset.sleeping,String(sleeping));
  }
});

function exchangeHome() {
  const h=harness({deterministic:true,resume:true});h.api.hatchEgg();
  const s=h.api.state();Object.assign(s,{ageTicks:80,companions:[{id:'shiba',bond:80}],isSleeping:false,isSick:false});
  h.api.clearConversationTimers();h.api.closeAllMenuOverlays();
  h.get('storyFlash').classList.add('hidden');
  h.get('screenNormal').classList.remove('hidden');
  h.get('device').classList.add('ui-home-active');
  // Keep the screenshot's exact exchange as the only unused shiba candidate.
  s.individuality.natural.kindness[0].push('shiba-walk');
  s.individuality.natural.kindness[2].push('shiba-pace');
  h.get('playWithBtn').focus();
  return h;
}
test('screenshot exchange opens a compact Home popup and shows its existing narrative exactly once',()=>{
  const h=exchangeHome(),s=h.api.state();
  assert.equal(h.api.maybeIndividualExchange(),true);
  const dialog=h.get('individualityDialog');
  assert.ok(dialog.classList.contains('home-choice-popup'));
  assert.equal(dialog['aria-modal'],'false');
  assert.equal(h.get('individualityText').textContent,'しばいぬが涼しい風に鼻を向けた。');
  const button=h.get('individualityChoices').children[0];
  assert.equal(button.textContent,'いっしょに風を感じる');
  let stopped=false;
  assert.equal(button.onclick({stopPropagation(){stopped=true;}}),true);
  assert.equal(stopped,true,'the selection click stops before closing its popup');
  const saved=JSON.stringify(s.individuality);
  assert.equal(button.onclick(),false,'double click on removed choices is ignored');
  assert.equal(JSON.stringify(s.individuality),saved,'effects occur once');
  assert.ok(dialog.classList.contains('hidden'));
  assert.equal(dialog.classList.contains('home-choice-popup'),false);
  assert.equal(h.document.activeElement.id,'playWithBtn');
  const result=h.get('homeChoiceResult');
  assert.equal(h.get('homeChoiceText').textContent,'言葉がなくても、気持ちよさが伝わった。');
  assert.equal(result.classList.contains('hidden'),false);
  assert.equal(result.role,'status');
  h.advance(4201);
  assert.equal(result.classList.contains('hidden'),true);
});
test('Home exchange later rejects its stale callback and keeps the original later effects',()=>{
  const h=exchangeHome();assert.ok(h.api.maybeIndividualExchange());
  const button=h.get('individualityChoices').children[0];
  const before=JSON.stringify(h.api.state().individuality);
  h.get('individualityLater').onclick();
  assert.equal(button.onclick(),false);
  assert.equal(JSON.stringify(h.api.state().individuality),before);
  assert.ok(h.get('individualityDialog').classList.contains('hidden'));
  assert.equal(h.document.activeElement.id,'playWithBtn');
});
test('age choices reuse Home presentation with unchanged effects; non-Home remains modal',()=>{
  for(const home of [true,false]) {
    const h=exchangeHome(),s=h.api.state();
    h.api.INDIVIDUALITY.queue(s.individuality,0,3);
    h.get('device').classList.toggle('ui-home-active',home);
    assert.ok(h.api.showIndividualityEvent(true));
    const dialog=h.get('individualityDialog');
    assert.equal(dialog.classList.contains('home-choice-popup'),home);
    assert.equal(dialog['aria-modal'],String(!home));
    const button=h.get('individualityChoices').children[0];
    assert.equal(button.onclick(),true);
    assert.equal(s.individuality.events[3].status,'chosen');
    assert.equal(button.onclick(),false);
    assert.equal(dialog.classList.contains('home-choice-popup'),false);
    if(home)assert.equal(h.get('homeChoiceText').textContent,'その気持ちを、思い出にしまった。');
    else assert.ok(h.get('homeChoiceResult').classList.contains('hidden'));
  }
});
test('Home choice keeps fixed cast and care presentation across renders while gameplay stays paused',()=>{
  const h=exchangeHome(),device=h.get('device');
  h.get('lifeCardOverlay').classList.add('hidden');
  h.api.render();
  assert.equal(device.dataset.homeFixed,'true');
  assert.equal(device.classList.contains('ui-menu-open'),false);
  assert.ok(h.api.maybeIndividualExchange());
  for(let n=0;n<3;n++) {
    h.api.render();
    assert.equal(device.dataset.homeFixed,'true','the compact popup cannot release fixed Home geometry');
    assert.equal(device.classList.contains('ui-menu-open'),false,'care controls retain their Home presentation');
    assert.equal(device.classList.contains('ui-home-active'),true);
    assert.equal(h.api.isTimePaused(),true,'existing choice gameplay pause remains');
    assert.equal(h.api.homeDioramaBlocked(),true,'choice cannot start actor movement');
  }
  h.api.openExclusiveMenu('theme');h.api.render();
  assert.equal(device.dataset.homeFixed,'false','actual menu retains its original presentation');
  assert.equal(device.classList.contains('ui-menu-open'),true);
});
