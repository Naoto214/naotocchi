const test = require('node:test');
const assert = require('node:assert/strict');
const {withOpeningSeats} = require('./seating.js');

function terrain() {
  return {
    initialPoint: (index,count) => ({index,count}),
    project: ({x,z}) => ({x,y:z}),
    valid: p => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1,
    route: () => [],
    reachable: () => [],
  };
}

test('fixed mode at any gain and both +0 modes return the identical V2 navigation', () => {
  const nav = terrain(), spec = {region:'forest'};
  for (const gain of [0,5,10,15,20]) {
    assert.equal(withOpeningSeats(nav,spec,320,516,'?layout=fixed&extra='+gain),nav);
  }
  for (const gain of [0,-1,7,30,'bad']) {
    assert.equal(withOpeningSeats(nav,spec,320,516,'?layout=optimized&extra='+gain),nav);
  }
});

test('only eligible initial hints change and V5 retains authority over blocked ground', () => {
  const nav = terrain(), spec = {region:'river_lake'};
  const trial = withOpeningSeats(nav,spec,320,516,'?layout=optimized&extra=20');
  assert.equal(trial.route,nav.route);
  assert.equal(trial.reachable,nav.reachable);
  assert.deepEqual(trial.initialPoint(0,28),nav.initialPoint(0,28));
  assert.deepEqual(trial.initialPoint(0,1),nav.initialPoint(0,1));
  const seats=Array.from({length:28},(_,i)=>trial.initialPoint(i,28));
  assert.ok(seats.some(p=>typeof p.x==='number'));
  assert.deepEqual(Array.from({length:28},(_,i)=>trial.initialPoint(i,28)),seats);
  const blocked = {...nav,valid:()=>false};
  const unsafe = withOpeningSeats(blocked,spec,320,516,'?layout=optimized&extra=20');
  for(let i=0;i<28;i++) assert.deepEqual(unsafe.initialPoint(i,28),blocked.initialPoint(i,28));
});

test('unmeasured landscape and foreign region preserve the V2 object', () => {
  const nav = terrain();
  const query = '?extra=20&layout=optimized';
  assert.equal(withOpeningSeats(nav,{region:'forest'},844,338,query),nav);
  assert.equal(withOpeningSeats(nav,{region:'unregistered'},320,516,query),nav);
});

test('verified four-resident tall starts preserve the hero, fixed controls and unrelated rosters', () => {
  const nav = terrain();
  for (const [region, width, height] of [['home', 375, 760], ['city', 390, 792]]) {
    for (const gain of [5, 10, 15, 20]) {
      const query = '?layout=optimized&extra=' + gain;
      const trial = withOpeningSeats(nav, {region}, width, height, query);
      assert.deepEqual(trial.initialPoint(0, 4), nav.initialPoint(0, 4));
      assert.notDeepEqual(trial.initialPoint(1, 4), nav.initialPoint(1, 4));
      for (const i of [0, 1, 12, 27]) {
        assert.deepEqual(trial.initialPoint(i, 28), nav.initialPoint(i, 28));
      }
      assert.equal(trial.route, nav.route);
      assert.equal(withOpeningSeats(nav, {region}, width, height, '?layout=fixed&extra=' + gain), nav);
    }
    assert.equal(withOpeningSeats(nav, {region}, width, height, '?layout=optimized&extra=0'), nav);
    assert.deepEqual(withOpeningSeats(nav, {region}, width, height, '?layout=optimized&extra=20').initialPoint(0, 1), nav.initialPoint(0, 1));
  }
});

test('an optimized gain can fall back independently for a tall household', () => {
  const nav = terrain();
  const get = gain => withOpeningSeats(nav, {region:'home'}, 390, 792, '?layout=optimized&extra=' + gain);
  assert.notDeepEqual(get(5).initialPoint(1, 4), nav.initialPoint(1, 4));
  for (const gain of [10, 15, 20]) {
    for (let i = 0; i < 4; i++) assert.deepEqual(get(gain).initialPoint(i, 4), nav.initialPoint(i, 4));
  }
});
