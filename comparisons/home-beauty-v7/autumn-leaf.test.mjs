import assert from 'node:assert/strict';
import test from 'node:test';
import {sampleFall} from './fall-motion.mjs';
import {drawAutumnLeaf, sampleAutumnLeaf} from './autumn-leaf.mjs';

const state = {region:'forest', t:9, leafVariant:'B', leafColor:'mixed'};
const track = {...sampleFall('leaf', 2, 9), phase:.5, alpha:.8};

test('the same visible passage has three calibrated sizes and keeps its position when switched', () => {
  const sizes = ['A','B','C'].map(leafVariant => sampleAutumnLeaf(2, track, 4.4, {...state, leafVariant}));
  const oldRadius = 4.4 * track.radius;
  for (const [i, expected] of [1.5, 2, 2.5].entries()) {
    assert.ok(Math.abs(sizes[i].radius / oldRadius / expected - 1) < .16);
    assert.equal(sizes[i].dx, sizes[0].dx);
    assert.equal(sizes[i].dy, sizes[0].dy);
  }
  assert.ok(2 * sizes[1].radius * .32 > 5, 'near B leaf must span five pixels on a 320px painting');
});

test('near leaves bank and flutter more broadly than distant leaves and expose both faces', () => {
  const stats = [.14, .83].map(depth => {
    const xs = [], ys = [], faces = [];
    for (let t = 0; t < 20; t += .25) {
      const p = {...sampleFall('leaf', 2, t), depth, phase:.5, gust:0};
      const g = sampleAutumnLeaf(2, p, 4.4, {...state, t});
      xs.push(g.dx); ys.push(g.dy); faces.push(g.face);
      assert.ok(g.roll >= .18 && g.roll <= 1, 'edge turns keep a visible shoulder');
    }
    assert.ok(Math.min(...faces) < -.84 && Math.max(...faces) > .84);
    return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  });
  assert.ok(stats[1][0] > 42 && stats[1][0] > 2 * stats[0][0]);
  assert.ok(stats[1][1] > 12 && stats[1][1] > 2 * stats[0][1]);
});

test('a passing gust lifts a near leaf and additions taper back to its original release and landing', () => {
  const p = {...track, depth:.85, phase:.5, gust:0};
  for (const region of ['forest','countryside']) {
    const s = {...state, region};
    const still = sampleAutumnLeaf(2,p,4.4,s);
    const lifted = sampleAutumnLeaf(2,{...p,gust:.9},4.4,s);
    assert.ok(lifted.dy < still.dy - 18);
    for (const phase of [0,1]) {
      const edge = sampleAutumnLeaf(2,{...p,phase,gust:.9},4.4,s);
      assert.ok(Math.abs(edge.dx) + Math.abs(edge.dy) < 1e-6);
    }
    assert.deepEqual(still, sampleAutumnLeaf(2,p,4.4,s));
  }
});

// In a canvas host without sprite surfaces the same artwork is painted directly.
// Record its actual pigment selection for each palette and for half-turned leaves.
function pigments(i, t, leafColor, region = 'forest') {
  const inks = [];
  const ctx = new Proxy({
    createLinearGradient(){return {addColorStop(){}};},
    fill(){inks.push(this.fillStyle);}
  }, {
    get(target,key){return key in target ? target[key] : key === 'canvas' ? undefined : () => {};}
  });
  const p = {...sampleFall('leaf',i,t), phase:.5, alpha:1};
  const s = {...state, t, leafColor, region};
  drawAutumnLeaf(ctx,i,p,0,0,5,1,s);
  return {front:sampleAutumnLeaf(i,p,5,s).face >= 0, inks};
}

test('front and back have different pigments and all three warm families appear in mixed mode', () => {
  const all = new Set();
  for (const hue of ['red','orange','gold']) {
    const faces = new Map();
    for (let t=0; t<16; t+=.25) {
      const {front, inks} = pigments(2,t,hue);
      assert.ok(new Set(inks).size >= 2);
      faces.set(front,inks[0]);
      all.add(inks[0]);
    }
    assert.equal(new Set(faces.values()).size,2);
  }
  assert.equal(all.size,6);
  const mixed = new Set();
  for (let i=0; i<6; i++) {
    for (let t=0; t<16; t+=.5) mixed.add(pigments(i,t,'mixed').inks[0]);
  }
  assert.deepEqual(mixed,all);
});

test('the near orchard leaf keeps a crimson reverse against evening ochre when mixed colors are selected', () => {
  const backs = new Map();
  for (const hue of ['mixed','red','orange','gold']) {
    for (let t=0; t<12; t+=.25) {
      const {front, inks} = pigments(5,t,hue,'countryside');
      if (!front) { backs.set(hue,inks[0]); break; }
    }
  }
  assert.equal(backs.size,4);
  const [r,g,b] = backs.get('mixed').slice(1).match(/../g).map(x=>parseInt(x,16));
  assert.ok(r - g > 70 && b > g && g < 95, 'the reverse must separate from tan and amber');
  assert.equal(new Set(backs.values()).size,4);
});
