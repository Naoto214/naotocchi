const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const builder=require('../tools/relationship-home-qa/build.cjs');
const bootstrap=require('../tools/relationship-home-qa/bootstrap.js');
const install=require('../tools/relationship-home-qa/runtime-hook.js');
const cases=builder.createCases();

test('twenty cases reuse complete fixtures, exact partner/state and selective rescue',()=>{
 assert.equal(cases.length,20);assert.equal(new Set(cases.map(c=>c.id)).size,20);
 for(const id of ['forest_bear','rock_octopus'])for(const face of ['normal','positive','lonely']){
  const c=cases.find(c=>c.id===id+'-'+face);assert.equal(c.save.partner.id,id);assert.equal(c.save.partner.affection,face==='lonely'?20:50);
 }
 assert.equal(cases.find(c=>c.id==='dense').save.companions.length,26);
 assert.deepEqual(cases.find(c=>c.id==='multi-rescue').save.companions.map(c=>c.bond),[20,25,60]);
 assert.equal(cases.find(c=>c.id==='single-rescue').save.companions.filter(c=>c.bond<30).length,1);
});

test('memory storage never reads/writes persistent local or session storage',()=>{
 let touched=0;const w={};for(const key of ['localStorage','sessionStorage'])Object.defineProperty(w,key,{configurable:true,get(){touched++;throw Error('persistent accessed');}});
 bootstrap.installStorage(w,{fixture:true});assert.equal(touched,0);
 w.localStorage.setItem('x','y');w.sessionStorage.setItem('x','z');assert.equal(w.localStorage.getItem('x'),'y');assert.equal(w.sessionStorage.getItem('x'),'z');
 w.localStorage.clear();assert.equal(w.localStorage.length,0);assert.equal(touched,0);
});

test('denied storage replacement fails closed before activating any game script',async()=>{
 let executed=0;const w={};Object.defineProperty(w,'localStorage',{configurable:false,value:{}});
 await assert.rejects(()=>bootstrap.start(w,{save:{}},()=>{executed++;}),/Storage isolation/);assert.equal(executed,0);
});

test('generated Home preserves production markup/CSS and scripts remain inert until isolation',()=>{
 const html=builder.gameDocument(cases);assert.match(html,/application\/x-relationship-qa/);assert.match(html,/qa-bootstrap.js/);
 assert.match(html,/<meta name="viewport"/);assert.match(html,/cast-layout.js\?v=/);assert.match(html,/relationship-expression.js\?v=/);
 assert.doesNotMatch(html,/<script src="script.js/);assert.match(html,/src="qa-runtime.js/);
 const source=fs.readFileSync('script.js','utf8'),generated=builder.instrument(source);
 assert.equal(generated.replace(builder.BRIDGE,''),source);
 assert.throws(()=>builder.instrument('other program'),/anchor/);
});

// Load the existing harness with only the disposable QA export appended to its
// script.js input. Restore fs immediately: no production file is written.
const read=fs.readFileSync;
let harness;
try {fs.readFileSync=function(p,...args){const result=read.call(this,p,...args);return p==='script.js'?builder.instrument(result):result;};
 delete require.cache[require.resolve('./helpers/runtime-harness.cjs')];harness=require('./helpers/runtime-harness.cjs').harness;
} finally {fs.readFileSync=read;}
const productionPositiveIds=require('../relationship-expression.js').companionPositiveIds;
function scene(id,phase){
 const c={...cases.find(c=>c.id===id),phase},h=harness();
 Object.assign(h.api.state(),JSON.parse(JSON.stringify(c.save)));
 for(const name of ['storyFlash','lifeCardOverlay','speechBubble'])h.get(name).classList.add('hidden');
 h.get('playWithBtn').click=()=>h.dispatch(h.get('playWithBtn'),'click');
 const env={setTimeout:h.sandbox.setTimeout,clearTimeout:h.sandbox.clearTimeout,setInterval:()=>0,clearInterval:()=>{},Math:vm.runInContext('Math',h.sandbox)};
 env.NaotocchiRelationshipExpression=h.window.NaotocchiRelationshipExpression;
 const qa=install(h.window.__relationshipQaBridge,c,env);h.api.render();return {h,qa};
}
const markup=h=>h.get('companionLeft').innerHTML+h.get('companionRight').innerHTML;
for(const [id,count] of [['ordinary',1],['single-rescue',1],['multi-rescue',2]])test(id+' invokes real play; only expected individuals positive then normal',()=>{
 const {h,qa}=scene(id);qa.run();h.advance(1);assert.equal((markup(h).match(/\/positive.png/g)||[]).length,count);
 if(id==='multi-rescue'){assert.deepEqual(Array.from(h.api.state().companions,c=>c.bond),[50,55,90]);assert.ok(!markup(h).includes('relationship/cat_friend/positive.png'));}
 h.advance(2501);assert.ok(!markup(h).includes('/positive.png'));assert.ok(!markup(h).includes('/lonely.png'));
 const bonds=Array.from(h.api.state().companions,c=>c.bond);qa.run();assert.deepEqual(Array.from(h.api.state().companions,c=>c.bond),bonds,'one action per fixture; reload to replay');
});
test('low current value returns from actual temporary reaction to lonely at 2500ms',()=>{
 const {h,qa}=scene('return-lonely');qa.run();assert.match(h.get('partnerCompanion').innerHTML,/positive.png/);
 h.advance(2499);assert.match(h.get('partnerCompanion').innerHTML,/positive.png/);h.advance(2);assert.match(h.get('partnerCompanion').innerHTML,/lonely.png/);
});
test('fixed partner stimulus uses real resolver and never serializes expression',()=>{
 const {h}=scene('forest_bear-positive');assert.match(h.get('partnerCompanion').innerHTML,/relationship\/forest_bear\/positive.png/);
 assert.doesNotMatch(JSON.stringify(h.api.state()),/reactionUntil|relationshipExpression/);
});
test('outside transition button allows its synthetic click through Home interception',()=>{
 const {h,qa}=scene('ordinary'),button=h.get('playWithBtn'),original=button.click;
 button.click=()=>{if(!qa.running){qa.run();return;}original();};
 qa.run();h.advance(1);assert.equal((markup(h).match(/\/positive.png/g)||[]).length,1);
});
test('iPhone Home has reachable parent return control without shrinking iframe',()=>{
 const controls=fs.readFileSync('tools/relationship-home-qa/controls.js','utf8'),page=fs.readFileSync('tools/relationship-home-qa/page.html','utf8');
 assert.match(page,/id="quick-back"/);assert.match(page,/#quick-back\{[^}]*position:fixed/);
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{style:{},value:'',disabled:false,hidden:true,getBoundingClientRect(){return {top:1000,bottom:1844};},appendChild(){},addEventListener(){},scrollIntoView(){this.scrolled=true;}});return nodes.get(id);};
 node('case-data').textContent=JSON.stringify(cases.map(({save,...c})=>c));
 const listeners={};const w={innerWidth:390,innerHeight:844,addEventListener:(name,fn)=>listeners[name]=fn};
 vm.runInNewContext(controls,{document:{getElementById:node,createElement:()=>node('option')},window:w,location:{origin:'https://qa.example'},setTimeout:()=>1,clearTimeout(){}});
 assert.equal(node('game').style.height,'844px');
 node('show').onclick();assert.equal(node('quick-back').hidden,false);assert.equal(node('game').scrolled,true);
 node('quick-back').onclick();assert.equal(node('controls').scrolled,true);assert.equal(node('quick-back').hidden,true);
 w.innerHeight=568;w.innerWidth=320;listeners.resize();assert.equal(node('game').style.height,'568px');
 node('game').getBoundingClientRect=()=>({top:0,bottom:568});listeners.scroll();assert.equal(node('quick-back').hidden,false);
});
test('packaging refuses a nonempty output so unrelated files cannot be published',()=>{
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'relationship-qa-output-'));
 try{fs.writeFileSync(path.join(dir,'unrelated.txt'),'not a QA asset');assert.throws(()=>builder.build(dir),/empty output/);}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('transition assets preload before readiness; missing image blocks QA',async()=>{
 const loaded=[];class Img{set src(s){loaded.push(s);}decode(){return Promise.resolve();}}
 await bootstrap.preloadImages({Image:Img},cases.find(c=>c.id==='multi-rescue'));
 assert.ok(loaded.includes('assets/characters/relationship/otter/positive.png'));assert.ok(loaded.includes('assets/characters/relationship/clock/lonely.png'));
 assert.ok(loaded.includes('assets/characters/partners/forest_bear.png'));
 class Broken{set src(s){this.url=s;}decode(){return Promise.reject(Error('missing'));}}
 await assert.rejects(()=>bootstrap.preloadImages({Image:Broken},cases[0]),/画像/);
});
test('fixed positive snapshots the real reaction without a repeating timer',()=>{
 let renders=0,starts=0,snapshot;const api={state:()=>({partner:{id:'forest_bear'}}),startRelationshipPositive:()=>starts++,render:()=>renders++,snapshot:phase=>snapshot=phase};
 install(api,{mode:'held'},{setInterval:()=>{throw Error('no repeating render');}});
 assert.equal(starts,1);assert.equal(renders,1);assert.equal(snapshot,'positive');
});
test('static dense case preloads only each actor current expression',async()=>{
 const loaded=[];class Img{set src(s){loaded.push(s);}decode(){return Promise.resolve();}}
 await bootstrap.preloadImages({Image:Img},cases.find(c=>c.id==='dense'));
 assert.equal(loaded.length,27);assert.equal(loaded.filter(s=>s.endsWith('/positive.png')).length,0);
});
test('QA representative draw never forces unrelated event randomness and restores resolver',()=>{
 const random=()=>0.99,env={Math:{random},NaotocchiRelationshipExpression:{companionPositiveIds:productionPositiveIds}};
 const original=env.NaotocchiRelationshipExpression.companionPositiveIds;
 const api={play(){assert.equal(env.Math.random,random);assert.deepEqual(env.NaotocchiRelationshipExpression.companionPositiveIds([],[{id:'a'},{id:'b'}]),['a']);throw Error('click failed');}};
 const qa=install(api,{mode:'play'},env);assert.throws(()=>qa.run(),/click failed/);
 assert.equal(env.Math.random,random);assert.equal(env.NaotocchiRelationshipExpression.companionPositiveIds,original);assert.equal(qa.running,false);
});
test('QA timing reports double-frame latency outside Home and deduplicates nested clicks',()=>{
 let listener,now=10;const frames=[],messages=[];
 const w={performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),parent:{postMessage:(m,o)=>messages.push([m,o])},location:{origin:'https://qa.example'}};
 bootstrap.observeInteractions(w,{addEventListener:(name,fn,capture)=>{assert.equal(name,'click');assert.equal(capture,true);listener=fn;}},{id:'multi-rescue'});
 const e={target:{closest:()=>({})}};listener(e);listener(e);assert.equal(frames.length,1);
 now=30;frames.shift()();now=50;frames.shift()();
 assert.deepEqual(messages,[[{type:'relationship-qa-timing',id:'multi-rescue',ms:40},'https://qa.example']]);
 listener(e);assert.equal(frames.length,1);
});

test('fixed before, positive and after reuse real rescue while live keeps its clock',()=>{
 for(const [phase,face] of [['before','lonely'],['positive','positive'],['after','normal']]){
  const {h,qa}=scene('multi-rescue',phase);
  const html=markup(h);assert.equal((html.match(/\/positive.png/g)||[]).length,face==='positive'?2:0);
  assert.equal((html.match(/\/lonely.png/g)||[]).length,face==='lonely'?2:0);
  assert.deepEqual(Array.from(h.api.state().companions,c=>c.bond),phase==='before'?[20,25,60]:[50,55,90]);
  h.advance(3000);if(phase==='positive')assert.equal((markup(h).match(/\/positive.png/g)||[]).length,2);
  assert.equal(qa.run(),false);
 }
});

for(const face of ['normal','lonely','positive'])test('married QA retains the ring while showing '+face,()=>{
 const {h}=scene('married-'+face);assert.equal(h.api.state().partner.married,true);
 assert.ok(h.get('partnerCompanion').innerHTML.includes('partner-ring'));
 assert.equal(h.get('partnerCompanion').querySelector('.partner-emoji').dataset.relationshipState,face);
});
test('companion fixed positive stimulates only selected companion; dense lonely has 26 low values',()=>{
 const {h}=scene('companion-positive');assert.equal((markup(h).match(/positive.png/g)||[]).length,1);
 assert.ok(!h.get('partnerCompanion').innerHTML.includes('positive.png'));
 assert.equal(cases.find(c=>c.id==='dense-lonely').save.companions.filter(c=>c.bond<30).length,26);
});

test('ring comparison restores production defaults and only changes ring presentation tokens',()=>{
 const values=new Map([['--unrelated','keep']]);
 const doc={documentElement:{style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)}}};
 bootstrap.applyRingComparison(doc,'legacy');
 assert.equal(values.get('--married-ring-scale'),'1');assert.equal(values.get('--married-ring-tone'),'none');
 for(const size of ['1.15','1.25']){bootstrap.applyRingComparison(doc,size);assert.equal(values.get('--married-ring-scale'),size);assert.equal(values.has('--married-ring-tone'),false);}
 for(const input of ['1.2','invalid','9']){bootstrap.applyRingComparison(doc,input);assert.equal(values.has('--married-ring-scale'),false);assert.equal(values.has('--married-ring-tone'),false);}
 assert.deepEqual([...values],[['--unrelated','keep']]);
});
