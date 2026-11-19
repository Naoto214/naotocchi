const {test} = require('node:test');
const assert = require('node:assert/strict');
const {withOpeningSeats} = require('./seating.js');

function original(region = 'forest') {
  const spec = {region, seats: [[.54, .76], [.73, .43]], ground: [[.1,.28],[.91,.3],[.88,.97],[.1,.95]]};
  let projections = 0;
  const nav = {
    initialPoint(index,count) { return {index, count}; },
    project({x,z}) { projections++; return {x, y:z}; },
    valid({x,y}) { return x >= .10 && x <= .91 && y >= .32 && y <= .97; },
    route() { return []; },
  };
  return {spec, nav, projections: () => projections};
}

test('only a full cast requests alternate opening seats, once per navigation instance', () => {
  const {spec, nav, projections} = original();
  const trial = withOpeningSeats(nav, spec, 320, 516);
  assert.equal(trial.route, nav.route);
  for (const count of [1,4,10,20,27]) {
    for (let i=0; i<count; i++) assert.deepEqual(trial.initialPoint(i,count), {index:i, count});
  }
  assert.equal(projections(), 0);
  for (let pass=0; pass<3; pass++) {
    const seats = Array.from({length:28}, (_, i) => trial.initialPoint(i,28));
    assert.equal(new Set(seats.map(p => JSON.stringify(p))).size, 28);
    assert.deepEqual(seats[0], {x:.54, y:.76});
    assert.equal(projections(), 28);
  }
});

test('preserve native openings in other compact regions and in landscape', () => {
  for (const [region,w,h] of [['snow',320,516], ['forest',670,320]]) {
    const {nav,spec,projections} = original(region);
    const trial = withOpeningSeats(nav, spec, w, h);
    for (let i=0; i<28; i++) assert.deepEqual(trial.initialPoint(i,28), {index:i, count:28});
    assert.equal(projections(),0);
  }
});

test('taller portrait changes only the starting hint for the partner, on valid ground', () => {
  const {spec,nav} = original();
  const trial = withOpeningSeats(nav,spec,390,792);
  assert.ok(nav.valid(trial.initialPoint(1,28)));
  for (const index of [0,2,7,27]) assert.deepEqual(trial.initialPoint(index,28), {index,count:28});
  const blocked = withOpeningSeats({...nav, valid:()=>false},spec,390,792);
  assert.deepEqual(blocked.initialPoint(1,28), {index:1,count:28});
});
