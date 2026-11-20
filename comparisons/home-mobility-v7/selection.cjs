// Owner trial only. Keep the original contact geometry as the fallback.
const fs = require('node:fs');
const path = require('node:path');

function once(source, needle, value) {
  if (source.split(needle).length !== 2) throw Error('Selection source anchor changed: ' + needle.slice(0,72));
  return source.replace(needle, () => value);
}

function patchSelection(name, source, arm) {
  if (arm !== 'v7' || !name.includes('production-diorama')) return source;
  const start = source.indexOf('        let m=new env.DOMMatrix();');
  const end = source.indexOf('        const css=env.getComputedStyle(n),w=', start);
  if (start < 0 || end < 0) throw Error('Missing native painted transform');
  const basis = source.slice(start,end);
  // One affine basis for the existing foreground mask and the sampled sprite.
  source = once(source,basis,'        const m=spriteBasis(n);\n');
  source = once(source,'    function paintForeground(a,row){',
    '    function spriteBasis(n){\n'+basis+'      return m;\n    }\n    function paintForeground(a,row){');
  const inside = source.match(/^      const inside=\(x,y,poly\)=>[^\n]+;$/m)?.[0];
  if (!inside) throw Error('Missing native painted polygon predicate');
  source = once(source,inside+'\n','');
  source = once(source,'    function visibilityTest(',inside.trimStart()+'\n    function visibilityTest(');
  const adapter=fs.readFileSync(path.join(__dirname,'selection-hit.js'),'utf8');
  source = once(source,'    function hit(p,target){',adapter+'\n    function rectangleHit(p,target){');
  return once(source,'const p=point(e),key=hit(p,e.target);','const p=point(e),key=hit(p,e.target,e);');
}

module.exports={patchSelection};
