'use strict';

// Two insertions in the comparison copy. The native stamp still owns animation,
// depth, placement and selection. The extra fields belong to decorative nodes.
function applyGroundPaint(source) {
  const insertions = [
    ["const screenStage=artRect && scene.region==='sea'?stage.getBoundingClientRect():null;",
      'const finishGround=env.HomeFinishGround?.prepare(scene.region,artRect,stage,presentation,revision);'],
    ['row.shadow.dataset.selected=String(model.selected()===a.key);',
      'env.HomeFinishGround?.annotate(row.shadow,row.contact,finishGround,a.x,a.y);']
  ];
  for (const [anchor,line] of insertions) {
    if (source.split(anchor).length!==2) throw Error('V4 ground paint anchor changed: '+anchor);
    source=source.replace(anchor,anchor+'\n        '+line);
  }
  return source;
}
module.exports={applyGroundPaint};
