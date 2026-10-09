// Scoped QA gate controls only; production files and browser captures are untouched.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='tools/character-3d/runtime-integration.cjs',original=fs.readFileSync(file),text=original.toString();
const cases=[
 ['full45 requirement omitted',"  assert.ok(!requireFull || rows.length === 45 && !missing.length, 'all45 production roles required; missing ' + missing.join(','));",'','production role planner'],
 ['actual role kind guard omitted',"  assert.equal(r.actorIdentity.kind, row.kind === 'author' ? 'naoto' : row.kind, 'actual role identity');",'','functional gate rejects'],
 ['live template identity guard omitted',"  assert.equal(r.template?.id, row.specKey.id, 'exact live template');",'','functional gate rejects'],
 ['author draw restoration guard omitted',"['natural2D','sameActor','restoredActor','restoredPose','restoredDraw','restoredStep','restoredList']","['natural2D','sameActor','restoredActor','restoredPose','restoredStep','restoredList']",'author functional gate'],
 ['city retained live bound guard omitted',"assert.equal(city.live,before.live,'city retained live bound');",'','natural city cache','city-cache'],
 ['warm template plateau guard omitted',"const PLATEAU = ['templates', 'materials'","const PLATEAU = ['materials'",'repeated scene gate'],
 ['startup maximum mislabeled appearance window',"const neighbors=samples.slice(Math.max(0,i-1),i+2);","const neighbors=samples;",'appearance windows'],
 ['save boundary state bytes ignored','save:before.state===after.state','save:true','strict boundaries preserve','save-boundary'],
 ['save boundary write count ignored','saveWrites:before.writes===after.writes','saveWrites:true','functional validation rejects dirty','save-boundary'],
 ['save boundary dirty proof discarded','observer.record(proof);','if(proof.save&&proof.storage&&proof.getter&&proof.saveWrites)observer.record(proof);','strict boundaries preserve','save-boundary'],
 ['failing row omitted before validation','  results.push(result);','', 'failing functional row', 'save-boundary'],
 ['dirty constituent boundaries ignored',"  if(r.boundaries)for(const proof of r.boundaries)for(const key of ['save','storage','getter','saveWrites'])assert.equal(proof[key],true,'dirty presentation boundary '+proof.label+' '+key);",'', 'functional validation rejects dirty','save-boundary'],
 ['scene readiness failure ignored',"  assert.ok(!r.error && !r.restorationError, 'repeated scene readiness/restoration: '+(r.error?.message||r.restorationError?.message||''));",'','scene timeout retains','scene-diagnostics'],
 ['failed scene raw artifact discarded','    fs.writeFileSync(file,JSON.stringify(report,null,2));','','failed scene raw result','scene-diagnostics'],
 ['stale seven actor count reused before readiness','fixtureCount=fixtureComposition.length;','fixtureCount=result.initial.live;','held current view','scene-baseline'],
 ['same-count roster substitution accepted','JSON.stringify(actual.composition)===JSON.stringify(fixtureComposition)','true','same count','scene-baseline'],
 ['visible city GL accepted',"  assert.equal(city.hiddenGL,true,'city GL canvas hidden');",'','natural city cache','city-cache'],
 ['new city holder identity accepted',"['sameScene','sameHolders','sameCanvases']","['sameScene','sameCanvases']",'natural city cache','city-cache'],
 ['city resource growth accepted',"  for(const key of [...PLATEAU,'created','removed'])assert.equal(city[key],before[key],'city resource growth '+key);",'','natural city cache','city-cache'],
 ['scene phase save observations omitted','result.saveObservations.push(proof);',"if(label!=='warmup/city')result.saveObservations.push(proof);",'scene save diagnostics expose','scene-save-observability'],
 ['scene save call provenance discarded','saveCalls:calls,eventLimitReached','saveCalls:[],eventLimitReached','scene save diagnostics expose','scene-save-observability'],
 ['scene dirty presentation proof discarded','result.boundaries.push(proof);','if(proof.save)result.boundaries.push(proof);','scene save diagnostics retain dirty','scene-save-observability'],
 ['scene cleanup save observation omitted',"saveObservation('cleanup',cleanupBefore,cleanupEvents,'Restoration via normal application operations');",'', 'scene save diagnostics preserve','scene-save-observability']
];
const scope=process.argv.includes('--scene-save-observability-only')?'scene-save-observability':process.argv.includes('--city-cache-only')?'city-cache':process.argv.includes('--scene-baseline-only')?'scene-baseline':process.argv.includes('--scene-diagnostics-only')?'scene-diagnostics':process.argv.includes('--save-boundaries-only')?'save-boundary':null;
const selected=scope?cases.filter(c=>c[4]===scope||(scope==='scene-diagnostics'&&['scene-baseline','city-cache','scene-save-observability'].includes(c[4]))):cases;
const run=(pattern,suite='integration')=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','--test-name-pattern='+pattern,'tests/character-3d-runtime-'+((suite==='scene-diagnostics'||suite==='scene-baseline'||suite==='city-cache'||suite==='scene-save-observability')?'scene-diagnostics':suite==='save-boundary'?'save-boundary':'integration')+'-test.cjs'],{encoding:'utf8',timeout:120000});
const focused=scope==='scene-save-observability'?'scene save diagnostics|scene browser helper':scope==='city-cache'?'natural city cache':scope==='scene-baseline'?'held current view|same count':scope==='scene-diagnostics'?'scene timeout|scene diagnostic|failed scene|scene-only':scope==='save-boundary'?'strict boundaries|failing functional row|runtime marker|real Meguru|functional validation':'production role planner|functional gate|repeated scene gate|appearance windows',suite=scope||'integration';
let result=run(focused,suite);assert.equal(result.status,0,result.stdout+result.stderr);
for(const [label,anchor,replacement,pattern,suite]of selected){assert.equal(text.split(anchor).length,2,label+': unique scoped QA anchor');try{fs.writeFileSync(file,text.replace(anchor,replacement));result=run(pattern,suite);assert.equal(result.status,1,label+': expected meaningful RED\n'+result.stdout);assert.ok(result.stdout.includes('AssertionError'),label+': assertion failure');console.log(label+': RED');}finally{fs.writeFileSync(file,original);assert.ok(fs.readFileSync(file).equals(original),'exact QA gate bytes restored');}}
result=run(focused,suite);assert.equal(result.status,0,result.stdout+result.stderr);console.log(selected.length+'/'+selected.length+' controls detected; restored focused GREEN; exact SHA256 '+crypto.createHash('sha256').update(original).digest('hex'));
