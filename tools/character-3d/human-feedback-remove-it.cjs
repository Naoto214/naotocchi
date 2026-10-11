const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function run(authorOnly=false){
 const file='character-3d/nonplayer-spec.js',bytes=fs.readFileSync(file),source=bytes.toString(),anchor=' const authorRows=',old=require('../../docs/qa/character-3d-full-v0/human-feedback-20261011/before-specs.json').rows;
 const cases=[
  ['deer old stilt length','groveDeer.legs.len=.50;','deer leg length'],
  ['deer missing tapered anatomy',"groveDeer.details=groveDeer.details.filter(q=>!q.name.endsWith('Shape'));",'anatomical upper leg'],
  ['author former wide wedge and bare rear','naoto.hair='+JSON.stringify(old['author:naoto'].spec.hair)+';','rear scalp covered'],
  ['author missing posterior coverage','naoto.hair.closedVolumes.splice(1,1);','rear scalp covered']
 ].filter(([name])=>!authorOnly||name.startsWith('author'));
 const test=()=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap','tests/character-3d-human-feedback-test.cjs'],{encoding:'utf8',timeout:60000});
 let r=test();assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(source.split(anchor).length,2);
 for(const [name,mutation,reason]of cases){try{fs.writeFileSync(file,source.replace(anchor,mutation+'\n'+anchor));r=test();assert.equal(r.status,1,r.stdout+r.stderr);assert.ok(r.stdout.includes('AssertionError')&&r.stdout.includes(reason),name+': intended RED\n'+r.stdout);console.log(name+': RED');}finally{fs.writeFileSync(file,bytes);assert.ok(fs.readFileSync(file).equals(bytes));}}
 r=test();assert.equal(r.status,0,r.stdout+r.stderr);console.log(cases.length+'/'+cases.length+' controls detected; exact restoration '+crypto.createHash('sha256').update(bytes).digest('hex'));
}
if(require.main===module)run();module.exports={run};
