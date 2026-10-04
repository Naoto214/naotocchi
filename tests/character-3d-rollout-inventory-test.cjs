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
