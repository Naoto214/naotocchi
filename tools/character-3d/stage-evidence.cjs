const assert=require('node:assert/strict');
function stageTargets(spec,args){
 if(args.includes('--no-species'))return [];
 const rollout=args.includes('--rollout'),rows=rollout?spec.ROLLOUT:spec.PILOT,keys=rollout?spec.ROLLOUT_STAGE_KEYS:spec.STAGE_KEYS;
 const i=args.indexOf('--line'),line=i<0?null:args[i+1];
 if(i>=0&&(!line||line.startsWith('--')))throw Error('--line requires an exact family');
 if(line&&!rows[line])throw Error('unknown stage family '+line);
 return (line?[line]:Object.keys(rows)).flatMap(id=>keys[id].map(stage=>id+':'+stage)).filter(k=>!args.includes('--focus')||['dandelion:8','butterfly:8'].includes(k));
}
function validateStages(expected,records){
 if(JSON.stringify([...expected].sort())!==JSON.stringify(Object.keys(records||{}).sort()))return false;
 return expected.every(key=>{const v=records[key],[id,stage]=key.split(':');return v.player3d&&v.specKey?.exact&&v.specKey.id===id&&v.specKey.stage===Number(stage)&&v.requestedStage===Number(stage)&&v.errors?.length===0&&v.live?.fallbacks===0;});
}
function mergeStages(expected,shards,source){
 const records={};for(const shard of shards){assert.equal(shard.sourceCommit,source,'source mismatch');assert.equal(shard.verdict?.pass,true,'failed shard');for(const[k,v]of Object.entries(shard.perSpecies||{})){assert.ok(!records[k],'duplicate stage '+k);records[k]=v;}}
 assert.ok(validateStages(expected,records),'incomplete or invalid stage coverage');return records;
}
module.exports={stageTargets,validateStages,mergeStages};
if(require.main===module){
 const fs=require('fs'),path=require('path'),dir=process.argv[2],out=process.argv[3],spec=require('../../character-3d/spec.js');
 const shards=[];function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(f.name==='meguru-qa.json'){const r=JSON.parse(fs.readFileSync(p));for(const v of Object.values(r.perSpecies||{}))for(const view of ['front','back'])assert.ok(v[view]&&fs.existsSync(path.join(d,path.basename(v[view]))),'missing '+view+' capture');shards.push(r);}}}walk(dir);
 const source=process.env.GITHUB_SHA;assert.ok(source,'exact source required');const expected=stageTargets(spec,['--rollout']),records=mergeStages(expected,shards,source);
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({sourceCommit:source,expected:expected.length,actual:Object.keys(records).length,shards:shards.length,perSpecies:records,verdict:{pass:true}},null,2));
}
