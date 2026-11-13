'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const music=require('../songs.js'),audio=require('../engine.js'),report=[];
assert.equal(music.SONGS.length,8);
if(process.argv[2]){
 const source=fs.readFileSync(process.argv[2],'utf8'),literal=source.split('home: ')[1].split('\n      night:')[0].trim().replace(/,$/,'');
 const original=vm.runInNewContext('('+literal+')',{_:null});
 for(const k of ['bpm','swing','chords','roots','bass','lead'])assert.equal(JSON.stringify(music.CURRENT_RAW[k]),JSON.stringify(original[k]),k);
 console.log('Original audio.js home: all six source fields match');
}
const reference=require('../reference-songs.js').SONGS.find(s=>s.id==='D');
assert.deepEqual(music.SONGS[1].bars,reference.bars);
assert.equal(music.SONGS[1].bpm,reference.bpm);
const shapes=new Set();
for(const s of music.SONGS){
 const flat=music.flatten(s),span=flat.beats*60/s.bpm*s.repeats;
 if('ABCDEF'.includes(s.id)){assert(span>=45&&span<=90);const signature=flat.notes.map(n=>n.midi-flat.notes[0].midi).join(',');assert(!shapes.has(signature));shapes.add(signature);}
 for(const bpm of [s.bpm,96])for(const full of [false,true]){
  const r=audio.render(s,full,bpm);
  assert(r.samples.every(Number.isFinite));assert(r.peak<.86);assert(r.rms>.08&&r.rms<.101);
  const jump=Math.abs(r.samples[0]-r.samples.at(-1));assert(jump<.025,`${s.id} boundary ${jump}`);
  const seq=audio.events(s,full,bpm);assert(seq.notes.every(n=>n.time>=0&&n.time<seq.duration&&n.dur>0&&n.midi>=21&&n.midi<=108));
  report.push({id:s.id,bpm,mode:full?'accompanied':'solo',duration:r.duration,rmsDb:20*Math.log10(r.rms),peak:r.peak,boundaryJump:jump});
 }
}
fs.writeFileSync(path.join(__dirname,'../VALIDATION.json'),JSON.stringify(report,null,2)+'\n');
console.log('32 renders: finite, duration, peak, RMS, boundary, event-range PASS; six independent pitch contours');
