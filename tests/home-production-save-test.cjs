const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {harness}=require('./helpers/runtime-harness.cjs');
const dir=path.join(__dirname,'fixtures/saves/real'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
const storage=raw=>{const data=new Map([['naotocchi-save-v1',raw]]);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
for(const {file} of manifest)test('shipped home adapters preserve real save '+file,()=>{
 const raw=fs.readFileSync(path.join(dir,file),'utf8'),a=storage(raw),b=storage(raw);
 const legacy=harness({storage:a,resume:true,deterministic:true,homeDiorama:true});
 const production=harness({storage:b,resume:true,deterministic:true,homeDiorama:true,productionHome:true});
 const plain=h=>JSON.parse(JSON.stringify(h.api.state()));assert.deepEqual(plain(production),plain(legacy));
 assert.ok(b.data.has('naotocchi-save-v1'));assert.ok(![...b.data.keys()].some(k=>/home-v9/.test(k)));
});
