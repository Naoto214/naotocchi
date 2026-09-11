const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { harness } = require('./helpers/runtime-harness.cjs');

function home() {
  const h = harness({ worldScene:true, viewportHeight:786 });
  h.api.render();
  if (fs.existsSync('home-touch.js')) vm.runInContext(fs.readFileSync('home-touch.js','utf8'), h.sandbox);
  const device = h.get('device');
  function target(id) {
    const e = h.get(id);
    e.closest = selector => selector === '#device' ? device
      : selector === '#speechText, #message' && ['speechText','message'].includes(id) ? e : null;
    return e;
  }
  function touch(e, type, y, count=1, extra={}) {
    let prevented = false;
    h.dispatch(e, type, { cancelable:true, touches:Array.from({length:count},(_,i)=>({clientX:100+i*40,clientY:y})),
      preventDefault(){prevented=true;}, ...extra });
    return prevented;
  }
  return { h, device, target, touch };
}

test('one-finger drags cannot pan the home, including a drag starting on a care button', () => {
  const { target, touch } = home();
  for (const id of ['ageLabel','castStage','homeMeters','feedBtn']) {
    const e = target(id);
    assert.equal(touch(e,'touchstart',300),false,'starting a tap must remain usable');
    assert.equal(touch(e,'touchmove',350),true,'dragging down must not move the home');
    assert.equal(touch(e,'touchmove',250),true,'dragging up must not move the home');
    assert.equal(touch(e,'touchend',250,0),false);
  }
});

test('long text can scroll in both directions but cannot drag the home past its edges', () => {
  const { target, touch } = home();
  for (const id of ['message','speechText']) {
    const e = target(id);
    Object.assign(e,{scrollHeight:400,clientHeight:40,scrollTop:0});
    touch(e,'touchstart',300);
    assert.equal(touch(e,'touchmove',350),true,'top edge must not chain a downward pan');
    assert.equal(touch(e,'touchmove',300),false,'text below is reachable');
    e.scrollTop=180;
    assert.equal(touch(e,'touchmove',250),false);
    assert.equal(touch(e,'touchmove',300),false);
    e.scrollTop=360;
    assert.equal(touch(e,'touchmove',250),true,'bottom edge must not chain an upward pan');
    assert.equal(touch(e,'touchmove',300),false,'text above is reachable');
    e.scrollHeight=40;e.scrollTop=0;
    assert.equal(touch(e,'touchmove',350),true,'short text is part of the fixed home');
    touch(e,'touchend',350,0);
  }
});

test('pinch zoom and panning an enlarged view remain available', () => {
  const { h, target, touch } = home(), e=target('castStage');
  touch(e,'touchstart',300);
  touch(e,'touchstart',300,2);
  assert.equal(touch(e,'touchmove',350,2),false);
  touch(e,'touchend',350,1);
  assert.equal(touch(e,'touchmove',400),false,'lifting one finger must not trap an ongoing pinch');
  touch(e,'touchend',400,0);
  h.window.visualViewport.scale=2;
  touch(e,'touchstart',300);
  assert.equal(touch(e,'touchmove',350),false,'zoomed content remains reachable');
});

test('menus, minigames and life records keep their gestures and returning home restores the lock', () => {
  const { h, device, target, touch } = home(), e=target('castStage');
  touch(e,'touchstart',300);
  h.api.openExclusiveMenu('theme');h.api.render();
  assert.equal(device.dataset.homeFixed,'false');
  assert.equal(touch(e,'touchmove',350),false,'opening a menu mid-gesture releases it');
  h.api.closeAllMenuOverlays();h.api.render();
  touch(e,'touchstart',300);
  assert.equal(touch(e,'touchmove',350),true);
  h.api.startMinigame(h.api.games[0]);h.api.render();
  touch(e,'touchstart',300);
  assert.equal(touch(e,'touchmove',350),false);
  h.api.finishMinigame(50);h.api.render();
  h.get('lifeCardOverlay').classList.remove('hidden');h.api.render();
  touch(e,'touchstart',300);
  assert.equal(touch(e,'touchmove',350),false);
});
