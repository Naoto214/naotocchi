const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'naopoyo-gauge-'));
try{
 for(const f of fs.readdirSync(root))if(f.endsWith('.mjs'))fs.copyFileSync(path.join(root,f),path.join(tmp,f));
 fs.mkdirSync(path.join(tmp,'tests'));fs.cpSync(path.join(__dirname,'fixtures'),path.join(tmp,'tests/fixtures'),{recursive:true});fs.copyFileSync(path.join(__dirname,'gauge-comparison.test.mjs'),path.join(tmp,'tests/gauge-comparison.test.mjs'));
 const cases=[
 ['second-ply ablation','egg-policy.mjs','candidates(r.z, policy, allowItems, options)','candidates(r.z, policy, allowItems, {})'],
 ['action ablation','egg-policy.mjs','if (options.allowedTypes && !options.allowedTypes.includes(a.type)) continue;',''],
 ['absolute reserve','egg-policy.mjs','options.reservePoints ?? 3 * s.rules.gaugeUnit','3 * s.rules.gaugeUnit'],
 ['burden penalty','egg-policy.mjs','options.transformPenalty ?? 0','0'],
 ['UI tool taps','gauge-comparison.mjs','screenDiscrete+=4;screenHold+=4;toolInputs+=4','screenDiscrete+=2;screenHold+=2;toolInputs+=2'],
 ['waiting is not a tap','gauge-comparison.mjs',"if(op==='down'){downSteps++;prev=null;continue;}","if(op==='down'){downSteps++;prev=null;}"],
 ['death source','gauge-comparison.mjs','out.winTrigger??=a.type',"out.winTrigger??='drop'"],
 ['selection priority','gauge-comparison.mjs','b.wins-a.wins','a.wins-b.wins'],
 ['selection burden tie','gauge-comparison.mjs','a.transforms-b.transforms','b.transforms-a.transforms']
 ];
 const test=()=>spawnSync(process.execPath,['--test','tests/gauge-comparison.test.mjs'],{cwd:tmp,encoding:'utf8'});
 if(test().status!==0)throw Error('Unmutated baseline failed');
 for(const [name,file,a,b]of cases){const f=path.join(tmp,file),base=fs.readFileSync(f,'utf8');if(!base.includes(a))throw Error('Missing mutation '+name);fs.writeFileSync(f,base.replaceAll(a,b));const r=test();fs.writeFileSync(f,base);if(r.status===0)throw Error('Survived '+name);if(!r.stdout.includes('AssertionError'))throw Error('Non-assertion failure '+name+' '+r.stdout+r.stderr);console.log('DETECTED',name);}
 if(test().status!==0)throw Error('Restored baseline failed');console.log('PASS',cases.length,'/',cases.length,'restored baseline');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
