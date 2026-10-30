const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('every region gallery link is selectable in the validation panel',async()=>{
 const manifest=await import('../home-v9-manifest.mjs');
 for(const [region]of manifest.REGIONS){const id=manifest.selectRecoveredScene(region).candidate,options=[],select={add:o=>options.push(o),get value(){return this.v||''},set value(v){this.v=options.some(o=>o.value===v)?v:''}},nodes={candidate:select},document={getElementById:k=>nodes[k]||(nodes[k]={}),createElement:()=>({}),body:{append(){}}};
 const source=fs.readFileSync('tools/home-v9-qa.js','utf8').replace(/^import .*;\n/,'');
 vm.runInNewContext(source,{...manifest,document,location:{search:'?candidate='+id},URLSearchParams,Option:function(text,value){this.text=text;this.value=value},localStorage:{getItem(){return null}},setTimeout});
 assert.equal(select.value,id,region);
 }
});
