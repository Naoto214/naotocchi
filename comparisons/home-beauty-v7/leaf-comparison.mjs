export const referenceFall=Object.freeze({count:1,size:1,speed:1,wind:1});

// With one shared wind field the environment paints once. Only the leaves
// need two passes, at their original place in the painting's layer order.
export function drawLeafPasses(ctx,s,drawLeaves) {
  if (s.leafCut===undefined) {
    drawLeaves(ctx,s);
    return;
  }
  function half(from,to,settings) {
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(from,0,to-from,1500);
      ctx.clip();
      drawLeaves(ctx,settings);
    } finally {ctx.restore();}
  }
  half(0,s.leafCut,{...s,fall:referenceFall,leafVariant:null,leafColor:'mixed'});
  half(s.leafCut,1000,s);
}
