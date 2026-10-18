const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const {buildSheet}=require(path.join(root,'tools/expression-contact-sheet.cjs'));
const names=require(path.join(root,'tools/expression-stage-names.json'));
const expression=require(path.join(root,'pet-expression.js'));
const context={};
vm.runInNewContext(fs.readFileSync(path.join(root,'character-world-master.v1.js'),'utf8')+';globalThis.master=NAOTOCCHI_CHARACTER_WORLD_MASTER_V1',context);
const rows=Object.values(context.master.playerSpecies).filter(Array.isArray).flat();
assert.equal(rows.length,31);
let stages=0,assets=0;
for(const row of rows){
  // Existing gender hints disambiguate the two human menus; canonical names are unchanged.
  assert.deepEqual(names[row.id].map(n=>n.replace(/（[男女]）/g,'')),Array.from(row.stages));
  for(let i=1;i<=8;i++){
    const stage=String(i).padStart(2,'0'),base=`assets/characters/${row.id}/${stage}.png`;
    assert(fs.existsSync(path.join(root,base)));assets++;
    const sheet=buildSheet(row.id,stage,names[row.id][i-1]);
    assert(!sheet.includes('href="assets/'),'static gallery must embed external hunger marks');
    assert(sheet.includes('data:image/svg+xml;base64,'));
    const sick=sheet.slice(sheet.indexOf('4. びょうき'),sheet.indexOf('5. つかれた'));
    assert(sick.indexOf('opacity=".85"')<sick.indexOf('class="pet-expression-accent"'));
    for(const state of expression.EXPRESSIONS || ['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping']){
      assert(fs.existsSync(path.join(root,expression.assetFor(base,state))));assets++;
    }
    stages++;
  }
}
console.log(JSON.stringify({canonical_name_lines:rows.length,stages,all_hunger_marks_embedded:true,static_body_sweat_mark_order:true,asset_references_checked:assets}));
