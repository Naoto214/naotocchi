const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),tool=path.join(root,'tools/character-3d/inventory.cjs');
const api=fs.existsSync(tool)?require(tool):{};
function master(){const w={};new Function('window',fs.readFileSync(path.join(root,'character-world-master.v1.js'),'utf8'))(w);return w.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;}
test('fresh inventory derives every master row, stage and registered asset without fixed counts',()=>{
 assert.equal(typeof api.auditInventory,'function','inventory auditor must exist');const m=master(),d=api.auditInventory(root,m);const lines=Object.values(m.playerSpecies).filter(Array.isArray).flat();
 assert.equal(d.active.length,lines.reduce((n,l)=>n+l.stages.length,0)+Object.values(m.companions).filter(Array.isArray).flat().length+m.partners.length+1);
 for(const l of lines)assert.deepEqual(d.active.filter(r=>r.kind==='form'&&r.id===l.id).map(r=>r.stage),l.stages.map((_,i)=>i+1));
 assert.equal(new Set(d.active.map(r=>r.key)).size,d.active.length);assert.deepEqual(d.missingAssets,[]);assert.deepEqual(d.unclassifiedAssets,[]);
 assert.ok(d.supplemental.some(r=>r.id==='kinoko'&&r.status==='retired-asset'));assert.equal(d.supplemental.filter(r=>r.kind==='egg').length,3);
});
test('master additions cannot silently disappear behind the pilot registry',()=>{
 assert.equal(typeof api.auditInventory,'function');const m=master();m.playerSpecies.secret.push({id:'new_test_line',label:'future',stages:['one','two']});const d=api.auditInventory(root,m);assert.equal(d.active.filter(r=>r.id==='new_test_line').length,2);assert.equal(d.missingAssets.filter(r=>r.includes('new_test_line')).length,2);
});
test('missing and unclassified assets remain explicit audit failures',()=>{
 assert.equal(typeof api.auditInventory,'function');const m=master(),d=api.auditInventory(root,m,{assets:['assets/characters/unregistered/01.png']});assert.ok(d.unclassifiedAssets.includes('assets/characters/unregistered/01.png'));assert.ok(d.missingAssets.length>0);
});
const {coverage}=require('../tools/character-3d/coverage.cjs'),SPEC=require('../character-3d/spec.js');
const legacyReview='docs/qa/character-3d-full-v0/legacy-four-view-review.json';
function legacyFixture(t){
 const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'legacy-view-'));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 fs.symlinkSync(path.join(root,'assets'),path.join(tmp,'assets'),'dir');fs.copyFileSync(path.join(root,'character-world-master.v1.js'),path.join(tmp,'character-world-master.v1.js'));
 const review=JSON.parse(fs.readFileSync(path.join(root,legacyReview),'utf8'));
 for(const file of [legacyReview,review.sourceMetadata,...review.rows.map(r=>r.path)]){fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(tmp,file));}
 return {tmp,review,save:()=>fs.writeFileSync(path.join(tmp,legacyReview),JSON.stringify(review))};
}
test('legacy coverage references the reviewed rightmost four tiles without claiming raw photos or later gates',t=>{
 const {tmp,review}=legacyFixture(t),result=coverage(tmp,SPEC);
 assert.equal(result.counts.fourViewRecords,2);
 for(const evidence of review.rows){
  const row=result.rows.find(r=>r.key===evidence.key+':0');assert.ok(row.exact);assert.deepEqual(Object.values(row.views),Array(4).fill(evidence.path));
  assert.equal(row.viewEvidence.type,'comparison-board');assert.equal(row.viewEvidence.layout,evidence.views);assert.deepEqual(row.viewEvidence.viewOrder,['front','34','side','back']);
  assert.equal(row.viewEvidence.path,evidence.path);assert.equal(row.viewEvidence.sha256,evidence.sha256);assert.equal(row.viewEvidence.actualReview,'PASS_FOUR_VIEWS_ONLY');
  assert.equal(row.viewEvidence.reviewRecord,legacyReview);assert.equal(row.viewEvidence.sourceCommit,review.sourceCommit);assert.equal(row.viewEvidence.sourceMetadata,review.sourceMetadata);
  assert.equal(row.viewEvidence.currentComparisonCommit,review.currentComparisonCommit);assert.equal(row.viewEvidence.geometryAndAnimationHash,evidence.geometryAndAnimationHash);
  assert.deepEqual(row.viewEvidence.remainingGates,review.remainingGates);assert.equal(row.states,undefined);assert.equal(row.distance,undefined);
 }
 assert.ok(result.rows.filter(r=>!['cat_friend','shiba'].includes(r.id)).every(r=>r.viewEvidence===undefined));
});
test('legacy coverage rejects unreviewed, missing, changed, or wrongly mapped boards',t=>{
 const {tmp,review,save}=legacyFixture(t),original=structuredClone(review),cat=()=>coverage(tmp,SPEC).rows.find(r=>r.key==='companion:cat_friend:0');
 for(const [field,value] of [['actualReview','PENDING_VISUAL_REVIEW'],['key','partner:cat_friend'],['path',review.rows[1].path],['path','../outside.jpg'],['sha256','0'.repeat(64)],['views','leftmost four baseline tiles']]){
  review.rows=structuredClone(original.rows);review.rows[0][field]=value;save();const row=cat();assert.ok(Object.values(row.views).every(v=>v===null),field);assert.equal(row.viewEvidence,undefined,field);
 }
 review.rows=structuredClone(original.rows);save();fs.appendFileSync(path.join(tmp,review.rows[0].path),'changed');assert.equal(cat().viewEvidence,undefined);
 fs.unlinkSync(path.join(tmp,review.rows[0].path));assert.equal(cat().viewEvidence,undefined);
 fs.unlinkSync(path.join(tmp,legacyReview));assert.equal(coverage(tmp,SPEC).counts.fourViewRecords,0);
});
test('legacy board reuse requires the exact companion model at stage zero',t=>{
 const {tmp}=legacyFixture(t);
 for(const key of [{id:'cat_friend',stage:0,exact:false},{id:'cat_friend',stage:1,exact:true},{id:'partner:cat_friend',stage:0,exact:true}]){
  const fake={...SPEC,specKeyFor:ref=>ref.kind==='companion'&&ref.id==='cat_friend'?key:SPEC.specKeyFor(ref)};
  const row=coverage(tmp,fake).rows.find(r=>r.key==='companion:cat_friend:0');assert.equal(row.viewEvidence,undefined);assert.ok(Object.values(row.views).every(v=>v===null));
 }
});
