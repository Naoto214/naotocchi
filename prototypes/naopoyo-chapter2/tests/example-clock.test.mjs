import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackClock} from '../example-clock.mjs';
test('playback measures elapsed time independently of slow animation frames',()=>{
 let clock={elapsed:0};for(let i=0;i<2;i++)clock=playbackClock(clock,900,true,false);
 assert.equal(clock.advance,true);assert.equal(clock.elapsed,0);
});
test('does not advance while an animation is playing or while paused',()=>{
 let clock=playbackClock({elapsed:1600},500,true,true);assert.equal(clock.advance,false);
 clock=playbackClock(clock,500,false,false);assert.equal(clock.advance,false);assert.equal(clock.elapsed,0);
});
