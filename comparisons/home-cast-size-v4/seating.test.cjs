const assert = require('node:assert/strict');
const test = require('node:test');
const {withOpeningSeats, openingFor} = require('./seating.js');

function terrain(valid = () => true) {
  return {
    initialPoint: (index,count) => [index,count],
    project: ({x,z}) => [x,z],
    valid,
    route: () => [], reachable: () => [], depthScale: () => 1,
  };
}

function query(count, layout='optimized', policy='B', curve='linear') {
  return '?' + new URLSearchParams({count,layout,policy,curve});
}

test('zero gain keeps the identical V2 navigation for every registered region and roster', () => {
  const regions=['home','forest','river_lake','city','countryside','sea','mountain','snow','jungle',
    'desert','deepsea','star_stop','memory_lake'];
  const nav=terrain();
  for(const region of regions) for(let n=1;n<=28;n++) {
    for(const [width,height] of [[320,516],[375,760],[390,792],[430,880]]) {
      assert.equal(withOpeningSeats(nav,{region},width,height,query(n,'fixed')),nav);
      assert.equal(withOpeningSeats(nav,{region},width,height,query(n,'optimized','current')),nav);
      if(width===320 || n<=18)
        assert.equal(withOpeningSeats(nav,{region},width,height,query(n)),nav);
    }
  }
});

test('count-specific companion hints use the full native reference for navigation, depth and blocked ground', () => {
  const nav=terrain(), region='home', count=28;
  const hints=openingFor(375,760,region,count);
  assert.ok(hints.length>0);
  const trial=withOpeningSeats(nav,{region},375,760,query(count));
  for(const key of ['route','reachable','valid','depthScale']) assert.equal(trial[key],nav[key]);
  assert.deepEqual(trial.initialPoint(0,count),nav.initialPoint(0,count));
  assert.deepEqual(trial.initialPoint(1,count),nav.initialPoint(1,count));
  const blocked=terrain(()=>false);
  const fallback=withOpeningSeats(blocked,{region},375,760,query(count));
  for(const [index,x,z] of hints) {
    assert.ok(index>=2 && index<count);
    assert.deepEqual(trial.initialPoint(index,count),[x,z]);
    assert.deepEqual(trial.initialPoint(index,count-1),nav.initialPoint(index,count-1));
    assert.deepEqual(fallback.initialPoint(index,count),blocked.initialPoint(index,count));
  }
});

test('positive curves share a given household opening and unmeasured viewports retain V2', () => {
  const nav=terrain(), region='home', count=28;
  const expected=Array.from({length:count},(_,i)=>
    withOpeningSeats(nav,{region},375,760,query(count)).initialPoint(i,count));
  for(const policy of ['A','B','C']) for(const curve of ['linear','step']) {
    const trial=withOpeningSeats(nav,{region},375,760,query(count,'optimized',policy,curve));
    assert.deepEqual(Array.from({length:count},(_,i)=>trial.initialPoint(i,count)),expected);
  }
  for(const [w,h] of [[375,374],[1024,800],[376,760],[375,610]])
    assert.equal(withOpeningSeats(nav,{region},w,h,query(count)),nav);
});
