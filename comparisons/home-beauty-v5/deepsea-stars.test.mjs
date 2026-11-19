import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from './deepsea-stars.mjs';

const disabled = {light:false,water:false,particles:false,magic:false,motion:false};

function draw(region, options = {}) {
  const log = [];
  const gradient = {addColorStop(...args) { log.push(['stop', ...args]); }};
  const ctx = new Proxy({}, {
    get(target, name) {
      if (name in target) return target[name];
      return (...args) => {
        log.push([name, ...args]);
        if (name === 'createRadialGradient' || name === 'createLinearGradient') return gradient;
      };
    },
    set(target, name, val) {
      target[name] = val;
      log.push([name, val === gradient ? 'gradient' : val]);
      return true;
    },
  });
  renderer.drawDeepseaStars(ctx, {
    region, time:'night', season:'summer', weather:'sunny', seconds:30, variant:'E3',
    width:1000, height:1500, opacity:1, strength:1, ...options,
  });
  return log;
}
const paints = commands => commands.filter(([name]) => ['fill','stroke','fillRect','drawImage'].includes(name));

for (const region of ['deepsea','star_stop']) {
  test(region+' respects strength, crossfade opacity and effect opt-outs', () => {
    assert.equal(paints(draw(region,{strength:0})).length,0);
    assert.equal(paints(draw(region,{opacity:0})).length,0);
    assert.equal(paints(draw(region,{effects:disabled})).length,0);
    assert.ok(paints(draw(region)).length > 0);
    assert.notDeepEqual(draw(region,{strength:1}),draw(region,{strength:2}));
    assert.deepEqual(draw(region,{strength:2}),draw(region,{strength:20}));
  });
  test(region+' holds a reduced-motion frame and changes at long intervals', () => {
    const frames = [30,60,180].map(seconds => draw(region,{seconds}));
    assert.notDeepEqual(frames[0],frames[1]);
    assert.notDeepEqual(frames[1],frames[2]);
    assert.deepEqual(draw(region,{reduced:true,seconds:30}),draw(region,{reduced:true,seconds:180}));
    assert.ok(paints(frames[0]).length < 130);
  });
}

test('underwater bubbles and plankton are independent of land precipitation', () => {
  const wet = {effects:{...disabled, particles:true, motion:true}};
  assert.ok(paints(draw('deepsea',wet)).length);
  assert.deepEqual(draw('deepsea',{...wet,weather:'rain'}),draw('deepsea',{...wet,weather:'snow'}));
});

test('the meteor crosses open sky briefly and never appears on a reduced-motion frame', () => {
  const meteor = {effects:{...disabled, magic:true, motion:true}};
  const between = paints(draw('star_stop',{...meteor,seconds:30})).length;
  assert.ok(paints(draw('star_stop',{...meteor,seconds:60})).length > between);
  assert.equal(paints(draw('star_stop',{...meteor,reduced:true,seconds:60})).length,0);
});

test('other regions and empty drawing bounds receive no overlay', () => {
  assert.equal(draw('sea').length,0);
  assert.equal(draw('star_stop',{variant:'previous'}).length,0);
  assert.equal(draw('deepsea',{width:0}).length,0);
});
