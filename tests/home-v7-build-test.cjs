const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
test('v7 builder is additive and scopes script, conversation and away per frame',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'home-v7-test-'));
 try{let source='../site/dist';if(!fs.existsSync(source+'/release-v6.json')){source=path.join(dir,'v6-fixture');execFileSync(process.execPath,['tools/home-v6-build.cjs',source],{stdio:'inherit'});}
 const files=fs.readdirSync(source).filter(f=>fs.statSync(path.join(source,f)).isFile());for(const f of files)fs.copyFileSync(path.join(source,f),path.join(dir,f));
 fs.mkdirSync(path.join(dir,'assets/world'),{recursive:true});for(const f of ['star_stop-v1.webp','memory_lake-v1.webp'])fs.copyFileSync('assets/world/'+f,path.join(dir,'assets/world',f));
 const before=Object.fromEntries(files.filter(f=>!f.includes('v7')).map(f=>[f,fs.readFileSync(path.join(dir,f))]));
 execFileSync(process.execPath,['tools/home-v7-build.cjs',dir,'--existing']);
 for(const [f,data]of Object.entries(before))assert.deepEqual(fs.readFileSync(path.join(dir,f)),data,f);
 for(const scope of ['qa','sheet','play']){const stem=scope==='qa'?'qa-home-v7':scope==='sheet'?'qa-home-v7-sheet':'home-v7-play';const script=fs.readFileSync(path.join(dir,stem+'-script.js'),'utf8');assert.ok(script.includes('naotocchi-home-v7-'+scope+'-v1'));assert.ok(!script.includes('naotocchi-home-v6-'));for(const n of ['director','away']){const c=fs.readFileSync(path.join(dir,'home-v7-'+scope+'-conversation-'+n+'.js'),'utf8');assert.ok(c.includes('naotocchi-home-v7-'+scope+':'));assert.ok(!c.includes('naotocchi-home-v6-'));}}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
