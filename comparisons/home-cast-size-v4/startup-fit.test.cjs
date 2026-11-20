const test = require('node:test');
const assert = require('node:assert/strict');
const {createOpeningFit} = require('./startup-fit.cjs');

function envelope(right, up = 75) {
  return {width:342,height:380,count:28,left:23.7,right,top:86,bottom:368,
    side:35,above:86,below:25,vertical:[[90,up,8],[350,84,10]],
    fitVertical:[[90,up,8],[350,84,10]]};
}
const camera={x:0,y:0,scaleX:1,scaleY:.9,bodyScale:.7,bodyScaleLimit:.7};
const small=envelope(318.26), large=envelope(321.47,75.001);

test('keeps a fitted, containing envelope after a repeated native startup two-cycle', () => {
  const retain = createOpeningFit();
  let current;
  const publish = (next, scope='river/360') => {
    const kept=retain(current,next,scope,camera);
    if (!kept) current=next;
    return kept;
  };
  for (const next of [small,large,small,large]) assert.equal(publish(next),false);
  assert.equal(publish(small),true);
  assert.equal(current,large);
  assert.equal(publish(small,'river/360'),true);
  assert.equal(publish(small,'river/361'),false);
});

test('distinct fits and incomplete containment remain native', () => {
  const retain=createOpeningFit();
  assert.equal(retain(large,large,'same',camera),true);
  const cross=envelope(318.26,76);
  let previous;
  for (const next of [small,large,cross,large,cross,large,cross,large,cross]) {
    assert.equal(retain(previous,next,'same',camera),false);
    previous=next;
  }
});

test('recovers a proven two-cycle during refit and counts each recovery once', () => {
  let recoveries=0;
  const retain=createOpeningFit(() => { recoveries++; });
  let current;
  const publish = (next, scaleX) => {
    const kept = retain(current,next,'new viewport',{x:0,y:0,scaleX,scaleY:1,bodyScale:1,bodyScaleLimit:1});
    if (!kept) current=next;
    return kept;
  };
  for (const [next,sx] of [[small,.96],[large,.97],[small,.96],[large,.97]]) assert.equal(publish(next,sx),false);
  assert.equal(publish(small,.96),true);
  assert.equal(publish(small,.96),true);
  assert.equal(recoveries,1);
});

test('different current camera measurements never qualify as an exact cycle', () => {
  const retain=createOpeningFit();
  let current;
  for (let i=0; i<8; i++) {
    const next=i%2 ? large : small;
    assert.equal(retain(current,next,'city',{scaleX:i+1}),false);
    current=next;
  }
});

test('native outer samples may contain additional rows while covering every inner Y and ink extent', () => {
  const inner=envelope(318), outer=envelope(321);
  for (const key of ['fitVertical','vertical']) outer[key]=[[86,70,9],...outer[key],[360,90,11]];
  function fits(candidate, required) {
    const retain=createOpeningFit();
    let current;
    for (const next of [required,candidate,required,candidate]) {
      assert.equal(retain(current,next,'lake',camera),false);
      current=next;
    }
    return retain(current,required,'lake',camera);
  }
  assert.equal(fits(outer,inner),true);
  for (const key of ['fitVertical','vertical']) {
    const missing={...outer,[key]:outer[key].filter(([y])=>y!==90)};
    const tooShort={...outer,[key]:outer[key].map(([y,up,down])=>[y,y===90?up-.001:up,down])};
    assert.equal(fits(missing,inner),false);
    assert.equal(fits(tooShort,inner),false);
  }
});
