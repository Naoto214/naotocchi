'use strict';
// Node 22/24 ships Acorn. Use `node --expose-internals ...` for this offline audit,
// or supply an installed Acorn. The game itself loads neither this script nor Acorn.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
let acorn;
try{acorn=require('acorn');}catch{acorn=require('internal/deps/acorn/acorn/dist/acorn');}
const [original,corrected,baseline,out,firstRef,finalRef]=process.argv.slice(2);
if(!/^[a-f0-9]{40}$/.test(firstRef||'')||!/^[a-f0-9]{40}$/.test(finalRef||''))throw Error('Expected original game files, corrected game files, baseline game directory, result path, original and corrected commit SHAs');
const hash=s=>createHash('sha256').update(s).digest('hex');
const parse=s=>acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'});
const ast=n=>JSON.stringify(n,(k,v)=>['start','end','raw'].includes(k)?undefined:v);
const nodes=(n,fn)=>{if(!n||typeof n!=='object')return;fn(n);for(const v of Object.values(n))nodes(v,fn);};
const expression=s=>ast(parse('const x = '+s).body[0].declarations[0].init);
const statement=s=>ast(parse(s).body[0]);
const one=(s,a,b)=>{assert.equal(s.split(a).length,2,'expected a unique generated construct: '+a.slice(0,80));return s.replace(a,b);};
function replaceNode(s,match,replacement,expected=1){
  const found=[];nodes(parse(s),n=>{if(match(n))found.push(n);});
  assert.equal(found.length,expected,'unexpected audited syntax occurrence');
  for(const n of found.reverse())s=s.slice(0,n.start)+replacement+s.slice(n.end);
  return s;
}
function declarator(n,name){return n.type==='VariableDeclaration'&&n.declarations.length===1&&n.declarations[0].id.name===name;}
const regions='home river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split(' ').sort();
const nav='home-visible-ground-navigation-v13.mjs';
const variants=['v12','v13-a','v13-b','v13-c','v13-d'];
const targets=[nav,'home-production-diorama-mobility-v12.js','home-production-world-v12-finish.mjs','home-production-world-v12-mobility.mjs'];
for(const v of variants){
  targets.push('mobility-'+v+'.html','home-production-model-mobility-'+v+'.js');
  if(v.endsWith('-b')||v.endsWith('-c')||v.endsWith('-d')){
    targets.push('home-production-diorama-mobility-'+v+'.js','home-production-world-'+v+'-finish.mjs','home-production-world-'+v+'-mobility.mjs');
  }
}
function load(dir){
  const entries={};
  for(const name of targets){
    let file=path.join(dir,name);
    if(!fs.existsSync(file))file=path.join(baseline,name);
    const source=fs.readFileSync(file,'utf8');
    entries[name]={source,sha256:hash(source)};
  }
  return entries;
}
const [first,last]=[load(original),load(corrected)];
// The only specialization is the observed nonforest call `patches=[]`. It is
// justified below from both world builders and every nonforest recovered spec.
const oldPaint='s.z>=rule.minZ&&insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly))';
const commonPaint='const paintedValid=q=>{const s=paintedPoint(q);return '+oldPaint+';};';
function navigation(s,isFinal){
  assert.ok(s.includes('const patchContains=s=>patches.some(poly=>insidePolygon(s.x,s.z,poly)) &&'));
  if(!isFinal)return one(s,'const paintedValid=q=>{const s=paintedPoint(q);return s.z>=rule.minZ&&((insidePolygon(s.x,s.z,spec.ground)&&!(spec.exclude||[]).some(poly=>insidePolygon(s.x,s.z,poly)))||patchContains(s));};',commonPaint);
  s=one(s,'cover,patches=[],inkBodies=[],opening=null','cover,patches=[]');
  s=one(s,'const oldPaint=s=>'+oldPaint+';','');
  s=one(s,'const paintedValid=q=>{const s=paintedPoint(q);return oldPaint(s)||(s.z>=rule.minZ&&patchContains(s));};',commonPaint);
  s=replaceNode(s,n=>{
    if(!declarator(n,'clearAdded'))return false;
    const init=n.declarations[0].init;
    return init.type==='LogicalExpression'&&init.operator==='&&'&&ast(init.left)===expression('patches.length');
  },'');
  // In the corrected at() function the nonempty-patch path is unreachable
  // after the early return. Verify the actual argument before inlining q.
  const coord='{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}';
  s=replaceNode(s,n=>{
    if(!declarator(n,'at'))return false;
    const arrow=n.declarations[0].init,body=arrow.body.body;
    return arrow.params.length===1&&arrow.params[0].name==='t'&&ast(body[0])===statement('const q='+coord+';')&&
      ast(body[1].test)===expression('!patches.length')&&body[1].consequent.type==='ReturnStatement'&&
      ast(body[1].consequent.argument)===expression('valid(q)');
  },'const at=t=>valid('+coord+');');
  s=replaceNode(s,n=>n.type==='IfStatement'&&n.alternate===null&&ast(n.test)===expression('added && !clearAdded(paintedA,paintedB)'), '');
  s=one(s,'let added=false;','');
  // No other reader or writer of the removed bindings may survive specialization.
  for(const name of ['added','clearAdded','inkBodies','opening','oldPaint']){
    nodes(parse(s),n=>assert.ok(n.type!=='Identifier'||n.name!==name,'unexpected live '+name));
  }
  return s;
}
function code(name,all,isFinal){
  let s=all[name].source;
  // Compare the actual dependencies first. Drop only their verified content
  // digests from URL references so URI cache keys do not masquerade as logic.
  for(const [resource,info] of Object.entries(all))s=s.replaceAll(resource+'?v='+info.sha256.slice(0,12),resource);
  if(name===nav)s=navigation(s,isFinal);
  if(name.startsWith('home-production-world-v13-')){
    s=replaceNode(s,n=>n.type==='IfStatement'&&n.alternate===null&&ast(n.test)===expression("addVisible && spec.region==='forest'"),'');
    assert.equal(s.split('extendVisibleGroundNavigation(legacy,{spec,stage:rect,presentation:p,cover})').length,2);
    assert.equal(s.includes('v13Opening'),false);
    assert.equal(s.includes('patches'),false);
  }
  if(isFinal&&/^home-production-model-mobility-v13-[bcd]\.js$/.test(name)){
    // v13Opening is introduced solely by the forest-only world block above.
    const guarded=statement('if(v13Navigation?.v13Opening)v13Navigation.v13SetInkBodies(list);');
    s=replaceNode(s,n=>n.type==='IfStatement'&&ast(n)===guarded,'');
  }
  return name.endsWith('.html')?s:ast(parse(s));
}
function checkBaselineDirectory(dir){
  let count=0;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const file=path.join(dir,ent.name);
    if(ent.isDirectory())count+=checkBaselineDirectory(file);
    else if(ent.isFile()&&/\.m?js$/.test(ent.name)){
      assert.equal(fs.readFileSync(file,'utf8').includes('v13Opening'),false,'legacy code unexpectedly supplies the forest-only marker');
      count++;
    }
  }
  return count;
}
const baselineScriptsWithoutMarker=checkBaselineDirectory(baseline);
const generated={};
for(const name of targets){
  const init=first[name].sha256,final=last[name].sha256;
  const a=code(name,first,false),b=code(name,last,true);
  assert.ok(a===b,'live nonforest program differs after specialization: '+name);
  generated[name]={original:init,corrected:final,identicalFile:init===final,nonforestProgramSHA256:hash(a)};
}
const probe=out+'.probe.tmp';
execFileSync(process.execPath,[path.join(__dirname,'matrix-navigation-probe.mjs'),path.join(original,nav),path.join(corrected,nav),baseline,probe],{stdio:'inherit'});
const navigationProbe=JSON.parse(fs.readFileSync(probe,'utf8'));fs.unlinkSync(probe);
assert.deepEqual(Object.keys(navigationProbe.regions).sort(),regions);
const observer=JSON.parse(execFileSync('python3',[path.join(__dirname,'matrix_observer_equivalence.py'),firstRef,finalRef],{encoding:'utf8'}));
fs.writeFileSync(out,JSON.stringify({schema:1,observer,unaffectedRegions:regions,correctedRegion:'forest',acorn:acorn.version,baselineScriptsWithoutMarker,
  conditions:['For nonforest world specs the only visible-ground call omits patches. The legacy route is unchanged when visible-ground is disabled.',
    'Empty patches make patchContains and clearAdded false. The corrected sample returns valid(q) before any added flag or obstruction code. Both painted-ground formulae reduce to the same original polygon condition.',
    'v13Opening exists only in the forest world branch, so the roster ink callback is not invoked outside it. The remaining model, terrain, renderer, controls and entry bytes or parsed syntax match after verifying dependency hashes.'],generated,navigationProbe},null,2)+'\n');
console.log('Verified',Object.keys(generated).length,'runtime files; changed bytes in',Object.values(generated).filter(d=>!d.identicalFile).length,'files.');
