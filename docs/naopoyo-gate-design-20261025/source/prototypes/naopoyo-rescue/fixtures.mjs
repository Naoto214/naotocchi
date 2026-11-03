import { drawSprite, spriteSpec, fitSprite } from './sprites.mjs';
import { conditionLabel } from './conditions.mjs';

function inCell(c, fixture, draw) {
  c.save();
  c.translate(fixture.x, fixture.y);
  c.beginPath();
  c.rect(.025, .025, .95, .95);
  c.clip();
  draw();
  c.restore();
}
function rounded(c, x, y, w, h, radius, color) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.fill();
}
// Measure glyph ink and cropped sprite, then center their combined visible bounds.
export function conditionLayout(c, fixture) {
 const label=conditionLabel(fixture),fontSize=label==='ALL'?.245:.29,cy=.775;
 // Measuring subpixel fonts quantizes ink bounds in browsers. Measure at real cell size.
 c.font=`bold ${fontSize*42}px ui-monospace, monospace`;
 c.textAlign='left';c.textBaseline='alphabetic';
 const m=c.measureText(label)||{},ascent=(m.actualBoundingBoxAscent??fontSize*42*.78)/42,descent=(m.actualBoundingBoxDescent??fontSize*42*.2)/42;
 const inkLeft=(m.actualBoundingBoxLeft??0)/42,inkRight=(m.actualBoundingBoxRight??m.width??fontSize*42*label.length*.62)/42;
 const textWidth=inkLeft+inkRight;
 const icon=fixture.species?fitSprite(spriteSpec(fixture.species,6).crop,{x:0,y:cy-.20,w:Math.min(.50,.95-textWidth-.035),h:.40}):null;
 const width=textWidth+(icon?icon.w+.035:0),left=(1-width)/2;
 if(icon)icon.x=left;
 return {label,fontSize,cy,left,right:left+width,icon,textX:left+(icon?icon.w+.035:0)+inkLeft,baseline:cy+(ascent-descent)/2};
}
export function drawCondition(c, fixture) {
 inCell(c,fixture,()=>{
  const v=conditionLayout(c,fixture);
  if(v.icon)drawSprite(c,fixture.species,6,v.icon);
  c.fillStyle='#20333f';c.strokeStyle='#fff4d5';c.lineWidth=.025;c.lineJoin='round';
  c.save();c.translate(v.textX,v.baseline);c.scale(1/42,1/42);c.lineWidth=.025*42;
  c.font=`bold ${v.fontSize*42}px ui-monospace, monospace`;
  c.strokeText(v.label,0,0);c.fillText(v.label,0,0);c.restore();
 });
}
export function drawExit(c, fixture) {
  inCell(c, fixture, () => {
    // Rounded star arch, distinct from the barred magic gate.
    rounded(c,.06,.025,.88,.55,[.36,.36,.035,.035],'#a2d5b6');
    rounded(c,.17,.10,.66,.46,[.27,.27,.02,.02],'#315e62');
    const glow=c.createRadialGradient(.5,.37,.02,.5,.37,.25);
    glow.addColorStop(0,'#fff6abbb');glow.addColorStop(1,'#fff6ab00');
    c.fillStyle=glow;c.fillRect(.24,.12,.52,.53);
    c.fillStyle='#ffe398';c.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2?.09:.21;
      const x=.5+Math.cos(a)*r,y=.31+Math.sin(a)*r;
      if(i)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.closePath();c.fill();
    rounded(c,.06,.54,.88,.035,.02,'#e9ecc4');
  });
}
export function drawGate(c, fixture, opening = fixture.open ? 1 : 0) {
 inCell(c,fixture,()=>{
  const openness=Math.max(0,Math.min(1,opening));
  // Full-width arch, two jambs and a clear central passage. No guardian or pedestal.
  rounded(c,.06,.025,.88,.55,[.36,.36,.025,.025],'#a8bdc6');
  rounded(c,.18,.115,.64,.45,[.26,.26,.015,.015],'#142d40');
  c.fillStyle=openness?'#9ce7db33':'#5887aa22';c.fillRect(.20,.28,.60,.28);
  c.strokeStyle='#e4e7dc';c.lineWidth=.025;c.beginPath();c.arc(.5,.33,.37,Math.PI,2*Math.PI);c.stroke();
  c.strokeStyle='#687d92';c.lineWidth=.025;
  for(const y of [.35,.48]){c.beginPath();c.moveTo(.06,y);c.lineTo(.18,y);c.moveTo(.82,y);c.lineTo(.94,y);c.stroke();}
  c.save();c.beginPath();c.rect(.18,.15,.64,.40);c.clip();
  c.strokeStyle='#b8d8e4';c.lineWidth=.04;
  for(const side of [-1,1]){const shift=side*openness*.34;c.beginPath();
   for(const x of (side<0?[.23,.35,.47]:[.53,.65,.77])){c.moveTo(x+shift,.14);c.lineTo(x+shift,.55);}
   for(const y of [.30,.48]){c.moveTo((side<0?.18:.50)+shift,y);c.lineTo((side<0?.50:.82)+shift,y);}c.stroke();
  }c.restore();
  rounded(c,.06,.54,.88,.035,.01,'#c7d6d5');
  if(fixture.flash){c.strokeStyle=`rgba(166,255,231,${fixture.flash*.65})`;c.lineWidth=.05;c.beginPath();c.arc(.5,.33,.32,Math.PI,2*Math.PI);c.stroke();}
 });
}
