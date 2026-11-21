const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const D=require('../../bgm-complete-v3-20261109/design.js');
const expected=['home-morning','home-day','home-evening','home-night','poyo-1','koro-1','card-2','game-1','explore-1','event-2','event-1','kisetsu','ohayo','bgm-game','bgm-race','bgm-farewell','poyo-2','game-2','explore-2','board-b','fishing-a','lullaby-a','jingle-achieve','jingle-card-lose','var-poyo-clear','var-poyo-chapter','var-koro-goal','var-koro-album','var-card-late','var-card-win','var-flight','var-ohayo-hatch2'];
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n)));
test('home A files and all source references retain their locked SHA-256',()=>{
 const crypto=require('node:crypto'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 for(const f of read('home-inheritance.json'))assert.equal(hash(path.join(root,f.output)),f.sha256,f.output);
 for(const f of read('source-lock.json').files)assert.equal(hash(path.resolve(root,'../..',f.path)),f.sha256,f.path);
});
test('all four inherited home arrangements preserve their source lead',()=>{
 const ids={soyokaze:'home-morning',current:'home-day',starlake:'home-evening',hoshizora:'home-night'};
 const rows=read('home-scores-original.json');assert.equal(rows.length,4);
 for(const s of rows){const song=D.SONGS[ids[s.id]].song,flat=D.flatten(song),lead=s.events.filter(e=>e.role==='melody'),expected=[];
  for(let r=0;r<song.repeats;r++)for(const n of flat.notes)expected.push({midi:n.midi,t:(r*flat.beats+n.beat)*60/song.bpm+.05,dur:n.dur*60/song.bpm*.96});
  assert.equal(lead.length,expected.length,s.id);lead.forEach((e,i)=>{assert.equal(e.midi,expected[i].midi);assert.ok(Math.abs(e.t-expected[i].t)<1e-8);assert.ok(Math.abs(e.dur-expected[i].dur)<1e-8);});
 }
});
test('all 32 owner-selected compositions are present, with no additions',()=>{
 assert.ok(fs.existsSync(path.join(root,'source.json')),'source snapshot not yet generated');
 assert.deepEqual(read('source.json').map(s=>s.id).sort(),[...expected].sort());
});
test('all 50 final placement rows are copied without changing selections or performance directions',()=>{
 assert.ok(fs.existsSync(path.join(root,'placement.json')),'placement not yet generated');
 assert.deepEqual(read('placement.json').map(({rowId,...r})=>r),JSON.parse(JSON.stringify(D.TABLE)));
});
test('every arranged lead retains pitch, onset, note length, tempo, bars and repeats',()=>{
 assert.ok(fs.existsSync(path.join(root,'scores.json')),'arrangements not yet generated');
 for(const s of read('scores.json')){
  const orig=D.SONGS[s.id].song,flat=D.flatten(orig),lead=s.events.filter(e=>e.role==='melody');
  assert.equal(s.bpm,orig.bpm,s.id);assert.equal(s.repeats,orig.repeats,s.id);assert.equal(s.meter,orig.meter,s.id);
  const exp=[];for(let r=0;r<orig.repeats;r++)for(const n of flat.notes)exp.push({midi:n.midi,t:(r*flat.beats+n.beat)*60/orig.bpm+s.leadIn,dur:n.dur*60/orig.bpm*.96});
  assert.equal(lead.length,exp.length,s.id);
  lead.forEach((e,i)=>{assert.equal(e.midi,exp[i].midi,s.id);assert.ok(Math.abs(e.t-exp[i].t)<1e-8,s.id+' onset');assert.ok(Math.abs(e.dur-exp[i].dur)<1e-8,s.id+' duration');});
 }
});
test('flight keeps 120 BPM and sparkle; hatch is one shot with 0.35s lead-in and 2.4s tail',()=>{
 assert.ok(fs.existsSync(path.join(root,'scores.json')));
 const scores=read('scores.json'),flight=scores.find(s=>s.id==='var-flight'),h=scores.find(s=>s.id==='var-ohayo-hatch2');
 assert.equal(flight.bpm,120);assert.ok(flight.events.some(e=>e.instrument==='bell'));assert.ok(flight.events.some(e=>e.instrument==='harp'));
 assert.equal(h.loop,false);assert.equal(h.leadIn,.35);assert.ok(Math.abs(h.duration-6.75)<1e-8);
});
