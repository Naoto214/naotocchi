const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),SPEC=require('../character-3d/spec.js');
const gallery=fs.readFileSync('character-3d/gallery.html','utf8'),full=fs.readFileSync('character-3d/full-gallery.html','utf8');
test('live gallery accepts every approved exact nonplayer key without dog fallback',()=>{
 const expression=gallery.match(/const ALL = (.+);/)[1];
 const ids=vm.runInNewContext(expression,{SPEC});
 for(const id of [...Object.keys(SPEC.NON_PLAYER),...Object.keys(SPEC.ARCHETYPE_REUSE)])assert.ok(ids.includes(id),id+' must remain selected');
 assert.ok(!ids.includes('author:__unreviewed__'));
});
test('full gallery live links resolve production role keys and preserve legacy and player stages',()=>{
 const expression=full.match(/link.href=`([^`]+)`/)[1];
 for(const r of [{kind:'form',id:'cat',stage:4},{kind:'companion',id:'cat_friend',stage:0},{kind:'companion',id:'shiba',stage:0},...Object.values(SPEC.NON_PLAYER).map(r=>({...r,stage:0}))]){
  const key=SPEC.specKeyFor(r.kind==='form'?{line:r.id,stage:r.stage,zeroBased:false}:{kind:r.kind,id:r.id});
  const link=vm.runInNewContext('`'+expression+'`',{r,SPEC,encodeURIComponent});
  const q=new URL(link,'https://qa.invalid/').searchParams;assert.equal(q.get('id'),key.id,r.kind+':'+r.id);assert.equal(Number(q.get('stage')),key.stage);
 }
});
test('actual gallery syncUi renders approved role metadata without legacy-only dereference',()=>{
 const source=gallery.match(/function syncUi\(\) \{[\s\S]*?\n\}/)[0];
 for(const id of [...Object.keys(SPEC.NON_PLAYER),...Object.keys(SPEC.ARCHETYPE_REUSE),'cat']){
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
  const stage=id==='cat'?4:0,st={id,stage,emotion:'normal',mode:'C',layout:'single'};
  vm.runInNewContext(source+';syncUi();',{SPEC,st,$:get,sel:{},stagesOf:()=>[stage],clearRow:()=>{},btn:()=>{},az:0,VIEWS:{},URL,location:{href:'https://qa.invalid/gallery.html'},history:{replaceState:()=>{}}});
  assert.equal(get('refBase').src,'../'+SPEC.referenceAsset(id,stage));assert.ok(get('why').textContent,id);
 }
});
