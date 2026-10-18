const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'naopoyo-opt-'));
try{
 for(const f of fs.readdirSync(root))if(f.endsWith('.mjs'))fs.copyFileSync(path.join(root,f),path.join(tmp,f));
 fs.mkdirSync(path.join(tmp,'tests'));fs.cpSync(path.join(__dirname,'fixtures'),path.join(tmp,'tests/fixtures'),{recursive:true});fs.copyFileSync(path.join(__dirname,'optimization.test.mjs'),path.join(tmp,'tests/optimization.test.mjs'));
 const cases=[['actual six kinds','if(r.kinds>5)','if(false)'],['08 count','e.to===8','e.to===7'],['censoring','\'censored\'','\'gameover\''],['two 08','living>=2','living>=3'],['death action','win?1e7','win?-1e7'],['live tool guard',"toolTransaction(s,spawnPose(s.rules),a).state","applyAction(s,a,false)"]];
 const f=path.join(tmp,'optimization.mjs'),base=fs.readFileSync(f,'utf8');
 for(const [name,a,b] of cases){if(!base.includes(a))throw Error('Missing mutation');fs.writeFileSync(f,base.replaceAll(a,b));const r=spawnSync(process.execPath,['--test','tests/optimization.test.mjs'],{cwd:tmp,encoding:'utf8'});if(r.status===0)throw Error('Survived: '+name);console.log('DETECTED',name);}
 fs.writeFileSync(f,base);if(spawnSync(process.execPath,['--test','tests/optimization.test.mjs'],{cwd:tmp}).status!==0)throw Error('Baseline failed');console.log('PASS 6/6 restored baseline');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
