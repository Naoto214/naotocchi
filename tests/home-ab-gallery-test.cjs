const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const src=fs.readFileSync('tools/home-ab-gallery.js','utf8');
 const fragment=src.slice(src.indexOf("const frames=[$('old')"),src.indexOf("$('apply').onclick"));
 const calls=[],composites=[],nodes={candidateA:{value:'home-garden'},candidateB:{value:'home-interior-a'},width:{value:'390'},count:{value:'28'},time:{value:'day'},staticCount:{value:'6'},apply:{},qaStatus:{},metrics:{}};
 for(const id of ['landscape','portrait','rotate','live','freeze','speech','map','performance','homes','start'])nodes[id]={disabled:false};
 const candidates=[['home-garden','home'],['home-interior-a','home'],['forest-no-waterfall','forest'],['forest-waterfall','forest']].map(([id,region])=>({id,region,name:id}));
 for(const id of ['old','new']){let candidate='',region='home';const f={style:{},dataset:{},previousElementSibling:{},error:null};f.contentWindow={HomeV22QA:{scene(r){region=r;calls.push(candidate);},environment(){return {loaded:!f.error,error:f.error,candidate};},detail(){return {region,actors:[],slots:{homeEventSlot:{height:42},speechSlot:{height:76}}};}}};Object.defineProperty(f,'src',{set(value){candidate=new URL(value,'http://local').searchParams.get('candidate');f.onload();}});nodes[id]=f;}
 const context={$:id=>nodes[id],wait:()=>Promise.resolve(),ART_CANDIDATES:candidates,URL,encodeURIComponent,setTimeout:()=>0,clearTimeout:()=>{},drawStatic:s=>{composites.push(s);return Promise.resolve();}};vm.createContext(context);vm.runInContext(fragment+'\nthis.apply=apply;this.measure=measure;',context);return {context,nodes,calls,composites};
}
test('latest preset wins when clicked while a previous scene is loading',async()=>{const {context,nodes,calls}=harness();const initial=context.apply();nodes.candidateA.value='forest-no-waterfall';nodes.candidateB.value='forest-waterfall';await context.apply();await initial;await new Promise(setImmediate);assert.equal(nodes.old.dataset.candidate,'forest-no-waterfall');assert.equal(nodes.new.dataset.candidate,'forest-waterfall');assert.equal(calls.at(-1),'forest-waterfall');});
test('measurement controls preserve background errors instead of showing safe counts',()=>{const {context,nodes}=harness();nodes.old.error='背景画像を読み込めませんでした';context.measure();assert.equal(nodes.qaStatus.textContent,'背景画像を読み込めませんでした');});
test('measurement waits for the requested candidate before reporting readiness',()=>{const {context,nodes}=harness();context.measure();assert.match(nodes.qaStatus.textContent,/読み込み中/);});

test('static composites use the completed snapshot while a newer request is queued',async()=>{
 const {context,nodes,composites}=harness();const first=context.apply();
 nodes.candidateA.value='forest-no-waterfall';nodes.candidateB.value='forest-waterfall';nodes.count.value='6';nodes.width.value='320';await context.apply();
 await first;await new Promise(setImmediate);
 assert.equal(composites[0]?.ids[0],'home-garden');assert.equal(composites[0]?.count,28);assert.equal(composites[0]?.width,'390');
 assert.equal(composites.at(-1)?.ids[0],'forest-no-waterfall');assert.equal(composites.at(-1)?.width,'320');assert.equal(composites.at(-1)?.count,6);
});

test('loading locks layout and motion until both panes and exports agree',async()=>{
 const {context,nodes}=harness();let release;
 context.wait=()=>new Promise(resolve=>{release=resolve;});
 const pending=context.apply();await new Promise(setImmediate);
 for(const id of ['landscape','portrait','rotate','live','freeze','speech','map','performance','homes','start'])assert.equal(nodes[id].disabled,true,id+' is locked during loading');
 context.wait=()=>Promise.resolve();release();await pending;
 assert.equal(nodes.old.style.width,nodes.new.style.width);assert.equal(nodes.old.style.height,nodes.new.style.height);
 for(const id of ['landscape','rotate','live','start'])assert.equal(nodes[id].disabled,false,id+' is restored');
});
