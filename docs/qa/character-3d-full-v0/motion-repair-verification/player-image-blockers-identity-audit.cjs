const fs=require('fs'),cp=require('child_process'),assert=require('assert/strict'),vm=require('vm'),path=require('path'),{pathToFileURL}=require('url'),localRequire=require('module').createRequire(path.resolve('audit.cjs'));
(async()=>{
 const file='character-3d/.player-image-before.mjs',base=cp.execFileSync('git',['show','9528525d:character-3d/archetypes.mjs'],{encoding:'utf8'}),current=fs.readFileSync('character-3d/archetypes.mjs','utf8');
 assert.equal(current.replace('sp.fins.rootFactor ?? (sp.fins.spread ? .94 : .8)','sp.fins.spread ? .94 : .8'),base,'only fish root opt-in differs in complete shared factory');
 fs.writeFileSync(file,base);
 try{
  const before=await import(pathToFileURL(path.resolve(file))),after=await import(pathToFileURL(path.resolve('character-3d/archetypes.mjs'))),S=localRequire('./character-3d/spec.js'),{sameRigDefaults}=localRequire('./tests/helpers/character-3d-soft-toy-baseline.cjs'),seen=new Set();
  function compare(id,stage,sp){const key=id+':'+stage;if(seen.has(key))return;seen.add(key);const a=after.BUILDERS[sp.archetype](sp,key),b=before.BUILDERS[sp.archetype](sp,key),af=Array.isArray(a.faceSpec)?a.faceSpec:[a.faceSpec],bf=Array.isArray(b.faceSpec)?b.faceSpec:[b.faceSpec];assert.equal(af.length,bf.length);for(let i=0;i<af.length;i++)sameRigDefaults({...a,faceSpec:af[i]},{...b,faceSpec:bf[i]},key+'/face'+i);console.log(key+': exact assembled attrs/indices/transforms/faceSpec');}
  let pilots=0;for(const[id,row]of Object.entries(S.PILOT))for(const[n,sp]of Object.entries(row.stages)){compare(id,n,sp);pilots++;}assert.equal(pilots,26);for(const [id,sp]of Object.entries(S.ARCHETYPE_REUSE)){compare(id,0,sp);pilots++;}assert.equal(pilots,28);console.log('28/28 immutable Pilot roster exact (26 player definitions + two legacy reused role inputs)');
  for(const n of [1,2,3,4,5,6,7,8])compare('salmon',n,S.ROLLOUT.salmon.stages[n]);for(const n of [1,2,3,4,8])compare('mushroom',n,S.ROLLOUT.mushroom.stages[n]);for(const n of [1,4,8])compare('clownfish',n,S.ROLLOUT.clownfish.stages[n]);
  console.log(seen.size+' unique unaffected assembled input rigs exact; all11 unaffected fish stages exact; all5 unaffected mushroom stages exact');
  for(const f of ['fish-spec.js','topology-spec.js']){const ctx={module:{exports:{}},globalThis:{}};vm.runInNewContext(cp.execFileSync('git',['show','9528525d:character-3d/'+f],{encoding:'utf8'}),ctx);const rows=ctx.module.exports(S.PILOT),now=localRequire('./character-3d/'+f)(S.PILOT);for(const[id,row]of Object.entries(rows))for(const[n,sp]of Object.entries(row.stages)){if(id==='mushroom'&&[5,6,7].includes(+n)||id==='clownfish'&&[2,3,5,6,7].includes(+n))continue;assert.equal(JSON.stringify(now[id].stages[n]),JSON.stringify(sp),id+':'+n+' unchanged definition');}}
  console.log('All unaffected fish/topology stage definitions exact; no current candidate rows frozen.');
 }finally{fs.unlinkSync(file);}
})().catch(e=>{console.error(e);process.exitCode=1;});
