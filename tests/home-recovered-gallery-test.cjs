const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const src=fs.readFileSync('tools/home-recovered-gallery.js','utf8');
 const fragment=src.slice(src.indexOf("const frames=[$('old')"),src.indexOf("$('apply').onclick"));
 const calls=[],nodes={candidateA:{value:'home-garden'},candidateB:{value:'home-interior-a'},width:{value:'390'},count:{value:'28'},time:{value:'day'},apply:{},qaStatus:{},metrics:{}};
 const candidates=[['home-garden','home'],['home-interior-a','home'],['forest-no-waterfall','forest'],['forest-waterfall','forest']].map(([id,region])=>({id,region,name:id}));
 for(const id of ['old','new']){let candidate='',region='home';const f={style:{},dataset:{},previousElementSibling:{},error:null};f.contentWindow={HomeV22QA:{scene(r){region=r;calls.push(candidate);},environment(){return {loaded:!f.error,error:f.error,candidate};},detail(){return {region,actors:[],slots:{homeEventSlot:{height:42},speechSlot:{height:76}}};}}};Object.defineProperty(f,'src',{set(value){candidate=new URL(value,'http://local').searchParams.get('candidate');f.onload();}});nodes[id]=f;}
 const context={$:id=>nodes[id],wait:()=>Promise.resolve(),ART_CANDIDATES:candidates,URL,encodeURIComponent,setTimeout:()=>0,clearTimeout:()=>{}};vm.createContext(context);vm.runInContext(fragment+'\nthis.apply=apply;this.measure=measure;',context);return {context,nodes,calls};
}
test('latest preset wins when clicked while a previous scene is loading',async()=>{const {context,nodes,calls}=harness();const initial=context.apply();nodes.candidateA.value='forest-no-waterfall';nodes.candidateB.value='forest-waterfall';await context.apply();await initial;await new Promise(setImmediate);assert.equal(nodes.old.dataset.candidate,'forest-no-waterfall');assert.equal(nodes.new.dataset.candidate,'forest-waterfall');assert.equal(calls.at(-1),'forest-waterfall');});
test('measurement controls preserve background errors instead of showing safe counts',()=>{const {context,nodes}=harness();nodes.old.error='背景画像を読み込めませんでした';context.measure();assert.equal(nodes.qaStatus.textContent,'背景画像を読み込めませんでした');});
test('measurement waits for the requested candidate before reporting readiness',()=>{const {context,nodes}=harness();context.measure();assert.match(nodes.qaStatus.textContent,/読み込み中/);});
