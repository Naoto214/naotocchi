const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('the document-blocking egg module never depends on the optional Meguru 3D startup',()=>{
 const seen=new Set();
 function visit(file){
  if(seen.has(file))return;seen.add(file);
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:import|export)\s+[^;\n]*?from\s*['"](\.[^'"]+)['"]/g))visit(path.normalize(path.join(path.dirname(file),match[1])));
 }
 visit('home-production-egg.mjs');
 assert.ok(!seen.has('meguru-3d.mjs'),'delaying optional 3D must not block DOMContentLoaded or the egg');
});
