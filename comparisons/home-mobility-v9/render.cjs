'use strict';

const {replaceExact} = require('../home-finish-v5/native-hooks.cjs');

// The V8 painter updates all siblings, reads animated image geometry, then applies masks.
// Project a shared foreground once in that single read phase. Keep each sprite's real
// transformed box, affine basis, local SVG, attachment geometry and paint order.
function patchRender(source) {
  const replace = (old, next) => { source = replaceExact(source, old, next); };
  const start = '    function paintForeground(a,row,edits){';
  const end = '      for(const n of [...row.owner.querySelectorAll(\'.character-asset\'),...(row.attachments||[])]){';
  const header = source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
  if (!header.startsWith(start) || !header.includes('polygonsAt(a).map')) throw Error('Unexpected V8 mask projection');
  replace(header, `    function foregroundProjection(a){
      const polygons=polygonsAt(a);
      const p=env.NaotocchiHomeViewport?.residentPresentation?.(),host=displayRect(worldHost);
      return polygons.map(poly=>{
        const points=poly.map(([x,y])=>p?[p.x+(host.left+x-p.x)*p.scaleX,p.y+(host.top+y-p.y)*p.scaleY]:[host.left+x,host.top+y]);
        return {points,left:Math.min(...points.map(q=>q[0])),right:Math.max(...points.map(q=>q[0])),
          top:Math.min(...points.map(q=>q[1])),bottom:Math.max(...points.map(q=>q[1]))};
      });
    }
    function paintForeground(a,row,edits,shared){
      if(!world||!scene?.navigation||!env.DOMMatrix)return;
      const polygons=shared||foregroundProjection(a);
`);
  replace('const near=polygons.filter(poly=>Math.max(...poly.map(q=>q[0]))>=r.left&&Math.min(...poly.map(q=>q[0]))<=r.right&&Math.max(...poly.map(q=>q[1]))>=r.top&&Math.min(...poly.map(q=>q[1]))<=r.bottom);',
    'const near=polygons.filter(poly=>poly.right>=r.left&&poly.left<=r.right&&poly.bottom>=r.top&&poly.top<=r.bottom).map(poly=>poly.points);');
  replace('const edits=[];\n        for(const a of snapshot)', `const edits=[];
        const shared=world?.pointIndependentOcclusion&&scene?.navigation&&snapshot.length?foregroundProjection(snapshot[0]):null;
        for(const a of snapshot)`);
  replace('if(row)paintForeground(a,row,edits);', 'if(row)paintForeground(a,row,edits,shared);');

  // WebKit reports native attribute mutations even for repeated identical strings.
  // The accessibility labels, walk/effect selectors and render stamps keep their
  // actual values; an outside writer is respected on the next native update.
  replace('    function sync(){', `    function paintAttribute(node,key,value){
      if(node.getAttribute(key)!==value)node.setAttribute(key,value);
    }
    function sync(){`);
  replace("a.owner.dataset.dioramaActor=a.key;a.owner.setAttribute('role','button');a.owner.setAttribute('tabindex','0');a.owner.setAttribute('aria-label',`\${a.label||a.id}をえらぶ`);",
    "paintAttribute(a.owner,'data-diorama-actor',a.key);paintAttribute(a.owner,'role','button');paintAttribute(a.owner,'tabindex','0');paintAttribute(a.owner,'aria-label',`\${a.label||a.id}をえらぶ`);");
  replace("row.owner.dataset.dioramaSelected=String(model.selected()===a.key);row.owner.setAttribute('aria-pressed',String(model.selected()===a.key));",
    "const selected=String(model.selected()===a.key);paintAttribute(row.owner,'data-diorama-selected',selected);paintAttribute(row.owner,'aria-pressed',selected);");
  replace('row.owner.dataset.dioramaActivity=a.activity;', "paintAttribute(row.owner,'data-diorama-activity',a.activity);");
  replace('row.owner.dataset.dioramaWalking=String(!!a.target&&!isPaused&&!media?.matches);row.owner.dataset.dioramaDirection=String(a.direction);',
    "paintAttribute(row.owner,'data-diorama-walking',String(!!a.target&&!isPaused&&!media?.matches));paintAttribute(row.owner,'data-diorama-direction',String(a.direction));");
  replace('row.contact.hidden=false;row.contact.dataset.material=material;', "if(row.contact.hidden)row.contact.hidden=false;paintAttribute(row.contact,'data-material',material);");
  replace('row.shadow.dataset.selected=String(model.selected()===a.key);',"paintAttribute(row.shadow,'data-selected',selected);");
  replace('stage.dataset.dioramaPaused=String(busy);',"paintAttribute(stage,'data-diorama-paused',String(busy));");
  replace("onStatus:(mode,error)=>{stage.dataset.worldRenderer=mode;", "onStatus:(mode,error)=>{paintAttribute(stage,'data-world-renderer',mode);");
  return source;
}

module.exports = {patchRender};
