// Scoped QA gate controls only; production files and browser captures are untouched.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file='tools/character-3d/runtime-integration.cjs',original=fs.readFileSync(file),text=original.toString();
const cases=[
 ['full45 requirement omitted',"  assert.ok(!requireFull || rows.length === 45 && !missing.length, 'all45 production roles required; missing ' + missing.join(','));",'','production role planner'],
 ['actual role kind guard omitted',"  assert.equal(r.actorIdentity.kind, row.kind === 'author' ? 'naoto' : row.kind, 'actual role identity');",'','functional gate rejects'],
 ['live template identity guard omitted',"  assert.equal(r.template?.id, row.specKey.id, 'exact live template');",'','functional gate rejects'],
 ['author draw restoration guard omitted',"['natural2D','sameActor','restoredActor','restoredPose','restoredDraw','restoredStep','restoredList']","['natural2D','sameActor','restoredActor','restoredPose','restoredStep','restoredList']",'author functional gate'],
 ['city live cleanup guard omitted',"assert.equal(sample[state].live, 0, state + ' cleanup');",'','repeated scene gate'],
 ['warm template plateau guard omitted',"const PLATEAU = ['templates', 'materials'","const PLATEAU = ['materials'",'repeated scene gate'],
 ['startup maximum mislabeled appearance window',"const neighbors=samples.slice(Math.max(0,i-1),i+2);","const neighbors=samples;",'appearance windows']
];
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','--test-name-pattern='+pattern,'tests/character-3d-runtime-integration-test.cjs'],{encoding:'utf8',timeout:120000});
let result=run('production role planner|functional gate|repeated scene gate|appearance windows');assert.equal(result.status,0,result.stdout+result.stderr);
for(const [label,anchor,replacement,pattern]of cases){assert.equal(text.split(anchor).length,2,label+': unique scoped QA anchor');try{fs.writeFileSync(file,text.replace(anchor,replacement));result=run(pattern);assert.equal(result.status,1,label+': expected meaningful RED\n'+result.stdout);assert.ok(result.stdout.includes('AssertionError'),label+': assertion failure');console.log(label+': RED');}finally{fs.writeFileSync(file,original);assert.ok(fs.readFileSync(file).equals(original),'exact QA gate bytes restored');}}
result=run('production role planner|functional gate|repeated scene gate|appearance windows');assert.equal(result.status,0,result.stdout+result.stderr);console.log(cases.length+'/'+cases.length+' controls detected; restored focused GREEN; exact SHA256 '+crypto.createHash('sha256').update(original).digest('hex'));
